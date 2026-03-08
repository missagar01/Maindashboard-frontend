import { API_BASE_URL as ROOT_API_BASE_URL } from "../apiClient";

const normalizedRootApiBase = ROOT_API_BASE_URL.trim().replace(/\/+$/, "");
const canonicalRootApiBase = normalizedRootApiBase &&
  !/^[a-z]+:\/\//i.test(normalizedRootApiBase) &&
  !normalizedRootApiBase.startsWith("/")
  ? `/${normalizedRootApiBase}`
  : normalizedRootApiBase;

const stripOrigin = (url: string) => url.replace(/^[a-z]+:\/\/[^/]+/i, "");

const hasApiPrefix = (url: string) => {
  const path = stripOrigin(url);
  return /(^|\/)api(\/|$)/i.test(path);
};

const effectiveRootApiBase = !canonicalRootApiBase
  ? "/api"
  : hasApiPrefix(canonicalRootApiBase)
    ? canonicalRootApiBase
    : `${canonicalRootApiBase}/api`;

const API_BASE_URL = `${effectiveRootApiBase.replace(/\/+$/, "")}/document`;

function getToken(): string | null {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Auto-set JSON content type for string body payloads.
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export { API_BASE_URL };
