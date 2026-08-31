export const savePassenger = (passengerData) => {
  localStorage.setItem("passengerToken", passengerData.token);
  localStorage.setItem("passengerInfo", JSON.stringify(passengerData));
};

export const getPassengerToken = () => {
  return localStorage.getItem("passengerToken");
};

export const getPassengerInfo = () => {
  const passengerInfo = localStorage.getItem("passengerInfo");
  return passengerInfo ? JSON.parse(passengerInfo) : null;
};

export const logoutPassenger = () => {
  localStorage.removeItem("passengerToken");
  localStorage.removeItem("passengerInfo");
};

export const updatePassengerInfo = (updates) => {
  const merged = { ...(getPassengerInfo() || {}), ...updates };
  localStorage.setItem("passengerInfo", JSON.stringify(merged));
  return merged;
};