import api from "../api/axios";

/* Totals per section — Super Admin only. */
export const getRevenueOverview = async () => {
  const response = await api.get("/revenue/overview");
  return response.data;
};

/** @param {"bus"|"tour"|"religious"} kind */
export const getCompanyRevenueList = async (kind = "bus") => {
  const response = await api.get("/revenue/companies", { params: { kind } });
  return response.data;
};

/* One company plus a row per bus. */
export const getCompanyRevenue = async (id) => {
  const response = await api.get(`/revenue/companies/${id}`);
  return response.data;
};

/* One bus plus the tickets behind its takings. */
export const getBusRevenue = async (id) => {
  const response = await api.get(`/revenue/buses/${id}`);
  return response.data;
};

export const getEventRevenueList = async () => {
  const response = await api.get("/revenue/events");
  return response.data;
};
