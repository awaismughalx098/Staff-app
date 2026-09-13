import api from "../api/axios";

/** The Lost & Found queue. Full admins only — the server enforces that. */
export const getLostFoundReports = async (params = {}) => {
  const response = await api.get("/lost-found/admin", { params });
  return response.data;
};

/** Move a report on ({ status }) and/or set the note the passenger sees. */
export const updateLostFoundReport = async (id, payload) => {
  const response = await api.patch(`/lost-found/admin/${id}`, payload);
  return response.data;
};
