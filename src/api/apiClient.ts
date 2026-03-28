import axios, { type AxiosRequestConfig } from 'axios';

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '';
  }

  const normalizedEnvBase = normalizeBaseUrl(envBaseUrl);

  if (!normalizedEnvBase) {
    return '';
  }

  if (
    typeof window !== 'undefined' &&
    window.location?.protocol === 'https:' &&
    normalizedEnvBase.startsWith('http://')
  ) {
    return normalizedEnvBase.replace(/^http:\/\//, 'https://');
  }

  return normalizedEnvBase;
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_STORAGE_KEYS = [
  'token',
  'user',
  'userData',
  'currentUser',
  'id',
  'user-name',
  'user-pass',
  'user_pass',
  'username',
  'user_name',
  'user_id',
  'role',
  'email_id',
  'employee_id',
  'department',
  'department_id',
  'designation',
  'division',
  'user_access',
  'userAccess',
  'user_access1',
  'userAccess1',
  'page_access',
  'pageAccess',
  'system_access',
  'systemAccess',
  'store_access',
  'verify_access',
  'verifyAccess',
  'verify_access_dept',
  'verifyAccessDept',
] as const;

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  try {
    const [, rawPayload = ''] = token.split('.');
    if (!rawPayload) {
      return null;
    }

    const normalized = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = normalized.length % 4;
    const paddedPayload =
      paddingNeeded === 0 ? normalized : `${normalized}${'='.repeat(4 - paddingNeeded)}`;

    const decoded = atob(paddedPayload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getTokenExp = (token: string): number | null => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  return Number.isFinite(exp) ? exp : null;
};

export const isJwtExpired = (token: string): boolean => {
  const exp = getTokenExp(token);
  if (!exp) {
    return false;
  }
  return exp <= Math.floor(Date.now() / 1000);
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionToken = sessionStorage.getItem('token');
  const localToken = localStorage.getItem('token');

  if (!sessionToken) return localToken;
  if (!localToken) return sessionToken;
  if (sessionToken === localToken) return sessionToken;

  const sessionExpired = isJwtExpired(sessionToken);
  const localExpired = isJwtExpired(localToken);

  if (sessionExpired && !localExpired) return localToken;
  if (!sessionExpired && localExpired) return sessionToken;

  const sessionExp = getTokenExp(sessionToken) || 0;
  const localExp = getTokenExp(localToken) || 0;
  return localExp >= sessionExp ? localToken : sessionToken;
};

export const clearStoredAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  AUTH_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

const isSessionAuthFailure = (error: any) => {
  if (error.response?.status !== 401) {
    return false;
  }

  const responseCode = String(error.response?.data?.code || '').toUpperCase();
  if (responseCode === 'SESSION_REVOKED' || responseCode === 'TOKEN_EXPIRED' || responseCode === 'TOKEN_INVALID') {
    return true;
  }

  const requestUrl = String(error.config?.url || '').toLowerCase();
  if (requestUrl.includes('/api/auth/verify-session')) {
    return responseCode === 'SESSION_REVOKED' || responseCode === 'TOKEN_EXPIRED' || responseCode === 'TOKEN_INVALID';
  }

  const token = getStoredToken();
  return Boolean(token && isJwtExpired(token));
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
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
    if (isSessionAuthFailure(error)) {
      if (!redirectingToLogin && window.location.pathname !== '/login') {
        redirectingToLogin = true;
        clearStoredAuth();
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
