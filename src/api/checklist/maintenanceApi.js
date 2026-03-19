import axiosInstance from "./axiosInstance";

// API functions
const MAINTENANCE_BASE_URL = "/api/mainatce";

export const getMaintenanceTasksAPI = (page = 1, filters = {}) => {
  const params = { page, ...filters };
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/tasks`, { params });
};

export const getPendingMaintenanceTasksAPI = (page = 1, userId = null) => {
  const params = { page, ...(userId && { userId }) };
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/tasks/pending`, { params });
};

export const getCompletedMaintenanceTasksAPI = (page = 1, filters = {}, userId = null) => {
  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user-name");

  // Use explicit userId if provided, otherwise fall back to localStorage for user role
  const resolvedUserId = userId ?? (role === "user" ? user : null);

  const params = {
    page,
    ...filters,
    ...(resolvedUserId ? { userId: resolvedUserId } : {})
  };

  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/tasks/completed`, { params });
};


export const updateMaintenanceTaskAPI = (taskId, updateData) => {
  const formData = new FormData();

  // Add all update data to formData
  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined && updateData[key] !== null) {
      formData.append(key, updateData[key]);
    }
  });

  return axiosInstance.put(`${MAINTENANCE_BASE_URL}/tasks/${taskId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const updateMultipleMaintenanceTasksAPI = (tasks) => {
  return axiosInstance.put(`${MAINTENANCE_BASE_URL}/tasks/bulk/update`, { tasks });
};

export const getUniqueMachineNamesAPI = () => {
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/machines/unique`);
};

export const getUniqueMaintenanceDepartmentsAPI = () => {
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/departments/unique`);
};



export const getMaintenanceStatisticsAPI = () => {
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/statistics`);
};

export const getUniqueAssignedPersonnelAPI = () => {
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/personnel/unique`);
};

export const getUniqueMaintenanceDoerNameAPI = () => {
  return axiosInstance.get(`${MAINTENANCE_BASE_URL}/doers/unique`);
};

export default axiosInstance;
