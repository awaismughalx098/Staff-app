import { resolveProvider, isNativePlatform, nativePlatformName } from "./providers/index.js";
import { enqueue, clearQueue, dropOtherTrips, queueLength } from "./QueueService.js";
import { createSyncer } from "./SyncService.js";
import { acceptFix, shouldSend, trackingProfile } from "./strategy.js";

/**
 * One trip's tracking, from the driver pressing start to the trip ending.
 *
 * Deliberately not a React hook and not a component. A foreground service
 * outlives the screen that started it: tying its lifetime to a component's
 * would stop tracking the moment the driver navigated away, which is the class
 * of bug this whole exercise is about. The UI subscribes to it; it does not own
 * it.
 *
 * It is a singleton because the thing it represents is a singleton. A phone has
 * one GPS and a driver has one active trip, and two trackers would mean two
 * foreground services and every fix sent twice.
 *
 * What it does NOT do is decide whether the driver may update this trip. That
 * is the server's job and it already does it — protectDriver on the route, then
 * an ownership and status check in the controller. Nothing here is a substitute
 * for that; a client cannot authorise itself.
 */

const state = {
  provider: null,
  tripId: null,
  running: false,

  /* The last fix actually SENT, which is what the send strategy compares
     against — not the last one received. */
  lastSent: null,
  lastFix: null,
  lastError: null,
  moving: null,

  syncer: null,
  listeners: new Set(),

  /* Aggregated rather than reported per fix. A bus in a long tunnel produces
     hundreds of failures describing one event, and one incident per GPS point
     would bury the monitor and the on-call phone. */
  failures: { sync: 0, gps: 0, since: null, reported: false },
};

const notify = () => {
  const snapshot = getState();
  for (const listener of state.listeners) {
    try {
      listener(snapshot);
    } catch {
      /* A broken subscriber must not stop the bus being tracked. */
    }
  }
};

export const subscribe = (listener) => {
  state.listeners.add(listener);
  listener(getState());
  return () => state.listeners.delete(listener);
};

export const getState = () => ({
  running: state.running,
  tripId: state.tripId,
  lastFix: state.lastFix,
  lastSentAt: state.lastSent?.at ?? null,
  lastError: state.lastError,
  queued: queueLength(),
  moving: state.moving,
  provider: state.provider?.id ?? null,

  /* What the UI needs to tell the driver the truth about screen-off tracking,
     rather than guessing from the user agent. */
  backgroundCapable: Boolean(state.provider?.backgroundCapable),
  native: isNativePlatform(),
  platform: nativePlatformName(),

  syncFailures: state.failures.sync,
});

/* ── the fix pipeline ─────────────────────────────────────────────────────
   provider -> validate -> strategy -> queue -> sync
   Every fix goes through the queue, including a live one. It is the queue that
   makes "sent" mean "the server confirmed it", and a live send that fails then
   needs no special case — the point is already stored and the next flush picks
   it up. */

const handleFix = async (fix) => {
  const verdict = acceptFix(fix);

  if (!verdict.ok) {
    /* A rejected fix is not an error the driver can act on — GPS scatter and a
       moment of poor accuracy are normal. Counted, not surfaced. */
    state.failures.gps += 1;
    return;
  }

  state.lastFix = fix;
  state.lastError = null;

  const now = Date.now();
  const decision = shouldSend(fix, state.lastSent, now);

  /* Retune the radio when the bus actually changes state, not per fix:
     restarting the watcher per fix would cancel and recreate the Android
     foreground service continuously. */
  const profile = trackingProfile(fix);
  if (state.moving !== profile.moving) {
    state.moving = profile.moving;
    try {
      await state.provider?.setProfile?.(profile, handleFix, handleError);
    } catch {
      /* Retuning is an optimisation; failing to retune must not stop tracking. */
    }
  }

  if (!decision.send) {
    notify();
    return;
  }

  enqueue({ ...fix, tripId: state.tripId });

  /* Recorded as sent at the point it enters the queue rather than on server
     acknowledgement. The strategy is asking "have I already captured a fix for
     this position and moment", which the queue answers; waiting for the server
     would make a phone in a dead zone queue a fix every two seconds. */
  state.lastSent = { latitude: fix.latitude, longitude: fix.longitude, at: now };

  notify();
  await state.syncer?.flush();
  notify();
};

