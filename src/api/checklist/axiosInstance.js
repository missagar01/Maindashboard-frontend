import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
});

// Request interceptor to add the JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add legacy headers for backward compatibility (used by some backend routes)
    const userAccess1 = localStorage.getItem("user_access1") || localStorage.getItem("userAccess1") || "";
    const userAccess = localStorage.getItem("user_access") || localStorage.getItem("userAccess") || "";
    const role = localStorage.getItem("role") || "";
    const pageAccess = localStorage.getItem("page_access") || localStorage.getItem("pageAccess") || "";
    const systemAccess = localStorage.getItem("system_access") || localStorage.getItem("systemAccess") || "";
    const userId = localStorage.getItem("user_id") || localStorage.getItem("id") || "";
    const verifyAccessDept = localStorage.getItem("verify_access_dept") || localStorage.getItem("verifyAccessDept") || "";
    const department = localStorage.getItem("department") || "";
    const division = localStorage.getItem("division") || "";

    if (userAccess1) {
      config.headers["x-user-access1"] = encodeURIComponent(userAccess1);
    }
    if (userAccess) {
      config.headers["x-user-access"] = encodeURIComponent(userAccess);
    }
    if (role) {
      config.headers["x-user-role"] = role;
    }
    if (pageAccess) {
      config.headers["x-page-access"] = encodeURIComponent(pageAccess);
    }
    if (systemAccess) {
      config.headers["x-system-access"] = encodeURIComponent(systemAccess);
    }
    if (userId) {
      config.headers["x-user-id"] = userId;
    }
    if (verifyAccessDept) {
      config.headers["x-verify-access-dept"] = encodeURIComponent(verifyAccessDept);
    }
    if (department) {
      config.headers["x-user-department"] = encodeURIComponent(department);
    }
    if (division) {
      config.headers["x-user-division"] = encodeURIComponent(division);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && [401, 403].includes(error.response.status)) {
      // Token expired or unauthorized
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
