import axios from "axios";
import { API_BASE_URL } from "../apiClient";

const TRANSPORT_API_BASE_URL = API_BASE_URL
  ? `${API_BASE_URL}/api/transport`
  : "/api/transport";
const TRANSPORT_LOGIN_EMAIL = import.meta.env.VITE_TRANSPORT_EMAIL;
const TRANSPORT_LOGIN_PASSWORD = import.meta.env.VITE_TRANSPORT_PASSWORD;
const TRANSPORT_TOKEN_STORAGE_KEY = "transport_auth_token";

let transportLoginPromise = null;

const transportApi = axios.create({
  baseURL: TRANSPORT_API_BASE_URL,
  maxBodyLength: Infinity,
  headers: {
    "Content-Type": "application/json",
  },
});

const getStoredTransportToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    sessionStorage.getItem(TRANSPORT_TOKEN_STORAGE_KEY) ||
    localStorage.getItem(TRANSPORT_TOKEN_STORAGE_KEY) ||
    ""
  );
};

let transportAuthToken = getStoredTransportToken();

const persistTransportToken = (token) => {
  transportAuthToken = String(token || "").trim();

  if (typeof window === "undefined") {
    return transportAuthToken;
  }

  if (transportAuthToken) {
    sessionStorage.setItem(TRANSPORT_TOKEN_STORAGE_KEY, transportAuthToken);
  } else {
    sessionStorage.removeItem(TRANSPORT_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TRANSPORT_TOKEN_STORAGE_KEY);
  }

  return transportAuthToken;
};

export const setTransportAccessToken = (token) => persistTransportToken(token);

export const clearTransportAccessToken = () => {
  transportLoginPromise = null;
  persistTransportToken("");
};

const decodeJwtPayload = (token) => {
  try {
    const [, rawPayload = ""] = String(token || "").split(".");
    if (!rawPayload) {
      return null;
    }

    const normalized = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddingNeeded = normalized.length % 4;
    const paddedPayload =
      paddingNeeded === 0 ? normalized : `${normalized}${"=".repeat(4 - paddingNeeded)}`;

    const decoded =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob(paddedPayload)
        : Buffer.from(paddedPayload, "base64").toString("utf8");

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const isTransportTokenExpired = (token, skewSeconds = 30) => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp)) {
    return false;
  }

  return exp <= Math.floor(Date.now() / 1000) + skewSeconds;
};

const hasTransportLoginCredentials = () =>
  Boolean(
    String(TRANSPORT_LOGIN_EMAIL || "").trim() &&
    String(TRANSPORT_LOGIN_PASSWORD || "").trim()
  );

const buildMissingCredentialsError = () =>
  new Error(
    "Transport token not available. Add TRANSPORT_LOGIN_EMAIL and TRANSPORT_LOGIN_PASSWORD in src/api/transport/api.js or call setTransportAccessToken(token)."
  );

export const loginTransport = async () => {
  if (transportLoginPromise) {
    return transportLoginPromise;
  }

  if (!hasTransportLoginCredentials()) {
    throw buildMissingCredentialsError();
  }

  transportLoginPromise = transportApi
    .post(
      "/auth/login",
      {
        email: TRANSPORT_LOGIN_EMAIL,
        password: TRANSPORT_LOGIN_PASSWORD,
      },
      {
        skipTransportAuth: true,
      }
    )
    .then((response) => {
      const nextToken = response?.data?.token;
      const statusCode = Number(response?.data?.statusCode || 0);

      if (statusCode !== 200 || !nextToken) {
        throw new Error(response?.data?.message || "Transport login failed.");
      }

      return persistTransportToken(nextToken);
    })
    .finally(() => {
      transportLoginPromise = null;
    });

  return transportLoginPromise;
};

const ensureTransportToken = async (forceRefresh = false) => {
  if (
    !forceRefresh &&
    transportAuthToken &&
    !isTransportTokenExpired(transportAuthToken)
  ) {
    return transportAuthToken;
  }

  if (hasTransportLoginCredentials()) {
    return loginTransport();
  }

  throw buildMissingCredentialsError();
};

transportApi.interceptors.request.use(
  async (config) => {
    if (config?.skipTransportAuth) {
      return config;
    }

    const nextToken = await ensureTransportToken();
    const nextHeaders = config.headers || {};
    nextHeaders.Authorization = `Bearer ${nextToken}`;
    config.headers = nextHeaders;
    return config;
  },
  (error) => Promise.reject(error)
);

transportApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const statusCode = Number(error?.response?.status || 0);
    const message = String(error?.response?.data?.message || "").toLowerCase();
    const shouldRetryWithFreshLogin =
      !originalRequest._retry &&
      !originalRequest.skipTransportAuth &&
      hasTransportLoginCredentials() &&
      (statusCode === 401 ||
        message.includes("token") ||
        message.includes("jwt") ||
        message.includes("unauthorized"));

    if (shouldRetryWithFreshLogin) {
      originalRequest._retry = true;
      const nextToken = await ensureTransportToken(true);
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${nextToken}`,
      };
      return transportApi.request(originalRequest);
    }

    if (statusCode === 401 && !originalRequest.skipTransportAuth) {
      clearTransportAccessToken();
    }

    return Promise.reject(error);
  }
);

export const transportApiRequest = async (path, options = {}) => {
  const {
    method = "GET",
    data,
    params,
    headers,
    skipTransportAuth = false,
    ...rest
  } = options;

  return transportApi.request({
    url: path,
    method,
    data,
    params,
    headers,
    skipTransportAuth,
    ...rest,
  });
};

export const getLrBiltyRegister = async (params = {}) => {
  const response = await transportApiRequest("/reports/lr-bilty-register", {
    params,
  });
  return {
    records: Array.isArray(response?.data?.data) ? response.data.data : [],
    count: Number(response?.data?.count || 0),
    paginationMetadata: response?.data?.paginationMetadata || null,
    message: response?.data?.message || "",
  };
};

export { TRANSPORT_API_BASE_URL };

export default transportApi;
