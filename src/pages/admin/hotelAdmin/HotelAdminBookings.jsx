import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarDays,
  Hotel as HotelIcon,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
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
  getHotelBookings,
  updateHotelBookingStatus,
} from "../../../services/hotelService";
import { formatPrice } from "../../../utils/tours";
import useMyHotel from "./useMyHotel";

const SCOPES = [
  { id: "all", label: "All" },
  { id: "Confirmed", label: "Arriving" },
  { id: "CheckedIn", label: "In house" },
  { id: "CheckedOut", label: "Departed" },
  { id: "Cancelled", label: "Cancelled" },
];

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/* What the desk can do next, given where a guest is in their stay. */
const NEXT_STATUS = {
  Confirmed: { to: "CheckedIn", label: "Check in" },
  CheckedIn: { to: "CheckedOut", label: "Check out" },
};

function HotelAdminBookings() {
  const hotel = useMyHotel();

  const [bookings, setBookings] = useState([]);
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    if (!hotel.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getHotelBookings(hotel.id);
      setBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [hotel.id]);

  const patch = async (booking, payload, successText) => {
    setBusyId(booking._id);
    try {
      const res = await updateHotelBookingStatus(hotel.id, booking._id, payload);
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? { ...b, ...res.data } : b))
      );
      toast.success(successText);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update that booking");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (scope !== "all" && b.status !== scope) return false;
      if (!q) return true;
      return [b.guestName, b.phone, b.bookingCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [bookings, scope, query]);

  const earned = useMemo(
    () =>
      filtered
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    [filtered]
  );

  return (
    <AdminLayout
      requireRole="hotelAdmin"
      title="Bookings"
      subtitle={hotel.name || "Your guests"}
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
      {!hotel.id ? (
        <GlassEmptyState
          icon={HotelIcon}
          title="No hotel assigned yet"
          description="Ask the Super Admin to link your account to a hotel."
          className="mt-16"
        />
      ) : (
        <>
          <div className={searchWrapClass}>
            <Search className="h-4 w-4 shrink-0 text-content-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by guest, phone or booking code..."
              aria-label="Search bookings"
              className={searchInputClass}
            />
          </div>

          <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <div className="w-max min-w-full">
              <GlassSegmentedControl
                options={SCOPES}
                value={scope}
                onChange={setScope}
              />
            </div>
          </div>

          {!loading && filtered.length > 0 && (
            <p className="mt-3 text-[12.5px] text-content-muted">
              <span className="font-display font-bold text-content">
                {formatPrice(earned)}
              </span>{" "}
              from {filtered.filter((b) => b.status !== "Cancelled").length} booking(s)
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <GlassSkeleton className="h-[92px]" count={4} />
            ) : filtered.length === 0 ? (
              <GlassEmptyState
                icon={BedDouble}
                title={
                  bookings.length === 0 ? "No bookings yet" : "No bookings match"
                }
                description={
                  bookings.length === 0
                    ? "Stays booked by guests will appear here."
                    : "Try a different search or filter."
                }
                className="mt-12"
              />
            ) : (
              filtered.map((b, i) => {
                const cancelled = b.status === "Cancelled";
                const next = NEXT_STATUS[b.status];
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
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <BedDouble className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-content">
                          {b.guestName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-content-muted">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {b.rooms} room{b.rooms === 1 ? "" : "s"} · {b.guests} guest
                            {b.guests === 1 ? "" : "s"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {b.phone}
                          </span>
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-content-faint">
                          {b.bookingCode}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-display text-[13.5px] font-bold text-content">
                          {formatPrice(b.totalAmount)}
                        </p>
                        <p
                          className={`mt-0.5 text-[10.5px] font-bold ${
                            cancelled
                              ? "text-danger"
                              : b.status === "CheckedIn"
                              ? "text-success"
                              : "text-content-muted"
                          }`}
                        >
                          {b.refundedAt ? "Refunded" : b.status}
                        </p>
                        {b.refundedAt && (
                          <p className="mt-0.5 text-[10px] text-content-muted">
                            {formatPrice(b.refundAmount || 0)} returned
                          </p>
                        )}
                      </div>
                    </div>

                    {!cancelled && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                        {next && (
                          <button
                            type="button"
                            disabled={busyId === b._id}
                            onClick={() =>
                              patch(b, { status: next.to }, `${b.guestName} ${next.label.toLowerCase()}ed`)
                            }
                            className="cursor-pointer rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
                          >
                            {next.label}
                          </button>
                        )}
                        {b.paymentStatus === "Pending" ? (
                          <button
                            type="button"
                            disabled={busyId === b._id}
                            onClick={() =>
                              patch(b, { paymentStatus: "Paid" }, "Marked as paid")
                            }
                            className="glass-surface cursor-pointer rounded-full px-3.5 py-1.5 text-[11.5px] font-bold text-accent transition-transform active:scale-95 disabled:opacity-50"
                          >
                            Mark paid
                          </button>
                        ) : (
                          <span className="rounded-full bg-success/15 px-3.5 py-1.5 text-[11.5px] font-bold text-success">
                            Paid
                          </span>
                        )}

                        <CancelBookingButton
                          disabled={busyId === b._id}
                          onCancel={() =>
                            patch(
                              b,
                              { status: "Cancelled" },
                              `${b.guestName}'s stay cancelled`
                            )
                          }
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default HotelAdminBookings;
