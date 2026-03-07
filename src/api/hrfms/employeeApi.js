import { apiRequest } from './apiRequest';

export const createEmployee = (payload, token) => {
  // Check if payload contains files (FormData)
  if (payload instanceof FormData) {
    return apiRequest('/api/hrfms/employees', {
      method: 'POST',
      body: payload,
      token,
    });
  }
  // Regular JSON payload
  return apiRequest('/api/hrfms/employees', {
    method: 'POST',
    body: payload,
    token,
  });
};

export const getEmployees = (token) =>
  apiRequest('/api/hrfms/employees', {
    method: 'GET',
    token,
  });

export const getEmployeeById = (id, token) =>
  apiRequest(`/api/hrfms/employees/${id}`, {
    method: 'GET',
    token,
  });

export const updateEmployee = (id, payload, token) => {
  // Check if payload contains files (FormData)
  if (payload instanceof FormData) {
    return apiRequest(`/api/hrfms/employees/${id}`, {
      method: 'PUT',
      body: payload,
      token,
    });
  }
  // Regular JSON payload
  return apiRequest(`/api/hrfms/employees/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });
};

export const deleteEmployee = (id, token) =>
  apiRequest(`/api/hrfms/employees/${id}`, {
    method: 'DELETE',
    token,
  });

export const getDepartments = () =>
  apiRequest('/api/hrfms/employees/departments', {
    method: 'GET',
  });

export const getDesignations = () =>
  apiRequest('/api/hrfms/employees/designations', {
    method: 'GET',
  });
