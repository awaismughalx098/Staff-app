/**
 * GPS from the browser.
 *
 * This is what the driver app has always used, kept as-is in behaviour and
 * moved behind the provider contract. It works while the page is visible and
 * stops when Android freezes the tab — which is precisely why the Android
 * provider exists.
 *
 * `backgroundCapable: false` is not a limitation to be worked around. It is the
 * honest answer, and the UI reads it to tell the driver the truth about what
 * happens when the screen goes off.
 */

let watchId = null;

/* The browser reports metres per second; the whole app talks km/h. */
const toKmh = (metresPerSecond) =>
  Number.isFinite(metresPerSecond) && metresPerSecond >= 0
    ? Math.round(metresPerSecond * 3.6)
    : null;

const normalise = (position) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  speed: toKmh(position.coords.speed),
  heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
  accuracy: Number.isFinite(position.coords.accuracy)
    ? Math.round(position.coords.accuracy)
    : null,
  capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
});

/* Mapped to something a driver can act on. The raw GeolocationPositionError
   codes and messages never reach the UI. */
const describe = (error) => {
  switch (error?.code) {
    case 1:
      return { kind: "permission", message: "Location permission is required for live trip tracking." };
    case 2:
      return { kind: "unavailable", message: "Location is unavailable right now. Trying again." };
    case 3:
      return { kind: "timeout", message: "Still searching for a GPS signal." };
    default:
      return { kind: "unknown", message: "Location tracking is temporarily unavailable." };
  }
};

export const webProvider = {
  id: "web",

  /* A browser page cannot track with the screen off. Saying so here is what
     lets the rest of the app stop pretending otherwise. */
  backgroundCapable: false,

  async ensurePermission() {
    if (!("geolocation" in navigator)) {
      return { granted: false, permanentlyDenied: true, background: false };
    }

    /* The Permissions API is advisory here — Safari and some Android WebViews
       do not implement it for geolocation. When it is missing the answer comes
       from the first watchPosition callback instead, which is why a failure to
       query is reported as "granted" rather than denied: refusing up front
       would block a device that would in fact have allowed it. */
    try {
      const status = await navigator.permissions?.query({ name: "geolocation" });
      if (status?.state === "denied") {
        return { granted: false, permanentlyDenied: true, background: false };
      }
    } catch {
      /* Not supported. Fall through and let the watch decide. */
    }

    return { granted: true, permanentlyDenied: false, background: false };
  },

  async start(onFix, onError) {
    if (!("geolocation" in navigator)) {
      onError?.({ kind: "unsupported", message: "This device cannot report its location." });
      return;
    }

    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    watchId = navigator.geolocation.watchPosition(
      (position) => onFix(normalise(position)),
      (error) => onError?.(describe(error)),
      {
        enableHighAccuracy: true,
        /* Generous: a first fix indoors can take a while, and a timeout here
           surfaces as an error the driver can do nothing about. */
        timeout: 30000,
        maximumAge: 0,
      }
    );
  },

  async stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  },

  /* The browser has no equivalent knob — watchPosition takes no distance
     filter — so the profile is applied by the send strategy alone. */
  async setProfile() {},
};

export default webProvider;
