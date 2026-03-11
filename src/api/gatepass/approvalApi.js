import { getWithFallback, patchWithFallback } from "./requestWithFallback";

/**
 * GET visits for approval (by personToMeet)
 * @param {string} personToMeet
 */
export const fetchVisitsForApprovalApi = async (personToMeet) => {
    try {
        const response = await getWithFallback(["/approvals", "/approve", "/approval"], {
            params: { personToMeet },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching approval visits", error);
        throw error;
    }
};

/**
 * PATCH approve / reject visit
 * @param {number} id
 * @param {"approved" | "rejected"} status
 * @param {string} approvedBy
 */
export const updateVisitApprovalApi = async ({ id, status, approvedBy }) => {
    try {
        const response = await patchWithFallback(
            [`/approvals/${id}`, `/approve/${id}`, `/approval/${id}`],
            {
            status,
            approvedBy,
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error updating visit approval", error);
        throw error;
    }
};
