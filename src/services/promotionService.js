import api from "../api/axios";

/** Every promotion, in order. Super Admin only — the server enforces that. */
export const getPromotions = async () => {
  const response = await api.get("/promotions");
  return response.data;
};

/** @param {FormData} formData image + title + description + link + sortOrder + isActive */
export const createPromotion = async (formData) => {
  const response = await api.post("/promotions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updatePromotion = async (id, formData) => {
  const response = await api.put(`/promotions/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deletePromotion = async (id) => {
  const response = await api.delete(`/promotions/${id}`);
  return response.data;
};
