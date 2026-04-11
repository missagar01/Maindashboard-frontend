import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const BASE_URL = "/api/checklist/settings";

const getApiErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallbackMessage;

// =======================================================
// 1️⃣ FETCH USERS
// =======================================================
export const fetchUserDetailsApi = async () => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/users`);
    return response.data;
  } catch (error) {
    console.error("Error fetching users", error);
    return [];
  }
};

// =======================================================
// 2️⃣ FETCH DEPARTMENTS
// =======================================================
export const fetchDepartmentDataApi = async () => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/departments`);
    return response.data;
  } catch (error) {
    console.error("Error fetching departments", error);
    return [];
  }
};

// =======================================================
// 3️⃣ CREATE USER
// =======================================================
export const createUserApi = async (newUser) => {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/users`, newUser);
    return response.data;
  } catch (error) {
    console.error("Error creating user", error);
    throw new Error(getApiErrorMessage(error, "Failed to create user"));
  }
};

// =======================================================
// 4️⃣ UPDATE USER
// =======================================================
export const updateUserDataApi = async ({ id, updatedUser }) => {
  try {
    const response = await axiosInstance.put(`${BASE_URL}/users/${id}`, updatedUser);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating user:", error);
    throw new Error(getApiErrorMessage(error, "Failed to update user"));
  }
};

// =======================================================
// 5️⃣ DELETE USER
// =======================================================
export const deleteUserByIdApi = async (id) => {
  try {
    await axiosInstance.delete(`${BASE_URL}/users/${id}`);
  } catch (error) {
    console.error("Error deleting user", error);
  }
};

// =======================================================
// 6️⃣ CREATE DEPARTMENT
// =======================================================
export const createDepartmentApi = async (newDept) => {
  try {
    const response = await axiosInstance.post(`${BASE_URL}/departments`, newDept);
    return response.data;
  } catch (error) {
    console.error("Error adding department", error);
    throw new Error(getApiErrorMessage(error, "Failed to create department"));
  }
};

// =======================================================
// 7️⃣ UPDATE DEPARTMENT
// =======================================================
export const updateDepartmentDataApi = async ({ id, updatedDept }) => {
  try {
    const response = await axiosInstance.put(`${BASE_URL}/departments/${id}`, updatedDept);
    return response.data;
  } catch (error) {
    console.error("Error updating department:", error);
    throw new Error(getApiErrorMessage(error, "Failed to update department"));
  }
};

// =======================================================
// DELETE DEPARTMENT
// =======================================================
export const deleteDepartmentDataApi = async (id) => {
  try {
    const response = await axiosInstance.delete(`${BASE_URL}/departments/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting department:", error);
    throw new Error(getApiErrorMessage(error, "Failed to delete department"));
  }
};

// Fetch only unique departments (without given_by)
export const fetchDepartmentsOnlyApi = async () => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/departments-only`);
    return response.data;
  } catch (error) {
    console.error("Error fetching departments only", error);
    return [];
  }
};

// Fetch only given_by data
export const fetchGivenByDataApi = async () => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/given-by`);
    return response.data;
  } catch (error) {
    console.error("Error fetching given_by data", error);
    return [];
  }
};

// =======================================================
// 8️⃣ PATCH VERIFY ACCESS
// =======================================================
export const patchVerifyAccessApi = async ({ id, verify_access }) => {
  try {
    const response = await axiosInstance.patch(`${BASE_URL}/users/${id}/verify-access`, { verify_access });
    return response.data;
  } catch (error) {
    console.error("Error patching verify_access", error);
    throw new Error(getApiErrorMessage(error, "Failed to update verify access"));
  }
};

// =======================================================
// 9️⃣ PATCH VERIFY ACCESS DEPT
// =======================================================
export const patchVerifyAccessDeptApi = async ({ id, verify_access_dept }) => {
  try {
    const response = await axiosInstance.patch(`${BASE_URL}/users/${id}/verify-access-dept`, { verify_access_dept });
    return response.data;
  } catch (error) {
    console.error("Error patching verify_access_dept", error);
    throw new Error(getApiErrorMessage(error, "Failed to update verify access department"));
  }
};
