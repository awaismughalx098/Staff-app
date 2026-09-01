import api from "../api/axios";

/* Rooms live under the hotel that sells them, so every call is scoped by a
   hotel id — the server checks that id against the one the admin's token is
   pinned to. */

/** Rooms of a hotel. Pass checkIn/checkOut to get availability for a stay. */
export const getRooms = async (hotelId, params = {}) => {
  const response = await api.get(`/hotels/${hotelId}/rooms`, { params });
  return response.data;
};

/* FormData, because a room carries photos and videos. */
export const createRoom = async (hotelId, formData) => {
  const response = await api.post(`/hotels/${hotelId}/rooms`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateRoom = async (hotelId, roomId, formData) => {
  const response = await api.put(`/hotels/${hotelId}/rooms/${roomId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteRoom = async (hotelId, roomId) => {
  const response = await api.delete(`/hotels/${hotelId}/rooms/${roomId}`);
  return response.data;
};
