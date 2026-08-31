import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  BusFront,
  CalendarDays,
  Globe,
  RefreshCw,
  Search,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import {
  GlassEmptyState,
  GlassSkeleton,
  GlassSegmentedControl,
} from "../../components/glass";
import {
  searchInputClass,
  searchWrapClass,
} from "../../components/admin/adminFormStyles";
import { getCompanyBookings } from "../../services/bookingService";
import { getAllHotelBookings } from "../../services/hotelService";
import { getTourCompanyBookings } from "../../services/tourService";
import { getAllEventBookings } from "../../services/eventService";
import { formatPrice } from "../../utils/tours";

const SCOPES = [
  { id: "bus", label: "Bus" },
  { id: "hotel", label: "Hotels" },
  { id: "tour", label: "Tours" },
  { id: "event", label: "Events" },
];

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const normalize = (res) => (Array.isArray(res?.data) ? res.data : []);

function Row({ icon: Icon, title, subtitle, detail, amount, fee, status, refundedAt, index }) {
  const cancelled = status === "Cancelled";
  const refunded = Boolean(refundedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.28 }}
      className={`glass-surface flex items-center gap-3 rounded-card p-3.5 shadow-glass ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold text-content">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
          {subtitle}
        </span>
        {detail && (
          <span className="mt-0.5 block truncate text-[11px] text-content-faint">
            {detail}
          </span>
        )}
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-display text-[13.5px] font-bold text-content">
          {formatPrice(amount)}
        </span>
        {/* What the platform took out of this booking. */}
        <span className="mt-0.5 block text-[11px] text-accent">
          +{formatPrice(fee)} fee
        </span>
        {cancelled && (
          <span className="mt-0.5 block text-[10.5px] font-bold text-danger">
            {refunded ? "Refunded" : "Cancelled"}
          </span>
        )}
      </span>
    </motion.div>
  );
}

/**
 * Every booking on the platform, in the four sections that take them.
 *
 * Operators see their own bookings in their own consoles; this is the owner's
 * view across all of them, and it shows the service charge each one earned
 * because that is the platform's side of the transaction.
 */
function Bookings() {
  const [scope, setScope] = useState("bus");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [bus, setBus] = useState([]);
  const [hotel, setHotel] = useState([]);
  const [tour, setTour] = useState([]);
  const [event, setEvent] = useState([]);

  const load = async () => {
    setLoading(true);
    /* One failing section must not blank the others. */
    const [current, past, h, t, e] = await Promise.allSettled([
      getCompanyBookings("current"),
      getCompanyBookings("past"),
      getAllHotelBookings(),
      getTourCompanyBookings(),
      getAllEventBookings(),
    ]);

    setBus([
      ...(current.status === "fulfilled" ? normalize(current.value) : []),
      ...(past.status === "fulfilled" ? normalize(past.value) : []),
    ]);
    if (h.status === "fulfilled") setHotel(normalize(h.value));
    if (t.status === "fulfilled") setTour(normalize(t.value));
    if (e.status === "fulfilled") setEvent(normalize(e.value));

    if ([current, past, h, t, e].every((r) => r.status === "rejected")) {
      toast.error("Couldn't load bookings");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const match = (fields) =>
      !q || fields.filter(Boolean).some((v) => String(v).toLowerCase().includes(q));

    if (scope === "bus") {
      return bus
        .filter((b) =>
          match([b.passengerName, b.phone, b.bus?.busNo, b.company?.name, b.fromCity, b.toCity])
        )
        .map((b, i) => ({
          key: b._id,
          icon: BusFront,
          title: b.passengerName,
          subtitle: `${b.fromCity} → ${b.toCity} · ${b.bus?.busNo || "—"}`,
          detail: `${b.company?.name || "—"} · Seat ${b.seatNumber} · ${formatDate(
            b.travelDate
          )}`,
          amount: b.fare || 0,
          fee: b.serviceFee || 0,
          status: b.status,
          refundedAt: b.refundedAt,
          index: i,
        }));
    }

    if (scope === "hotel") {
      return hotel
        .filter((h) => match([h.guestName, h.phone, h.hotel?.name, h.bookingCode]))
        .map((h, i) => ({
          key: h._id,
          icon: BedDouble,
          title: h.guestName,
          subtitle: `${h.hotel?.name || "—"} · ${h.nights} night${
            h.nights === 1 ? "" : "s"
          }`,
          detail: `${formatDate(h.checkIn)} → ${formatDate(h.checkOut)} · ${
            h.bookingCode
          }`,
          amount: (h.totalAmount || 0) - (h.serviceFee || 0),
          fee: h.serviceFee || 0,
          status: h.status,
          refundedAt: h.refundedAt,
          index: i,
        }));
    }

    if (scope === "event") {
      return event
        .filter((e) => match([e.attendeeName, e.phone, e.event?.title, e.ticketCode]))
        .map((e, i) => ({
          key: e._id,
          icon: CalendarDays,
          title: e.attendeeName,
          subtitle: `${e.event?.title || "Event"} · ${e.quantity} ticket${
            e.quantity === 1 ? "" : "s"
          }`,
          detail: `${formatDate(e.event?.eventDate)} · ${e.ticketCode}`,
          amount: (e.totalAmount || 0) - (e.serviceFee || 0),
          fee: e.serviceFee || 0,
          status: e.status,
          refundedAt: e.refundedAt,
          index: i,
        }));
    }

    return tour
      .filter((t) => match([t.leadName, t.phone, t.tour?.title, t.bookingCode]))
      .map((t, i) => ({
        key: t._id,
        icon: Globe,
        title: t.leadName,
        subtitle: `${t.tour?.title || "Package"} · ${t.travellers} traveller${
          t.travellers === 1 ? "" : "s"
        }`,
        detail: `${formatDate(t.departureDate)} · ${t.bookingCode}`,
        amount: (t.totalAmount || 0) - (t.serviceFee || 0),
        fee: t.serviceFee || 0,
        status: t.status,
        refundedAt: t.refundedAt,
        index: i,
      }));
  }, [scope, query, bus, hotel, tour, event]);

  const counts = {
    bus: bus.length,
    hotel: hotel.length,
    tour: tour.length,
    event: event.length,
  };

  const feeTotal = rows
    .filter((r) => r.status !== "Cancelled")
    .reduce((sum, r) => sum + r.fee, 0);

  return (
    <AdminLayout
      requireSuperAdmin
      title="Bookings"
      subtitle="Every booking taken on the platform"
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
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="w-max min-w-full">
          <GlassSegmentedControl
            options={SCOPES.map((s) => ({
              ...s,
              label: `${s.label} (${counts[s.id]})`,
            }))}
            value={scope}
            onChange={setScope}
          />
        </div>
      </div>

      <div className={`${searchWrapClass} mt-4`}>
        <Search className="h-4 w-4 shrink-0 text-content-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, code or operator..."
          aria-label="Search bookings"
          className={searchInputClass}
        />
      </div>

      <div className="glass-surface mt-4 flex items-center justify-between rounded-card p-4">
        <span className="text-[12.5px] text-content-muted">
          Service charges in this section
        </span>
        <span className="font-display text-[16px] font-black text-accent">
          {formatPrice(feeTotal)}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <GlassSkeleton className="h-[76px]" count={5} />
        ) : rows.length === 0 ? (
          <GlassEmptyState
            icon={Ticket}
            title={query ? "No bookings match your search" : "No bookings yet"}
            className="mt-12"
          />
        ) : (
          rows.map((r) => <Row key={r.key} {...r} />)
        )}
      </div>
    </AdminLayout>
  );
}

export default Bookings;
