import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BusFront,
  ChevronRight,
  RefreshCw,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState } from "../../../components/glass";
import { getCompanyRevenue } from "../../../services/revenueService";
import { getDrivers } from "../../../services/driverService";
import { formatPrice } from "../../../utils/tours";
import useMyCompany from "./useMyCompany";

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

function BusAdminDashboard() {
  const company = useMyCompany();

  const [stats, setStats] = useState(null);
  const [driverCount, setDriverCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!company.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    /* Drivers are a separate endpoint; a failure there should not blank the
       revenue figures, so the two are settled independently. */
    const [rev, drv] = await Promise.allSettled([
      getCompanyRevenue(company.id),
      getDrivers(),
    ]);

    if (rev.status === "fulfilled") {
      setStats(rev.value?.data || null);
    } else {
      toast.error(
        rev.reason?.response?.data?.message || "Couldn't load your figures"
      );
    }

    if (drv.status === "fulfilled") {
      const list = Array.isArray(drv.value?.data) ? drv.value.data : [];
      setDriverCount(list.length);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [company.id]);

  return (
    <AdminLayout
      requireRole="busAdmin"
      title={company.name || "My Company"}
      subtitle="Bus Company Admin"
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
          icon={BusFront}
          title="No company assigned yet"
          description="Ask the Super Admin to link your account to a bus company."
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
              icon={Ticket}
              value={stats?.tickets ?? 0}
              label="Tickets sold"
              loading={loading}
            />
            <StatCard
              icon={BusFront}
              value={stats?.buses?.length ?? 0}
              label="Buses"
              loading={loading}
            />
            <StatCard
              icon={UserRound}
              value={driverCount}
              label="Drivers"
              loading={loading}
            />
          </motion.div>

          <motion.div {...fadeUp(0.05)} className="mt-3">
            <StatCard
              icon={Users}
              value={stats?.passengers ?? 0}
              label="Customers who booked with you"
              loading={loading}
            />
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mt-4 grid gap-3 sm:grid-cols-3">
            <QuickLink
              to="/bus-admin/buses"
              icon={BusFront}
              title="My Buses"
              subtitle="Revenue per bus"
            />
            <QuickLink
              to="/bus-admin/bookings"
              icon={Ticket}
              title="Bookings"
              subtitle="Every ticket sold"
            />
            <QuickLink
              to="/bus-admin/drivers"
              icon={UserRound}
              title="Drivers"
              subtitle="Your drivers"
            />
          </motion.div>

          {!loading && stats?.tickets === 0 && (
            <GlassEmptyState
              icon={Ticket}
              title="No tickets sold yet"
              description="Bookings for your buses will appear here as passengers buy them."
              className="mt-6"
            />
          )}
        </>
      )}
    </AdminLayout>
  );
}

export default BusAdminDashboard;
