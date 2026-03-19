import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const API = "/api/checklist/settings/departments";

export const fetchDepartments = async () => {
  const res = await axiosInstance.get(API);
  return res.data;
};

export const addDepartment = async (data) => {
  const res = await axiosInstance.post(API, data);
  return res.data;
};

export const updateDepartment = async (id, data) => {
  const res = await axiosInstance.put(`${API}/${id}`, data);
  return res.data;
};

export const removeDepartment = async (id) => {
  const res = await axiosInstance.delete(`${API}/${id}`);
  return res.data;
};
