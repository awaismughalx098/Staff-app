import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarCheck,
  ChevronRight,
  Hotel as HotelIcon,
  RefreshCw,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState } from "../../../components/glass";
import { getHotelStats } from "../../../services/hotelService";
import { formatPrice } from "../../../utils/tours";
import useMyHotel from "./useMyHotel";

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

function HotelAdminDashboard() {
  const hotel = useMyHotel();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!hotel.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getHotelStats(hotel.id);
      setStats(res?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your figures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [hotel.id]);

  return (
    <AdminLayout
      requireRole="hotelAdmin"
      title={hotel.name || "My Hotel"}
      subtitle={hotel.city ? `Hotel Admin · ${hotel.city}` : "Hotel Admin"}
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
          <motion.div {...fadeUp(0)} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              value={formatPrice(stats?.revenue || 0)}
              label="Total revenue"
              loading={loading}
              accent
            />
            <StatCard
              icon={BedDouble}
              value={stats?.bookings ?? 0}
              label="Bookings"
              loading={loading}
            />
            <StatCard
              icon={CalendarCheck}
              value={stats?.nights ?? 0}
              label="Room-nights sold"
              loading={loading}
            />
            <StatCard
              icon={Users}
              value={stats?.guests ?? 0}
              label="Guests"
              loading={loading}
            />
          </motion.div>

          {/* What the desk needs at a glance */}
          <motion.div {...fadeUp(0.05)} className="mt-3 grid grid-cols-3 gap-3">
            <StatCard
              icon={CalendarCheck}
              value={stats?.arrivingToday ?? 0}
              label="Arriving today"
              loading={loading}
            />
            <StatCard
              icon={BedDouble}
              value={stats?.inHouse ?? 0}
              label="In house now"
              loading={loading}
            />
            <StatCard
              icon={Wallet}
              value={stats?.pendingPayment ?? 0}
              label="Unpaid bills"
              loading={loading}
            />
          </motion.div>

          {stats?.hotel && (
            <motion.div
              {...fadeUp(0.1)}
              className="glass-surface mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-card p-4 shadow-glass"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] text-content-muted">
                <Star className="h-4 w-4 fill-accent text-accent" />
                {Number(stats.hotel.rating || 0).toFixed(1)} from{" "}
                {stats.hotel.reviewCount || 0} review
                {stats.hotel.reviewCount === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-content-muted">
                <Wallet className="h-4 w-4 text-accent" />
                {formatPrice(stats.hotel.pricePerNight)} / night
              </span>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                  stats.hotel.isActive !== false
                    ? "bg-success/15 text-success"
                    : "bg-content-muted/15 text-content-muted"
                }`}
              >
                {stats.hotel.isActive !== false ? "Live on app" : "Hidden"}
              </span>
            </motion.div>
          )}

          <motion.div {...fadeUp(0.15)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <QuickLink
              to="/hotel-admin/bookings"
              icon={BedDouble}
              title="Bookings"
              subtitle="Arrivals, check-ins and payments"
            />
            <QuickLink
              to="/hotel-admin/manage"
              icon={HotelIcon}
              title="My Hotel"
              subtitle="Photos, videos, details and reviews"
            />
          </motion.div>
        </>
      )}
    </AdminLayout>
  );
}

export default HotelAdminDashboard;
