import axiosInstance from "./axiosInstance";

const BASE_URL = "/api/checklist/tasks";

// =========================
// FETCH CHECKLIST (PAGINATED)
// =========================
export const fetchChecklistData = async (page = 0, pageSize = 50, nameFilter = "") => {
  const res = await axiosInstance.post(`${BASE_URL}/checklist`, { page, pageSize, nameFilter });
  return res.data;
};

// =========================
// FETCH DELEGATION
// =========================
export const fetchDelegationData = async (page = 0, pageSize = 50, nameFilter = "") => {
  const res = await axiosInstance.post(`${BASE_URL}/delegation`, { page, pageSize, nameFilter });
  return res.data;
};

// =========================
// DELETE CHECKLIST TASKS
// =========================
export const deleteChecklistTasksApi = async (tasks) => {
  const res = await axiosInstance.post(`${BASE_URL}/delete-checklist`, { tasks });
  return res.data;
};

// =========================
// DELETE DELEGATION TASKS
// =========================
export const deleteDelegationTasksApi = async (taskIds) => {
  const res = await axiosInstance.post(`${BASE_URL}/delete-delegation`, { taskIds });
  return res.data;
};

// =========================
// UPDATE CHECKLIST TASK
// =========================
export const updateChecklistTaskApi = async (updatedTask, originalTask) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/update-checklist`, { updatedTask, originalTask });
    return res.data;
  } catch (error) {
    console.error("Error updating checklist task:", error);
    throw error.response?.data?.error || error.message;
  }
};

// =========================
// FETCH USERS
// =========================
export const fetchUsersData = async () => {
  const res = await axiosInstance.get(`${BASE_URL}/users`);
  return res.data;
};
