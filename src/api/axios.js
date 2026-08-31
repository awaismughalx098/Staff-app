import axios from "axios";
import { API_BASE_URL } from "../config";
import { getAdminToken, logoutAdmin } from "../utils/adminAuth";
import { getFriendlyError } from "../utils/apiError";

const api = axios.create({
  baseURL: API_BASE_URL,
  /* Render free/standby dynos cold-start in tens of seconds. A generous ceiling
     lets a waking backend answer instead of failing the first request, while
     still capping a truly dead connection rather than hanging forever. */
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    /* Per tab, not per browser — see utils/adminAuth. */
    const adminToken = getAdminToken();
    const driverToken = localStorage.getItem("driverToken");
    const passengerToken = localStorage.getItem("passengerToken");

    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();

    const isPublicGet =
      method === "get" &&
      (url.startsWith("/companies") ||
        url.startsWith("/buses") ||
        url.startsWith("/news") ||
        url.startsWith("/cities") ||
        url.startsWith("/route-suggestions") ||
        url.startsWith("/trips/live") ||
        url.startsWith("/tours") ||
        url.startsWith("/airlines") ||
        url.startsWith("/consultants") ||
        url.startsWith("/bookings/seatmap") ||
        /* Browsing events is public; /stats and /bookings under the same
           prefix are admin reads and must keep the admin token. */
        (url.startsWith("/events") &&
          !url.includes("/stats") &&
          !url.includes("/bookings")) ||
        (url.startsWith("/hotels") &&
          !url.includes("/stats") &&
          !url.includes("/bookings")));

    const isPublicPost =
      url === "/drivers/login" ||
      url === "/passengers/login" ||
      url === "/passengers/register" ||
      url === "/passengers/google" ||
      url === "/login" ||
      url === "/signup";

    if (isPublicPost || isPublicGet) return config;

    /* Driver-authenticated endpoints. NOTE: /drivers CRUD is NOT here — creating,
       listing, updating and deleting drivers are ADMIN endpoints; only the trip
       lifecycle runs on the driver token. */
    const isDriverRoute =
      url.startsWith("/trips/available-buses") ||
      url.startsWith("/trips/my-running-trip") ||
      url.startsWith("/trips/start") ||
      url.includes("/location") ||
      url.includes("/seats") ||
      url.includes("/seat-map") ||
      url.includes("/end") ||
      url.startsWith("/bookings/verify");

    if (isDriverRoute) {
      if (driverToken) config.headers.Authorization = `Bearer ${driverToken}`;
      return config;
    }

    const isPassengerRoute =
      url.startsWith("/passengers") ||
      url.startsWith("/refunds") ||
      /* Notifications belong to the passenger who received them. /key is the
         VAPID public key and needs no token at all, but sending one does no
         harm and keeps this rule simple. */
      url.startsWith("/notifications") ||
      url.startsWith("/event-bookings") ||
      /* The /admin sub-paths are read by a console and keep the admin token;
         everything else under these prefixes is the traveller's own. */
      (url.startsWith("/hotel-bookings") && !url.startsWith("/hotel-bookings/admin")) ||
      (url.startsWith("/tour-bookings") && !url.startsWith("/tour-bookings/admin")) ||
      /* Writing a hotel review is a guest action; the rest of /hotels is
         admin-owned, so only the reviews sub-path switches tokens. */
      (url.startsWith("/hotels") && url.includes("/reviews")) ||
      (url.startsWith("/bookings") &&
        !url.startsWith("/bookings/admin") &&
        !url.startsWith("/bookings/verify"));

    if (isPassengerRoute) {
      if (passengerToken)
        config.headers.Authorization = `Bearer ${passengerToken}`;
      return config;
    }

    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* A rejected admin token is dead — deleted account, revoked role, or an
   expired week-old session. Dropping it here means the next render sees an
   anonymous tab and asks for a sign-in, instead of every panel failing in
   turn against a token that will never work again.
   Left to the caller: the sign-in request itself, where a 401 just means the
   password was wrong and there is no session to clear. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || "";
    /* Sign-in requests are exempt: a 401 there just means wrong credentials,
       with no live session to clear. */
    const isAuthEntry =
      url.endsWith("/login") ||
      url.endsWith("/register") ||
      url.endsWith("/google") ||
      url.endsWith("/signup");

    if (error?.response?.status === 401 && !isAuthEntry) {
      /* Clear precisely the token that was actually sent, so a passenger 401
         never signs out a driver session sharing the same browser. Fall back to
         the old behaviour (drop the admin token) when nothing matched. */
      const sent = (error?.config?.headers?.Authorization || "").replace(
        /^Bearer\s+/i,
        ""
      );

      if (sent && sent === getAdminToken()) logoutAdmin();
      else if (sent && sent === localStorage.getItem("driverToken"))
        localStorage.removeItem("driverToken");
      else if (sent && sent === localStorage.getItem("passengerToken"))
        localStorage.removeItem("passengerToken");
      else if (getAdminToken()) logoutAdmin();
    }

    /* A clean, human sentence any caller can surface without ever leaking
       AxiosError text. The original error is still rejected for callers that
       need the status or detail. */
    error.friendlyMessage = getFriendlyError(error);

    return Promise.reject(error);
  }
);

export default api;