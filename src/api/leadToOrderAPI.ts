import { apiRequest } from './apiClient';

export const login = (username: string, password: string) =>
  apiRequest('/api/lead-to-order/auth/login', {
    method: 'POST',
    body: { username, password },
  });

export const verifyToken = () => apiRequest('/api/lead-to-order/auth/verify-token');

export const createUser = (data: any) =>
  apiRequest('/api/lead-to-order/auth/create-user', {
    method: 'POST',
    body: data,
  });

export const getAuthData = () => apiRequest('/api/lead-to-order/auth/data');

export const createLead = (data: any) =>
  apiRequest('/api/lead-to-order/leads', {
    method: 'POST',
    body: data,
  });

export const getLeadDropdowns = () => apiRequest('/api/lead-to-order/lead-dropdown');

export const getPendingFollowups = () => apiRequest('/api/lead-to-order/follow-up/pending');
export const getHistoryFollowups = () => apiRequest('/api/lead-to-order/follow-up/history');

export const submitFollowUp = (data: any) =>
  apiRequest('/api/lead-to-order/follow-up/followup', {
    method: 'POST',
    body: data,
  });

export const getFollowUpDropdowns = () => apiRequest('/api/lead-to-order/follow-up/dropdowns');

export const listUsers = () => apiRequest('/api/lead-to-order/users');
export const getDepartments = () => apiRequest('/api/lead-to-order/users/departments');

export const createUserRecord = (data: any) =>
  apiRequest('/api/lead-to-order/users', {
    method: 'POST',
    body: data,
  });

export const updateUserRecord = (id: string | number, data: any) =>
  apiRequest(`/api/lead-to-order/users/${id}`, {
    method: 'PUT',
    body: data,
  });

export const deleteUserRecord = (id: string | number) =>
  apiRequest(`/api/lead-to-order/users/${id}`, {
    method: 'DELETE',
  });

export const getPendingFMS = () => apiRequest('/api/lead-to-order/enquiry-tracker/pending');
export const getEnquiryHistory = () => apiRequest('/api/lead-to-order/enquiry-tracker/history');

export const getDirectEnquiryPending = () =>
  apiRequest('/api/lead-to-order/enquiry-tracker/direct-pending');

export const getEnquiryById = (type: string, id: string) =>
  apiRequest(`/api/lead-to-order/enquiry-tracker/view/${type}/${id}`);

export const submitEnquiryTrackerForm = (data: any) =>
  apiRequest('/api/lead-to-order/enquiry-tracker/form', {
    method: 'POST',
    body: data,
  });

export const getEnquiryTrackerDropdowns = (column: string) =>
  apiRequest(`/api/lead-to-order/enquiry-tracker/dropdowns/${column}`);

export const createQuotation = (data: any) =>
  apiRequest('/api/lead-to-order/quotations/quotation', {
    method: 'POST',
    body: data,
  });

export const getQuotationByNumber = (quotationNo: string) =>
  apiRequest(`/api/lead-to-order/quotations/quotation/${quotationNo}`);

export const getNextQuotationNumber = () => apiRequest('/api/lead-to-order/quotations/get-next-number');
export const getQuotationDropdowns = () => apiRequest('/api/lead-to-order/quotations/dropdowns');
export const getQuotationNumbers = () => apiRequest('/api/lead-to-order/quotation-leads/quotation-numbers');

export const getQuotationDetails = (quotationNo: string) =>
  apiRequest(`/api/lead-to-order/quotation-leads/quotation-details/${quotationNo}`);

export const uploadQuotationPDF = (base64Data: string, quotationNo: string) => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const file = new File([blob], `Quotation_${quotationNo}.pdf`, { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('pdf', file);
  return apiRequest('/api/lead-to-order/quotations/upload-pdf', {
    method: 'POST',
    body: formData,
  });
};

export const getQuotationLeadNumbers = () => apiRequest('/api/lead-to-order/quotation-leads/lead-numbers');

export const getQuotationLeadDetails = (leadNo: string) =>
  apiRequest(`/api/lead-to-order/quotation-leads/lead-details/${leadNo}`);

export const getDashboardMetrics = (userId?: string, isAdmin?: boolean) =>
  apiRequest('/api/lead-to-order/dashboard/metrics', { params: { userId, isAdmin } });

export const getDashboardCharts = (userId?: string, isAdmin?: boolean) =>
  apiRequest('/api/lead-to-order/dashboard/charts', { params: { userId, isAdmin } });

export const getProducts = () => apiRequest('/api/lead-to-order/products');
