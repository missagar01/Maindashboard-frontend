import axiosClient from "./axiosClient";

/**
 * PATCH employee image
 * @param {number|string} id - User ID
 * @param {File} file - Image file
 */
export const patchEmpImageApi = async (id, file) => {
    try {
        const formData = new FormData();
        formData.append("emp_image", file);

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
