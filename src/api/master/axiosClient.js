import axios from "axios";
import { getStoredToken, isJwtExpired, clearStoredAuth } from "../apiClient";

const resolveBaseUrl = () => {
    if (import.meta.env.DEV) {
        return "/api/master";
    }

    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const cleaned = (rawBaseUrl || "").trim().replace(/\/+$/, "");

    if (!cleaned) {
        return "/api/master";
    }

    if (cleaned.endsWith("/api/master")) {
        return cleaned;
    }

    if (cleaned.endsWith("/api")) {
        return `${cleaned}/master`;
    }

    return `${cleaned}/api/master`;
};

const axiosClient = axios.create({
    baseURL: resolveBaseUrl(),
    timeout: 60000, // 60 seconds timeout
    headers: {
        "Content-Type": "application/json",
    },
});

const shouldForceLogout = (error) => {
    if (error.response?.status !== 401) {
        return false;
    }

    const responseCode = String(error.response?.data?.code || "").toUpperCase();
    if (responseCode === "SESSION_REVOKED" || responseCode === "TOKEN_EXPIRED" || responseCode === "TOKEN_INVALID") {
        return true;
    }

    const token = getStoredToken();
    return Boolean(token && isJwtExpired(token));
};

const redirectToLogin = () => {
    if (typeof window === "undefined" || window.location.pathname === "/login") {
        return;
    }

    clearStoredAuth();
    window.location.href = "/login";
};

const buildAuthError = (message, code) => {
    const error = new Error(message);
    error.code = code;
    error.response = {
        status: 401,
        data: {
            message,
            code,
        },
    };
    return error;
};

export const isSilentMasterAuthError = (error) => {
    const code = String(error?.code || error?.response?.data?.code || "").toUpperCase();
    return ["TOKEN_MISSING", "TOKEN_EXPIRED", "TOKEN_INVALID", "SESSION_REVOKED"].includes(code);
};

// Add a request interceptor to include the JWT token
axiosClient.interceptors.request.use(
    (config) => {
        const token = getStoredToken();

        if (!token) {
            redirectToLogin();
            return Promise.reject(buildAuthError("Authentication token missing", "TOKEN_MISSING"));
        }

        if (isJwtExpired(token)) {
            redirectToLogin();
            return Promise.reject(buildAuthError("Authentication token expired", "TOKEN_EXPIRED"));
        }

        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor for global error handling
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (shouldForceLogout(error) && window.location.pathname !== "/login") {
            clearStoredAuth();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
