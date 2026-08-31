/* Turns any request failure — Axios error, network drop, backend 5xx, timeout —
 * into one clean sentence safe to show a user. Nothing here ever surfaces
 * "AxiosError", a status code, or a raw backend/Mongo message.
 *
 * Usage in a page's catch block:
 *   catch (err) { toast.error(getFriendlyError(err)); }
 *
 * The axios instance also attaches the result as `error.friendlyMessage`, so
 * callers can use either.
 */

const BY_STATUS = {
  400: "Some details look incorrect. Please review and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  408: "The request timed out. Please try again.",
  409: "That action conflicts with something that already exists.",
  422: "Some details look incorrect. Please review and try again.",
  429: "You're doing that a bit too fast — please wait a moment and try again.",
  500: "Unable to load this information right now. Please try again.",
  502: "The server is waking up. Please try again in a moment.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "The server is waking up. Please try again in a moment.",
};

/* A server message is only worth showing when it reads like guidance for a
   human, not a leaked internal error. */
const looksTechnical = (text) =>
  /error|exception|stack|axios|mongo|cast|econn|timeout|undefined|null|failed with status|validation failed/i.test(
    text
  );

export const getFriendlyError = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  if (!error) return fallback;

  /* Timed out (axios aborts the request itself). */
  if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
    return "The server is taking too long to respond. Please try again.";
  }

  /* No response at all — backend offline, DNS, CORS, or the device is offline. */
  if (!error.response) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "You appear to be offline. Please check your connection and try again.";
    }
    return "Can't reach the server right now. Please check your connection and try again.";
  }

  const { status, data } = error.response;
  const serverMessage = typeof data?.message === "string" ? data.message.trim() : "";

  /* A deliberate 4xx message from our own API (e.g. "Seat already booked") is
     the most useful thing to show — but only if it isn't a raw technical dump. */
  if (status >= 400 && status < 500 && serverMessage && !looksTechnical(serverMessage)) {
    return serverMessage;
  }

  if (BY_STATUS[status]) return BY_STATUS[status];

  return fallback;
};

export default getFriendlyError;
