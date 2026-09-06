/**
 * GPS fixes waiting to reach the server.
 *
 * Grown out of utils/gpsQueue.js, which already did the important part: keep
 * the fixes captured in a dead zone instead of throwing away the only record
 * that the bus was ever there. What is added here is what a background service
 * needs and a foreground page did not:
 *
 *   A sequence number per trip, so order survives even when two fixes share a
 *   millisecond and JSON key order cannot be relied on.
 *
 *   A retention window. A bounded COUNT alone is not enough — a phone left off
 *   overnight would replay yesterday's journey onto today's passenger map.
 *
 *   Dedupe on the way IN, not only on the way out. The server already refuses
 *   an id it has applied, but a duplicate that never leaves the phone costs
 *   nothing to drop and keeps the queue honest about its own length.
 *
 * Storage is localStorage because it is the one store available to both the
 * browser build and the Capacitor WebView, synchronously, with no plugin. The
 * queue holds coordinates and a trip id — never a token, never a passenger.
 */

const KEY = "driverGpsQueue";
const SEQ_KEY = "driverGpsSeq";

/* Roughly twenty minutes at one fix every two seconds. Past that the oldest
   points describe a journey the passenger stopped caring about long ago. */
export const MAX_POINTS = 600;

/* The server refuses more than 100 in one call (replayQueuedLocations), so this
   stays comfortably under it. */
export const BATCH_SIZE = 50;

/* Older than this and a fix is history, not a position. Replaying it would move
   the bus backwards to where it was two hours ago. */
export const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    /* Unparseable, or storage blocked in a private window. An empty queue is
       the right answer either way — losing the queue must never stop the trip. */
    return [];
  }
};

const write = (points) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(points));
    return true;
  } catch {
    /* Quota exceeded, or storage blocked. Live tracking continues; only the
       offline buffer is unavailable. */
    return false;
  }
};

/**
 * The next sequence number for a trip.
 *
 * Persisted separately from the queue so it keeps counting across a restart and
 * across a flush that empties the queue — a counter derived from queue length
 * would restart at zero and produce colliding ids.
 */
const nextSeq = (tripId) => {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const state = raw ? JSON.parse(raw) : {};

    /* Scoped per trip and reset when the trip changes, so one journey's numbers
       never continue into the next. */
    const seq = state.tripId === tripId ? (state.seq || 0) + 1 : 1;

    localStorage.setItem(SEQ_KEY, JSON.stringify({ tripId, seq }));
    return seq;
  } catch {
    return 0;
  }
};

/** Drop anything past the retention window. */
const withinRetention = (points, now = Date.now()) =>
  points.filter((p) => {
    const at = new Date(p.capturedAt || 0).getTime();
    return Number.isFinite(at) && now - at <= MAX_AGE_MS;
  });

/**
 * Add a fix to the queue.
 *
 * @param {object} fix {tripId, latitude, longitude, speed, accuracy, heading, capturedAt?}
 * @returns {{length: number, dropped: number, stored: boolean}}
 */
export const enqueue = (fix) => {
  if (!fix?.tripId || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) {
    return { length: read().length, dropped: 0, stored: false };
  }

  const now = Date.now();
  const capturedAt = fix.capturedAt || new Date(now).toISOString();
  const seq = nextSeq(fix.tripId);

  const point = {
    /* Identifies this fix for the rest of its life. The server stores applied
       ids and refuses a repeat, so a batch that is uploaded, whose response is
       lost, and which the phone retries cannot be applied twice. */
    id: `${fix.tripId}-${seq}-${now.toString(36)}`,
    seq,
    tripId: fix.tripId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: Number.isFinite(fix.speed) ? fix.speed : null,
    accuracy: Number.isFinite(fix.accuracy) ? fix.accuracy : null,
    heading: Number.isFinite(fix.heading) ? fix.heading : null,
    /* The device's clock at capture. The server keeps its own received-at time;
       this one says when the bus was actually there, which is the whole point
       of replaying a queued fix. */
    capturedAt,
  };

  const existing = withinRetention(read(), now);
  const before = existing.length;

  /* A fix identical in position and second to the one already at the tail is
     the same reading arriving twice — from a retry, or from two providers
     reporting the same moment. */
  const tail = existing[existing.length - 1];
  const duplicate =
    tail &&
    tail.tripId === point.tripId &&
    tail.latitude === point.latitude &&
    tail.longitude === point.longitude &&
    Math.abs(new Date(tail.capturedAt).getTime() - now) < 1000;

  if (duplicate) {
    write(existing);
    return { length: existing.length, dropped: before - existing.length, stored: true };
  }

  existing.push(point);

  /* Oldest first out — a recent position is worth more than an old one. */
  const trimmed =
    existing.length > MAX_POINTS ? existing.slice(-MAX_POINTS) : existing;

  const stored = write(trimmed);

  return {
    length: trimmed.length,
    /* What retention and the size cap removed, so the caller can report an
       overflow once rather than per point. */
    dropped: before - existing.length + (existing.length - trimmed.length),
    stored,
  };
};

/** The next batch to send, oldest first — the order the bus drove them. */
export const peekBatch = (size = BATCH_SIZE) => {
  const fresh = withinRetention(read());
  /* Chronological, with the sequence number breaking ties two fixes in the
     same millisecond would otherwise leave to insertion order. */
  const ordered = [...fresh].sort((a, b) => {
    const at = new Date(a.capturedAt || 0) - new Date(b.capturedAt || 0);
    return at !== 0 ? at : (a.seq || 0) - (b.seq || 0);
  });
  return ordered.slice(0, size);
};

/**
 * Drop points the server has confirmed.
 *
 * By id rather than by count: while a batch was in flight the tracker may have
 * queued more, and removing "the first fifty" would throw away fixes that were
 * never sent.
 */
export const ackBatch = (ids) => {
  const done = new Set(ids || []);
  const remaining = read().filter((point) => !done.has(point.id));
  write(remaining);
  return remaining.length;
};

export const queueLength = () => withinRetention(read()).length;

/** Cleared when a trip ends — its queued fixes have nowhere to go. */
export const clearQueue = () => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(SEQ_KEY);
  } catch {
    /* Nothing to do; the queue is per-device and per-trip anyway. */
  }
};

/** Everything queued for a trip other than this one, which is stale by
 *  definition once a new trip has started. */
export const dropOtherTrips = (tripId) => {
  const mine = read().filter((p) => p.tripId === tripId);
  write(mine);
  return mine.length;
};
