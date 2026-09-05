import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  RefreshCw,
  Ticket,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState } from "../../../components/glass";
import { getRentalBookings, getRentalRevenue } from "../../../services/rentalService";
import { formatPrice } from "../../../utils/tours";
import { useRentalCatalog } from "../../../hooks/useRentalCatalog";
import useMyRentalCompany from "./useMyRentalCompany";

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

function QuickLink({ to, icon: Icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="glass-surface flex items-center gap-3 rounded-card p-4 shadow-glass transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-bold text-content">
          {title}
        </span>
        <span className="block text-[11.5px] text-content-muted">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
    </Link>
  );
}

const dayAndTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

function RentalAdminDashboard() {
  const company = useMyRentalCompany();
  const catalog = useRentalCatalog();

  const [totals, setTotals] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      /* Both scoped by the server from the token; neither call names a
         company. */
      const [revenue, requests] = await Promise.all([
        getRentalRevenue(),
        getRentalBookings({ status: "Requested", limit: 5 }),
      ]);

      setTotals(revenue?.data?.totals || null);
      setWaiting(Array.isArray(requests?.data) ? requests.data : []);
    } catch (err) {
      toast.error(err?.friendlyMessage || "Couldn't load your figures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminLayout
      requireRole="rentalAdmin"
      title={company.name || "My Company"}
      subtitle="Rental Company Admin"
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
          icon={Building2}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a rental company."
          className="mt-16"
        />
      ) : (
        <>
          {company.suspended && (
            <motion.p
              {...fadeUp(0)}
              className="mb-3 rounded-card border border-danger/30 bg-danger/10 p-3.5 text-[12.5px] leading-relaxed text-danger"
            >
              Your company is suspended, so your vehicles are off the market and
              customers cannot request them. Your bookings and fleet are kept —
              contact the platform to be reinstated.
            </motion.p>
          )}

          <motion.div {...fadeUp(0)} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              value={formatPrice(totals?.net || 0)}
              label="Earned after fees"
              loading={loading}
              accent
            />
            <StatCard
              icon={Ticket}
              value={totals?.bookings ?? 0}
              label="Total requests"
              loading={loading}
            />
            <StatCard
              icon={CheckCircle2}
              value={totals?.confirmed ?? 0}
              label="Confirmed hires"
              loading={loading}
            />
            <StatCard
              icon={Clock}
              value={waiting.length}
              label="Waiting on you"
              loading={loading}
            />
          </motion.div>

          {/* Requests nobody has answered are the one thing on this page that
              is time-sensitive, so they sit above the navigation rather than
              behind it. */}
          <motion.div
            {...fadeUp(0.05)}
            className="glass-surface mt-4 rounded-card p-4 shadow-glass"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-[14px] font-bold text-content">
                Waiting for your reply
              </p>
              <Link
                to="/rental-admin/bookings"
                className="text-[12px] font-semibold text-accent"
              >
                See all
              </Link>
            </div>

            {!loading && waiting.length === 0 && (
              <p className="mt-3 text-[12.5px] text-content-muted">
                Nothing unanswered. New hire requests appear here.
              </p>
            )}

            <div className="mt-3 space-y-2">
              {waiting.map((booking) => (
                <Link
                  key={booking._id}
                  to="/rental-admin/bookings"
                  className="flex items-center gap-3 rounded-input border border-line bg-surface p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-delayed-soft text-status-delayed">
                    <Clock className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-content">
                      {catalog.purposeLabel(booking.purpose)} ·{" "}
                      {booking.vehicle?.name || "Vehicle removed"}
                    </span>
                    <span className="block truncate text-[11.5px] text-content-muted">
                      {dayAndTime(booking.rentalStart)} · {booking.pickupLocation}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <QuickLink
              to="/rental-admin/fleet"
              icon={Car}
              title="My Fleet"
              subtitle="Vehicles, photos and pricing"
            />
            <QuickLink
              to="/rental-admin/bookings"
              icon={Ticket}
              title="Requests"
              subtitle="Quote, confirm and complete hires"
            />
            <QuickLink
              to="/rental-admin/revenue"
              icon={Wallet}
              title="Earnings"
              subtitle="What you made and what the platform took"
            />
            <QuickLink
              to="/rental-admin/manage"
              icon={Building2}
              title="My Company"
              subtitle="Contact details, areas and logo"
            />
          </motion.div>
        </>
      )}
    </AdminLayout>
  );
}

export default RentalAdminDashboard;
