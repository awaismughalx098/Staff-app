/**
 * What to tell a driver about location permission.
 *
 * Wording only — no platform calls. The providers report a machine state and
 * this turns it into a sentence and an action, so the driver never sees an
 * Android error code or a GeolocationPositionError, and so the same wording is
 * used wherever the state is shown.
 *
 * The distinction that matters is DENIED versus PERMANENTLY DENIED. The first
 * is fixed by asking again; the second cannot be, and asking again just fails
 * silently — the driver has to be sent to Settings, and telling them to "allow
 * location" when the prompt will never appear again is how an app strands
 * someone mid-shift.
 */

export const PERMISSION_STATE = {
  GRANTED: "granted",
  FOREGROUND_ONLY: "foreground_only",
  DENIED: "denied",
  PERMANENTLY_DENIED: "permanently_denied",
  UNAVAILABLE: "unavailable",
};

/**
 * @param {object} status from provider.ensurePermission()
 * @param {boolean} backgroundCapable whether this platform can track in the background at all
 */
export const describePermission = (status, backgroundCapable) => {
  if (status?.deferred) {
    return {
      state: PERMISSION_STATE.GRANTED,
      title: null,
      message: null,
      action: null,
      blocking: false,
    };
  }

  if (status?.permanentlyDenied) {
    return {
      state: PERMISSION_STATE.PERMANENTLY_DENIED,
      title: "Location is turned off for this app",
      message:
        "Please enable location permission from your phone settings, then start the trip again.",
      action: "settings",
      blocking: true,
    };
  }

  if (!status?.granted) {
    return {
      state: PERMISSION_STATE.DENIED,
      title: "Location permission needed",
      message: "Location permission is required for live trip tracking.",
      action: "retry",
      blocking: true,
    };
  }

  /* Granted, but only while the app is open. Not an error — the trip tracks
     perfectly well like this — so it must not block. It is a warning the driver
     needs before they put the phone in their pocket. */
  if (backgroundCapable && !status?.background) {
    return {
      state: PERMISSION_STATE.FOREGROUND_ONLY,
      title: "Tracking stops when the app is closed",
      message:
        "Choose “Allow all the time” in location settings so the trip keeps updating when your screen is off.",
      action: "settings",
      blocking: false,
    };
  }

  return {
    state: PERMISSION_STATE.GRANTED,
    title: null,
    message: null,
    action: null,
    blocking: false,
  };
};

/**
 * The warning a driver needs when the platform itself cannot track in the
 * background — a browser, today.
 *
 * Said plainly and once. The app used to acquire a screen wake lock and say
 * nothing, so a driver who locked their phone believed the bus was still being
 * tracked when it was not. That silence was the real defect; this is the fix
 * for it that does not require Android.
 */
export const backgroundLimitationNotice = ({ backgroundCapable, native }) => {
  if (backgroundCapable) return null;

  return native
    ? {
        title: "Background tracking unavailable",
        message:
          "Live tracking will pause if you close the app. Keep it open for the whole trip.",
      }
    : {
        title: "Keep this screen open",
        message:
          "On the web app, tracking pauses when the screen locks. Install the Let’s Goo Transit Staff app for tracking that continues with the screen off.",
      };
};

/** Battery optimisation, said once and never nagged. */
export const BATTERY_NOTICE = {
  title: "Allow background activity",
  message:
    "For reliable live tracking during your trip, allow Let’s Goo Transit to run without battery restrictions.",
};

/**
 * Can the driver log out right now?
 *
 * A background service must never keep reporting for a driver who has signed
 * out — the trip would be updated by nobody, and the service would be anonymous
 * in exactly the way the security rules forbid. Ending or handing over the trip
 * first is the business rule.
 */
export const logoutGuard = (hasActiveTrip) =>
  hasActiveTrip
    ? {
        allowed: false,
        message: "Please end or hand over the active trip before logging out.",
      }
    : { allowed: true, message: null };
