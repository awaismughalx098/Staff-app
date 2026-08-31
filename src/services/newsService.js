import api from "../api/axios";

export const getNews = async () => {
  const response = await api.get("/news");
  return response.data;
};

export const getActiveNews = async () => {
  const response = await api.get("/news/active");
  return response.data;
};

export const createNews = async (newsData) => {
  const response = await api.post("/news", newsData);
  return response.data;
};

export const updateNews = async (id, newsData) => {
  const response = await api.put(`/news/${id}`, newsData);
  return response.data;
};

export const deleteNews = async (id) => {
  const response = await api.delete(`/news/${id}`);
  return response.data;
};