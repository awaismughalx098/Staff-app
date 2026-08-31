import api from "../api/axios";

export const getHotels = async (params = {}) => {
  const response = await api.get("/hotels", { params });
  return response.data;
};

export const getHotelById = async (id) => {
  const response = await api.get(`/hotels/${id}`);
  return response.data;
};

export const createHotel = async (formData) => {
  const response = await api.post("/hotels", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateHotel = async (id, formData) => {
  const response = await api.put(`/hotels/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteHotel = async (id) => {
  const response = await api.delete(`/hotels/${id}`);
  return response.data;
};

/* Driving directions to the hotel. Origin is optional — without it the API
   still returns the destination pin so the map has something to show. */
export const getHotelRoute = async (id, origin) => {
  const response = await api.get(`/hotels/${id}/route`, {
    params: origin ? { lat: origin.lat, lng: origin.lng } : {},
  });
  return response.data;
};

export const getHotelReviews = async (id) => {
  const response = await api.get(`/hotels/${id}/reviews`);
  return response.data;
};

export const saveHotelReview = async (id, payload) => {
  const response = await api.post(`/hotels/${id}/reviews`, payload);
  return response.data;
};

export const deleteHotelReview = async (id, reviewId) => {
  const response = await api.delete(`/hotels/${id}/reviews/${reviewId}`);
  return response.data;
};

/* ── Guest stays ──────────────────────────────────────────────────────── */

export const bookHotelStay = async (payload) => {
  const response = await api.post("/hotel-bookings", payload);
  return response.data;
};

export const getMyHotelStays = async () => {
  const response = await api.get("/hotel-bookings/my");
  return response.data;
};

export const cancelHotelStay = async (id) => {
  const response = await api.patch(`/hotel-bookings/${id}/cancel`);
  return response.data;
};

/* ── Hotel Admin ──────────────────────────────────────────────────────── */

export const getHotelStats = async (id) => {
  const response = await api.get(`/hotels/${id}/stats`);
  return response.data;
};

export const getHotelBookings = async (id, params = {}) => {
  const response = await api.get(`/hotels/${id}/bookings`, { params });
  return response.data;
};

export const updateHotelBookingStatus = async (id, bookingId, payload) => {
  const response = await api.patch(`/hotels/${id}/bookings/${bookingId}`, payload);
  return response.data;
};

/** Every hotel's stays, for the owner's bookings view. */
export const getAllHotelBookings = async (params = {}) => {
  const response = await api.get("/hotel-bookings/admin", { params });
  return response.data;
};
