import { apiRequest } from './apiRequest';

export const getDashboardStats = (token, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/hrfms/dashboard?${query}` : '/api/hrfms/dashboard';
  return apiRequest(url, {
    method: 'GET',
    token,
  });
};

export const getEmployeeFullDetails = (token, employeeId) => {
  return apiRequest(`/api/hrfms/dashboard/employee/${employeeId}`, {
    method: 'GET',
    token,
  });
};
