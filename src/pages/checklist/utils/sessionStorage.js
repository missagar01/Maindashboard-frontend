// Helper for clearing all session keys that are populated during login.
const SESSION_KEYS = [
  "user-name",
  "user_id",
  "role",
  "email_id",
  "token",
  "user_access",
  "userAccess",
  "user_access1",
  "userAccess1",
  "page_access",
  "system_access",
  "userData",
  "user-pass",
  "user_pass",
];

/** Clears every session/localStorage key that holds user context. */
export const clearSessionStorage = () => {
  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};
