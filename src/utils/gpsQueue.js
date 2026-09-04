/**
 * GPS fixes the driver's phone captured while it could not reach the server.
 *
 * Without this the fixes from a dead-zone are simply lost: the trip survives
 * and reconnects, but the minutes of road it covered while offline are gone.
 * That is the one place in the system where real data was being discarded.
 *
 * Deliberately small and local:
 *
 *   Only what a fix needs — no trip document, no route, no bus. A phone in a
 *   tunnel for twenty minutes should hold kilobytes, not megabytes.
 *
 *   Bounded. An old fix is worse than no fix, so the queue keeps the most
 *   recent MAX_POINTS and drops the rest rather than growing until the browser
 *   refuses to store anything at all.
 *
 *   Nothing sensitive. Coordinates and a trip id, never a token or a passenger.
 */

const KEY = "driverGpsQueue";

/* Roughly twenty minutes at one fix every two seconds. Past that, the oldest
   points describe a journey the passenger stopped caring about long ago. */
const MAX_POINTS = 600;

/* Sent in batches so a long queue does not become six hundred requests the
   moment a driver comes back into signal. */
export const BATCH_SIZE = 50;

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    /* Unparseable, or storage unavailable in a private window. An empty queue
       is the right answer either way — losing the queue must never stop the
       trip. */
    return [];
  }
};

const write = (points) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(points));
    return true;
  } catch {
    /* Quota exceeded, or storage blocked. Tracking continues live; only the
       offline buffer is unavailable. */
    return false;
  }
};

/**
 * Add a fix to the queue.
 *
 * @param {object} fix  { tripId, latitude, longitude, speed, accuracy, heading }
 * @returns {number} the queue length after adding
 */
export const enqueue = (fix) => {
  if (!fix?.tripId || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) {
    return read().length;
  }

  const points = read();

  points.push({
    tripId: fix.tripId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: Number.isFinite(fix.speed) ? fix.speed : null,
    accuracy: Number.isFinite(fix.accuracy) ? fix.accuracy : null,
    heading: Number.isFinite(fix.heading) ? fix.heading : null,
    /* The device's own clock at capture. The server keeps its own received-at
       time; this one says when the bus was actually there, which is the whole
       point of replaying a queued fix. */
    capturedAt: new Date().toISOString(),
    /* Identifies this fix for the rest of its life. The server rejects an id it
       has already stored, so a batch that is sent twice — uploaded, then the
       response lost, then retried — cannot be applied twice. */
    id: `${fix.tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });

  /* Oldest first out. */
  const trimmed = points.length > MAX_POINTS ? points.slice(-MAX_POINTS) : points;
  write(trimmed);

  return trimmed.length;
};

/** The next batch to send, oldest first — the order the bus drove them. */
export const peekBatch = (size = BATCH_SIZE) => read().slice(0, size);

/**
 * Drop points the server has accepted.
 *
 * By id rather than by count: while a batch was in flight the tracker may have
 * queued more, and removing "the first fifty" would throw away fixes that were
 * never sent.
 */
export const ackBatch = (ids) => {
  const done = new Set(ids);
  const remaining = read().filter((point) => !done.has(point.id));
  write(remaining);
  return remaining.length;
};

export const queueLength = () => read().length;

/** Cleared when a trip ends — its queued fixes have nowhere to go. */
export const clearQueue = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Nothing to do; the queue is per-device and per-trip anyway. */
  }
};

/**
 * Send everything queued, in batches, stopping on the first failure.
 *
 * Stopping rather than pressing on is deliberate: a failure usually means the
 * connection is gone again, and firing the remaining batches at it only spends
 * the driver's battery to fail eleven more times.
 *
 * @param {(points: object[]) => Promise<any>} send
 * @returns {Promise<{uploaded: number, remaining: number}>}
 */
export const flushQueue = async (send) => {
  let uploaded = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = peekBatch();
    if (batch.length === 0) break;

    try {
      // eslint-disable-next-line no-await-in-loop
      await send(batch);
    } catch {
      break;
    }

    uploaded += batch.length;
    // eslint-disable-next-line no-await-in-loop
    ackBatch(batch.map((p) => p.id));
  }

  return { uploaded, remaining: queueLength() };
};
