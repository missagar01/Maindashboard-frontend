import { apiRequest as coreApiRequest } from '../apiClient';

export const apiRequest = async (path, options = {}) => {
  const response = await coreApiRequest(path, options);
  return response?.data;
};
