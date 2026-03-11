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

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");

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
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
