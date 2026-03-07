import { useEffect } from 'react';

/**
 * Custom hook for automatic data synchronization via polling.
 * 
 * @param {Function} fetchData - The function to call for fetching data.
 * @param {number} interval - Polling interval in milliseconds (default: 30000ms / 30s).
 * @param {boolean} enabled - Whether polling is enabled (default: true).
 */
export const useAutoSync = (fetchData, interval = 30000, enabled = true) => {
    useEffect(() => {
        if (!enabled || !fetchData) return;

        // Initial fetch is usually handled by the component's own useEffect,
        // but we set up the interval here.

        const intervalId = setInterval(() => {
            // Only fetch if the tab is visible to save resources
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        }, interval);

        // Visibility change listener to trigger an immediate fetch when user returns to tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchData, interval, enabled]);
};

export default useAutoSync;
