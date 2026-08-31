import api from "../api/axios";

export const registerAdmin = async (adminData) => {
  const response = await api.post("/admin/register", adminData);
  return response.data;
};

export const loginAdmin = async (adminData) => {
  const response = await api.post("/admin/login", adminData);
  return response.data;
};

export const getAdminProfile = async () => {
  const response = await api.get("/admin/profile");
  return response.data;
};

export const getAdmins = async () => {
  const response = await api.get("/admin/admins");
  return response.data;
};

export const createAdmin = async (adminData) => {
  const response = await api.post("/admin/register", adminData);
  return response.data;
};

export const updateAdmin = async (id, adminData) => {
  const response = await api.put(`/admin/admins/${id}`, adminData);
  return response.data;
};

export const deleteAdmin = async (id) => {
  const response = await api.delete(`/admin/admins/${id}`);
  return response.data;
};