import axiosClient from "./axiosClient";

/**
 * GET ALL USERS SCORES
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 */
export const fetchUserScoresApi = async ({
    startDate,
    endDate
}) => {
    try {
        const response = await axiosClient.get("/user-score", {
            params: { startDate, endDate }
        });
        return response.data;
    } catch (error) {
        console.log("Error fetching user scores", error);
        return [];
    }
};

/**
 * GET SINGLE USER SCORE (by name)
 * @param {string} name
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 */
export const fetchUserScoreApiByName = async (
    name,
    { startDate, endDate }
) => {
    try {
        const encodedName = encodeURIComponent(name);
        const response = await axiosClient.get(`/user-score/${encodedName}`, {
            params: { startDate, endDate }
        });
        return response.data;
    } catch (error) {
        console.log("Error fetching user score by name", error);
        return null;
    }
};
