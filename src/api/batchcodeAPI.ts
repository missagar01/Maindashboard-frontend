import { apiRequest } from './apiClient';

export const submitHotCoil = (formData: FormData) =>
  apiRequest('/api/batchcode/hot-coil', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getHotCoilHistory = () => apiRequest('/api/batchcode/hot-coil');
export const getHotCoilByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/hot-coil/${uniqueCode}`);

export const submitQCLabTest = (formData: FormData) =>
  apiRequest('/api/batchcode/qc-lab-samples', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getQCLabHistory = () => apiRequest('/api/batchcode/qc-lab-samples');
export const getQCLabTestByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/qc-lab-samples/${uniqueCode}`);

export const submitSMSRegister = (formData: FormData) =>
  apiRequest('/api/batchcode/sms-register', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getSMSRegisterHistory = () => apiRequest('/api/batchcode/sms-register');

export const submitReCoil = (data: any) =>
  apiRequest('/api/batchcode/re-coiler', {
    method: 'POST',
    body: data,
  });

export const getReCoilHistory = () => apiRequest('/api/batchcode/re-coiler');
export const getReCoilByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/re-coiler/${uniqueCode}`);

export const submitPipeMill = (formData: FormData) =>
  apiRequest('/api/batchcode/pipe-mill', {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getPipeMillHistory = () => apiRequest('/api/batchcode/pipe-mill');
export const getPipeMillByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/pipe-mill/${uniqueCode}`);

export const submitLaddleChecklist = (data: any) =>
  apiRequest('/api/batchcode/laddle-checklist', {
    method: 'POST',
    body: data,
  });

export const getLaddleChecklists = () => apiRequest('/api/batchcode/laddle-checklist');
export const getLaddleChecklistByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/laddle-checklist/${uniqueCode}`);

export const submitTundishChecklist = (data: any) =>
  apiRequest('/api/batchcode/tundish-checklist', {
    method: 'POST',
    body: data,
  });

export const getTundishChecklists = () => apiRequest('/api/batchcode/tundish-checklist');
export const getTundishChecklistByUniqueCode = (uniqueCode: string) =>
  apiRequest(`/api/batchcode/tundish-checklist/${uniqueCode}`);

export const getAdminOverview = (uniqueCode?: string) => {
  const url = uniqueCode
    ? `/api/batchcode/admin/overview/${uniqueCode}`
    : '/api/batchcode/admin/overview';
  return apiRequest(url);
};
