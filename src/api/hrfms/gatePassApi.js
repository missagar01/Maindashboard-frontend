import { apiRequest } from './apiRequest';

export const getGatePasses = (token, options = {}) =>
  apiRequest('/api/hrfms/gatepasses', {
    method: 'GET',
    token,
    params: options,
  });

export const createGatePass = (payload, token) =>
  apiRequest('/api/hrfms/gatepasses', {
    method: 'POST',
    body: payload,
    token,
  });

export const updateGatePass = (id, payload, token) =>
  apiRequest(`/api/hrfms/gatepasses/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });

export const deleteGatePass = (id, token) =>
  apiRequest(`/api/hrfms/gatepasses/${id}`, {
    method: 'DELETE',
    token,
  });
