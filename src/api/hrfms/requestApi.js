import { apiRequest } from './apiRequest';

export const createRequest = (payload, token) =>
  apiRequest('/api/hrfms/requests', {
    method: 'POST',
    body: payload,
    token,
  });

export const getRequests = (token) =>
  apiRequest('/api/hrfms/requests', {
    method: 'GET',
    token,
  });

export const updateRequest = (id, payload, token) =>
  apiRequest(`/api/hrfms/requests/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });

  
