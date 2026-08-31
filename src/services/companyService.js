import api from "../api/axios";

/** @param {{kind?: "bus"|"tour"|"religious"}} params */
export const getCompanies = async (params = {}) => {
  const response = await api.get("/companies", { params });
  return response.data;
};

export const createCompany = async (formData) => {
  const response = await api.post("/companies", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateCompany = async (id, formData) => {
  const response = await api.put(`/companies/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};