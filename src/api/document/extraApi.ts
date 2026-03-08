import { authFetch, API_BASE_URL } from "./apiClient";

// Dashboard endpoints
export const fetchDashboardAll = async () => authFetch(`${API_BASE_URL}/dashboard/all`);
export const fetchDashboardDashboard = async () => authFetch(`${API_BASE_URL}/dashboard/dashboard`);
export const fetchDashboardDashboardAll = async () =>
  authFetch(`${API_BASE_URL}/dashboard/dashboard-all`);
export const fetchDashboardDashboards = async () =>
  authFetch(`${API_BASE_URL}/dashboard/dashboards`);
export const fetchDashboardMine = async () => authFetch(`${API_BASE_URL}/dashboard/mine`);

// Health
export const fetchDocumentHealth = async () => authFetch(`${API_BASE_URL}/health`);

// My subscriptions
export const fetchMySubscriptions = async () => authFetch(`${API_BASE_URL}/my-subscriptions`);

// Users endpoints
export const fetchDocumentUsers = async () => authFetch(`${API_BASE_URL}/users`);
export const fetchDocumentUsersList = async () => authFetch(`${API_BASE_URL}/users-list`);
export const fetchDocumentUserAuthMe = async () => authFetch(`${API_BASE_URL}/users/auth/me`);
export const createDocumentUser = async (payload: unknown) =>
  authFetch(`${API_BASE_URL}/users/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
export const updateDocumentUser = async (username: string, payload: unknown) =>
  authFetch(`${API_BASE_URL}/users/update/${username}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
export const deleteDocumentUser = async (username: string) =>
  authFetch(`${API_BASE_URL}/users/delete/${username}`, {
    method: "DELETE",
  });
