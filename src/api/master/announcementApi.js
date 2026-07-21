import axiosClient, { isSilentMasterAuthError } from "./axiosClient";

export const fetchAnnouncementsApi = async () => {
    try {
        const response = await axiosClient.get("/announcements");
        return response.data;
    } catch (error) {
        if (!isSilentMasterAuthError(error)) {
            console.log("Error fetching announcements", error);
        }
        throw error;
    }
};

export const createAnnouncementApi = async (payload) => {
    const response = await axiosClient.post("/announcements", payload);
    return response.data;
};

export const updateAnnouncementApi = async (id, payload) => {
    const response = await axiosClient.put(`/announcements/${id}`, payload);
    return response.data;
};

export const deleteAnnouncementApi = async (id) => {
    const response = await axiosClient.delete(`/announcements/${id}`);
    return response.data;
};
