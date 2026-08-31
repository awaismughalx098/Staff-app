import api from "../api/axios";

export const getCities = async () => {
  const response = await api.get("/cities");
  return response.data;
};