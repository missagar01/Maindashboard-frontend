import { API_BASE_URL } from '../api/apiClient';

const normalizedApiBaseUrl = String(API_BASE_URL || '').trim().replace(/\/+$/, '');
const normalizedEnvApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const resolveReachableApiBaseUrl = () => {
  const baseUrl = normalizedApiBaseUrl || normalizedEnvApiBaseUrl;
  if (!baseUrl) {
    return '';
  }

  if (typeof window === 'undefined') {
    return baseUrl;
  }

  try {
    const parsedUrl = new URL(baseUrl, window.location.origin);
    const browserHostname = String(window.location.hostname || '').trim().toLowerCase();
    const apiHostname = String(parsedUrl.hostname || '').trim().toLowerCase();

    if (
      browserHostname &&
      !LOCAL_HOSTS.has(browserHostname) &&
      LOCAL_HOSTS.has(apiHostname)
    ) {
      parsedUrl.hostname = browserHostname;
    }

    if (window.location.protocol === 'https:' && parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
    }

    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    return baseUrl;
  }
};

const effectiveApiBaseUrl = resolveReachableApiBaseUrl();

const normalizeRawValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    const candidate =
      value?.sourceUrl ??
      value?.url ??
      value?.path ??
      value?.href ??
      value?.value ??
      '';

    return String(candidate).trim().replace(/\\/g, '/');
  }

  return String(value).trim().replace(/\\/g, '/');
};

const stripHashAndQuery = (value) => value.split('#')[0].split('?')[0];

const collectFileCandidates = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFileCandidates(item));
  }

  if (typeof value === 'object') {
    const candidate =
      value?.sourceUrl ??
      value?.url ??
      value?.path ??
      value?.href ??
      value?.value;

    return candidate !== undefined ? collectFileCandidates(candidate) : [];
  }

  const rawValue = normalizeRawValue(value);
  if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
    return [];
  }

  if (
    (rawValue.startsWith('[') && rawValue.endsWith(']')) ||
    (rawValue.startsWith('{') && rawValue.endsWith('}'))
  ) {
    try {
      return collectFileCandidates(JSON.parse(rawValue));
    } catch {
      // Fall through to string parsing.
    }
  }

  if (rawValue.includes(',') && !/^https?:\/\//i.test(rawValue)) {
    return rawValue
      .split(',')
      .map((item) => normalizeRawValue(item))
      .filter(Boolean);
  }

  return [rawValue];
};

export const extractUploadedFileValues = (value) =>
  Array.from(new Set(collectFileCandidates(value).filter(Boolean)));

export const resolveUploadedFileUrl = (value) => {
  const rawValue = extractUploadedFileValues(value)[0] || '';
  if (!rawValue || rawValue.toLowerCase() === 'null' || rawValue.toLowerCase() === 'undefined') {
    return null;
  }

  if (rawValue.startsWith('blob:') || rawValue.startsWith('data:')) {
    return rawValue;
  }

  const uploadPathMatch = rawValue.match(/\/uploads\/[^?#"'\s]+/i);
  if (uploadPathMatch) {
    const uploadPath = encodeURI(uploadPathMatch[0]);
    return effectiveApiBaseUrl ? `${effectiveApiBaseUrl}${uploadPath}` : uploadPath;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith('/')) {
    const encodedPath = encodeURI(rawValue);
    return effectiveApiBaseUrl ? `${effectiveApiBaseUrl}${encodedPath}` : encodedPath;
  }

  const normalizedPath = encodeURI(rawValue.replace(/^\/+/, ''));
  return effectiveApiBaseUrl ? `${effectiveApiBaseUrl}/${normalizedPath}` : normalizedPath;
};

export const getFileNameFromUrl = (value) => {
  const rawValue = extractUploadedFileValues(value)[0] || '';
  if (!rawValue) {
    return '';
  }

  const cleanValue = stripHashAndQuery(rawValue);
  const segments = cleanValue.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
};

export const isPdfFileUrl = (value) =>
  extractUploadedFileValues(value).some((item) =>
    stripHashAndQuery(normalizeRawValue(item)).toLowerCase().endsWith('.pdf')
  );
