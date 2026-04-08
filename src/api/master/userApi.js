import axiosClient from "./axiosClient";

/**
 * PATCH employee image
 * Sends the file as multipart/form-data so the backend saves it to disk
 * and stores the URL path (e.g. /uploads/users/filename.jpg) in the DB.
 *
 * @param {number|string} id - User ID
 * @param {File} file - Image file
 */
export const patchEmpImageApi = async (id, file) => {
    try {
        const formData = new FormData();
        formData.append("profile_img", file);

        const response = await axiosClient.patch(
            `/users/${id}/emp-image`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error updating employee image", error);
        throw error;
    }
};

export const getEmpImageApi = async (id) => {
    try {
        const response = await axiosClient.get(`/users/${id}/emp-image`);
        return response.data;
    } catch (error) {
        console.error("Error fetching employee image", error);
        throw error;
    }
};


