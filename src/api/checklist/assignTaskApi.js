import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const BASE_URL = "/api/checklist/assign-task";
const MAX_ASSIGN_TASK_BATCH_SIZE = 50;

export const fetchUniqueDepartmentDataApi = async (user_name) => {
  const res = await axiosInstance.get(`${BASE_URL}/departments/${user_name}`);
  return res.data;
};

export const fetchUniqueGivenByDataApi = async () => {
  const res = await axiosInstance.get(`${BASE_URL}/given-by`);
  return res.data;
};

export const fetchUniqueDivisionDataApi = async () => {
  const res = await axiosInstance.get(`${BASE_URL}/divisions`);
  return res.data;
};

export const fetchUniqueDoerNameDataApi = async (department) => {
  const res = await axiosInstance.get(`${BASE_URL}/doer/${department}`);
  return res.data;
};

export const fetchWorkingDaysApi = async () => {
  const res = await axiosInstance.get(`${BASE_URL}/working-days`);
  return res.data;
};

export const pushAssignTaskApi = async (tasks) => {
  const normalizedTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];

  if (normalizedTasks.length === 0) {
    return { message: "No tasks to insert", count: 0, batches: 0 };
  }

  if (normalizedTasks.length <= MAX_ASSIGN_TASK_BATCH_SIZE) {
    const res = await axiosInstance.post(`${BASE_URL}/assign`, normalizedTasks);
    return { ...res.data, batches: 1 };
  }

  const responses = [];

  for (let index = 0; index < normalizedTasks.length; index += MAX_ASSIGN_TASK_BATCH_SIZE) {
    const batch = normalizedTasks.slice(index, index + MAX_ASSIGN_TASK_BATCH_SIZE);
    const res = await axiosInstance.post(`${BASE_URL}/assign`, batch);
    responses.push(res.data);
  }

  return {
    message: "Tasks inserted",
    count: responses.reduce(
      (total, item) => total + Number(item?.count || 0),
      0
    ),
    batches: responses.length,
  };
};
