import { X } from "lucide-react";
import { buildSeatLayout } from "../../utils/seatLayout";
import { BUS_TYPES, DEFAULT_BUS_TYPE } from "../../utils/busTypes";

function LegendDot({ className, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-content-muted">
      <span className={`h-3 w-3 rounded-[3px] ${className}`} />
      {label}
    </span>
  );
}

/* Minimal steering wheel — marks the driver's position so the layout reads as a
   real bus cabin with a front and a back, not an abstract grid. */
function SteeringWheel() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 4.6V9.6M5 16l4.3-2.6M19 16l-4.3-2.6" />
    </svg>
  );
}

/**
 * Multi-select, colour-coded seat/bed picker inside a bus cabin — row shape
 * driven by busType.
 * `seats` is [{seatNumber, booked, gender}]; `selectedSeats` is [{seatNumber, gender}].
 */
function SeatMap({
  busType,
  totalSeats,
  seats = [],
  selectedSeats = [],
  onToggle,
  onGenderChange,
  fare = 0,
  unit,
}) {
  const shape = BUS_TYPES[busType] || BUS_TYPES[DEFAULT_BUS_TYPE];
  const rows = buildSeatLayout(busType, totalSeats);
  const seatState = new Map(seats.map((s) => [s.seatNumber, s]));
  const selectedMap = new Map(selectedSeats.map((s) => [s.seatNumber, s.gender]));
  const label = unit || shape.unit;

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LegendDot className="border border-line bg-surface" label="Available" />
        <LegendDot className="bg-seat-male-soft" label="Male" />
        <LegendDot className="bg-seat-female-soft" label="Female" />
        <LegendDot className="bg-accent" label="Selected" />
      </div>

      {/* Bus cabin — rounded nose at the top (windshield), driver up front */}
      <div className="mx-auto max-w-[320px]">
        <div className="rounded-t-[2rem] rounded-b-xl border-2 border-line bg-surface-2 p-3">
          {/* Driver row */}
          <div className="mb-3 flex items-center justify-between border-b border-dashed border-line pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-content-muted">
              <SteeringWheel />
            </span>
            <span className="data-mono text-[10px] uppercase tracking-wider text-content-muted">
              Front
            </span>
          </div>

          {/* Seat rows */}
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => {
              // Pad every row to the full row width so partial rows (a short
              // leftover row before the back bench) still line up column-for-column.
              const padded =
                row.length < shape.perRow
                  ? [...row, ...Array(shape.perRow - row.length).fill(null)]
                  : row;

              return (
                <div key={i} className="flex items-center justify-center gap-2">
                  {padded.map((seatNumber, seatIdx) => {
                    if (seatNumber === null) {
                      return (
                        <span key={`empty-${i}-${seatIdx}`} className="flex items-center">
                          <span className="h-12 w-10" aria-hidden="true" />
                          {shape.aisleAfter > 0 && seatIdx === shape.aisleAfter - 1 && (
                            <span className="w-5" aria-hidden="true" />
                          )}
                        </span>
                      );
                    }

                    const state = seatState.get(seatNumber);
                    const booked = Boolean(state?.booked);
                    const isSelected = selectedMap.has(seatNumber);

                    const classes = isSelected
                      ? "border-accent bg-accent text-white"
                      : booked
                      ? state.gender === "Female"
                        ? "cursor-not-allowed border-transparent bg-seat-female-soft text-seat-female"
                        : "cursor-not-allowed border-transparent bg-seat-male-soft text-seat-male"
                      : "cursor-pointer border-line bg-surface text-content-muted hover:border-accent-line hover:text-content";

                    return (
                      <span key={seatNumber} className="flex items-center">
                        {/* Seat: rounded-top back, flatter base — reads as a seat */}
                        <button
                          type="button"
                          disabled={booked}
                          onClick={() => onToggle(seatNumber)}
                          aria-label={`${label} ${seatNumber}${booked ? " (booked)" : ""}`}
                          className={`flex h-12 w-10 flex-col items-center justify-center gap-0.5 rounded-t-lg rounded-b-[4px] border-2 transition-colors duration-200 ${classes}`}
                        >
                          <span className="data-mono text-[11px] font-bold leading-none">
                            {seatNumber}
                          </span>
                          {!booked && fare > 0 && (
                            <span className="data-mono text-[7px] font-medium leading-none opacity-80">
                              {fare}
                            </span>
                          )}
                        </button>
                        {shape.aisleAfter > 0 && seatIdx === shape.aisleAfter - 1 && (
                          <span className="w-5" aria-hidden="true" />
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] uppercase tracking-wider text-content-faint">
          Rear
        </p>
      </div>

      {/* Selected seats + per-seat gender */}
      {selectedSeats.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[11px] font-semibold text-content-muted">
            Selected {label.toLowerCase()}s · tap M/F to set gender
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map((s) => (
              <div
                key={s.seatNumber}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1"
              >
                <span className="data-mono text-[11px] font-bold text-content">
                  {s.seatNumber}
                </span>
                <div className="flex gap-1">
                  {["Male", "Female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onGenderChange(s.seatNumber, g)}
                      className={`cursor-pointer rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors duration-200 ${
                        s.gender === g
                          ? g === "Female"
                            ? "bg-seat-female text-white"
                            : "bg-seat-male text-white"
                          : "bg-bg text-content-muted"
                      }`}
                    >
                      {g[0]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(s.seatNumber)}
                  aria-label={`Remove seat ${s.seatNumber}`}
                  className="cursor-pointer text-content-muted hover:text-danger"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeatMap;
