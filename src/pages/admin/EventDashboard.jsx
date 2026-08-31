import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { useAdminSession } from "../../components/admin/AdminSession";
import { GlassEmptyState } from "../../components/glass";
import { getEventStats } from "../../services/eventService";
import { formatPrice } from "../../utils/tours";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] },
});

export function useMyEventId() {
  return useAdminSession().scopeId;
}

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
        <div className="mt-3 h-6 w-16 animate-pulse rounded bg-white/50" />
      ) : (
        <p className="mt-3 font-display text-xl font-black leading-none text-content">
          {value}
        </p>
      )}
      <p className="mt-1.5 text-[11.5px] text-content-muted">{label}</p>
    </div>
  );
}

function EventDashboard() {
  const eventId = useMyEventId();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getEventStats(eventId);
      setStats(res?.data || null);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Unable to load your event stats"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [eventId]);

  const event = stats?.event;

  return (
    <AdminLayout
      requireEventAdmin
      title={event?.title || "Event Dashboard"}
      subtitle="Your event at a glance"
      actions={
        <button
          type="button"
          onClick={fetchStats}
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
          {event && (
            <motion.div
              {...fadeUp(0)}
              className="glass-surface flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card p-4 shadow-glass"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] text-content-muted">
                <CalendarDays className="h-4 w-4 text-accent" />
                {new Date(event.eventDate).toLocaleDateString([], {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {event.startTime ? ` · ${event.startTime}` : ""}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-content-muted">
                <MapPin className="h-4 w-4 text-accent" />
                {event.venue}, {event.city}
              </span>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                  event.isActive
                    ? "bg-success/15 text-success"
                    : "bg-content-muted/15 text-content-muted"
                }`}
              >
                {event.isActive ? "Live on app" : "Hidden"}
              </span>
            </motion.div>
          )}

          <motion.div
            {...fadeUp(0.05)}
            className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <StatCard
              icon={Wallet}
              value={formatPrice(stats?.revenue || 0)}
              label="Total revenue"
              loading={loading}
              accent
            />
            <StatCard
              icon={Ticket}
              value={stats?.ticketsSold ?? 0}
              label="Tickets booked"
              loading={loading}
            />
            <StatCard
              icon={Users}
              value={stats?.bookings ?? 0}
              label="Bookings"
              loading={loading}
            />
            <StatCard
              icon={CheckCircle2}
              value={stats?.checkedIn ?? 0}
              label="Checked in"
              loading={loading}
            />
          </motion.div>

          {event && (
            <motion.div
              {...fadeUp(0.1)}
              className="glass-surface mt-4 rounded-card p-4 shadow-glass"
            >
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-semibold text-content">
                  Capacity
                </p>
                <p className="text-[12.5px] text-content-muted">
                  {stats?.ticketsSold ?? 0} of {event.totalTickets} sold
                </p>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-elevated">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      ((stats?.ticketsSold || 0) / (event.totalTickets || 1)) *
                        100,
                      100
                    )}%`,
                  }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
              <p className="mt-2 text-[11.5px] text-content-muted">
                {stats?.ticketsLeft ?? 0} tickets still available
              </p>
            </motion.div>
          )}

          <motion.div {...fadeUp(0.15)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/admin/event/scan"
              className="glass-surface flex items-center gap-3 rounded-card p-4 shadow-glass transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <QrCode className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[14px] font-bold text-content">
                  Scan tickets
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Check attendees in at the gate
                </span>
              </span>
            </Link>

            <Link
              to="/admin/event/tickets"
              className="glass-surface flex items-center gap-3 rounded-card p-4 shadow-glass transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Ticket className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[14px] font-bold text-content">
                  Booked tickets
                </span>
                <span className="block text-[11.5px] text-content-muted">
                  Every booking for your event
                </span>
              </span>
            </Link>
          </motion.div>
        </>
      )}
    </AdminLayout>
  );
}

export default EventDashboard;
