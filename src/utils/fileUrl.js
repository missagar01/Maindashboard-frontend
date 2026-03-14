import { API_BASE_URL } from '../api/apiClient';

const normalizedApiBaseUrl = String(API_BASE_URL || '').trim().replace(/\/+$/, '');

const normalizeRawValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().replace(/\\/g, '/');
};

const stripHashAndQuery = (value) => value.split('#')[0].split('?')[0];

export const resolveUploadedFileUrl = (value) => {
  const rawValue = normalizeRawValue(value);
  if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
    return null;
  }

  if (rawValue.startsWith('blob:') || rawValue.startsWith('data:')) {
    return rawValue;
  }

  const uploadPathMatch = rawValue.match(/\/uploads\/[^?#"'\s]+/i);
  if (uploadPathMatch) {
    const uploadPath = uploadPathMatch[0];
    return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${uploadPath}` : uploadPath;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith('/')) {
    return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${rawValue}` : rawValue;
  }

  return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}/${rawValue.replace(/^\/+/, '')}` : rawValue;
};

export const getFileNameFromUrl = (value) => {
  const rawValue = normalizeRawValue(value);
  if (!rawValue) {
    return '';
  }

  const cleanValue = stripHashAndQuery(rawValue);
  const segments = cleanValue.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
};

export const isPdfFileUrl = (value) =>
  stripHashAndQuery(normalizeRawValue(value)).toLowerCase().endsWith('.pdf');
