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

export interface DocumentItem {
  id: string;
  sn: string;
  companyName: string;
  documentType: string;
  category: string;
  documentName: string;
  needsRenewal: boolean;
  renewalDate?: string;
  file: string | null;
  fileContent?: string;
  date: string;
  status: string;
}

export interface SubscriptionItem {
  id: string;
  sn: string;
  requestedDate: string;
  companyName: string;
  subscriberName: string;
  subscriptionName: string;
  price: string;
  frequency: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
  service?: string;
  plan?: string;
  renewalDate?: string;
  renewalStatus?: string;
  renewalNumber?: string;
  approvalNo?: string;
  remarks?: string;
  approvalDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentFile?: string;
  paymentFileContent?: string;
  file?: string | null;
  fileContent?: string;
}

export interface LoanItem {
  id: string;
  sn: string;
  loanName: string;
  bankName: string;
  amount: string;
  emi: string;
  startDate: string;
  endDate: string;
  providedDocument: string;
  remarks: string;
  file?: string | null;
  fileContent?: string;
  foreclosureStatus?: 'Pending' | 'Approved' | 'Rejected';
  requestDate?: string;
  requesterName?: string;
  documentStatus?: 'Yes' | 'No';
  documentCollectionRemarks?: string;
  closerRequestDate?: string;
  collectNocStatus?: 'Yes' | 'No';
  finalSettlementStatus?: 'Yes' | 'No';
  nextDate?: string;
  settlementDate?: string;
}

export interface MasterItem {
  id: string;
  companyName: string;
  documentType: string;
  category: string;
}

export interface RenewalItem {
  id: string;
  documentId: string;
  sn: string;
  documentName: string;
  documentType: string;
  category: string;
  companyName: string;
  entryDate: string;
  oldRenewalDate: string;
  oldFile: string | null;
  renewalStatus: 'Yes' | 'No';
  nextRenewalDate: string | null;
  newFile: string | null;
  newFileContent?: string;
  oldFileContent?: string;
}

export interface SubscriptionRenewalItem {
  id: string;
  renewalNo: string;
  subscriptionId: string;
  sn: string;
  companyName: string;
  subscriberName: string;
  subscriptionName: string;
  frequency: string;
  price: string;
  endDate: string;
  renewalStatus: string;
}

export interface ShareItem {
  id: string;
  shareNo: string;
  dateTime: string;
  docSerial: string;
  docName: string;
  docFile: string;
  sharedVia: 'Email' | 'WhatsApp';
  recipientName: string;
  contactInfo: string;
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

