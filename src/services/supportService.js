import api from "../api/axios";

/** The support queue. Full admins only — the server enforces that; this is
 *  just the caller. */
export const getSupportReports = async (params = {}) => {
  const response = await api.get("/support/admin/reports", { params });
  return response.data;
};

/** Write back to the passenger. Sending a reply is what marks it Replied. */
export const replyToSupportReport = async (id, body) => {
  const response = await api.post(`/support/admin/reports/${id}/reply`, { body });
  return response.data;
};

/** Move it through the queue: Open, InReview or Resolved. */
export const setSupportReportStatus = async (id, status) => {
  const response = await api.patch(`/support/admin/reports/${id}/status`, { status });
  return response.data;
};
