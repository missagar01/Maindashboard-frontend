import axios from "axios";

const normalizeBaseUrl = (rawBaseUrl) => {
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
    baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
    timeout: 15000, // 15 seconds timeout
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to include the JWT token
axiosClient.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor for global error handling
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);


export default axiosClient;
