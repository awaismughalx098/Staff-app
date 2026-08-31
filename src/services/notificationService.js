import api from "../api/axios";

export const getPushKey = async () => {
  const response = await api.get("/notifications/key");
  return response.data;
};

export const subscribeToPush = async (subscription) => {
  const response = await api.post("/notifications/subscribe", subscription);
  return response.data;
};

export const unsubscribeFromPush = async (endpoint) => {
  const response = await api.post("/notifications/unsubscribe", { endpoint });
  return response.data;
};

export const getMyNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const markNotificationsRead = async (id) => {
  const response = await api.patch(
    id ? `/notifications/${id}/read` : "/notifications/read"
  );
  return response.data;
};
