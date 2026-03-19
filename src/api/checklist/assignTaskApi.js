import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const BASE_URL = "/api/checklist/assign-task";

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
  const res = await axiosInstance.post(`${BASE_URL}/assign`, tasks);
  return res.data;
};
