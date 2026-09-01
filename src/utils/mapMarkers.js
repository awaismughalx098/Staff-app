import L from "leaflet";

/* Shared Leaflet markers + route styling for the passenger and driver maps,
   so both screens show the same vehicle and the same route language. */

export const ROUTE_COLORS = {
  passed: "#16A34A",
  /* The brand orange, like everything else the app calls "now". */
  current: "#F97316",
  upcoming: "#A8A29E",
};

export const ROUTE_LINE = {
  /* Solid line, two tones of the brand orange: the covered part is deep, the
     part still ahead is light — so the split reads at a glance. White casing
     lifts both off the basemap, pale or dark. */
  casing: "#FFFFFF",
  travelled: "#C2410C",
  ahead: "#FDBA74",
};

/* A clean circular badge — an orange disc with a white bus glyph, ringed by the
   pulse. Reads instantly as "the bus is here" against the pale basemap, where
   the old top-down coach looked like clutter. Kept upright on purpose (no
   heading rotation) so the glyph is always legible. */
const busGlyph = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="5" y="4" width="14" height="13" rx="3"/>
  <path d="M5 10h14"/>
  <path d="M8 17v2M16 17v2"/>
</svg>`;

export const createBusIcon = ({ live = true } = {}) =>
  L.divIcon({
    html: `
      <div class="lg-bus-marker">
        ${live ? '<span class="lg-bus-pulse"></span>' : ""}
        <span style="position:relative;z-index:2;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:#F97316;border:2.5px solid #ffffff;box-shadow:0 6px 14px rgba(15,23,42,.35);">
          ${busGlyph}
        </span>
      </div>`,
    className: "lg-bus-icon",
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -26],
  });

/* Numbered pin — used only for the origin, the destination, and whichever
   stop the bus is currently at. A long route (now legitimately 15-38 stops
   since every city on the road is suggested) would otherwise show 15-38
   numbered pins stacked on top of each other. */
export const createStopIcon = (status = "upcoming", order = null) => {
  const color = ROUTE_COLORS[status] || ROUTE_COLORS.upcoming;
  const isCurrent = status === "current";
  const size = isCurrent ? 34 : 26;

  return L.divIcon({
    html: `
      <div class="lg-stop-marker ${isCurrent ? "is-current" : ""}" style="--stop-color:${color}">
        ${isCurrent ? '<span class="lg-stop-pulse"></span>' : ""}
        <span class="lg-stop-dot">${order ?? ""}</span>
      </div>`,
    className: "lg-stop-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

/* Plain small dot — every intermediate stop that isn't the origin,
   destination, or the bus's current stop. No number, no permanent label;
   the city name only shows on hover/click (see the Tooltip/Popup usage in
   LiveTracking.jsx and driver/LiveTrip.jsx). */
export const createStopDotIcon = (status = "upcoming") => {
  const color = ROUTE_COLORS[status] || ROUTE_COLORS.upcoming;
  const size = 10;

  return L.divIcon({
    html: `<span class="lg-stop-dot-plain" style="--stop-color:${color}"></span>`,
    className: "lg-stop-dot-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

/* Compass bearing (0-360, 0 = north) from one point to the next. Used as a
   fallback for the bus icon's rotation whenever the device's own
   `coords.heading` is missing or unusable (very common at low speed, or on
   plenty of phones even in motion) — a stale/garbage heading is what makes
   the bus icon look like it's pointing the wrong way. */
export const computeBearingDeg = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/* Builds the drawable route, split into the part already driven and the part
   still ahead so they can be coloured differently. Overlaps by one point so
   there is no gap at the bus.
   Prefers the road polyline the backend fetched from the routing service; when
   that is missing (service was down at trip start) it joins the stops directly,
   which is straight but never blank. */
export const buildRoute = (trip, busPosition) => {
  const geometry = (trip?.routeGeometry || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
  );

  if (geometry.length > 1) {
    const raw = Number.isFinite(trip.busGeoIndex) ? trip.busGeoIndex : 0;
    const index = Math.min(Math.max(raw, 0), geometry.length - 1);

    return {
      all: geometry,
      travelled: geometry.slice(0, index + 1),
      ahead: geometry.slice(index),
      followsRoads: true,
    };
  }

  const points = (trip?.stops || [])
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => ({ latlng: [s.lat, s.lng], reached: s.reached }));

  const all = points.map((p) => p.latlng);

  if (points.length < 2) {
    return { all, travelled: [], ahead: [], followsRoads: false };
  }

  let lastReached = -1;
  points.forEach((p, i) => {
    if (p.reached) lastReached = i;
  });

  if (lastReached < 0) {
    return { all, travelled: [], ahead: all, followsRoads: false };
  }

  const travelled = all.slice(0, lastReached + 1);
  const ahead = all.slice(lastReached);

  /* The live position bridges the two halves */
  if (busPosition) {
    travelled.push(busPosition);
    ahead.unshift(busPosition);
  }

  return { travelled, ahead, all, followsRoads: false };
};
