import { apiRequest as coreApiRequest } from "../apiClient";

export const storeApiRequest = async <T = any>(
  path: string,
  options: Record<string, unknown> = {}
): Promise<T> => {
  const response = await coreApiRequest(path, options);
  return response?.data as T;
};

export { API_BASE_URL } from "../apiClient";
