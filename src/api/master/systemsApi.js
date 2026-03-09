import axiosClient from "./axiosClient";

/**
 * GET all systems
 */
export const fetchSystemsApi = async () => {
    try {
        const response = await axiosClient.get("/systems");
        return response.data;
    } catch (error) {
        console.error("Error fetching systems", error);
        return [];
    }
};

/**
 * CREATE system
 */
export const createSystemApi = async (payload) => {
    try {
        const response = await axiosClient.post("/systems", payload);
        return response.data;
    } catch (error) {
        console.error("Error creating system", error);
        throw error;
    }
};

/**
 * UPDATE system
 */
export const updateSystemApi = async (id, payload) => {
    try {
        const response = await axiosClient.put(`/systems/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error("Error updating system", error);
        throw error;
    }
};

/**
 * DELETE system
 */
export const deleteSystemApi = async (id) => {
    try {
        const response = await axiosClient.delete(`/systems/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting system", error);
        throw error;
    }
};
