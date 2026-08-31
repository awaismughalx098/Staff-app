import api from "../api/axios";

export const getAvailableBuses = async () => {
  const response = await api.get("/trips/available-buses");
  return response.data;
};

export const startTrip = async (tripData) => {
  const response = await api.post("/trips/start", tripData);
  return response.data;
};

export const updateTripLocation = async (tripId, locationData) => {
  const response = await api.patch(`/trips/${tripId}/location`, locationData);
  return response.data;
};

export const updateTripSeats = async (tripId, data) => {
  const response = await api.patch(`/trips/${tripId}/seats`, data);
  return response.data;
};

export const endTrip = async (tripId) => {
  const response = await api.patch(`/trips/${tripId}/end`);
  return response.data;
};

export const getLiveTrips = async () => {
  const response = await api.get("/trips/live");
  return response.data;
};

export const getDriverRunningTrip = async () => {
  const response = await api.get("/trips/my-running-trip");
  return response.data;
};
/** The seat layout the driver works from at a stop. */
export const getTripSeatMap = async (tripId) => {
  const response = await api.get(`/trips/${tripId}/seat-map`);
  return response.data;
};

/** Seat someone who got on at this stop. */
export const seatWalkOnPassenger = async (tripId, payload) => {
  const response = await api.post(`/trips/${tripId}/seat-map`, payload);
  return response.data;
};

export const removeWalkOnPassenger = async (tripId, bookingId) => {
  const response = await api.delete(`/trips/${tripId}/seat-map/${bookingId}`);
  return response.data;
};
