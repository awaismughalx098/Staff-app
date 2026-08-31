import api from "../api/axios";

export const getAirlines = async (params = {}) => {
  const response = await api.get("/airlines", { params });
  return response.data;
};

export const getAirlineById = async (id) => {
  const response = await api.get(`/airlines/${id}`);
  return response.data;
};

export const createAirline = async (formData) => {
  const response = await api.post("/airlines", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateAirline = async (id, formData) => {
  const response = await api.put(`/airlines/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteAirline = async (id) => {
  const response = await api.delete(`/airlines/${id}`);
  return response.data;
};