const handleError = (error) => {
  state.failures.gps += 1;
  state.failures.since = state.failures.since || Date.now();
  state.lastError = error?.message || "Location tracking is temporarily unavailable.";
  notify();
};

/* ── network ─────────────────────────────────────────────────────────────── */

const onOnline = () => {
  /* Forced past the backoff: the backoff was earned by an outage that has just
     ended, and waiting it out would leave the queue sitting on a working
     connection. */
  state.syncer?.flush(true).then(notify);
};

const onOffline = () => {
  notify();
};

/**
 * The app came back to the foreground.
 *
 * On a browser this is where a frozen tab resumes and the gap has to be closed.
 * On Android with a foreground service nothing was missed, but flushing is
 * still right — the radio may have been up while the uplink was not.
 */
const onVisible = () => {
  if (!state.running) return;
  if (document.visibilityState === "visible") {
    state.syncer?.flush(true).then(notify);
  }
};

/* ── lifecycle ───────────────────────────────────────────────────────────── */

/**
 * Begin tracking a trip.
 *
 * @param {object} args
 * @param {string} args.tripId       an ACTIVE trip the server has confirmed
 * @param {Function} args.sendBatch  (points) => Promise, the batch endpoint
 * @param {Function} [args.onIncident] aggregated failure reporter
 */
export const startTracking = async ({ tripId, sendBatch, onIncident }) => {
  if (!tripId || typeof sendBatch !== "function") {
    throw new Error("startTracking needs a trip and a way to send");
  }

  /* Idempotent. Called again for the trip already running — a remount, a
     restored session, a second screen — it must not start a second service. */
  if (state.running && state.tripId === tripId) return getState();

  /* A different trip: stop cleanly first, and drop the previous trip's queued
     fixes so one journey's positions never replay onto another. */
  if (state.running) await stopTracking({ keepQueue: false });

  state.tripId = tripId;
  dropOtherTrips(tripId);

  state.provider = await resolveProvider();
  state.syncer = createSyncer(sendBatch, {
    onOverflow: (remaining) => {
      if (remaining > 0 && onIncident && !state.failures.reported) {
        state.failures.reported = true;
        onIncident({
          kind: "queue_backlog",
          message: `${remaining} positions waiting to sync`,
        });
      }
    },
  });

  const permission = await state.provider.ensurePermission();
  if (!permission.granted && !permission.deferred) {
    state.lastError = permission.permanentlyDenied
      ? "Please enable location permission from your phone settings."
      : "Location permission is required for live trip tracking.";
    notify();
    return getState();
  }

  await state.provider.start(handleFix, handleError, { distanceFilterM: 20 });

  state.running = true;
  state.failures = { sync: 0, gps: 0, since: null, reported: false };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);

  notify();
  return getState();
};

/**
 * Stop tracking.
 *
 * Called when the trip ends, when the driver stops sharing, and on logout. The
 * foreground service and its notification must go with it — a service still
 * running after a trip has ended is a phone reporting a bus that is not on the
 * road, and a notification the driver cannot dismiss.
 *
 * @param {object} [options]
 * @param {boolean} [options.keepQueue] leave queued fixes for one last flush
 */
export const stopTracking = async ({ keepQueue = false } = {}) => {
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  document.removeEventListener("visibilitychange", onVisible);

  try {
    await state.provider?.stop();
  } catch {
    /* Nothing useful to do — the service is going away with the process. */
  }

  if (!keepQueue) clearQueue();

  state.running = false;
  state.tripId = null;
  state.lastSent = null;
  state.moving = null;
  state.provider = null;
  state.syncer = null;

  notify();
};

/** Send whatever is queued right now — used before ending a trip. */
export const flushNow = async () => {
  const result = await state.syncer?.flush(true);
  notify();
  return result;
};

export const isTracking = () => state.running;
export const trackedTripId = () => state.tripId;
