import { apiRequest } from './apiRequest';

export const getLeaveRequests = (token) =>
  apiRequest('/api/hrfms/leave-requests', {
    method: 'GET',
    token,
  });

export const getLeaveRequestsByStatus = (status, token) =>
  apiRequest(`/api/hrfms/leave-requests/status/${encodeURIComponent(status)}`, {
    method: 'GET',
    token,
  });

export const updateLeaveRequest = (id, payload, token) =>
  apiRequest(`/api/hrfms/leave-requests/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });
