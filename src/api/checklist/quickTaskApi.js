import axiosInstance from "./axiosInstance";

const BASE_URL = "/api/checklist/tasks";

// =========================
// FETCH CHECKLIST (PAGINATED)
// =========================
export const fetchChecklistData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
  startDate,
  endDate
) => {
  const res = await axiosInstance.post(`${BASE_URL}/checklist`, {
    page,
    pageSize,
    nameFilter,
    startDate,
    endDate,
  });
  return res.data;
};

// =========================
// FETCH DELEGATION
// =========================
export const fetchDelegationData = async (
  page = 0,
  pageSize = 50,
  nameFilter = ""
) => {
  const res = await axiosInstance.post(`${BASE_URL}/delegation`, {
    page,
    pageSize,
    nameFilter,
  });
  return res.data;
};

// =========================
// FETCH MAINTENANCE
// =========================
export const fetchMaintenanceData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
  startDate,
  endDate
) => {
  const res = await axiosInstance.post(`${BASE_URL}/maintenance`, {
    page,
    pageSize,
    nameFilter,
    startDate,
    endDate,
  });
  return res.data;
};

// =========================
// FETCH HOUSEKEEPING
// =========================
export const fetchHousekeepingData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
  startDate,
  endDate
) => {
  const res = await axiosInstance.post(`${BASE_URL}/housekeeping`, {
    page,
    pageSize,
    nameFilter,
    startDate,
    endDate,
  });
  return res.data;
};

// =========================
// DELETE CHECKLIST TASKS
// =========================
export const deleteChecklistTasksApi = async (tasks) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/delete-checklist`, { tasks });
    return res.data;
  } catch (error) {
    console.error("Error deleting checklist tasks:", error);
    throw new Error(error.response?.data?.error || error.message);
  }
};

// =========================
// DELETE DELEGATION TASKS
// =========================
export const deleteDelegationTasksApi = async (taskIds) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/delete-delegation`, { taskIds });
    return res.data;
  } catch (error) {
    console.error("Error deleting delegation tasks:", error);
    throw new Error(error.response?.data?.error || error.message);
  }
};

// =========================
// DELETE MAINTENANCE TASKS
// =========================
export const deleteMaintenanceTasksApi = async (taskIds) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/delete-maintenance`, { taskIds });
    return res.data;
  } catch (error) {
    console.error("Error deleting maintenance tasks:", error);
    throw new Error(error.response?.data?.error || error.message);
  }
};

// =========================
// DELETE HOUSEKEEPING TASKS
// =========================
export const deleteHousekeepingTasksApi = async (taskIds) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/delete-housekeeping`, { taskIds });
    return res.data;
  } catch (error) {
    console.error("Error deleting housekeeping tasks:", error);
    throw new Error(error.response?.data?.error || error.message);
  }
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
// UPDATE DELEGATION TASK
// =========================
export const updateDelegationTaskApi = async (updatedTask) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/update-delegation`, { updatedTask });
    return res.data;
  } catch (error) {
    console.error("Error updating delegation task:", error);
    throw error.response?.data?.error || error.message;
  }
};

// =========================
// UPDATE MAINTENANCE TASK
// =========================
export const updateMaintenanceTaskApi = async (updatedTask) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/update-maintenance`, { updatedTask });
    return res.data;
  } catch (error) {
    console.error("Error updating maintenance task:", error);
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
