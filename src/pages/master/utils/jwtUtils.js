/**
 * Utility to decode JWT token payload without external libraries.
 * @param {string} token 
 * @returns {object|null}
 */
export const decodeToken = (token) => {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
};

/**
 * Check if the JWT token is expired.
 * @param {string} token 
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    // JWT exp is in seconds, Date.now() is in milliseconds
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
};
