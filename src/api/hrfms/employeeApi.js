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

export const getEmployeeById = async (id, token) => {
  try {
    return await apiRequest(`/api/hrfms/employees/${id}`, {
      method: 'GET',
      token,
    });
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    if (status !== 404) {
      throw error;
    }

    try {
      return await apiRequest(`/api/hrfms/dashboard/employee/${encodeURIComponent(id)}`, {
        method: 'GET',
        token,
      });
    } catch (dashboardError) {
      const fallbackStatus = dashboardError?.status ?? dashboardError?.response?.status;
      if (fallbackStatus !== 404) {
        throw dashboardError;
      }

      return await apiRequest(`/api/employees/${id}`, {
        method: 'GET',
        token,
      });
    }
  }
};

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
