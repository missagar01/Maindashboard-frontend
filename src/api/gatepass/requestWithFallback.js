import api from "./axiosInstance";

const isNotFoundError = (error) => error?.response?.status === 404;

const requestWithFallback = async (paths, callback) => {
  let lastError = null;

  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];

    try {
      return await callback(path);
    } catch (error) {
      lastError = error;
      const isLastPath = index === paths.length - 1;

      if (!isNotFoundError(error) || isLastPath) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const getWithFallback = (paths, config) =>
  requestWithFallback(paths, (path) => api.get(path, config));

export const postWithFallback = (paths, data, config) =>
  requestWithFallback(paths, (path) => api.post(path, data, config));

export const putWithFallback = (paths, data, config) =>
  requestWithFallback(paths, (path) => api.put(path, data, config));

export const patchWithFallback = (paths, data, config) =>
  requestWithFallback(paths, (path) => api.patch(path, data, config));

export const deleteWithFallback = (paths, config) =>
  requestWithFallback(paths, (path) => api.delete(path, config));