  // Document Store State
  title: string;
  setTitle: (title: string) => void;
  documents: DocumentItem[];
  subscriptions: SubscriptionItem[];
  loans: LoanItem[];
  masterData: MasterItem[];
  renewalHistory: RenewalItem[];
  subscriptionRenewalHistory: SubscriptionRenewalItem[];
  shareHistory: ShareItem[];
  pendingRenewals: DocumentItem[];
  pendingSubscriptionRenewals: any[];
  pendingApprovals: any[];
  approvalHistory: any[];
  pendingPayments: any[];
  paymentHistory: any[];
  setDocuments: (items: DocumentItem[]) => void;
  setPendingRenewals: (items: DocumentItem[]) => void;
  setPendingSubscriptionRenewals: (items: any[]) => void;
  setPendingApprovals: (items: any[]) => void;
  setApprovalHistory: (items: any[]) => void;
  setPendingPayments: (items: any[]) => void;
  setPaymentHistory: (items: any[]) => void;
  setSubscriptions: (items: SubscriptionItem[]) => void;
  setLoans: (items: LoanItem[]) => void;
  setMasterData: (items: MasterItem[]) => void;
  setRenewalHistory: (items: RenewalItem[]) => void;
  setSubscriptionRenewalHistory: (items: SubscriptionRenewalItem[]) => void;
  setShareHistory: (items: ShareItem[]) => void;
  addDocument: (item: DocumentItem) => void;
  addDocuments: (items: DocumentItem[]) => void;
  addSubscription: (item: SubscriptionItem) => void;
  addLoan: (item: LoanItem) => void;
  addMasterData: (item: MasterItem) => void;
  addRenewalHistory: (item: RenewalItem) => void;
  addSubscriptionRenewalHistory: (item: SubscriptionRenewalItem) => void;
  addShareHistory: (item: ShareItem) => void;
  resetShareHistory: () => void;
  resetSubscriptions: () => void;
  updateDocument: (id: string, updatedItem: Partial<DocumentItem>) => void;
  updateSubscription: (id: string, updatedItem: Partial<SubscriptionItem>) => void;
  updateLoan: (id: string, updatedItem: Partial<LoanItem>) => void;
  deleteDocument: (id: string) => void;
  deleteSubscription: (id: string) => void;
  deleteLoan: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearAuthStorage = () => {
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');
  const compatKeys = [
    'user-name',
    'username',
    'user_name',
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

const normalizeCsvValue = (value: unknown): string | null => {
  const raw = normalizeValue(value);
  if (!raw) return null;

  const entries = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && item.toUpperCase() !== 'NULL');

  if (entries.length === 0) return null;
  return Array.from(new Set(entries)).join(',');
};

const normalizeAccessArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValue(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  const csv = normalizeCsvValue(value);
  if (!csv) return [];
  return csv.split(',').map((entry) => entry.trim()).filter(Boolean);
};

const getLegacyStorageValue = (key: string): string | null =>
  sessionStorage.getItem(key) || localStorage.getItem(key);

const mergeWithLegacyStorage = (candidate: Partial<User> | null | undefined): Partial<User> => {
  const source = candidate || {};

  return {
    ...source,
    username:
      source.username ||
      source.user_name ||
      getLegacyStorageValue("username") ||
      getLegacyStorageValue("user-name") ||
      "",
    user_name:
      source.user_name ||
      source.username ||
      getLegacyStorageValue("user_name") ||
      getLegacyStorageValue("user-name") ||
      "",
    role: source.role || getLegacyStorageValue("role") || undefined,
    userType: source.userType || source.role || getLegacyStorageValue("role") || undefined,
    employee_id: source.employee_id || getLegacyStorageValue("employee_id") || undefined,
    department: source.department || getLegacyStorageValue("department") || undefined,
    user_access: source.user_access || getLegacyStorageValue("user_access") || undefined,
    page_access: source.page_access || getLegacyStorageValue("page_access") || undefined,
    system_access: source.system_access || getLegacyStorageValue("system_access") || undefined,
    store_access: source.store_access || getLegacyStorageValue("store_access") || undefined,
  };
};

const normalizeAuthUser = (candidate: Partial<User> | null | undefined): User | null => {
  const hydrated = mergeWithLegacyStorage(candidate);

  const username = normalizeValue(hydrated.username || hydrated.user_name) || '';
  const userAccess = normalizeCsvValue(hydrated.user_access);
  const pageAccess = normalizeCsvValue(hydrated.page_access);
  const systemAccess = normalizeCsvValue(hydrated.system_access);
  const storeAccess = normalizeCsvValue(hydrated.store_access);
  const normalizedRole = normalizeValue(hydrated.role) || normalizeValue(hydrated.userType) || 'user';

  return {
    ...hydrated,
    id: (hydrated.id as string | number | undefined) ?? '',
    username,
    user_name: normalizeValue(hydrated.user_name || hydrated.username) || username,
    employee_id: normalizeValue(hydrated.employee_id),
    role: normalizedRole,
    userType: normalizeValue(hydrated.userType) || normalizedRole,
    email_id: normalizeValue(hydrated.email_id),
    number: normalizeValue(hydrated.number),
    department: normalizeValue(hydrated.department),
    user_access: userAccess,
    page_access: pageAccess,
    system_access: systemAccess,
    store_access: storeAccess,
    access: normalizeAccessArray(hydrated.access || userAccess),
  };
};

const persistLegacyAuthState = (authUser: User) => {
  const compatEntries: Array<[string, string]> = [
    ['user-name', authUser.user_name || authUser.username || ''],
    ['username', authUser.username || authUser.user_name || ''],
    ['user_name', authUser.user_name || authUser.username || ''],
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

const DUMMY_SHARE_DATA: ShareItem[] = [];
const DUMMY_SUBSCRIPTIONS: SubscriptionItem[] = [];
const DEFAULT_DOCUMENTS: DocumentItem[] = [];
const DEFAULT_LOANS: LoanItem[] = [];
const DEFAULT_MASTER_DATA: MasterItem[] = [];
const DEFAULT_RENEWAL_HISTORY: RenewalItem[] = [];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Document Management State
  const [title, setTitle] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [masterData, setMasterData] = useState<MasterItem[]>([]);
  const [renewalHistory, setRenewalHistory] = useState<RenewalItem[]>([]);
  const [subscriptionRenewalHistory, setSubscriptionRenewalHistory] = useState<SubscriptionRenewalItem[]>([]);
  const [shareHistory, setShareHistory] = useState<ShareItem[]>([]);
  const [pendingRenewals, setPendingRenewals] = useState<DocumentItem[]>([]);
  const [pendingSubscriptionRenewals, setPendingSubscriptionRenewals] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Load from LocalStorage
  useEffect(() => {
    const storageKey = 'app-data-storage-v8';
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.documents) setDocuments(parsed.documents); else setDocuments(DEFAULT_DOCUMENTS);
          if (parsed.subscriptions) setSubscriptions(parsed.subscriptions); else setSubscriptions(DUMMY_SUBSCRIPTIONS);
          if (parsed.loans) setLoans(parsed.loans); else setLoans(DEFAULT_LOANS);
          if (parsed.masterData) setMasterData(parsed.masterData); else setMasterData(DEFAULT_MASTER_DATA);
          if (parsed.renewalHistory) setRenewalHistory(parsed.renewalHistory); else setRenewalHistory(DEFAULT_RENEWAL_HISTORY);
          if (parsed.subscriptionRenewalHistory) setSubscriptionRenewalHistory(parsed.subscriptionRenewalHistory);
          if (parsed.shareHistory) setShareHistory(parsed.shareHistory); else setShareHistory(DUMMY_SHARE_DATA);
        }
      } else {
        // Initialize empty local state when no persisted app data exists
        setDocuments(DEFAULT_DOCUMENTS);
        setSubscriptions(DUMMY_SUBSCRIPTIONS);
        setLoans(DEFAULT_LOANS);
        setMasterData(DEFAULT_MASTER_DATA);
        setRenewalHistory(DEFAULT_RENEWAL_HISTORY);
        setShareHistory(DUMMY_SHARE_DATA);
      }
    } catch (e) {
      console.error('Failed to load data from storage', e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (loading) return; // Don't save while initializing
    const storageKey = 'app-data-storage-v8';
    const stateToSave = {
      documents,
      subscriptions,
      loans,
      masterData,
      renewalHistory,
      subscriptionRenewalHistory,
      shareHistory
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save data to storage', e);
    }
  }, [documents, subscriptions, loans, masterData, renewalHistory, subscriptionRenewalHistory, shareHistory, loading]);

  const addDocument = (item: DocumentItem) => setDocuments(prev => [...prev, item]);
  const addDocuments = (items: DocumentItem[]) => setDocuments(prev => [...prev, ...items]);
  const addSubscription = (item: SubscriptionItem) => setSubscriptions(prev => [...prev, item]);
  const addLoan = (item: LoanItem) => setLoans(prev => [...prev, item]);
  const addMasterData = (item: MasterItem) => setMasterData(prev => [...prev, item]);
  const addRenewalHistory = (item: RenewalItem) => setRenewalHistory(prev => [item, ...prev]);
  const addSubscriptionRenewalHistory = (item: SubscriptionRenewalItem) => setSubscriptionRenewalHistory(prev => [item, ...prev]);
  const addShareHistory = (item: ShareItem) => setShareHistory(prev => [item, ...prev]);
  const resetShareHistory = () => setShareHistory(DUMMY_SHARE_DATA);
  const resetSubscriptions = () => setSubscriptions(DUMMY_SUBSCRIPTIONS);

  const updateDocument = (id: string, updatedItem: Partial<DocumentItem>) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updatedItem } : doc));
  };
  const updateSubscription = (id: string, updatedItem: Partial<SubscriptionItem>) => {
    setSubscriptions(prev => prev.map(sub => sub.id === id ? { ...sub, ...updatedItem } : sub));
  };
  const updateLoan = (id: string, updatedItem: Partial<LoanItem>) => {
    setLoans(prev => prev.map(loan => loan.id === id ? { ...loan, ...updatedItem } : loan));
  };
  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };
  const deleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
  };
  const deleteLoan = (id: string) => {
    setLoans(prev => prev.filter(loan => loan.id !== id));
  };

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
              const parsedUser = normalizeAuthUser(JSON.parse(storedUser));
              if (!parsedUser) {
                throw new Error('Stored user is invalid');
              }
              setToken(storedToken);
              setUser(parsedUser);
              persistLegacyAuthState(parsedUser);
              api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
              void enrichUserWithStoreAccess(parsedUser, storedToken);
              setLoading(false);
              return;
            } catch (e) { }
          }
          const decoded = decodeToken(storedToken);
          if (decoded) {
            const userAccess = normalizeCsvValue(decoded?.user_access);
            const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : [];

            const parsedUser = normalizeAuthUser({
              id: decoded?.id || decoded?.sub || '',
              employee_id: normalizeValue(decoded?.employee_id),
              username: decoded?.username || decoded?.user_name || '',
              user_name: decoded?.user_name || decoded?.username || '',
              role: decoded?.role || 'user',
              userType: decoded?.userType || decoded?.role || 'user',
              email_id: normalizeValue(decoded?.email_id),
              number: normalizeValue(decoded?.number),
              department: normalizeValue(decoded?.department),
              access: accessArray.length > 0 ? accessArray : decoded?.access || [],
              user_access: userAccess,
              page_access: normalizeCsvValue(decoded?.page_access),
              system_access: normalizeCsvValue(decoded?.system_access),
              store_access: normalizeCsvValue(decoded?.store_access),
            });

            if (!parsedUser) {
              throw new Error('Decoded user is invalid');
            }

            setToken(storedToken);
            setUser(parsedUser);
            persistLegacyAuthState(parsedUser);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            void enrichUserWithStoreAccess(parsedUser, storedToken);
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

      const userAccess = normalizeCsvValue(apiUser.user_access || payload.data?.user_access || decoded?.user_access);
      const pageAccess = normalizeCsvValue(apiUser.page_access || payload.data?.page_access || decoded?.page_access);
      const systemAccess = normalizeCsvValue(apiUser.system_access || payload.data?.system_access || decoded?.system_access);
      const storeAccess = normalizeCsvValue(apiUser.store_access || payload.data?.store_access || decoded?.store_access);

      const accessArray = userAccess ? userAccess.split(',').map((a: string) => a.trim()) : [];

      const rawUserData: User = {
        id: apiUser.id || decoded?.id,
        employee_id: normalizeValue(apiUser.employee_id || decoded?.employee_id) || '',
        username: apiUser.username || apiUser.user_name || decoded?.username || username,
        user_name: apiUser.user_name || apiUser.username || decoded?.user_name || username,
        role: apiUser.role || decoded?.role || 'user',
        userType: apiUser.userType || apiUser.role || decoded?.role || 'user',
        email_id: normalizeValue(apiUser.email_id || decoded?.email_id) || '',
        number: normalizeValue(apiUser.number || decoded?.number) || '',
        department: normalizeValue(apiUser.department || decoded?.department) || '',
        user_access: userAccess,
        page_access: pageAccess,
        system_access: systemAccess,
        store_access: storeAccess,
        access: accessArray,
      };
      let userData = normalizeAuthUser(rawUserData);

      if (!userData) {
        throw new Error('Invalid user payload');
      }

      if (!userData.store_access) {
        try {
          const resolvedStoreAccess = await lookupStoreAccessForUser(userData, authToken);
          if (resolvedStoreAccess) {
            userData = normalizeAuthUser({
              ...userData,
              store_access: resolvedStoreAccess,
            });
          }
        } catch (error) {
          console.warn('Unable to enrich login with store access', error);
        }
      }

      if (!userData) {
        throw new Error('Unable to normalize user access');
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

  const isInitializing = loading;
  const isAuthenticated = !!token && !!user;
  const pageAccess = user?.page_access || null;
  const systemAccess = user?.system_access || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isInitializing,
        isAuthenticated,
        pageAccess,
        systemAccess,
        login,
        logout,
        getAuthHeaders,
        title,
        setTitle,
        documents,
        subscriptions,
        loans,
        masterData,
        renewalHistory,
        subscriptionRenewalHistory,
        shareHistory,
        addDocument,
        addDocuments,
        addSubscription,
        addLoan,
        addMasterData,
        addRenewalHistory,
        addSubscriptionRenewalHistory,
        addShareHistory,
        setDocuments,
        setPendingRenewals,
        setPendingSubscriptionRenewals,
        setPendingApprovals,
        setApprovalHistory,
        setPendingPayments,
        setPaymentHistory,
        setSubscriptions,
        setLoans,
        setMasterData,
        setRenewalHistory,
        setSubscriptionRenewalHistory,
        setShareHistory,
        resetShareHistory,
        resetSubscriptions,
        updateDocument,
        updateSubscription,
        updateLoan,
        deleteDocument,
        deleteSubscription,
        deleteLoan,
        pendingRenewals,
        pendingSubscriptionRenewals,
        pendingApprovals,
        approvalHistory,
        pendingPayments,
        paymentHistory
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

