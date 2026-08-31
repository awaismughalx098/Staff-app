import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, Ticket } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import CancelBookingButton from "../../../components/admin/CancelBookingButton";
import {
  GlassEmptyState,
  GlassSkeleton,
  GlassSegmentedControl,
} from "../../../components/glass";
import {
  searchInputClass,
  searchWrapClass,
} from "../../../components/admin/adminFormStyles";
import {
  getCompanyBookings,
  adminCancelBooking,
} from "../../../services/bookingService";
import { formatPrice } from "../../../utils/tours";
import useMyCompany from "./useMyCompany";

const SCOPES = [
  { id: "current", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function BusAdminBookings() {
  const company = useMyCompany();

  const [bookings, setBookings] = useState([]);
  const [scope, setScope] = useState("current");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      /* The token decides which company's bookings come back — the scope is
         enforced server-side, not by passing an id from here. */
      const res = await getCompanyBookings(scope);
      setBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load bookings");
    } finally {
      setLoading(false);
    }
  };

  const cancelSeat = async (booking) => {
    setBusyId(booking._id);
    try {
      await adminCancelBooking(booking._id);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id ? { ...b, status: "Cancelled" } : b
        )
      );
      toast.success(`${booking.passengerName}'s seat cancelled`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't cancel that seat");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [scope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.passengerName, b.phone, b.seatNumber, b.fromCity, b.toCity, b.bus?.busNo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [bookings, query]);

  const earned = useMemo(
    () =>
      filtered
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + (b.fare || 0) + (b.serviceFee || 0), 0),
    [filtered]
  );

  return (
    <AdminLayout
      requireRole="busAdmin"
      title="Bookings"
      subtitle={company.name || "Your tickets"}
      actions={
        <button
          type="button"
          onClick={load}
          aria-label="Refresh"
          className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className={searchWrapClass}>
        <Search className="h-4 w-4 shrink-0 text-content-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by passenger, phone, seat or bus..."
          aria-label="Search bookings"
          className={searchInputClass}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <GlassSegmentedControl options={SCOPES} value={scope} onChange={setScope} />
        {!loading && filtered.length > 0 && (
          <p className="text-[12.5px] text-content-muted">
            <span className="font-display font-bold text-content">
              {formatPrice(earned)}
            </span>{" "}
            from {filtered.filter((b) => b.status !== "Cancelled").length} ticket(s)
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <GlassSkeleton className="h-[72px]" count={5} />
        ) : filtered.length === 0 ? (
          <GlassEmptyState
            icon={Ticket}
            title={
              bookings.length === 0
                ? `No ${scope === "past" ? "past" : "upcoming"} bookings`
                : "No bookings match"
            }
            description={
              bookings.length === 0
                ? "Tickets sold on your buses will show up here."
                : "Try a different search term."
            }
            className="mt-12"
          />
        ) : (
          filtered.map((b, i) => {
            const cancelled = b.status === "Cancelled";
            /* A refunded seat was sold and then handed back — worth saying so
               rather than lumping it in with an operator's own cancellation. */
            const refunded = Boolean(b.refundedAt);
            return (
              <motion.div
                key={b._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.28 }}
                className={`glass-surface rounded-card p-3.5 shadow-glass ${
                  cancelled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-[12px] font-bold text-accent">
                    {b.seatNumber}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-content">
                      {b.passengerName}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
                      {b.fromCity} → {b.toCity} · {formatDate(b.travelDate)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-content-faint">
                      {b.bus?.busNo || "Bus"} · {b.phone}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    {/* The fare, and only the fare — the service charge on top
                        is the platform's, not this company's. */}
                    <span className="block text-[13.5px] font-bold text-content">
                      {formatPrice(b.fare || 0)}
                    </span>
                    <span
                      className={`mt-0.5 block text-[10.5px] font-bold ${
                        cancelled ? "text-danger" : "text-success"
                      }`}
                    >
                      {refunded ? "Refunded" : b.status}
                    </span>
                    {refunded && (
                      <span className="mt-0.5 block text-[10px] text-content-muted">
                        {formatPrice(b.refundAmount || 0)} returned
                      </span>
                    )}
                  </span>
                </div>

                {!cancelled && (
                  <div className="mt-3 flex border-t border-line pt-3">
                    <CancelBookingButton
                      disabled={busyId === b._id}
                      onCancel={() => cancelSeat(b)}
                    />
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}

export default BusAdminBookings;
