import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArmchairIcon,
  BedDouble,
  BusFront,
  CalendarDays,
  ChevronRight,
  Globe,
  Sparkles,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton } from "../../components/glass";
import {
  getRevenueOverview,
  getCompanyRevenueList,
  getCompanyRevenue,
  getBusRevenue,
  getEventRevenueList,
} from "../../services/revenueService";
import { formatPrice } from "../../utils/tours";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] },
});

/* One per section id the overview returns. */
const SECTION_ICON = {
  bus: BusFront,
  hotel: BedDouble,
  tour: Globe,
  religious: Sparkles,
  event: CalendarDays,
};

function StatCard({ icon: Icon, value, label, accent }) {
  return (
    <div className="glass-surface rounded-card p-4 shadow-glass">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 font-display text-xl font-black leading-none text-content">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-content-muted">{label}</p>
    </div>
  );
}

/* One tappable row in any of the drill-down levels. */
function DrillRow({ image, icon: Icon, title, subtitle, revenue, meta, onClick, index }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className={`glass-surface flex w-full items-center gap-3 rounded-card p-3.5 text-left shadow-glass transition-transform ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]" : ""
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
        {image ? (
          <img
              loading="lazy"
              decoding="async" src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[14px] font-bold text-content">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
          {subtitle}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-display text-[14px] font-bold text-content">
          {formatPrice(revenue)}
        </span>
        <span className="mt-0.5 block text-[11px] text-content-muted">{meta}</span>
      </span>

      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />}
    </motion.button>
  );
}

function Revenue() {
  /* view: overview → companies → company → bus, or overview → events */
  const [view, setView] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState([]);
  const [totals, setTotals] = useState({ serviceCharges: 0, bookings: 0 });
  const [companies, setCompanies] = useState([]);
  const [companyKind, setCompanyKind] = useState("bus");
  const [company, setCompany] = useState(null);
  const [bus, setBus] = useState(null);
  const [events, setEvents] = useState([]);

  const load = async (fn, onData) => {
    setLoading(true);
    try {
      const res = await fn();
      onData(res?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load revenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(getRevenueOverview, (d) => {
      setOverview(d?.sections || []);
      setTotals({
        serviceCharges: d?.totalServiceCharges || 0,
        bookings: d?.totalBookings || 0,
      });
    });
  }, []);

  /* Which sections have an operator list to drill into. Hotels are their own
     collection rather than Companies, so asking for companies of kind
     "hotel" would return an empty page — it stays a summary row. */
  const DRILLABLE = ["bus", "tour", "religious", "event"];

  const openSection = (section) => {
    if (!DRILLABLE.includes(section.id)) return;

    if (section.id === "event") {
      setView("events");
      load(getEventRevenueList, (d) => setEvents(d || []));
      return;
    }
    setCompanyKind(section.id);
    setView("companies");
    load(() => getCompanyRevenueList(section.id), (d) => setCompanies(d || []));
  };

  const openCompany = (row) => {
    setView("company");
    load(() => getCompanyRevenue(row._id), (d) => setCompany(d));
  };

  const openBus = (row) => {
    setView("bus");
    load(() => getBusRevenue(row._id), (d) => setBus(d));
  };

  const back = () => {
    if (view === "bus") {
      setView("company");
    } else if (view === "company") {
      setView("companies");
    } else {
      setView("overview");
      load(getRevenueOverview, (d) => {
      setOverview(d?.sections || []);
      setTotals({
        serviceCharges: d?.totalServiceCharges || 0,
        bookings: d?.totalBookings || 0,
      });
    });
    }
  };

  const crumbs = useMemo(() => {
    const trail = [{ label: "Revenue", view: "overview" }];
    if (view === "events") trail.push({ label: "Events" });
    if (["companies", "company", "bus"].includes(view)) {
      trail.push({
        label:
          companyKind === "bus"
            ? "Bus Companies"
            : companyKind === "tour"
            ? "Tour Companies"
            : "Religious Tours",
        view: "companies",
      });
    }
    if (["company", "bus"].includes(view) && company?.company) {
      trail.push({ label: company.company.name, view: "company" });
    }
    if (view === "bus" && bus?.bus) trail.push({ label: bus.bus.busNo });
    return trail;
  }, [view, companyKind, company, bus]);

  return (
    <AdminLayout
      requireSuperAdmin
      title="Revenue"
      subtitle="Bookings and takings, section by section"
      actions={
        <button
          type="button"
          onClick={back}
          disabled={view === "overview"}
          className="glass-surface flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-content-muted transition-colors hover:text-content disabled:opacity-40"
        >
          Back
        </button>
      }
    >
      {/* BREADCRUMB */}
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-content-muted">
        {crumbs.map((c, i) => (
          <span key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={i === crumbs.length - 1 ? "font-bold text-content" : ""}>
              {c.label}
            </span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <GlassSkeleton className="h-[72px]" count={4} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} {...fadeUp()} className="mt-4">
            {/* LEVEL 1 — sections */}
            {view === "overview" && (
              <div className="space-y-3">
                {/* What the platform itself earned. Fares, room rates and
                    package prices are the operators' money and are reported
                    to them in their own consoles, deliberately not here. */}
                <div className="glass-surface rounded-card p-5 shadow-glass">
                  <p className="text-[11.5px] uppercase tracking-wide text-content-muted">
                    Service charges collected
                  </p>
                  <p className="mt-1 font-display text-3xl font-black text-accent">
                    {formatPrice(totals.serviceCharges)}
                  </p>
                  <p className="mt-1.5 text-[12px] text-content-muted">
                    across {totals.bookings} booking
                    {totals.bookings === 1 ? "" : "s"} · operator earnings are
                    not counted here
                  </p>
                </div>

                {overview.map((s, i) => (
                  <div key={s.id}>
                    <DrillRow
                      index={i}
                      icon={SECTION_ICON[s.id] || BusFront}
                      title={s.label}
                      subtitle={`${s.bookings} booking${
                        s.bookings === 1 ? "" : "s"
                      } · ${s.rate}`}
                      revenue={s.serviceCharges}
                      meta={`${s.customers ?? 0} customer${
                        (s.customers ?? 0) === 1 ? "" : "s"
                      }`}
                      onClick={
                        DRILLABLE.includes(s.id) && s.operators > 0
                          ? () => openSection(s)
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* LEVEL 2 — operators */}
            {view === "companies" && (
              <div className="space-y-3">
                {companies.map((c, i) => (
                  <DrillRow
                    key={c._id}
                    index={i}
                    image={getImageUrl(c.image)}
                    icon={BusFront}
                    title={c.name}
                    subtitle={`${c.buses} bus${c.buses === 1 ? "" : "es"} · ${
                      c.tickets
                    } ticket${c.tickets === 1 ? "" : "s"}`}
                    revenue={c.revenue}
                    meta={`${c.passengers} customer${c.passengers === 1 ? "" : "s"}`}
                    onClick={() => openCompany(c)}
                  />
                ))}
                {companies.length === 0 && (
                  <GlassEmptyState
                    icon={BusFront}
                    title="No operators in this section yet"
                    className="mt-10"
                  />
                )}
              </div>
            )}

            {/* LEVEL 2 — events */}
            {view === "events" && (
              <div className="space-y-3">
                {events.map((e, i) => (
                  <DrillRow
                    key={e._id}
                    index={i}
                    image={getImageUrl(e.image)}
                    icon={CalendarDays}
                    title={e.title}
                    subtitle={`${e.venue}, ${e.city} · ${formatDate(e.eventDate)}`}
                    revenue={e.revenue}
                    meta={`${e.tickets} ticket${e.tickets === 1 ? "" : "s"}`}
                  />
                ))}
                {events.length === 0 && (
                  <GlassEmptyState
                    icon={CalendarDays}
                    title="No events yet"
                    className="mt-10"
                  />
                )}
              </div>
            )}

            {/* LEVEL 3 — one company, broken down by bus */}
            {view === "company" && company && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatCard
                    icon={Wallet}
                    value={formatPrice(company.revenue)}
                    label="Total revenue"
                    accent
                  />
                  <StatCard icon={Ticket} value={company.tickets} label="Tickets sold" />
                  <StatCard icon={Users} value={company.passengers} label="Customers" />
                </div>

                <p className="mt-5 font-display text-[14px] font-bold text-content">
                  Buses
                </p>
                <div className="mt-2 space-y-3">
                  {company.buses.map((b, i) => (
                    <DrillRow
                      key={b._id}
                      index={i}
                      image={getImageUrl(b.image)}
                      icon={BusFront}
                      title={b.busNo}
                      subtitle={`${b.category}${
                        b.subCategory ? ` · ${b.subCategory}` : ""
                      } · ${b.totalSeats || "?"} seats`}
                      revenue={b.revenue}
                      meta={`${b.tickets} ticket${b.tickets === 1 ? "" : "s"}`}
                      onClick={() => openBus(b)}
                    />
                  ))}
                  {company.buses.length === 0 && (
                    <GlassEmptyState
                      icon={BusFront}
                      title="This company has no buses yet"
                      className="mt-10"
                    />
                  )}
                </div>
              </>
            )}

            {/* LEVEL 4 — one bus, and the tickets behind its takings */}
            {view === "bus" && bus && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatCard
                    icon={Wallet}
                    value={formatPrice(bus.revenue)}
                    label="This bus's revenue"
                    accent
                  />
                  <StatCard icon={Ticket} value={bus.tickets} label="Tickets sold" />
                  <StatCard
                    icon={ArmchairIcon}
                    value={bus.cancelled}
                    label="Cancelled"
                  />
                </div>

                <p className="mt-5 font-display text-[14px] font-bold text-content">
                  Bookings
                  <span className="ml-1.5 text-[12px] font-medium text-content-muted">
                    (cancelled shown, not counted)
                  </span>
                </p>

                <div className="mt-2 space-y-2">
                  {bus.bookings.map((b, i) => {
                    const cancelled = b.status === "Cancelled";
                    return (
                      <motion.div
                        key={b._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.28 }}
                        className={`glass-surface flex items-center gap-3 rounded-card p-3.5 ${
                          cancelled ? "opacity-60" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-[12px] font-bold text-accent">
                          {b.seatNumber}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-content">
                            {b.passengerName}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
                            {b.fromCity} → {b.toCity} · {formatDate(b.travelDate)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[13px] font-bold text-content">
                            {formatPrice((b.fare || 0) + (b.serviceFee || 0))}
                          </span>
                          <span
                            className={`mt-0.5 block text-[10.5px] font-bold ${
                              cancelled ? "text-danger" : "text-success"
                            }`}
                          >
                            {b.status}
                          </span>
                        </span>
                      </motion.div>
                    );
                  })}
                  {bus.bookings.length === 0 && (
                    <GlassEmptyState
                      icon={Ticket}
                      title="No bookings on this bus yet"
                      className="mt-10"
                    />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </AdminLayout>
  );
}

export default Revenue;
