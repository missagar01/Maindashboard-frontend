/**
 * Common formatting and state utility functions for Store GRN modules.
 */

/**
 * Standard date formatter (DD/MM/YYYY)
 */
export function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB");
}

/**
 * Standard date and time formatter (Indian Standard Time)
 * Formats: DD/MM/YYYY, HH:MM:SS AM/PM
 */
export function formatDateTime(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
}

/**
 * Currency formatter for Indian Rupee
 */
export function formatCurrency(amount?: number) {
    if (amount === undefined || amount === null) return "₹ 0.00";
    return `₹ ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
