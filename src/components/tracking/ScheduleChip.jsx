/**
 * How a trip is running against its timetable.
 *
 * Displays only. Every number and every word comes from the server — the same
 * `services/scheduleAdherence.js` that the driver's screen reads — so the two
 * can never show different verdicts about the same bus. Nothing here decides
 * whether a bus is late; that would be a second opinion, which is the problem
 * a single authority exists to avoid.
 *
 * Two distinct measurements, never merged:
 *   departure — how it left, settled once and then historical
 *   eta       — how it is projected to arrive, moving with the traffic
 */

const TONE = {
  early: "bg-route-green-soft text-route-green",
  on_time: "bg-route-green-soft text-route-green",
  late: "bg-danger/15 text-danger",
  not_started: "bg-accent-soft text-accent",
  unknown: "bg-white/50 text-content-muted",
};

/**
 * @param {string} status  early | on_time | late | not_started | unknown
 * @param {string} label   the server's wording, rendered verbatim
 * @param {string} [prefix] e.g. "ETA" — names which measurement this is
 */
function ScheduleChip({ status, label, prefix, className = "" }) {
  if (!label) return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        TONE[status] || TONE.unknown
      } ${className}`}
    >
      {prefix ? `${prefix} · ${label}` : label}
    </span>
  );
}

export default ScheduleChip;
