import api from "../api/axios";

/* The error dashboard. Every one of these is Super Admin only on the server —
   they serve stacks and provider messages, which is exactly what the rest of
   the application works to keep away from users. */

export const getErrorSummary = async () => {
  const response = await api.get("/error-logs/summary");
  return response.data;
};

export const getErrorLogs = async (params = {}) => {
  const response = await api.get("/error-logs", { params });
  return response.data;
};

export const getErrorLog = async (id) => {
  const response = await api.get(`/error-logs/${id}`);
  return response.data;
};

export const updateErrorLog = async (id, payload) => {
  const response = await api.patch(`/error-logs/${id}`, payload);
  return response.data;
};
