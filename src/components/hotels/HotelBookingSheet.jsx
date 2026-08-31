import { useState } from "react";
import { BedDouble, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { GlassModal, GlassInput, GlassButton } from "../glass";
import {
  inputClass,
  labelClass,
} from "../admin/adminFormStyles";
import { bookHotelStay } from "../../services/hotelService";
import { formatPrice } from "../../utils/tours";
import { HOTEL_SERVICE_FEE } from "../../config/serviceFees";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateInput = (date) => date.toISOString().slice(0, 10);

/* Nights are whole calendar days apart, matching how the backend counts them
   — the two must agree or the price shown differs from the price charged. */
const nightsBetween = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / MS_PER_DAY);
};

function Stepper({ label, icon: Icon, value, onChange, min = 1, max = 10 }) {
  return (
    <div className="glass-surface flex items-center justify-between rounded-input px-4 py-3">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-content">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </span>
      <span className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(value - 1, min))}
          disabled={value <= min}
          aria-label={`One fewer ${label.toLowerCase()}`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content transition-transform active:scale-90 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center font-display text-lg font-bold text-content">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(value + 1, max))}
          disabled={value >= max}
          aria-label={`One more ${label.toLowerCase()}`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content transition-transform active:scale-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}

/**
 * Booking sheet for one hotel. The total is recomputed from the same inputs
 * the API will price, so what the guest agrees to is what they are charged.
 */
function HotelBookingSheet({ hotel, open, onClose, onBooked }) {
  /* Lazy initialisers, not useMemo: reading the clock is impure and must not
     happen during render. */
  const [today] = useState(() => toDateInput(new Date()));

  const [form, setForm] = useState(() => ({
    guestName: "",
    phone: "",
    cnic: "",
    checkIn: toDateInput(new Date()),
    checkOut: toDateInput(new Date(Date.now() + MS_PER_DAY)),
    rooms: 1,
    guests: 1,
  }));
  const [saving, setSaving] = useState(false);

  const nights = nightsBetween(form.checkIn, form.checkOut);
  const stayCost = nights > 0 ? hotel.pricePerNight * nights * form.rooms : 0;
  /* Charged once per booking, whatever the room count or length. */
  const total = stayCost > 0 ? stayCost + HOTEL_SERVICE_FEE : 0;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /* Moving check-in past check-out would leave an impossible range on screen
     until the guest noticed, so the departure follows it. */
  const setCheckIn = (value) => {
    const next = { checkIn: value };
    if (nightsBetween(value, form.checkOut) < 1) {
      next.checkOut = toDateInput(
        new Date(new Date(`${value}T00:00:00`).getTime() + MS_PER_DAY)
      );
    }
    set(next);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.guestName.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (nights < 1) {
      toast.error("Check-out must be at least one night after check-in");
      return;
    }

    setSaving(true);
    try {
      const res = await bookHotelStay({
        hotelId: hotel._id,
        guestName: form.guestName.trim(),
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        rooms: form.rooms,
        guests: form.guests,
      });

      toast.success(res.message || "Your stay is booked");
      onBooked?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't book this stay");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={() => !saving && onClose()}
      title="Book a stay"
      subtitle={hotel?.name}
    >
      <form onSubmit={submit} className="space-y-4">
        <GlassInput
          label="Guest Name"
          value={form.guestName}
          onChange={(e) => set({ guestName: e.target.value })}
        />
        <GlassInput
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <GlassInput
          label="CNIC (optional)"
          value={form.cnic}
          onChange={(e) => set({ cnic: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Check-in</span>
            <input
              type="date"
              min={today}
              value={form.checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Check-out</span>
            <input
              type="date"
              min={form.checkIn}
              value={form.checkOut}
              onChange={(e) => set({ checkOut: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        <Stepper
          label="Rooms"
          icon={BedDouble}
          value={form.rooms}
          onChange={(v) => set({ rooms: v })}
        />
        <Stepper
          label="Guests"
          icon={Users}
          value={form.guests}
          onChange={(v) => set({ guests: v })}
          max={20}
        />

        <div className="space-y-1.5 border-t border-line pt-4">
          <div className="flex items-center justify-between text-[12.5px] text-content-muted">
            <span>
              {formatPrice(hotel.pricePerNight)} × {nights} night
              {nights === 1 ? "" : "s"} × {form.rooms} room
              {form.rooms === 1 ? "" : "s"}
            </span>
            <span>{formatPrice(stayCost)}</span>
          </div>
          <div className="flex items-center justify-between text-[12.5px] text-content-muted">
            <span>Service fee</span>
            <span>{formatPrice(HOTEL_SERVICE_FEE)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-muted">Total</span>
            <span className="font-display text-lg font-black text-accent">
              {formatPrice(total)}
            </span>
          </div>
          <p className="text-[11px] text-content-muted">
            Payable at the hotel on arrival.
          </p>
        </div>

        <GlassButton type="submit" disabled={saving} className="h-[52px] w-full">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Booking...
            </span>
          ) : (
            <>
              <BedDouble className="h-4.5 w-4.5" />
              Confirm Booking
            </>
          )}
        </GlassButton>
      </form>
    </GlassModal>
  );
}

export default HotelBookingSheet;
