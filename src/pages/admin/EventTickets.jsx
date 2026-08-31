import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import CancelBookingButton from "../../components/admin/CancelBookingButton";
import {
  GlassEmptyState,
  GlassSkeleton,
  GlassSegmentedControl,
} from "../../components/glass";
import {
  searchInputClass,
  searchWrapClass,
} from "../../components/admin/adminFormStyles";
import {
  getEventBookings,
  adminCancelEventBooking,
} from "../../services/eventService";
import { formatPrice } from "../../utils/tours";
import { useMyEventId } from "./EventDashboard";

const SCOPES = [
  { id: "all", label: "All" },
  { id: "checkedIn", label: "Checked in" },
  { id: "pending", label: "Not yet in" },
  { id: "cancelled", label: "Cancelled" },
];

const formatWhen = (date) =>
  new Date(date).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function TicketRow({ booking, index, onCancel, busy }) {
  const cancelled = booking.status === "Cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className={`glass-surface rounded-card p-3.5 shadow-glass ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          cancelled
            ? "bg-danger/12 text-danger"
            : booking.checkedIn
            ? "bg-success/15 text-success"
            : "bg-accent-soft text-accent"
        }`}
      >
        {booking.checkedIn ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Ticket className="h-5 w-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[13.5px] font-bold text-content">
          {booking.attendeeName}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-content-muted">
          {booking.phone} · {booking.quantity} ticket
          {booking.quantity === 1 ? "" : "s"} · {formatWhen(booking.createdAt)}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-content-faint">
          {booking.ticketCode}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-display text-[13.5px] font-bold text-content">
          {formatPrice((booking.totalAmount || 0) - (booking.serviceFee || 0))}
        </p>
        <p
          className={`mt-0.5 text-[10.5px] font-bold ${
            cancelled
              ? "text-danger"
              : booking.checkedIn
              ? "text-success"
              : "text-content-muted"
          }`}
        >
          {cancelled ? "Cancelled" : booking.checkedIn ? "Checked in" : "Booked"}
        </p>
      </div>
      </div>

      {!cancelled && (
        <div className="mt-3 flex border-t border-line pt-3">
          <CancelBookingButton
            disabled={busy}
            onCancel={onCancel}
            label="Cancel ticket"
          />
        </div>
      )}
    </motion.div>
  );
}

function EventTickets() {
  const eventId = useMyEventId();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");

  const fetchBookings = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getEventBookings(eventId);
      setBookings(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const cancelTicket = async (booking) => {
    setBusyId(booking._id);
    try {
      await adminCancelEventBooking(booking._id);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id ? { ...b, status: "Cancelled" } : b
        )
      );
      toast.success(`${booking.attendeeName}'s ticket cancelled`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't cancel that ticket");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    fetchBookings();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [eventId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (scope === "checkedIn" && !b.checkedIn) return false;
      if (scope === "pending" && (b.checkedIn || b.status === "Cancelled"))
        return false;
      if (scope === "cancelled" && b.status !== "Cancelled") return false;
      if (!q) return true;
      return [b.attendeeName, b.phone, b.ticketCode]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [bookings, search, scope]);

  return (
    <AdminLayout
      requireEventAdmin
      title="Booked Tickets"
      subtitle={`${bookings.length} booking${
        bookings.length === 1 ? "" : "s"
      } for your event`}
      actions={
        <button
          type="button"
          onClick={fetchBookings}
          aria-label="Refresh"
          className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {!eventId ? (
        <GlassEmptyState
          icon={CalendarDays}
          title="No event assigned yet"
          description="Ask the Super Admin to link your account to an event."
          className="mt-16"
        />
      ) : (
        <>
          <div className={searchWrapClass}>
            <Search className="h-4 w-4 shrink-0 text-content-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or ticket code..."
              aria-label="Search tickets"
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

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <GlassSkeleton className="h-[72px]" count={5} />
            ) : filtered.length === 0 ? (
              <GlassEmptyState
                icon={Ticket}
                title={
                  bookings.length === 0
                    ? "No tickets booked yet"
                    : "No tickets match"
                }
                description={
                  bookings.length === 0
                    ? "Bookings will appear here as people buy tickets."
                    : "Try a different search or filter."
                }
                className="mt-12"
              />
            ) : (
              filtered.map((booking, i) => (
                <TicketRow
                  key={booking._id}
                  booking={booking}
                  index={i}
                  busy={busyId === booking._id}
                  onCancel={() => cancelTicket(booking)}
                />
              ))
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default EventTickets;
