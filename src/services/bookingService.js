import api from "../api/axios";

export const getSeatMap = async (busId, date, { from, to } = {}) => {
  const response = await api.get(`/bookings/seatmap/${busId}`, {
    params: { date, from, to },
  });
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await api.post("/bookings", bookingData);
  return response.data;
};

export const getMyBookings = async () => {
  const response = await api.get("/bookings/my");
  return response.data;
};

export const cancelBooking = async (id) => {
  const response = await api.patch(`/bookings/${id}/cancel`);
  return response.data;
};

export const getCompanyBookings = async (scope = "current", companyId) => {
  const response = await api.get("/bookings/admin", {
    params: { scope, company: companyId || undefined },
  });
  return response.data;
};

export const verifyTicket = async (bookingId) => {
  const response = await api.get(`/bookings/verify/${bookingId}`);
  return response.data;
};

/** An operator cancelling a seat on their own bus. */
export const adminCancelBooking = async (id) => {
  const response = await api.patch(`/bookings/admin/${id}/cancel`);
  return response.data;
};
