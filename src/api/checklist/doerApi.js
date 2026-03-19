import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const API = "/api/checklist";

// GET ALL DOERS
export const fetchDoers = async () => {
  const res = await axiosInstance.get(`${API}/doers`);
  return res.data;
};

// ADD DOER
export const addDoer = async (data) => {
  const res = await axiosInstance.post(`${API}/doers`, data);
  return res.data;
};

// UPDATE DOER
export const updateDoer = async (id, data) => {
  const res = await axiosInstance.put(`${API}/doers/${id}`, data);
  return res.data;
};

// DELETE DOER
export const removeDoer = async (id) => {
  const res = await axiosInstance.delete(`${API}/doers/${id}`);
  return res.data;
};
