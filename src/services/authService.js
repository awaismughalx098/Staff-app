import api from "../api/axios";

/**
 * Passenger authentication calls.
 * All requests go through the existing Axios instance (src/api/axios.js)
 * which already handles token attachment per role.
 */

export const loginPassenger = async ({ identifier, password }) => {
  const response = await api.post("/passengers/login", { identifier, password });
  return response.data;
};

export const registerPassenger = async ({ name, phone, email, password, city }) => {
  const response = await api.post("/passengers/register", {
    name,
    phone,
    email,
    password,
    city,
  });
  return response.data;
};

/**
 * Exchanges a verified Firebase Google account for our own passenger JWT.
 * Backend finds or creates the passenger by email, then issues the same
 * token shape used by email/password login.
 */
export const googleAuthPassenger = async (payload) => {
  const response = await api.post("/passengers/google", payload);
  return response.data;
};