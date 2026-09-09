import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  getTripSeatMap,
  seatWalkOnPassenger,
} from "../../services/TripService";

/* Three states a seat can be in, and what each looks like. */
const seatClass = (seat, selected) => {
  if (selected) return "bg-accent text-white ring-2 ring-accent";
  if (seat.occupied && !seat.freeFromHere) {
    return seat.gender === "Female"
      ? "bg-pink-100 text-pink-700"
      : "bg-slate-200 text-slate-700";
  }
  /* Occupied but getting off here, or never taken — either way it can be
     sold from this stop onward. */
  return "bg-route-green-soft text-route-green";
};

/**
 * What the driver sees at every stop: the actual seats, who is on them and
 * how far they are going.
 *
 * The old prompt asked for a number, which the driver had to work out in
 * their head and which the app then had no way to reconcile with what it had
 * sold. This shows the seats themselves, so a walk-on goes onto a specific
 * one and appears in the app as taken straight away.
 */
function SeatMapSheet({ tripId, open, onClose, onChanged }) {
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ passengerName: "", phone: "", gender: "Male", toCity: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await getTripSeatMap(tripId);
      setMap(res?.data || null);
      setForm((f) => ({ ...f, toCity: f.toCity || res?.data?.destinations?.slice(-1)[0] || "" }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load the seat map");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      load();
    }
  }, [open, load]);

  if (!open) return null;

  const pick = (seat) => {
    if (seat.occupied && !seat.freeFromHere) {
      toast.message(`Seat ${seat.seatNumber}`, {
        description: `${seat.passengerName} · ${seat.fromCity} to ${seat.toCity}`,
      });
      return;
    }
    setSelected(seat.seatNumber === selected ? null : seat.seatNumber);
  };

  const save = async () => {
    if (!selected) return toast.error("Pick a seat first");
    if (!form.toCity) return toast.error("Where are they getting off?");

    setSaving(true);
    try {
      const res = await seatWalkOnPassenger(tripId, {
        seatNumber: selected,
        toCity: form.toCity,
        passengerName: form.passengerName,
        phone: form.phone,
        gender: form.gender,
      });
      toast.success(res.message || "Seated");
      setSelected(null);
      setForm((f) => ({ ...f, passengerName: "", phone: "" }));
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't seat that passenger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => !saving && onClose()}
      />

      <div className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-bg shadow-premium sm:max-w-lg sm:rounded-card">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-content">
              Seats on {map?.busNo || "this bus"}
            </p>
            {map && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-content-muted">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                At {map.currentCity} · {map.free} free · {map.occupied} taken
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-content"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : !map ? (
            <p className="py-8 text-center text-base text-content-muted">
              No seat map for this trip.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {map.rows.map((row, i) => (
                  <div key={i} className="flex justify-center gap-2">
                    {row.map((seat) => (
                      <button
                        key={seat.seatNumber}
                        type="button"
                        onClick={() => pick(seat)}
                        className={`h-11 w-11 shrink-0 cursor-pointer rounded-xl text-sm font-bold transition-transform active:scale-95 ${seatClass(
                          seat,
                          selected === seat.seatNumber
                        )}`}
                        title={
                          seat.occupied
                            ? `${seat.passengerName} · ${seat.fromCity} → ${seat.toCity}`
                            : "Free"
                        }
                      >
                        {seat.seatNumber}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-content-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-route-green-soft" /> Free from here
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-slate-200" /> On board
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-pink-100" /> On board (female)
                </span>
              </div>

              {/* Seating someone who got on here */}
              <div className="mt-5 border-t border-line pt-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-content">
                  <UserPlus className="h-4 w-4 text-accent" />
                  {selected
                    ? `Seat ${selected} — where are they going?`
                    : "Tap a green seat to give it to a passenger"}
                </p>

                {selected && (
                  <div className="mt-3 space-y-3">
                    <select
                      value={form.toCity}
                      onChange={(e) => setForm({ ...form, toCity: e.target.value })}
                      className="h-12 w-full rounded-input border border-line bg-white/60 px-3 text-base text-content outline-none"
                    >
                      {(map.destinations || []).map((city) => (
                        <option key={city} value={city}>
                          Getting off at {city}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={form.passengerName}
                        onChange={(e) =>
                          setForm({ ...form, passengerName: e.target.value })
                        }
                        placeholder="Name (optional)"
                        className="h-12 w-full rounded-input border border-line bg-white/60 px-3 text-base text-content outline-none"
                      />
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="h-12 w-full rounded-input border border-line bg-white/60 px-3 text-base text-content outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-lg font-bold text-white shadow-premium transition-transform active:scale-[0.98] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Give seat {selected} to this passenger
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SeatMapSheet;
