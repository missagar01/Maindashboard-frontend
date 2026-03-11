/**
 * Utility functions for Indian date and time formatting
 */

/**
 * Formats a date string or object to DD/MM/YYYY
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export const formatDateIN = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return dateVal;
        
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateVal;
    }
};

/**
 * Formats a time string or Date object to HH:MM AM/PM
 * @param {string|Date} timeVal 
 * @returns {string}
 */
export const formatTimeIN = (timeVal) => {
    if (!timeVal) return 'N/A';
    try {
        // If it's just a time string like "14:30", we need to wrap it in a date
        let date;
        if (typeof timeVal === 'string' && !timeVal.includes('T') && timeVal.includes(':')) {
            const [hours, minutes] = timeVal.split(':');
            date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes), 0);
        } else {
            date = new Date(timeVal);
        }

        if (isNaN(date.getTime())) return timeVal;

        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return timeVal;
    }
};
