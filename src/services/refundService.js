import api from "../api/axios";

/** What the passenger would get back if they cancelled right now. */
export const getRefundQuote = async (kind, id) => {
  const response = await api.get(`/refunds/${kind}/${id}/quote`);
  return response.data;
};

export const requestRefund = async (kind, id) => {
  const response = await api.post(`/refunds/${kind}/${id}`);
  return response.data;
};
