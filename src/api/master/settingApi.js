import axiosClient from "./axiosClient";

export const fetchUserDetailsApi = async () => {
    try {
        const response = await axiosClient.get("/settings/users");
        return response.data;
    } catch (error) {
        console.log("Error fetching users", error);
        return [];
    }
};

export const fetchUserDetailsApiById = async (id) => {
    try {
        const response = await axiosClient.get(`/settings/users/${id}`);
        return response.data;
    } catch (error) {
        console.log("Error fetching user details by ID", error);
        return null;
    }
};

/**
 * PATCH system_access (append, no overwrite)
 * @param {number} id
 * @param {string[] | string} system_access
 */
export const patchSystemAccessApi = async ({ id, system_access }) => {
    try {
        const response = await axiosClient.patch(
            `/settings/users/${id}/system_access`,
            { system_access }
        );

        return response.data;
    } catch (error) {
        console.log("Error patching system_access", error);
        return null;
    }
};