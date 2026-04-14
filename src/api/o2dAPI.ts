import { apiRequest } from './apiClient';

export const login = (username: string, password: string) =>
  apiRequest('/api/o2d/auth/login', {
    method: 'POST',
    body: { username, password },
  });

export const getUsers = () => apiRequest('/api/o2d/auth/users');
export const getPermissions = () => apiRequest('/api/o2d/auth/users/permissions');
export const getCrmUsers = () => apiRequest('/api/auth/crm-users');

export const getDashboardSummary = (params?: any) =>
  apiRequest('/api/o2d/dashboard/summary', { params });

export const getCustomerFeedback = (params?: any) =>
  apiRequest('/api/o2d/dashboard/customer-feedback', { params });

export const getDeliveryStats = (params?: any) =>
  apiRequest('/api/o2d/delivery/stats', { params });

export const getSalespersonDeliveryStats = (params?: any) =>
  apiRequest('/api/o2d/delivery/stats/salesperson', { params });

export const getPendingOrders = (params?: any) =>
  apiRequest('/api/o2d/orders/pending', { params });

export const getCompletedOrders = (params?: any) =>
  apiRequest('/api/o2d/orders/history', { params });

export const getProcessTimeline = (params?: any) =>
  apiRequest('/api/o2d/process/timeline', { params });

export const getProcessTimelineDetails = (
  loadingOrderNumber: string,
  params?: any
) =>
  apiRequest(`/api/o2d/process/timeline/${encodeURIComponent(loadingOrderNumber)}`, {
    params,
  });

export const getSizeMaster = () => apiRequest('/api/o2d/size-master');

export const getCurrentMonthEnquiryReport = (month?: string) =>
  apiRequest('/api/o2d/size-master/report/current-month', { params: { month } });

export const createEnquiry = (data: any) =>
  apiRequest('/api/o2d/size-master/enquiry', {
    method: 'POST',
    body: data,
  });

export const getAllEnquiries = () =>
  apiRequest('/api/o2d/size-master/enquiries/all');

export const getClients = () => apiRequest('/api/o2d/client');
export const getClient = (id: string) => apiRequest(`/api/o2d/client/${id}`);

export const createClient = (data: any) =>
  apiRequest('/api/o2d/client', {
    method: 'POST',
    body: data,
  });

export const updateClient = (id: string, data: any) =>
  apiRequest(`/api/o2d/client/${id}`, {
    method: 'PUT',
    body: data,
  });

export const deleteClient = (id: string) =>
  apiRequest(`/api/o2d/client/${id}`, {
    method: 'DELETE',
  });

export const getMarketingUsers = () => apiRequest('/api/o2d/client/marketing-users');

export const getFollowups = () => apiRequest('/api/o2d/followup');
export const getFollowup = (id: string) => apiRequest(`/api/o2d/followup/${id}`);

export const createFollowup = (data: any) =>
  apiRequest('/api/o2d/followup', {
    method: 'POST',
    body: data,
  });

export const updateFollowup = (id: string, data: any) =>
  apiRequest(`/api/o2d/followup/${id}`, {
    method: 'PUT',
    body: data,
  });

export const deleteFollowup = (id: string) =>
  apiRequest(`/api/o2d/followup/${id}`, {
    method: 'DELETE',
  });

export const getSalesPerformance = (params?: any) =>
  apiRequest('/api/o2d/followup/performance', { params });

export const getFollowupStats = (params?: any) =>
  apiRequest('/api/o2d/followup/stats', { params });

export const getClientCount = () => apiRequest('/api/o2d/client/count');
