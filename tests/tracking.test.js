import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

/* localStorage, which QueueService needs and node has not. Behaves like the
   real one including throwing nothing on a missing key. */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const { acceptFix, shouldSend, distanceMetres, trackingProfile } =
  await import("../src/tracking/strategy.js");
const Q = await import("../src/tracking/QueueService.js");
const { flushQueue, backoffFor, createSyncer } =
  await import("../src/tracking/SyncService.js");

beforeEach(() => {
  globalThis.localStorage.clear();
});

/* ── strategy: what to believe ────────────────────────────────────────────── */

test("a normal city fix is accepted, drift and all", () => {
  assert.equal(acceptFix({ latitude: 30.81, longitude: 73.45, accuracy: 42 }).ok, true,
    "40 m accuracy is ordinary phone GPS, not a fault");
});

test("null island is rejected", () => {
  assert.equal(acceptFix({ latitude: 0, longitude: 0, accuracy: 5 }).ok, false);
});

test("impossible coordinates are rejected", () => {
  assert.equal(acceptFix({ latitude: 91, longitude: 73 }).ok, false);
  assert.equal(acceptFix({ latitude: 30, longitude: 181 }).ok, false);
  assert.equal(acceptFix({ latitude: "30.8", longitude: 73 }).ok, false);
});

test("a fix with no accuracy reported is kept", () => {
  assert.equal(acceptFix({ latitude: 30.81, longitude: 73.45 }).ok, true,
    "absent accuracy is not bad accuracy; rejecting it would drop every fix from some devices");
});

test("a stadium-sized accuracy circle is rejected", () => {
  assert.equal(acceptFix({ latitude: 30.81, longitude: 73.45, accuracy: 400 }).ok, false);
});

/* ── strategy: when to send ───────────────────────────────────────────────── */

const at = (lat, lng) => ({ latitude: lat, longitude: lng });

test("the first fix of a trip always sends", () => {
  assert.equal(shouldSend(at(30.81, 73.45), null).send, true);
});

test("a parked bus sends a heartbeat, not silence", () => {
  const last = { latitude: 30.81, longitude: 73.45, at: 0 };

  assert.equal(shouldSend(at(30.81, 73.45), last, 5000).send, false, "5 s parked: nothing to say");
  const beat = shouldSend(at(30.81, 73.45), last, 12000);
  assert.equal(beat.send, true, "12 s parked: prove the bus is still live");
  assert.equal(beat.reason, "heartbeat");
});

test("the heartbeat lands before the passenger app calls it stale", async () => {
  /* config/tracking.js FRESHNESS.live is 15 s. A heartbeat slower than that
     would show every waiting coach as offline. */
  const { MAX_INTERVAL_MS } = await import("../src/tracking/strategy.js");
  assert.ok(MAX_INTERVAL_MS < 15000, `heartbeat ${MAX_INTERVAL_MS}ms must beat the 15s live threshold`);
});

test("a moving bus sends on distance, well before the heartbeat", () => {
  const last = { latitude: 30.81, longitude: 73.45, at: 0 };
  /* ~55 m north. */
  const moved = shouldSend(at(30.8105, 73.45), last, 3000);
  assert.equal(moved.send, true);
  assert.equal(moved.reason, "moved");
  assert.ok(moved.movedM > 20);
});

test("nothing is sent faster than the floor, however fast the GPS reports", () => {
  const last = { latitude: 30.81, longitude: 73.45, at: 0 };
  const tooSoon = shouldSend(at(31.5, 74.3), last, 500);
  assert.equal(tooSoon.send, false, "even a big jump waits for the 2 s floor");
  assert.equal(tooSoon.reason, "too soon");
});

test("GPS scatter while parked does not trigger a send", () => {
  const last = { latitude: 30.81, longitude: 73.45, at: 0 };
  /* ~5 m of drift. */
  assert.equal(shouldSend(at(30.810045, 73.45), last, 4000).send, false);
});

test("distance is real geography, not degrees", () => {
  const d = distanceMetres(30.81, 73.45, 30.8105, 73.45);
  assert.ok(d > 50 && d < 60, `expected ~55 m, got ${d}`);
});

test("a standing bus relaxes the radio, a moving one does not", () => {
  assert.equal(trackingProfile({ speed: 0 }).moving, false);
  assert.equal(trackingProfile({ speed: 45 }).moving, true);
  assert.ok(
    trackingProfile({ speed: 0 }).distanceFilterM < trackingProfile({ speed: 45 }).distanceFilterM
  );
});

/* ── queue ────────────────────────────────────────────────────────────────── */

const fix = (over = {}) => ({
  tripId: "trip1", latitude: 30.81, longitude: 73.45, speed: 40, accuracy: 8, ...over,
});

test("a queued point carries everything the batch endpoint needs", () => {
  Q.enqueue(fix());
  const [p] = Q.peekBatch();

  for (const field of ["id", "seq", "tripId", "latitude", "longitude", "speed", "accuracy", "capturedAt"]) {
    assert.ok(p[field] !== undefined, `missing ${field}`);
  }
  assert.equal(p.seq, 1);
});

