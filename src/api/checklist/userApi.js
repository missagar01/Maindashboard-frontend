import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const API = "/api/checklist/settings/users";

// ➤ Get all users
export const fetchUsers = async () => {
  const res = await axiosInstance.get(API);
  return res.data; // Adjusted to match axiosInstance return
};

// ➤ Add user
export const addUser = async (userData) => {
  const res = await axiosInstance.post(API, userData);
  return res.data;
};

// ➤ Update user
export const updateUser = async (id, userData) => {
  const res = await axiosInstance.put(`${API}/${id}`, userData);
  return res.data;
};

// ➤ Delete user
export const deleteUser = async (id) => {
  const res = await axiosInstance.delete(`${API}/${id}`);
  return res.data;
};
