import axios from "axios";

const envApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();

// Resolve API base; prefer env, else fallback to production HTTPS backend.
const resolveApiBase = () => {
  const isBrowser = typeof window !== "undefined";
  const isHttpsPage = isBrowser && window.location?.protocol === "https:";

  let base = envApiBase;
  base = base.replace(/\/+$/, "");

  // Auto-upgrade to https if somehow an http URL is provided while on https page.
  if (isHttpsPage && base.startsWith("http://")) {
    base = base.replace(/^http:\/\//, "https://");
  }

  return base;
};

export const API_BASE_URL = resolveApiBase();
const REQUEST_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: REQUEST_TIMEOUT
});

api.interceptors.request.use(
  (config) => {
    // Add user_access1, user_access, and role from localStorage (for non-JWT auth)
    // These headers are used by backend to filter data by user's departments
    const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || "";
    const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || "";
    const role = localStorage.getItem("role") || "";
    
    if (userAccess1) {
      config.headers["x-user-access1"] = encodeURIComponent(userAccess1);
    }
    if (userAccess) {
      config.headers["x-user-access"] = encodeURIComponent(userAccess);
    }
    if (role) {
      config.headers["x-user-role"] = role;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
