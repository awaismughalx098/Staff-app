import { io } from "socket.io-client";
import { API_ORIGIN } from "./config";

/* This app signs in as either a driver or an admin, and admin sessions are
   per-tab in sessionStorage while a driver's is in localStorage. Whichever is
   present is the identity; the server decides what it may do. */
const currentToken = () => {
  try {
    return (
      localStorage.getItem("driverToken") ||
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken") ||
      ""
    );
  } catch {
    return "";
  }
};

/* Allow polling as well as websocket. Forcing websocket-only means that if the
   upgrade handshake fails — common on mobile networks and behind some proxies —
   the socket never connects at all and live updates silently stop, leaving a
   frozen bus that only moves on a manual refresh. With polling in the list,
   Socket.IO connects over HTTP first and upgrades to websocket when it can, so
   real-time keeps working even where websockets are blocked. */
const socket = io(API_ORIGIN, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

/* The server refuses an unauthenticated handshake, so the token has to be on
   it — and it is read fresh on every attempt rather than captured once at
   import. A socket that reconnects after a sign-in, or after a token refresh,
   must present the token that is valid NOW; a captured one would keep
   presenting the expired string and reconnect forever without ever succeeding.
   socket.io calls this function again on each reconnection attempt. */
socket.auth = (cb) => cb({ token: currentToken() });

export default socket;
