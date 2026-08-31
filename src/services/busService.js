import api from "../api/axios";

export const getBuses = async () => {
  const response = await api.get("/buses");
  return response.data;
};

export const getBusesByCompany = async (companyId) => {
  const response = await api.get(`/buses/company/${companyId}`);
  return response.data;
};

export const getBusById = async (id) => {
  const response = await api.get(`/buses/${id}`);
  return response.data;
};

export const searchBusesByRoute = async (from, to) => {
  const response = await api.get("/buses/search", { params: { from, to } });
  return response.data;
};

export const createBus = async (formData) => {
  const response = await api.post("/buses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateBus = async (id, formData) => {
  const response = await api.put(`/buses/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteBus = async (id) => {
  const response = await api.delete(`/buses/${id}`);
  return response.data;
};