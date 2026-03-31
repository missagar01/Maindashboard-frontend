import axiosInstance from "./axiosInstance";

const BASE_URL = "/api/checklist/department-tasks";

/**
 * Fetch pending or completed tasks for HOD/Manager
 * @param {Object} params - { username, type ('pending'|'completed'), page }
 */
export const fetchDepartmentTasks = async ({ username, type = 'pending', page = 1, source = 'checklist' }) => {
    try {
        const response = await axiosInstance.get(`${BASE_URL}`, {
            params: {
                username,
                type,
                page,
                source
            }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching department tasks:", error);
        throw error.response?.data?.error || error.message;
    }
};
