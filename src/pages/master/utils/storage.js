/**
 * Safe wrapper for localStorage operations to handle potential errors
 * and provide a centralized point for persistent data.
 */
export const storage = {
  /**
   * Get an item from localStorage with an optional default value
   */
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error);
      return defaultValue;
    }
  },

  /**
   * Set an item in localStorage
   */
  set: (key, value) => {
    try {
      localStorage.setItem(key, value || "");
      return true;
    } catch (error) {
      console.error(`Error writing key "${key}" to localStorage:`, error);
      return false;
    }
  },

  /**
   * Remove an item from localStorage
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing key "${key}" from localStorage:`, error);
      return false;
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  },

  /**
   * Check if a key exists in localStorage
   */
  has: (key) => {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }
};
