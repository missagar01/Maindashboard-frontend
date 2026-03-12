import axios from "axios";

const normalizeBaseUrl = (rawBaseUrl) => {
  const cleaned = (rawBaseUrl || "").trim().replace(/\/+$/, "");

  if (!cleaned) {
    return "/api/gatepass";
  }

  if (cleaned.endsWith("/api/gatepass")) {
    return cleaned;
  }

  if (cleaned.endsWith("/api")) {
    return `${cleaned}/gatepass`;
  }

  return `${cleaned}/api/gatepass`;
};

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  headers: {
    "Content-Type": "application/json",
  },
});

const AUTH_STORAGE_KEYS = [
  "token",
  "user",
  "currentUser",
  "user-name",
  "username",
  "user_name",
  "user_id",
  "role",
  "employee_id",
  "department",
  "user_access",
  "page_access",
  "system_access",
  "store_access",
];

const decodeTokenPayload = (token) => {
  try {
    const [, rawPayload = ""] = String(token || "").split(".");
    if (!rawPayload) return null;

    const normalized = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddingNeeded = normalized.length % 4;
    const padded = paddingNeeded === 0 ? normalized : `${normalized}${"=".repeat(4 - paddingNeeded)}`;
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const exp = Number(decodeTokenPayload(token)?.exp);
  if (!Number.isFinite(exp)) return false;
  return exp <= Math.floor(Date.now() / 1000);
};

const getStoredToken = () => {
  const sessionToken = sessionStorage.getItem("token");
  const localToken = localStorage.getItem("token");

  if (!sessionToken) return localToken;
  if (!localToken) return sessionToken;
  if (sessionToken === localToken) return sessionToken;

  const sessionExpired = isTokenExpired(sessionToken);
  const localExpired = isTokenExpired(localToken);

  if (sessionExpired && !localExpired) return localToken;
  if (!sessionExpired && localExpired) return sessionToken;

  return localToken;
};

const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

const shouldForceLogout = (error) => {
  if (error.response?.status !== 401) {
    return false;
  }

  const responseCode = String(error.response?.data?.code || "").toUpperCase();
  if (responseCode === "SESSION_REVOKED" || responseCode === "TOKEN_EXPIRED" || responseCode === "TOKEN_INVALID") {
    return true;
  }

  const token = getStoredToken();
  return Boolean(token && isTokenExpired(token));
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldForceLogout(error) && window.location.pathname !== "/login") {
      clearAuthStorage();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
