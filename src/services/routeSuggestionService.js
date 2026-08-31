import api from "../api/axios";

export const getRouteSuggestions = async (from, to) => {
  const response = await api.get("/route-suggestions/suggestions", {
    params: { from, to },
  });

  return response.data;
};
/** Plan the route on the real road: which cities it passes, and whether the
 *  stops already listed are in the order the bus would reach them. */
export const planBusRoute = async (payload) => {
  const response = await api.post("/route-suggestions/plan", payload);
  return response.data;
};
