import api from "../api/axios";

/* ── Events ───────────────────────────────────────────────────────────── */

export const getEvents = async (params = {}) => {
  const response = await api.get("/events", { params });
  return response.data;
};

export const getEventById = async (id) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const createEvent = async (formData) => {
  const response = await api.post("/events", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateEvent = async (id, formData) => {
  const response = await api.put(`/events/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};

/* ── Event Admin ──────────────────────────────────────────────────────── */

export const getEventStats = async (id) => {
  const response = await api.get(`/events/${id}/stats`);
  return response.data;
};

export const getEventBookings = async (id, params = {}) => {
  const response = await api.get(`/events/${id}/bookings`, { params });
  return response.data;
};

export const scanEventTicket = async (code) => {
  const response = await api.post(`/events/scan/${encodeURIComponent(code)}`);
  return response.data;
};

/* ── Passenger tickets ────────────────────────────────────────────────── */

export const bookEventTickets = async (payload) => {
  const response = await api.post("/event-bookings", payload);
  return response.data;
};

export const getMyEventTickets = async () => {
  const response = await api.get("/event-bookings/my");
  return response.data;
};

export const cancelEventTicket = async (id) => {
  const response = await api.patch(`/event-bookings/${id}/cancel`);
  return response.data;
};

/** Every event's tickets, for the owner's bookings view. */
export const getAllEventBookings = async (params = {}) => {
  const response = await api.get("/events/admin/bookings", { params });
  return response.data;
};

/** An organiser cancelling a ticket to their own event. */
export const adminCancelEventBooking = async (id) => {
  const response = await api.patch(`/events/bookings/${id}/cancel`);
  return response.data;
};
