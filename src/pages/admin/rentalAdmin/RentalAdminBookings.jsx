import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  MapPin,
  Phone,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassModal, GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  textareaClass,
} from "../../../components/admin/adminFormStyles";
import { getRentalBookings, respondToRentalBooking } from "../../../services/rentalService";
import { useRentalCatalog } from "../../../hooks/useRentalCatalog";
import { formatPrice } from "../../../utils/tours";
import useMyRentalCompany from "./useMyRentalCompany";

/**
 * The company's diary: every hire request, and what it can do about each.
 *
 * The four actions match the four the server accepts. Which of them is offered
 * is decided by the booking's own status rather than shown-and-refused, so a
 * company is never told "no" after clicking.
 */

const STATUS_STYLE = {
  Requested: "bg-status-delayed-soft text-status-delayed",
  Quoted: "bg-accent-soft text-accent",
  Confirmed: "bg-status-live-soft text-status-live",
  PaymentPending: "bg-status-delayed-soft text-status-delayed",
  Paid: "bg-status-live-soft text-status-live",
  Completed: "bg-content-muted/15 text-content-muted",
  Cancelled: "bg-danger/10 text-danger",
  RefundPending: "bg-status-delayed-soft text-status-delayed",
  Refunded: "bg-content-muted/15 text-content-muted",
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "Requested", label: "New" },
  { id: "Quoted", label: "Quoted" },
  { id: "Confirmed", label: "Confirmed" },
  { id: "Completed", label: "Done" },
  { id: "Cancelled", label: "Cancelled" },
];

const when = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

