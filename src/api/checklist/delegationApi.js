import axiosInstance from "./axiosInstance";

const API_TASK_BASE = "/api/houskeeping/assigntask/generate";
const API_PENDING_URL = "/api/houskeeping/assigntask/generate/pending";
const API_HISTORY_URL = "/api/houskeeping/assigntask/generate/history";

export const getPendingTasks = async (filters = {}) => {
  const { data } = await axiosInstance.get(API_PENDING_URL, { params: filters });
  return data;
};

export const getHistoryTasks = async (filters = {}) => {
  const { data } = await axiosInstance.get(API_HISTORY_URL, { params: filters });
  return data;
};

export const confirmTask = async (taskId, remark = "", imageFile = null, doerName2 = "") => {
  const formData = new FormData();
  formData.append("attachment", "confirmed");
  formData.append("remark", remark);
  formData.append("doer_name2", doerName2);
  if (imageFile instanceof File) {
    formData.append("image", imageFile);
  }
  const { data } = await axiosInstance.post(`${API_TASK_BASE}/${taskId}/confirm`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const confirmTasksBulk = async (ids = [], options = {}) => {
  const formData = new FormData();
  formData.append("ids", JSON.stringify(ids));
  formData.append("attachment", options.attachment || "confirmed");
  formData.append("remark", options.remark || "");
  formData.append("doer_name2", options.doer_name2 || "");
  if (options.imageFile instanceof File) {
    formData.append("image", options.imageFile);
  }
  const { data } = await axiosInstance.post(`${API_TASK_BASE}/confirm/bulk`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateTask = async (taskId, updateData = {}) => {
  const formData = new FormData();
  if (updateData.status) formData.append("status", updateData.status);
  if (updateData.remark) formData.append("remark", updateData.remark);
  if (updateData.attachment) formData.append("attachment", updateData.attachment);
  if (updateData.name) formData.append("name", updateData.name);
  if (updateData.doer_name2) formData.append("doer_name2", updateData.doer_name2);

  if (updateData.status === "Yes" || updateData.status === "Done") {
    formData.append("submission_date", new Date().toISOString());
  }
  if (updateData.image_file instanceof File) {
    formData.append("image", updateData.image_file);
  }

  const { data } = await axiosInstance.patch(`${API_TASK_BASE}/${taskId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

// Legacy delegation functions merged
export const insertDelegationDoneAndUpdate = async ({ selectedDataArray }) => {
  const { data } = await axiosInstance.post(`/api/checklist/delegation/submit`, {
    selectedData: selectedDataArray,
  });
  return data;
};

export const fetchDelegationDataSortByDate = async () => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const userAccess = localStorage.getItem("user_access");
  const { data } = await axiosInstance.get(`/api/checklist/delegation`, {
    params: { role, username, user_access: userAccess },
  });
  return data;
};

export const fetchDelegation_DoneDataSortByDate = async () => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const userAccess = localStorage.getItem("user_access");
  const { data } = await axiosInstance.get(`/api/checklist/delegation-done`, {
    params: { role, username, user_access: userAccess },
  });
  return data;
};
