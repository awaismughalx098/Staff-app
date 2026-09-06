import { peekBatch, ackBatch, queueLength, BATCH_SIZE } from "./QueueService.js";

/**
 * Getting queued fixes to the server, and knowing when to stop trying.
 *
 * The rule that matters: a point is removed only when the SERVER says it has
 * it. Not when the request is sent, not when it does not throw — when the
 * response names the id. A phone that deletes on send loses exactly the fixes
 * whose response was lost, which is the case this queue exists for.
 *
 * Platform-independent: it is handed a `send` function and never knows whether
 * the caller is axios in a browser tab or in a WebView over a background
 * service.
 */

/* Backoff between failed flushes. A driver in a tunnel is not helped by
   retrying eleven times a second, and the backend is not helped by a hundred
   phones doing it. Capped so a long outage still recovers promptly rather than
   backing off into next week. */
export const BACKOFF_MS = [1000, 3000, 8000, 20000, 45000];
export const MAX_BACKOFF_MS = BACKOFF_MS[BACKOFF_MS.length - 1];

export const backoffFor = (consecutiveFailures) => {
  if (consecutiveFailures <= 0) return 0;
  const i = Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[i];
};

/**
 * Which ids the server confirmed.
 *
 * The batch endpoint answers with `acknowledged` — every id it has now applied
 * or already had. Falling back to the ids that were sent is deliberate for a
 * 2xx with no body: the server took them, and keeping them queued forever would
 * be worse than trusting a successful status.
 */
const acknowledgedFrom = (response, sent) => {
  const acked = response?.data?.acknowledged ?? response?.acknowledged;
  if (Array.isArray(acked) && acked.length > 0) return acked;
  return sent.map((p) => p.id);
};

/**
 * Send everything queued, oldest first, in batches.
 *
 * Stops on the first failure rather than pressing on: a failure almost always
 * means the connection has gone again, and firing the remaining batches at it
 * only spends the driver's battery to fail eleven more times.
 *
 * @param {(points: object[]) => Promise<any>} send
 * @param {object} [options]
 * @param {number} [options.maxBatches] bound on one flush, so a very long queue
 *   cannot occupy the uplink the live position needs
 * @returns {Promise<{uploaded: number, remaining: number, batches: number, failed: boolean}>}
 */
export const flushQueue = async (send, { maxBatches = 6, size = BATCH_SIZE } = {}) => {
  let uploaded = 0;
  let batches = 0;

  while (batches < maxBatches) {
    const batch = peekBatch(size);
    if (batch.length === 0) break;

    let response;
    try {
      response = await send(batch);
    } catch {
      /* Kept, not dropped. The whole point of the queue. */
      return { uploaded, remaining: queueLength(), batches, failed: true };
    }

    const acked = acknowledgedFrom(response, batch);
    const remaining = ackBatch(acked);
    uploaded += batch.length;
    batches += 1;

    /* Nothing was removed even though the server answered — the ids did not
       match anything queued. Continuing would loop on the same batch forever. */
    if (remaining === queueLength() && acked.length === 0) break;
  }

  return { uploaded, remaining: queueLength(), batches, failed: false };
};

/**
 * A flush that will not run twice at once and backs off after failures.
 *
 * Two overlapping flushes send the same batch twice: harmless at the server,
 * which dedupes, but it doubles the driver's uplink at exactly the moment it is
 * already struggling.
 */
export const createSyncer = (send, { onOverflow } = {}) => {
  let inFlight = false;
  let failures = 0;
  let nextAttemptAt = 0;

  return {
    get failures() {
      return failures;
    },

    /** @param {boolean} [force] ignore the backoff window — used when the
     *  network has just come back, where waiting out a backoff earned by the
     *  outage itself makes no sense. */
    async flush(force = false) {
      if (inFlight) return { skipped: "in flight" };
      if (!force && Date.now() < nextAttemptAt) return { skipped: "backing off" };
      if (queueLength() === 0) return { skipped: "empty" };

      inFlight = true;
      try {
        const result = await flushQueue(send);

        if (result.failed) {
          failures += 1;
          nextAttemptAt = Date.now() + backoffFor(failures);
        } else {
          failures = 0;
          nextAttemptAt = 0;
        }

        if (result.remaining > 0 && onOverflow) onOverflow(result.remaining);
        return result;
      } finally {
        inFlight = false;
      }
    },

    reset() {
      failures = 0;
      nextAttemptAt = 0;
    },
  };
};
