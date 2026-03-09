/**
 * Simple in-memory cache for API responses to reduce redundant network requests.
 */
const cache = new Map();

export const apiCache = {
  /**
   * Get data from cache if not expired
   * @param {string} key Unique key for the request (e.g., URL + params)
   * @param {number} ttl Time to live in milliseconds (default 5 minutes)
   */
  get: (key) => {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  },

  /**
   * Store data in cache
   * @param {string} key Unique key for the request
   * @param {any} data Data to store
   * @param {number} ttl Time to live in milliseconds (default 5 minutes)
   */
  set: (key, data, ttl = 5 * 60 * 1000) => {
    cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  },

  /**
   * Remove a specific key from cache
   */
  invalidate: (key) => {
    cache.delete(key);
  },

  /**
   * Invalidate keys starting with a certain prefix
   */
  invalidatePrefix: (prefix) => {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  },

  /**
   * Clear entire cache
   */
  clear: () => {
    cache.clear();
  }
};
