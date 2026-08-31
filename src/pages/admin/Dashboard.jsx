import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BusFront,
  ChevronRight,
  Clock,
  Navigation,
  PercentCircle,
  RefreshCw,
  Route as RouteIcon,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout, { getNavForRole } from "../../components/admin/AdminLayout";
import { useAdminSession } from "../../components/admin/AdminSession";
import { getCompanies } from "../../services/companyService";
import { getBuses } from "../../services/busService";
import { getDrivers } from "../../services/driverService";
import { getNews } from "../../services/newsService";
import { getCompanyBookings } from "../../services/bookingService";
import { getLiveTrips } from "../../services/TripService";

const normalizeData = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.companies)) return res.companies;
  if (Array.isArray(res?.buses)) return res.buses;
  if (Array.isArray(res?.drivers)) return res.drivers;
  if (Array.isArray(res?.news)) return res.news;
  if (Array.isArray(res?.trips)) return res.trips;
  return [];
};

/* One operations KPI — label on top, a big mono figure, a small sub-line. tone
   lets the live numbers carry status colour (green = running, amber = delayed)
   so the two that change minute-to-minute read first. */
function KpiTile({ icon: Icon, value, label, sub, tone = "default", loading }) {
  const valueColor =
    tone === "live"
      ? "text-status-live"
      : tone === "delayed"
      ? "text-status-delayed"
      : "text-content";
  const iconColor =
    tone === "live"
      ? "text-status-live"
      : tone === "delayed"
      ? "text-status-delayed"
      : "text-accent";

  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 ${iconColor}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      {loading ? (
        <div className="mt-2.5 h-6 w-14 animate-pulse rounded bg-surface-2" />
      ) : (
        <p className={`data-mono mt-2 text-[22px] font-bold leading-none ${valueColor}`}>
          {value}
        </p>
      )}
      {sub && <p className="mt-1.5 truncate text-[10.5px] text-content-muted">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { role } = useAdminSession();

  const [loading, setLoading] = useState(true);
  const [, setCompanies] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [, setNews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [current, past] = await Promise.allSettled([
        getCompanyBookings("current"),
        getCompanyBookings("past"),
      ]);
      const bookingList = [
        ...(current.status === "fulfilled" ? normalizeData(current.value) : []),
        ...(past.status === "fulfilled" ? normalizeData(past.value) : []),
      ];
      setBookings(bookingList);

      const [c, b, d, n, t] = await Promise.allSettled([
        getCompanies(),
        getBuses(),
        getDrivers(),
        getNews(),
        getLiveTrips(),
      ]);
      if (c.status === "fulfilled") setCompanies(normalizeData(c.value));
      if (b.status === "fulfilled") setBuses(normalizeData(b.value));
      if (d.status === "fulfilled") setDrivers(normalizeData(d.value));
      if (n.status === "fulfilled") setNews(normalizeData(n.value));
      if (t.status === "fulfilled") setLiveTrips(normalizeData(t.value));
    } catch {
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const totalRoutes = useMemo(() => {
    const pairs = new Set();
    buses.forEach((bus) => {
      if (bus.route?.fromCity && bus.route?.toCity) {
        const key = [bus.route.fromCity, bus.route.toCity].sort().join("→");
        pairs.add(key);
      }
    });
    return pairs.size;
  }, [buses]);

  const totalRevenue = useMemo(
    () => bookings.filter((b) => b.status !== "Cancelled").reduce((sum, b) => sum + (b.fare || 0), 0),
    [bookings]
  );

  const occupancyRate = useMemo(() => {
    const capacity = buses.reduce((sum, bus) => sum + (bus.totalSeats || 0), 0);
    if (!capacity) return 0;
    const confirmed = bookings.filter((b) => b.status !== "Cancelled").length;
    return Math.round((confirmed / capacity) * 100);
  }, [bookings, buses]);

  /* Live operations — the numbers that move minute to minute. */
  const activeTrips = useMemo(
    () => liveTrips.filter((t) => t.tripStatus === "Running").length,
    [liveTrips]
  );
  const delayedNow = useMemo(
    () =>
      liveTrips.filter(
        (t) => t.tripStatus === "Running" && (t.delayMinutes || 0) > 0
      ).length,
    [liveTrips]
  );

  const STATS = useMemo(
    () => [
      {
        icon: Navigation,
        value: activeTrips,
        label: "On the road",
        sub: activeTrips === 1 ? "1 bus running" : `${activeTrips} buses running`,
        tone: "live",
      },
      {
        icon: Clock,
        value: delayedNow,
        label: "Delayed",
        sub: delayedNow > 0 ? "behind schedule" : "all on time",
        tone: delayedNow > 0 ? "delayed" : "default",
      },
      { icon: BusFront, value: buses.length, label: "Fleet", sub: "total buses" },
      { icon: UserRound, value: drivers.length, label: "Drivers", sub: "on roster" },
      { icon: RouteIcon, value: totalRoutes, label: "Active routes", sub: "city pairs" },
      { icon: Ticket, value: bookings.length, label: "Bookings", sub: "all time" },
      {
        icon: Wallet,
        value: `Rs ${totalRevenue.toLocaleString()}`,
        label: "Revenue",
        sub: "confirmed",
      },
      { icon: PercentCircle, value: `${occupancyRate}%`, label: "Occupancy", sub: "seats sold" },
    ],
    [activeTrips, delayedNow, buses, drivers, totalRoutes, bookings, totalRevenue, occupancyRate]
  );

  const manageLinks = getNavForRole(role).filter((n) => n.path !== "/admin");

  return (
    <AdminLayout
      requireSuperAdmin
      title="Operations"
      subtitle="Super Admin overview"
      actions={
        <button
          type="button"
          onClick={fetchAll}
          aria-label="Refresh"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-input border border-line bg-surface text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <section>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STATS.map((s) => (
            <KpiTile key={s.label} {...s} loading={loading} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-content-muted">
          Manage
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {manageLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 transition-colors duration-200 hover:border-accent-line"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-content">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-content-muted">
                    Manage {item.label.toLowerCase()}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-muted" />
              </Link>
            );
          })}
        </div>
      </section>
    </AdminLayout>
  );
}