/** Hours between the two ends of the hire, rounded to something readable. */
const durationOf = (start, end) => {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;

  const hours = (to - from) / 3600000;
  if (hours < 24) return `${Math.round(hours)} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};

function RentalAdminBookings() {
  const company = useMyRentalCompany();
  const catalog = useRentalCatalog();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  /* { booking, action } — one modal serves quoting and declining, because
     both are "say something, then send". */
  const [reply, setReply] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter) params.status = filter;

      const res = await getRentalBookings(params);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your bookings");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const waiting = rows.filter((r) => r.status === "Requested").length;
    return { waiting };
  }, [rows]);

  /** Send an action the server takes without anything else typed. */
  const send = async (booking, action) => {
    try {
      const res = await respondToRentalBooking(booking._id, { action });
      toast.success(res.message || "Updated");
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't update that booking");
    }
  };

  const openReply = (booking, action) => {
    setAmount(booking.quotedAmount ?? "");
    setNote("");
    setReply({ booking, action });
  };

  const submitReply = async (e) => {
    e.preventDefault();
    const { booking, action } = reply;

    if (action === "quote") {
      const value = Number(amount);
      if (!Number.isFinite(value) || value < 0) {
        toast.error("Enter a price");
        return;
      }
    }

    setSending(true);
    try {
      const payload =
        action === "quote"
          ? { action, quotedAmount: Number(amount), quoteNotes: note }
          : { action, reason: note };

      const res = await respondToRentalBooking(booking._id, payload);
      toast.success(res.message || "Sent");
      setReply(null);
      load();
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't send that");
    } finally {
      setSending(false);
    }
  };

  /* The platform's fee is added on top of what the company quotes, so the
     company sees exactly what it will be paid. */
  const yourShare = Number(amount) || 0;

  return (
    <AdminLayout
      requireRole="rentalAdmin"
      title="Requests"
      subtitle={
        counts.waiting > 0
          ? `${counts.waiting} waiting for your reply`
          : company.name || "Rental Company Admin"
      }
    >
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              filter === f.id
                ? "bg-accent text-white"
                : "border border-line bg-surface text-content-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {loading && <GlassSkeleton className="h-32" count={3} />}

        {!loading &&
          rows.map((booking) => {
            const status = booking.status;
            const canQuote = status === "Requested" || status === "Quoted";
            const canConfirm = status === "Requested" || status === "Quoted";
            const canDecline = ["Requested", "Quoted", "Confirmed"].includes(status);
            const canComplete = ["Confirmed", "Paid", "PaymentPending"].includes(status);

            return (
              <div
                key={booking._id}
                className="rounded-card border border-line bg-surface p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-content">
                      {catalog.purposeLabel(booking.purpose)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-content-muted">
                      {booking.reference}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      STATUS_STYLE[status] || STATUS_STYLE.Requested
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[12.5px] text-content-muted">
                  <p className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {when(booking.rentalStart)} → {when(booking.rentalEnd)}
                      {durationOf(booking.rentalStart, booking.rentalEnd) && (
                        <span className="ml-1.5 data-mono">
                          ({durationOf(booking.rentalStart, booking.rentalEnd)})
                        </span>
                      )}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {booking.pickupLocation}
                      {booking.dropoffLocation ? ` → ${booking.dropoffLocation}` : ""}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" />
                    {booking.vehicle?.name || "Vehicle removed"} ·{" "}
                    {booking.passengerCount} passenger
                    {booking.passengerCount === 1 ? "" : "s"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    {booking.contactName || booking.passenger?.name || "—"}
                    {(booking.contactPhone || booking.passenger?.phone) && (
                      <a
                        href={`tel:${booking.contactPhone || booking.passenger?.phone}`}
                        className="font-semibold text-accent"
                      >
                        {booking.contactPhone || booking.passenger?.phone}
                      </a>
                    )}
                  </p>
                </div>

                {booking.specialRequirements && (
                  <p className="mt-2 rounded-input bg-surface-2 p-2.5 text-[12px] leading-relaxed text-content-muted">
                    {booking.specialRequirements}
                  </p>
                )}

                {booking.quotedAmount !== null && booking.quotedAmount !== undefined && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[12.5px]">
                    <span className="font-bold text-content data-mono">
                      {formatPrice(booking.quotedAmount)}
                    </span>
                    <span className="text-content-muted">
                      you · {formatPrice(booking.platformFee || 0)} platform fee ·{" "}
                      {formatPrice(booking.totalAmount || 0)} customer pays
                    </span>
                  </div>
                )}

                {booking.cancellationReason && (
                  <p className="mt-2 text-[12px] text-danger">
                    {booking.cancellationReason}
                  </p>
                )}

                {(canQuote || canConfirm || canDecline || canComplete) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canQuote && (
                      <button
                        type="button"
                        onClick={() => openReply(booking, "quote")}
                        className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-bold text-white"
                      >
                        {status === "Quoted" ? "Change price" : "Send price"}
                      </button>
                    )}
                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => send(booking, "confirm")}
                        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-content"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirm
                      </button>
                    )}
                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => send(booking, "complete")}
                        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-content"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark done
                      </button>
                    )}
                    {canDecline && (
                      <button
                        type="button"
                        onClick={() => openReply(booking, "decline")}
                        className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-[12px] font-semibold text-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {!loading && rows.length === 0 && (
        <GlassEmptyState
          icon={Ticket}
          title={filter ? "Nothing here" : "No requests yet"}
          description={
            filter
              ? "Try another filter."
              : "Hire requests from customers land here. You price them, confirm them and mark them done."
          }
          className="mt-12"
        />
      )}

      <GlassModal
        open={Boolean(reply)}
        onClose={() => setReply(null)}
        title={reply?.action === "quote" ? "Send your price" : "Decline this request"}
        subtitle={reply?.booking?.reference}
      >
        <form onSubmit={submitReply} className="space-y-3.5">
          {reply?.action === "quote" ? (
            <>
              <div>
                <label className={labelClass}>Your price (Rs)</label>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25000"
                />
              </div>

              <p className="rounded-input bg-surface-2 p-3 text-[11.5px] leading-relaxed text-content-muted">
                You keep{" "}
                <span className="font-bold text-content">{formatPrice(yourShare)}</span>.
                The platform fee of{" "}
                {formatPrice(reply?.booking?.platformFee || 0)} is added on top, so
                the customer is shown{" "}
                <span className="font-bold text-content">
                  {formatPrice(yourShare + (reply?.booking?.platformFee || 0))}
                </span>
                .
              </p>

              <div>
                <label className={labelClass}>Anything to say with it</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Includes fuel and driver. Decoration is Rs 8,000 extra."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Why (the customer sees this)</label>
                <textarea
                  rows={3}
                  autoFocus
                  className={textareaClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Already committed that weekend."
                />
              </div>
              <p className="rounded-input bg-surface-2 p-3 text-[11.5px] leading-relaxed text-content-muted">
                Declining frees the vehicle for those dates straight away, so
                somebody else can book it.
              </p>
            </>
          )}

          <button type="submit" disabled={sending} className={primaryButtonClass}>
            {sending
              ? "Sending…"
              : reply?.action === "quote"
              ? "Send price"
              : "Decline request"}
          </button>
        </form>
      </GlassModal>
    </AdminLayout>
  );
}

export default RentalAdminBookings;
