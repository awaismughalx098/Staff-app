import api from "../api/axios";

/** Every refund in the business, newest first. Super Admin only — the server
 *  enforces that; this is just the caller. */
export const getAllRefunds = async (params = {}) => {
  const response = await api.get("/refunds/admin", { params });
  return response.data;
};

/** Record that the money has actually gone back to the customer. */
export const markRefundPaid = async (kind, id, reference) => {
  const response = await api.patch(`/refunds/admin/${kind}/${id}/paid`, { reference });
  return response.data;
};
