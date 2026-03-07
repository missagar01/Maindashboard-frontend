import { apiRequest } from './apiRequest';

export const createResume = (payload, token) =>
  apiRequest('/api/hrfms/resumes', {
    method: 'POST',
    body: payload,
    token,
  });

export const getResumes = (token) =>
  apiRequest('/api/hrfms/resumes', {
    method: 'GET',
    token,
  });

export const getSelectCondidate = (token) =>
  apiRequest('/api/hrfms/resumes/selected', {
    method: 'GET',
    token,
  });

export const getByIdResumes = (id, token) =>
  apiRequest(`/api/hrfms/resumes/${id}`, {
    method: 'GET',
    token,
  });

export const updateResumes = (id, payload, token) =>
  apiRequest(`/api/hrfms/resumes/${id}`, {
    method: 'PUT',
    body: payload,
    token,
  });


