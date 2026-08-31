import { useState } from "react";
import { CalendarDays, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { GlassModal, GlassInput, GlassButton } from "../glass";
import { bookTour } from "../../services/tourService";
import { formatDeparture, formatPrice } from "../../utils/tours";
import { serviceFeeForTour } from "../../config/serviceFees";

/**
 * Booking sheet for one tour package. The total is recomputed from the same
 * inputs the API will price, so what the traveller agrees to is what they
 * are charged.
 *
 * The departure is the operator's, not the traveller's: a package runs when
 * the company schedules it, so the date is shown here rather than picked.
 */
function TourBookingSheet({ tour, open, onClose, onBooked }) {
  const [form, setForm] = useState(() => ({
    leadName: "",
    phone: "",
    cnic: "",
    travellers: 1,
  }));
  const [saving, setSaving] = useState(false);

  const seatCost = tour.price * form.travellers;
  /* Charged once per booking; religious packages carry none. */
  const serviceFee = serviceFeeForTour(tour);
  const total = seatCost + serviceFee;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const departure = formatDeparture(tour.departureDate, tour.departureTime);

  const submit = async (e) => {
    e.preventDefault();

    if (!form.leadName.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    setSaving(true);
    try {
      const res = await bookTour({
        tourId: tour._id,
        leadName: form.leadName.trim(),
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        travellers: form.travellers,
      });

      toast.success(res.message || "Your tour is booked");
      onBooked?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't book this tour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={() => !saving && onClose()}
      title="Book this tour"
      subtitle={tour?.title}
    >
      <form onSubmit={submit} className="space-y-4">
        {departure && (
          <div className="glass-surface flex items-center gap-2.5 rounded-input px-4 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-content-muted">
                Departs
              </span>
              <span className="block text-[13.5px] font-bold text-content">
                {departure}
              </span>
            </span>
          </div>
        )}

        <GlassInput
          label="Lead Traveller"
          value={form.leadName}
          onChange={(e) => set({ leadName: e.target.value })}
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

        <div className="glass-surface flex items-center justify-between rounded-input px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-content">
            <Users className="h-4 w-4 text-accent" />
            Travellers
          </span>
          <span className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => set({ travellers: Math.max(form.travellers - 1, 1) })}
              disabled={form.travellers <= 1}
              aria-label="One fewer traveller"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content transition-transform active:scale-90 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-display text-lg font-bold text-content">
              {form.travellers}
            </span>
            <button
              type="button"
              onClick={() => set({ travellers: Math.min(form.travellers + 1, 30) })}
              disabled={form.travellers >= 30}
              aria-label="One more traveller"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-content transition-transform active:scale-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </span>
        </div>

        <div className="space-y-1.5 border-t border-line pt-4">
          <div className="flex items-center justify-between text-[12.5px] text-content-muted">
            <span>
              {formatPrice(tour.price)} × {form.travellers} traveller
              {form.travellers === 1 ? "" : "s"}
            </span>
            <span>{formatPrice(seatCost)}</span>
          </div>
          {serviceFee > 0 && (
            <div className="flex items-center justify-between text-[12.5px] text-content-muted">
              <span>Service fee</span>
              <span>{formatPrice(serviceFee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content-muted">Total</span>
            <span className="font-display text-lg font-black text-accent">
              {formatPrice(total)}
            </span>
          </div>
          <p className="text-[11px] text-content-muted">
            The operator will call to confirm and take payment.
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
              <Users className="h-4.5 w-4.5" />
              Confirm Booking
            </>
          )}
        </GlassButton>
      </form>
    </GlassModal>
  );
}

export default TourBookingSheet;
