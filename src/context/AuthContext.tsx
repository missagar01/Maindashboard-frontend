"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import api from "../config/api.js";
import { lookupStoreAccessForUser } from "../api/store/storeSettingsApi";

interface User {
  id: string | number;
  username: string;
  user_name?: string;
  employee_id?: string;
  role?: string;
  email_id?: string;
  number?: string;
  department?: string;
  userType?: string;
  access?: string[];
  user_access?: string | null;
  page_access?: string | null;
  system_access?: string | null;
  store_access?: string | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  pageAccess: string | null;
  systemAccess: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  getAuthHeaders: () => { Authorization: string; 'Content-Type': string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearAuthStorage = () => {
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
  const compatKeys = [
    'user-name',
    'user_id',
    'role',
    'employee_id',
    'department',
    'user_access',
    'page_access',
    'system_access',
    'store_access',
  ];
  compatKeys.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

const normalizeValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && (value.toUpperCase() === 'NULL' || value.trim() === '')) return null;
  return typeof value === 'string' ? value : String(value);
};

const persistLegacyAuthState = (authUser: User) => {
  const compatEntries: Array<[string, string]> = [
    ['user-name', authUser.user_name || authUser.username || ''],
    ['user_id', String(authUser.id ?? '')],
    ['role', authUser.role || authUser.userType || 'user'],
    ['employee_id', String(authUser.employee_id ?? '')],
    ['department', String(authUser.department ?? '')],
    ['user_access', String(authUser.user_access ?? '')],
    ['page_access', String(authUser.page_access ?? '')],
    ['system_access', String(authUser.system_access ?? '')],
    ['store_access', String(authUser.store_access ?? '')],
  ];

  compatEntries.forEach(([key, value]) => {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  });
};

const persistAuthState = (authToken: string, authUser: User) => {
  sessionStorage.setItem('token', authToken);
  localStorage.setItem('token', authToken);
  sessionStorage.setItem('user', JSON.stringify(authUser));
  localStorage.setItem('user', JSON.stringify(authUser));
  persistLegacyAuthState(authUser);
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const decodeToken = (token: string) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(base64);
    return JSON.parse(decodedPayload);
  } catch (err) {
    console.error('Failed to decode token', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enrichUserWithStoreAccess = async (
      baseUser: User,
      authToken: string | null
    ): Promise<User> => {
      if (baseUser.store_access) {
        return baseUser;
      }

      try {
        const storeAccess = await lookupStoreAccessForUser(baseUser, authToken || undefined);
        if (!storeAccess) {
          return baseUser;
        }

        const enrichedUser = {
          ...baseUser,
          store_access: storeAccess,
        };

        setUser(enrichedUser);
        if (authToken) {
          persistAuthState(authToken, enrichedUser);
        }

        return enrichedUser;
      } catch (error) {
        console.warn('Unable to load store access', error);
        return baseUser;
      }
    };

    const initializeAuth = async () => {
      try {
        const storedToken = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (storedToken) {
          const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setToken(storedToken);
              setUser(parsedUser);
              persistLegacyAuthState(parsedUser);
              api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
              await enrichUserWithStoreAccess(parsedUser, storedToken);
              setLoading(false);
              return;
            } catch (e) { }
          }
          const decoded = decodeToken(storedToken);
          if (decoded) {
            const userAccess = decoded?.user_access || null;
            const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : null;

            const parsedUser: User = {
              id: decoded?.id || decoded?.sub || null,
              employee_id: normalizeValue(decoded?.employee_id),
              username: decoded?.username || decoded?.user_name || '',
              user_name: decoded?.user_name || decoded?.username || '',
              role: decoded?.role || 'user',
              userType: decoded?.userType || decoded?.role || 'user',
              email_id: normalizeValue(decoded?.email_id),
              number: normalizeValue(decoded?.number),
              department: normalizeValue(decoded?.department),
              access: accessArray || decoded?.access || null,
              user_access: normalizeValue(userAccess || decoded?.user_access),
              page_access: normalizeValue(decoded?.page_access),
              system_access: normalizeValue(decoded?.system_access),
              store_access: normalizeValue(decoded?.store_access),
            };
            setToken(storedToken);
            setUser(parsedUser);
            persistLegacyAuthState(parsedUser);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            await enrichUserWithStoreAccess(parsedUser, storedToken);
          } else {
            setToken(null);
            setUser(null);
            clearAuthStorage();
            delete api.defaults.headers.common['Authorization'];
            // Don't redirect here - let ProtectedRoute handle it
          }
        } else {
          setToken(null);
          setUser(null);
          clearAuthStorage();
          delete api.defaults.headers.common['Authorization'];
          // Don't redirect here - let ProtectedRoute handle it
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setToken(null);
        setUser(null);
        clearAuthStorage();
        delete api.defaults.headers.common['Authorization'];
        // Don't redirect here - let ProtectedRoute handle it
      } finally {
        setLoading(false);
      }
    };

    void initializeAuth();
  }, []);

  // ── Session revocation polling (every 60 seconds) ──────────────────────────
  // If another device logs in with the same credentials, the backend marks the
  // previous session_token invalid — this hook detects that and auto-logs out.
  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      try {
        const res = await api.get('/api/auth/verify-session');
        if (!res.data?.success) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?reason=session_revoked';
          }
        }
      } catch (err: unknown) {
        // 401 = session revoked or expired
        const axiosErr = err as { response?: { status?: number; data?: { code?: string } } };
        if (axiosErr?.response?.status === 401) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/login') {
            const reason = axiosErr.response.data?.code === 'SESSION_REVOKED'
              ? 'session_revoked'
              : 'token_expired';
            window.location.href = `/login?reason=${reason}`;
          }
        }
        // Other errors (network down etc.) — ignore, don't kick user out
      }
    };

    // Check once immediately after token is set, then every 60 s
    const timer = setInterval(checkSession, 60_000);
    return () => clearInterval(timer);
  }, [token]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      setLoading(true);

      // Use unified auth endpoint - Backend expects user_name, not username
      const response = await api.post('/api/auth/login', {
        user_name: username.trim(),
        password: password,
      });

      const payload = response.data || {};

      // Backend response structure: { success: true, data: { user: {...}, token: "..." } }
      const apiUser = payload.data?.user || payload.user || {};
      const authToken = payload.data?.token || payload.token || payload.access_token;

      if (!authToken) {
        throw new Error('No token received from server');
      }

      const decoded = decodeToken(authToken);

      const userAccess = normalizeValue(apiUser.user_access || payload.data?.user_access || decoded?.user_access);
      const pageAccess = normalizeValue(apiUser.page_access || payload.data?.page_access || decoded?.page_access);
      const systemAccess = normalizeValue(apiUser.system_access || payload.data?.system_access || decoded?.system_access);
      const storeAccess = normalizeValue(apiUser.store_access || payload.data?.store_access || decoded?.store_access);

      const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : null;

      let userData: User = {
        id: apiUser.id || decoded?.id,
        employee_id: normalizeValue(apiUser.employee_id || decoded?.employee_id) || '',
        username: apiUser.username || apiUser.user_name || decoded?.username || username,
        user_name: apiUser.user_name || apiUser.username || decoded?.user_name || username,
        role: apiUser.role || decoded?.role || 'user',
        userType: apiUser.userType || apiUser.role || decoded?.role || 'user',
        email_id: normalizeValue(apiUser.email_id || decoded?.email_id) || '',
        number: normalizeValue(apiUser.number || decoded?.number) || '',
        department: normalizeValue(apiUser.department || decoded?.department) || '',
        user_access: userAccess || '',
        page_access: pageAccess || '',
        system_access: systemAccess || '',
        store_access: storeAccess || '',
        access: accessArray || [],
      };

      if (!userData.store_access) {
        try {
          const resolvedStoreAccess = await lookupStoreAccessForUser(userData, authToken);
          if (resolvedStoreAccess) {
            userData = {
              ...userData,
              store_access: resolvedStoreAccess,
            };
          }
        } catch (error) {
          console.warn('Unable to enrich login with store access', error);
        }
      }

      setToken(authToken);
      setUser(userData);
      persistAuthState(authToken, userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      return {
        success: true,
        user: userData,
      };
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string }; statusText?: string; status?: number } };
        if (axiosError.response?.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (axiosError.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.response?.statusText || 'Login failed';
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Login failed';
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Notify backend so session_token is cleared (single-session enforcement)
    try {
      if (token) {
        await api.post('/api/auth/logout');
      }
    } catch { /* best effort */ }
    setToken(null);
    setUser(null);
    clearAuthStorage();
    delete api.defaults.headers.common['Authorization'];
    redirectToLogin();
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const value: AuthContextType = {
    user,
    token,
    loading,
    isInitializing: loading,
    isAuthenticated: !!token && !!user,
    pageAccess: user?.page_access || user?.user_access || null,
    systemAccess: user?.system_access || null,
    login,
    logout,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
