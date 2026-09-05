import api from "../api/axios";

/* The rentals module. Which company's data comes back is decided by the server
   from the caller's token — these never send a company id to widen a scope,
   because doing so would not work and would suggest that it might. */

export const getRentalCatalog = async () => {
  const response = await api.get("/rentals/catalog");
  return response.data;
};

/* ── Super Admin ─────────────────────────────────────────────────────────── */

export const getRentalCompanies = async (params = {}) => {
  const response = await api.get("/rentals/admin/companies", { params });
  return response.data;
};

export const createRentalCompany = async (formData) => {
  const response = await api.post("/rentals/admin/companies", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const suspendRentalCompany = async (id) => {
  const response = await api.delete(`/rentals/admin/companies/${id}`);
  return response.data;
};

/* ── Shared: a company reads its own, a full admin reads any ─────────────── */

export const getRentalCompany = async (id) => {
  const response = await api.get(`/rentals/admin/companies/${id}`);
  return response.data;
};

export const updateRentalCompany = async (id, formData) => {
  const response = await api.put(`/rentals/admin/companies/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/* ── Fleet ───────────────────────────────────────────────────────────────── */

export const getRentalVehicles = async (params = {}) => {
  const response = await api.get("/rentals/admin/vehicles", { params });
  return response.data;
};

export const createRentalVehicle = async (formData) => {
  const response = await api.post("/rentals/admin/vehicles", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateRentalVehicle = async (id, formData) => {
  const response = await api.put(`/rentals/admin/vehicles/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteRentalVehicle = async (id) => {
  const response = await api.delete(`/rentals/admin/vehicles/${id}`);
  return response.data;
};

/* ── Bookings ────────────────────────────────────────────────────────────── */

export const getRentalBookings = async (params = {}) => {
  const response = await api.get("/rentals/admin/bookings", { params });
  return response.data;
};

/** action: "quote" | "confirm" | "decline" | "complete" */
export const respondToRentalBooking = async (id, payload) => {
  const response = await api.patch(`/rentals/admin/bookings/${id}`, payload);
  return response.data;
};

export const getRentalRevenue = async (params = {}) => {
  const response = await api.get("/rentals/admin/revenue", { params });
  return response.data;
};
