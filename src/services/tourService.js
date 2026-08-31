import api from "../api/axios";

export const getTours = async (params = {}) => {
  const response = await api.get("/tours", { params });
  return response.data;
};

export const getTourById = async (id) => {
  const response = await api.get(`/tours/${id}`);
  return response.data;
};

export const createTour = async (formData) => {
  const response = await api.post("/tours", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateTour = async (id, formData) => {
  const response = await api.put(`/tours/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteTour = async (id) => {
  const response = await api.delete(`/tours/${id}`);
  return response.data;
};

/* ── Traveller bookings ───────────────────────────────────────────────── */

export const bookTour = async (payload) => {
  const response = await api.post("/tour-bookings", payload);
  return response.data;
};

export const getMyTourBookings = async () => {
  const response = await api.get("/tour-bookings/my");
  return response.data;
};

export const cancelTourBooking = async (id) => {
  const response = await api.patch(`/tour-bookings/${id}/cancel`);
  return response.data;
};

/* ── Operator console ─────────────────────────────────────────────────── */

export const getTourCompanyBookings = async (params = {}) => {
  const response = await api.get("/tour-bookings/admin", { params });
  return response.data;
};

export const getTourCompanyStats = async () => {
  const response = await api.get("/tour-bookings/admin/stats");
  return response.data;
};

export const updateTourBookingStatus = async (bookingId, payload) => {
  const response = await api.patch(`/tour-bookings/admin/${bookingId}`, payload);
  return response.data;
};
