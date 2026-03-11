import { API_BASE_URL as ROOT_API_BASE_URL } from '../apiClient';

const API_BASE_URL = (ROOT_API_BASE_URL || '').trim().replace(/\/+$/, '');

const getResolvedToken = (token) =>
  token || sessionStorage.getItem('token') || localStorage.getItem('token') || '';

const buildHeaders = (token, headers, isFormData) => {
  const resolvedToken = getResolvedToken(token);
  const baseHeaders = {
    ...headers,
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };

  if (
    !isFormData &&
    !Object.keys(baseHeaders).some((key) => key.toLowerCase() === 'content-type')
  ) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  return baseHeaders;
};

export const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, token, headers } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const url = `${API_BASE_URL}${path}`;

  let response;

  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders(token, headers, isFormData),
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (error) {
    const networkError = new Error(
      `Unable to reach HRFMS API. Check backend connection and VITE_API_BASE_URL.`
    );
    networkError.status = 0;
    networkError.data = null;
    networkError.cause = error;
    throw networkError;
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
