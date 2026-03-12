"use client";

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, value || "");
      return true;
    } catch (error) {
      console.error(`Error writing key "${key}" to localStorage:`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing key "${key}" from localStorage:`, error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  },

  has: (key) => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
};

export const decodeToken = (token) => {
  try {
    if (!token) return null;

    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;

  return decoded.exp < Math.floor(Date.now() / 1000);
};

const cache = new Map();

export const apiCache = {
  get: (key) => {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  },

  set: (key, data, ttl = 5 * 60 * 1000) => {
    cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  },

  invalidate: (key) => {
    cache.delete(key);
  },

  invalidatePrefix: (prefix) => {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  clear: () => {
    cache.clear();
  },
};
