import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Package,
  RefreshCw,
  Search,
  Users,
  Wallet,
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
  getTourCompanyBookings,
  getTourCompanyStats,
  updateTourBookingStatus,
} from "../../../services/tourService";
import { formatPrice } from "../../../utils/tours";
import { roleConfig } from "../../../config/adminRoles";
import useMyCompany from "../busAdmin/useMyCompany";

const SCOPES = [
  { id: "all", label: "All" },
  { id: "Confirmed", label: "Upcoming" },
  { id: "Completed", label: "Completed" },
  { id: "Cancelled", label: "Cancelled" },
];

const formatDate = (date) =>
  new Date(date).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] },
});

function StatCard({ icon: Icon, value, label, loading, accent }) {
  return (
    <div className="glass-surface rounded-card p-4 shadow-glass">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      {loading ? (
        <div className="mt-3 h-6 w-20 animate-pulse rounded bg-white/50" />
      ) : (
        <p className="mt-3 font-display text-xl font-black leading-none text-content">
          {value}
        </p>
      )}
      <p className="mt-1.5 text-[11.5px] text-content-muted">{label}</p>
    </div>
  );
}

/**
 * One console serving both Tour and Religious operators — they run the same
 * packages and bookings, and differ only in which Company.kind they own.
 *
 * @param {"tourAdmin"|"religiousAdmin"} role
 */
function TourAdminConsole({ role }) {
  const company = useMyCompany();
  const config = roleConfig(role);

  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    if (!company.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    /* A failure in one must not blank the other. */
    const [s, b] = await Promise.allSettled([
      getTourCompanyStats(),
      getTourCompanyBookings(),
    ]);

    if (s.status === "fulfilled") setStats(s.value?.data || null);
    if (b.status === "fulfilled")
      setBookings(Array.isArray(b.value?.data) ? b.value.data : []);

    if (s.status === "rejected" && b.status === "rejected") {
      toast.error(
        s.reason?.response?.data?.message || "Couldn't load your figures"
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [company.id]);

  const patch = async (booking, payload, text) => {
    setBusyId(booking._id);
    try {
      const res = await updateTourBookingStatus(booking._id, payload);
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? { ...b, ...res.data } : b))
      );
      toast.success(text);
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
      return [b.leadName, b.phone, b.bookingCode, b.tour?.title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [bookings, scope, query]);

  return (
    <AdminLayout
      requireRole={role}
      title={company.name || config?.label || "My Company"}
      subtitle={config?.label}
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
      {!company.id ? (
        <GlassEmptyState
          icon={Package}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a company."
          className="mt-16"
        />
      ) : (
        <>
          <motion.div {...fadeUp(0)} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              value={formatPrice(stats?.revenue || 0)}
              label="Total revenue"
              loading={loading}
              accent
            />
            <StatCard
              icon={CalendarDays}
              value={stats?.bookings ?? 0}
              label="Bookings"
              loading={loading}
            />
            <StatCard
              icon={Users}
              value={stats?.travellers ?? 0}
              label="Travellers"
              loading={loading}
            />
            <StatCard
              icon={Package}
              value={stats?.packages ?? 0}
              label="Packages listed"
              loading={loading}
            />
          </motion.div>

          <motion.div {...fadeUp(0.05)} className="mt-3 grid grid-cols-2 gap-3">
            <StatCard
              icon={CalendarDays}
              value={stats?.upcoming ?? 0}
              label="Upcoming departures"
              loading={loading}
            />
            <StatCard
              icon={Wallet}
              value={stats?.pendingPayment ?? 0}
              label="Payments pending"
              loading={loading}
            />
          </motion.div>

          <div className={`${searchWrapClass} mt-5`}>
            <Search className="h-4 w-4 shrink-0 text-content-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by traveller, phone, code or package..."
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

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <GlassSkeleton className="h-[92px]" count={4} />
            ) : filtered.length === 0 ? (
              <GlassEmptyState
                icon={CalendarDays}
                title={
                  bookings.length === 0 ? "No bookings yet" : "No bookings match"
                }
                description={
                  bookings.length === 0
                    ? "Bookings on your packages will appear here."
                    : "Try a different search or filter."
                }
                className="mt-12"
              />
            ) : (
              filtered.map((b, i) => {
                const cancelled = b.status === "Cancelled";
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
                        <Package className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-content">
                          {b.leadName}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-content-muted">
                          {b.tour?.title || "Package"} · {formatDate(b.departureDate)}
                          {b.departureTime ? ` · ${b.departureTime}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-content-muted">
                          {b.travellers} traveller{b.travellers === 1 ? "" : "s"} ·{" "}
                          {b.phone}
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
                              : b.status === "Completed"
                              ? "text-content-muted"
                              : "text-success"
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
                        {b.status === "Confirmed" && (
                          <button
                            type="button"
                            disabled={busyId === b._id}
                            onClick={() =>
                              patch(b, { status: "Completed" }, "Marked as travelled")
                            }
                            className="cursor-pointer rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
                          >
                            Mark travelled
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
                              `${b.leadName}'s booking cancelled`
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

export default TourAdminConsole;
