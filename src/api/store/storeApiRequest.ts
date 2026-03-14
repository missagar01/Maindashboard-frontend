import type { AxiosRequestConfig } from "axios";
import { apiRequest as coreApiRequest, getStoredToken } from "../apiClient";

type StoreApiRequestOptions = AxiosRequestConfig & {
  body?: unknown;
  token?: string;
  cacheTtlMs?: number;
  bypassCache?: boolean;
};

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

const STORE_CACHE_RULES: Array<{ pattern: RegExp; ttlMs: number }> = [
  { pattern: /^\/api\/store\/(items|uom|cost-location|departments|settings\/users)/, ttlMs: 300000 },
  { pattern: /^\/api\/store\/auth\/hod\//, ttlMs: 300000 },
  { pattern: /^\/api\/store\/(store-indent\/(pending|history|dashboard|vendors|products)|po\/(pending|history)|repair-gate-pass\/(pending|received|history|counts)|returnable\/(stats|details)|store-grn\/pending|store-grn-approval|store-issue|repair-followup|dashboard)/, ttlMs: 180000 },
  { pattern: /^\/api\/store\//, ttlMs: 60000 },
];

const cloneValue = <T>(value: T): T => {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const resolveCacheTtlMs = (path: string, explicitTtl?: number) => {
  if (typeof explicitTtl === "number") {
    return Math.max(0, explicitTtl);
  }

  const matchedRule = STORE_CACHE_RULES.find((rule) => rule.pattern.test(path));
  return matchedRule?.ttlMs ?? 0;
};

const getCacheScope = (token?: string) => {
  const resolvedToken = token || getStoredToken() || "";
  return resolvedToken ? resolvedToken.slice(-24) : "anon";
};

const getCacheKey = (path: string, token?: string) => `${getCacheScope(token)}:${path}`;

const getCachedResponse = <T>(cacheKey: string): T | null => {
  const cached = responseCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(cacheKey);
    return null;
  }

  return cloneValue(cached.data as T);
};

const setCachedResponse = <T>(cacheKey: string, data: T, ttlMs: number) => {
  responseCache.set(cacheKey, {
    data: cloneValue(data),
    expiresAt: Date.now() + ttlMs,
  });
};

export const invalidateStoreApiCache = (pathPrefix = "/api/store/") => {
  for (const key of Array.from(responseCache.keys())) {
    if (key.includes(`:${pathPrefix}`)) {
      responseCache.delete(key);
    }
  }

  for (const key of Array.from(pendingRequests.keys())) {
    if (key.includes(`:${pathPrefix}`)) {
      pendingRequests.delete(key);
    }
  }
};

export const storeApiRequest = async <T = any>(
  path: string,
  options: StoreApiRequestOptions = {}
): Promise<T> => {
  const method = String(options.method || "GET").toUpperCase();
  const cacheTtlMs = resolveCacheTtlMs(path, options.cacheTtlMs);
  const isCacheable =
    method === "GET" &&
    !options.bypassCache &&
    options.responseType !== "blob" &&
    cacheTtlMs > 0;

  if (isCacheable) {
    const cacheKey = getCacheKey(path, options.token);
    const cached = getCachedResponse<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return cloneValue((await pending) as T);
    }

    const requestPromise = coreApiRequest(path, options).then((response) => {
      const payload = response?.data as T;
      setCachedResponse(cacheKey, payload, cacheTtlMs);
      return payload;
    });

    pendingRequests.set(cacheKey, requestPromise);

    try {
      return cloneValue((await requestPromise) as T);
    } finally {
      pendingRequests.delete(cacheKey);
    }
  }

  const response = await coreApiRequest(path, options);
  const payload = response?.data as T;

  if (method !== "GET" && path.startsWith("/api/store/")) {
    invalidateStoreApiCache();
  }

  return payload;
};

export { API_BASE_URL } from "../apiClient";
