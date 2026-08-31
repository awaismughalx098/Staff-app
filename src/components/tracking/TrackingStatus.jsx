import { useEffect, useState } from "react";

/**
 * How fresh a bus's position actually is — and saying so honestly.
 *
 * The badge used to be the word "LIVE", hard-coded, shown whether the last
 * GPS fix was five seconds or five minutes old. That is the one thing a
 * tracking screen must never do: a stale dot labelled live is worse than an
 * empty map, because the passenger trusts it and misses the bus.
 *
 * This derives the label from the server's own `lastLocationUpdated`
 * timestamp and re-reads it every second, so "Live" means the data is live
 * and "Offline" means it stopped — neither is ever faked.
 *
 * Thresholds mirror backend/config/tracking.js FRESHNESS, so the two ends of
 * the system agree on what "slow" means.
 */
const LIVE_S = 15; // 0–15s   → Live
const RECENT_S = 60; // 15–60s  → Recently updated
const SLOW_S = 180; // 1–3 min → Connection slow
// 3 min+ → Offline

/** "just now" · "8 sec ago" · "2 min ago" · "1 hr ago" */
const timeAgo = (seconds) => {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${Math.floor(seconds)} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} hr ago`;
};

/**
 * The current status of one trip's location, recomputed every second.
 *
 * @param {string|Date|null} lastUpdated the trip's lastLocationUpdated
 * @param {number} locationUpdates how many fixes the trip has ever had
 */
export const useFreshness = (lastUpdated, locationUpdates = 0) => {
  /* A ticking clock, not the trip: the age changes with wall-time even when
     no new fix arrives, which is exactly the case this exists to show. */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* No fix has ever arrived — the driver hasn't switched GPS on yet. Not
     stale, just not started; say so rather than "offline". */
  if (!lastUpdated || !locationUpdates) {
    return {
      state: "waiting",
      label: "Waiting for GPS",
      ago: "",
      tone: "muted",
      pulse: false,
    };
  }

  const seconds = Math.max(0, (now - new Date(lastUpdated).getTime()) / 1000);
  const ago = `Updated ${timeAgo(seconds)}`;

  if (seconds <= LIVE_S) {
    return { state: "live", label: "Live", ago, tone: "success", pulse: true };
  }
  if (seconds <= RECENT_S) {
    /* Under a minute is still trustworthy — green — but not claimed as live
       to the second; the "Updated Xs ago" line carries the exact age. */
    return { state: "recent", label: "Recent", ago, tone: "success", pulse: false };
  }
  if (seconds <= SLOW_S) {
    return { state: "slow", label: "Connection slow", ago, tone: "warning", pulse: false };
  }
  return { state: "offline", label: "Offline", ago, tone: "danger", pulse: false };
};

/* Each tone's colours, from the app's own tokens — no hard-coded hex. */
const TONES = {
  success: "bg-route-green-soft text-route-green",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  muted: "bg-black/5 text-content-muted",
};

/**
 * The badge. Shows the real state and, underneath, how long ago the last
 * position actually arrived — so "Live" is always backed by a timestamp the
 * passenger can see.
 */
function TrackingStatus({ lastUpdated, locationUpdates, className = "", showAgo = true }) {
  const { label, ago, tone, pulse } = useFreshness(lastUpdated, locationUpdates);

  return (
    <span className={`flex flex-col items-end gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONES[tone]}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-soft-pulse" : ""}`}
        />
        {label}
      </span>

      {showAgo && ago && (
        <span className="text-[9.5px] text-content-muted">{ago}</span>
      )}
    </span>
  );
}

export default TrackingStatus;
