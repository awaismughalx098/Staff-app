import api from "../api/axios";

export const getConsultants = async (params = {}) => {
  const response = await api.get("/consultants", { params });
  return response.data;
};

export const getConsultantById = async (id) => {
  const response = await api.get(`/consultants/${id}`);
  return response.data;
};

/** Driving directions to the office. `origin` is null when the visitor
 *  declined location — the reply then carries the pin without a route. */
export const getConsultantRoute = async (id, origin) => {
  const response = await api.get(`/consultants/${id}/route`, {
    params: origin ? { lat: origin.lat, lng: origin.lng } : {},
  });
  return response.data;
};

export const createConsultant = async (formData) => {
  const response = await api.post("/consultants", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateConsultant = async (id, formData) => {
  const response = await api.put(`/consultants/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteConsultant = async (id) => {
  const response = await api.delete(`/consultants/${id}`);
  return response.data;
};
