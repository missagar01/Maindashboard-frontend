import axios, { type AxiosRequestConfig } from 'axios';

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const isS3Deployment = typeof window !== 'undefined' &&
  (window.location.hostname.includes('s3-website') ||
    window.location.hostname.includes('s3.amazonaws.com'));

export const API_BASE_URL = isS3Deployment
  ? envBaseUrl
  : (import.meta.env.PROD ? '' : (envBaseUrl || ''));

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let redirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 500) {
      console.error('Backend Server Error (500):', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: error.response?.data?.message || 'Internal server error',
        baseURL: error.config?.baseURL || '(empty - using proxy)',
      });
    }

    if (error.response?.status === 401 && redirectingToLogin) {
      setTimeout(() => {
        redirectingToLogin = false;
      }, 1000);
    }

    return Promise.reject(error);
  }
);

type ApiRequestOptions = AxiosRequestConfig & {
  body?: unknown;
  token?: string;
};

export const apiRequest = async (path: string, options: ApiRequestOptions = {}) => {
  const { method = 'GET', body, token, headers, ...rest } = options;
  const requestHeaders = {
    ...(headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return api.request({
    url: path,
    method,
    data: body,
    headers: requestHeaders,
    ...rest,
  });
};

export default api;