test("sequence numbers increase and survive an emptied queue", () => {
  Q.enqueue(fix()); Q.enqueue(fix({ latitude: 30.82 }));
  assert.deepEqual(Q.peekBatch().map((p) => p.seq), [1, 2]);

  Q.ackBatch(Q.peekBatch().map((p) => p.id));
  assert.equal(Q.queueLength(), 0);

  Q.enqueue(fix({ latitude: 30.83 }));
  assert.equal(Q.peekBatch()[0].seq, 3, "a length-derived counter would restart at 1 and collide");
});

test("points come back oldest first", () => {
  const t0 = Date.now();
  Q.enqueue(fix({ latitude: 30.81, capturedAt: new Date(t0 + 2000).toISOString() }));
  Q.enqueue(fix({ latitude: 30.82, capturedAt: new Date(t0).toISOString() }));
  Q.enqueue(fix({ latitude: 30.83, capturedAt: new Date(t0 + 1000).toISOString() }));

  const order = Q.peekBatch().map((p) => p.latitude);
  assert.deepEqual(order, [30.82, 30.83, 30.81], "the order the bus drove them");
});

test("the identical fix arriving twice is stored once", () => {
  Q.enqueue(fix());
  Q.enqueue(fix());
  assert.equal(Q.queueLength(), 1);
});

test("the queue is bounded, and drops the oldest", () => {
  for (let i = 0; i < Q.MAX_POINTS + 40; i += 1) {
    Q.enqueue(fix({ latitude: 30.81 + i * 0.001 }));
  }
  assert.equal(Q.queueLength(), Q.MAX_POINTS);
  assert.ok(Q.peekBatch()[0].seq > 1, "the earliest points were the ones dropped");
});

test("a fix older than the retention window is not replayed", () => {
  const old = new Date(Date.now() - Q.MAX_AGE_MS - 60000).toISOString();
  Q.enqueue(fix({ capturedAt: old }));
  Q.enqueue(fix({ latitude: 30.9 }));

  assert.equal(Q.queueLength(), 1, "yesterday's position must not move today's bus");
});

test("ack removes by id, never by count", () => {
  Q.enqueue(fix({ latitude: 30.81 }));
  Q.enqueue(fix({ latitude: 30.82 }));
  const [first] = Q.peekBatch();

  /* A fix arriving while the batch was in flight. */
  Q.enqueue(fix({ latitude: 30.83 }));
  Q.ackBatch([first.id]);

  const left = Q.peekBatch().map((p) => p.latitude);
  assert.deepEqual(left, [30.82, 30.83], "removing 'the first N' would lose an unsent fix");
});

test("another trip's fixes are dropped when a new trip starts", () => {
  Q.enqueue(fix({ tripId: "old" }));
  Q.enqueue(fix({ tripId: "old", latitude: 30.82 }));
  Q.dropOtherTrips("new");
  assert.equal(Q.queueLength(), 0, "one journey's positions must never replay onto another");
});

/* ── sync ─────────────────────────────────────────────────────────────────── */

test("points survive a failed send", async () => {
  Q.enqueue(fix()); Q.enqueue(fix({ latitude: 30.82 }));

  const result = await flushQueue(async () => { throw new Error("offline"); });

  assert.equal(result.failed, true);
  assert.equal(result.uploaded, 0);
  assert.equal(Q.queueLength(), 2, "a failed send must never lose the fix");
});

test("points are removed only for ids the server confirms", async () => {
  Q.enqueue(fix({ latitude: 30.81 }));
  Q.enqueue(fix({ latitude: 30.82 }));
  const sent = Q.peekBatch();

  /* The server applied one and said nothing about the other. */
  await flushQueue(async () => ({ data: { acknowledged: [sent[0].id] } }));

  const left = Q.peekBatch();
  assert.equal(left.length, 1);
  assert.equal(left[0].id, sent[1].id, "an unconfirmed point stays queued");
});

test("a 2xx with no body is trusted for what was sent", async () => {
  Q.enqueue(fix());
  await flushQueue(async () => ({ data: { applied: 1 } }));
  assert.equal(Q.queueLength(), 0, "otherwise the queue would never drain");
});

test("batches respect the server's 100-point limit", () => {
  assert.ok(Q.BATCH_SIZE <= 100, "replayQueuedLocations rejects more than 100");
});

test("backoff grows and then stops growing", () => {
  assert.equal(backoffFor(0), 0);
  assert.ok(backoffFor(1) < backoffFor(3));
  assert.equal(backoffFor(99), backoffFor(5), "capped, so a long outage still recovers");
});

test("a second flush does not run while the first is in flight", async () => {
  Q.enqueue(fix());
  let calls = 0;
  let release;
  const gate = new Promise((r) => { release = r; });

  const syncer = createSyncer(async () => { calls += 1; await gate; return { data: {} }; });

  const first = syncer.flush();
  const second = await syncer.flush();
  release();
  await first;

  assert.equal(second.skipped, "in flight", "overlapping flushes double the uplink when it is already struggling");
  assert.equal(calls, 1);
});

test("after a failure the syncer waits, unless forced", async () => {
  Q.enqueue(fix());
  const syncer = createSyncer(async () => { throw new Error("down"); });

  await syncer.flush();
  assert.equal(syncer.failures, 1);

  assert.equal((await syncer.flush()).skipped, "backing off");
  assert.notEqual((await syncer.flush(true)).skipped, "backing off",
    "network-back must not wait out a backoff the outage itself earned");
});
