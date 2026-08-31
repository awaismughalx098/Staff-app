import api from "../api/axios";

export const updatePassengerProfile = async (formData) => {
  const response = await api.put("/passengers/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
