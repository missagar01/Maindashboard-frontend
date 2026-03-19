import axiosInstance from "./axiosInstance";

// API functions for housekeeping
// All routes are relative to VITE_API_BASE_URL defined in axiosInstance
const HOUSEKEEPING_BASE_URL = "/api/houskeeping";
const HOUSEKEEPING_TASK_BASE_URL = `${HOUSEKEEPING_BASE_URL}/assigntask/generate`;
const HOUSEKEEPING_DASHBOARD_BASE_URL = `${HOUSEKEEPING_BASE_URL}/dashboard`;
const CHECKLIST_SETTINGS_BASE_URL = "/api/checklist/settings";

// Assign Task - Generate task
export const assignHousekeepingTaskAPI = (taskData) => {
  return axiosInstance.post(HOUSEKEEPING_TASK_BASE_URL, taskData, {
    timeout: 0, // No timeout - wait indefinitely
  });
};

// Get Locations
export const getHousekeepingLocationsAPI = () => {
  return axiosInstance.get(`${HOUSEKEEPING_BASE_URL}/locations`);
};

// Get User Departments - using settings/users endpoint which returns users with departments
export const getHousekeepingUserDepartmentsAPI = () => {
  return axiosInstance.get(`${CHECKLIST_SETTINGS_BASE_URL}/users`);
};

// Create Location
export const createHousekeepingLocationAPI = (payload) => {
  if (!payload) {
    throw new Error('Location payload required');
  }
  return axiosInstance.post(`${HOUSEKEEPING_BASE_URL}/locations`, payload);
};

// Get Pending Tasks
export const getHousekeepingPendingTasksAPI = (page = 1, filters = {}) => {
  const params = { page, limit: filters.limit || 100, ...filters };
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/pending`, { params });
};

// Get History Tasks
export const getHousekeepingHistoryTasksAPI = (page = 1, filters = {}) => {
  const params = { page, limit: filters.limit || 100, ...filters };
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/history`, { params });
};

// Confirm Task (single)
export const confirmHousekeepingTaskAPI = (taskId, remark = "", imageFile = null, doerName2 = "", hod = "", status = "", attachment = "") => {
  const formData = new FormData();

  if (remark) formData.append("remark", remark);
  if (doerName2) formData.append("doer_name2", doerName2);
  if (hod) formData.append("hod", hod);
  if (status) formData.append("status", status);
  if (attachment) formData.append("attachment", attachment);
  
  formData.append("submission_date", new Date().toISOString());

  if (imageFile instanceof File) {
    formData.append("image", imageFile);
  } else if (typeof imageFile === "string" && imageFile) {
    formData.append("image", imageFile);
  }

  return axiosInstance.post(
    `${HOUSEKEEPING_TASK_BASE_URL}/${taskId}/confirm`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
};

// Submit Tasks (bulk - for admin)
export const submitHousekeepingTasksAPI = async (tasks = []) => {
  const updatePromises = tasks.map((task) => {
    const formData = new FormData();

    if (task.status) formData.append("status", task.status);
    if (task.remark) formData.append("remark", task.remark);
    if (task.attachment) formData.append("attachment", task.attachment);
    if (task.doer_name2) formData.append("doer_name2", task.doer_name2);
    if (task.hod) formData.append("hod", task.hod);

    if (task.status === "Yes") {
      formData.append("submission_date", new Date().toISOString());
    }

    if (task.image_file instanceof File) {
      formData.append("image", task.image_file);
    } else if (task.image_url) {
      formData.append("image", task.image_url);
    }

    return axiosInstance.patch(
      `${HOUSEKEEPING_TASK_BASE_URL}/${task.task_id}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    ).then(response => response.data);
  });

  const results = await Promise.allSettled(updatePromises);

  const successful = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const failed = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  return { successful, failed };
};

// Update Task
export const updateHousekeepingTaskAPI = (taskId, updateData) => {
  const formData = new FormData();

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined && updateData[key] !== null && updateData[key] !== "") {
      formData.append(key, updateData[key]);
    }
  });

  return axiosInstance.patch(
    `${HOUSEKEEPING_TASK_BASE_URL}/${taskId}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
};

// Get Given By options (from settings)
export const getHousekeepingGivenByAPI = () => {
  return axiosInstance.get(`${CHECKLIST_SETTINGS_BASE_URL}/given-by`);
};

// Dashboard APIs
export const getHousekeepingDashboardSummaryAPI = (options = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_DASHBOARD_BASE_URL}/summary`, {
    params: {
      ...options
    }
  });
};

export const getHousekeepingDepartmentsAPI = () => {
  return axiosInstance.get(`${HOUSEKEEPING_DASHBOARD_BASE_URL}/departments`);
};

// Task APIs for dashboard
const todayISO = () => new Date().toISOString().split("T")[0];

export const getHousekeepingTodayTasksAPI = (options = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/today`, {
    params: {
      limit: 100,
      page: 1,
      ...options,
    }
  });
};

export const getHousekeepingTomorrowTasksAPI = (options = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/tomorrow`, {
    params: {
      limit: 100,
      page: 1,
      ...options,
    }
  });
};

export const getHousekeepingOverdueTasksAPI = (options = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/overdue`, {
    params: {
      endDate: todayISO(),
      limit: 100,
      page: 1,
      ...options,
    }
  });
};

export const getHousekeepingTodayCountAPI = (filters = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/today/count`, {
    params: filters
  });
};

export const getHousekeepingTomorrowCountAPI = (filters = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/tomorrow/count`, {
    params: filters
  });
};

export const getHousekeepingOverdueCountAPI = (filters = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/overdue/count`, {
    params: filters
  });
};

export const getHousekeepingNotDoneCountAPI = (filters = {}) => {
  return axiosInstance.get(`${HOUSEKEEPING_TASK_BASE_URL}/not-done/count`, {
    params: filters
  });
};

export const getHousekeepingTaskCountsAPI = async (filters = {}) => {
  const [recentData, upcomingData, overdueData, notDoneData] = await Promise.all([
    getHousekeepingTodayCountAPI(filters),
    getHousekeepingTomorrowCountAPI(filters),
    getHousekeepingOverdueCountAPI(filters),
    getHousekeepingNotDoneCountAPI(filters),
  ]);

  return {
    recent: recentData.data?.count || 0,
    upcoming: upcomingData.data?.count || 0,
    overdue: overdueData.data?.count || 0,
    notdone: notDoneData.data?.count || 0,
  };
};

export const getHousekeepingTasksWithFiltersAPI = (taskType, page = 1, limit = 50, filters = {}) => {
  let endpoint = HOUSEKEEPING_TASK_BASE_URL;
  if (taskType === "overdue") endpoint = `${HOUSEKEEPING_TASK_BASE_URL}/overdue`;
  else if (taskType === "recent") endpoint = `${HOUSEKEEPING_TASK_BASE_URL}/today`;
  else if (taskType === "upcoming") endpoint = `${HOUSEKEEPING_TASK_BASE_URL}/tomorrow`;
  else if (taskType === "notdone") endpoint = `${HOUSEKEEPING_TASK_BASE_URL}/not-done`;

  return axiosInstance.get(endpoint, {
    params: {
      page,
      limit,
      ...filters,
    }
  });
};

export default axiosInstance;
