import { io } from "socket.io-client";
import { API_ORIGIN } from "./config";

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

export default socket;