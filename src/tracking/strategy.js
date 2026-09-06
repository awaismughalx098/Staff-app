/**
 * When a GPS fix is worth sending, and when it is worth believing.
 *
 * Pure functions with no platform, no network and no React, so the same rules
 * apply whether the fix came from a browser's watchPosition or from an Android
 * foreground service — and so they can be tested without either.
 *
 * The old driver loop posted every two seconds unconditionally, including to a
 * bus parked at a terminal for forty minutes. That is 1,200 writes describing a
 * vehicle that has not moved, on a phone the driver still needs at the end of
 * the shift.
 */

/* Never faster than this, whatever the GPS reports. Matches the old fixed
   interval, so a moving bus behaves exactly as it does today. */
export const MIN_INTERVAL_MS = 2000;

/* A heartbeat for a bus that is not moving.
 *
 * Deliberately below the passenger app's "Live" threshold of 15 s
 * (config/tracking.js FRESHNESS.live). A parked bus is still a live bus, and
 * letting the heartbeat drift past 15 s would show every waiting coach as
 * stale — the display would be lying in the other direction. */
export const MAX_INTERVAL_MS = 12000;

/* Far enough that GPS scatter alone does not trigger a send, close enough that
   a bus pulling out of a stand registers immediately. At 40 km/h this is
   covered in under two seconds, so at road speed the floor above is what
   actually governs and behaviour is unchanged. */
export const MIN_DISTANCE_M = 20;

/* Below this the bus counts as standing rather than crawling — the same
   threshold the passenger status caption uses. */
export const STATIONARY_SPEED_KMH = 3;

/* A fix vaguer than this describes a circle bigger than a bus station. Kept
   generous on purpose: ordinary phone GPS drifts to 30–50 m in a city and
   rejecting that would freeze a bus that is genuinely moving. */
export const MAX_ACCURACY_M = 150;

const EARTH_RADIUS_M = 6371000;

/** Metres between two coordinates. */
export const distanceMetres = (aLat, aLng, bLat, bLng) => {
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;

  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/**
 * Is this fix worth keeping at all?
 *
 * Only the impossible is rejected. The server runs its own validation — the
 * jump and implied-speed checks in tripController — and this is not a second
 * opinion on the same question: it exists so a phone that has lost its fix does
 * not fill the offline queue with garbage while out of signal, where the server
 * cannot reject anything.
 *
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export const acceptFix = (fix, { maxAccuracy = MAX_ACCURACY_M } = {}) => {
  if (!fix) return { ok: false, reason: "no fix" };

  const { latitude, longitude, accuracy } = fix;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: "not a coordinate" };
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { ok: false, reason: "off the earth" };
  }
  /* Exactly (0, 0) is the Gulf of Guinea — where a failed GPS read lands, not
     where a bus is. Same rule the server applies. */
  if (latitude === 0 && longitude === 0) {
    return { ok: false, reason: "null island" };
  }
  /* Only when the device actually reported one. No accuracy is not bad
     accuracy, and treating it as such would drop every fix from a device that
     does not report it. */
  if (maxAccuracy > 0 && Number.isFinite(accuracy) && accuracy > maxAccuracy) {
    return { ok: false, reason: `accuracy ${Math.round(accuracy)} m` };
  }

  return { ok: true };
};

/**
 * Should this fix be sent now, given what was last sent?
 *
 * Distance OR time, never distance alone: a bus waiting at a stand would
 * otherwise stop reporting entirely and the passenger would be told the signal
 * was lost when the bus is simply standing still.
 *
 * @param {object} fix       the candidate, {latitude, longitude, speed}
 * @param {object|null} last the last SENT fix, {latitude, longitude, at}
 * @param {number} now       ms epoch
 * @returns {{send: boolean, reason: string, movedM: number|null}}
 */
export const shouldSend = (fix, last, now = Date.now(), options = {}) => {
  const {
    minIntervalMs = MIN_INTERVAL_MS,
    maxIntervalMs = MAX_INTERVAL_MS,
    minDistanceM = MIN_DISTANCE_M,
  } = options;

  /* Nothing sent yet this trip: the first fix is always worth having, because
     until it lands the passenger has no bus on the map at all. */
  if (!last) return { send: true, reason: "first fix", movedM: null };

  const elapsed = now - (last.at ?? 0);
  const movedM = distanceMetres(last.latitude, last.longitude, fix.latitude, fix.longitude);

  /* The floor. Protects the backend and the battery from a device that reports
     ten times a second. */
  if (elapsed < minIntervalMs) {
    return { send: false, reason: "too soon", movedM };
  }

  if (movedM !== null && movedM >= minDistanceM) {
    return { send: true, reason: "moved", movedM };
  }

  if (elapsed >= maxIntervalMs) {
    return { send: true, reason: "heartbeat", movedM };
  }

  return { send: false, reason: "stationary", movedM };
};

/* A standing bus still needs to notice the moment it pulls away, so the filter
   relaxes but never switches off. */
const STATIONARY_FILTER_M = 10;

/**
 * How hard the GPS should be working.
 *
 * A stationary bus does not need the radio at full rate; a moving one does.
 * Returned as a plain description so each platform provider can map it onto
 * whatever its own API calls these things.
 */
export const trackingProfile = (fix) => {
  const speed = Number.isFinite(fix?.speed) ? fix.speed : 0;

  return speed < STATIONARY_SPEED_KMH
    ? { moving: false, distanceFilterM: STATIONARY_FILTER_M, intervalMs: MAX_INTERVAL_MS }
    : { moving: true, distanceFilterM: MIN_DISTANCE_M, intervalMs: MIN_INTERVAL_MS };
};
