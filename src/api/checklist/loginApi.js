import axiosInstance from "./axiosInstance";

// Routes are relative to baseURL in axiosInstance
const BASE_URL = "/login";

export const LoginCredentialsApi = async (formData) => {
  try {
    const res = await axiosInstance.post(BASE_URL, formData);

    return { data: res.data }; // same return format
  } catch (err) {
    return { error: err.response?.data?.error || "Login failed" };
  }
};

export const logoutApi = async () => {
  try {
    await axiosInstance.post(`${BASE_URL}/logout`);
  } catch (err) {
    console.warn("Logout API failed", err);
  }
};
