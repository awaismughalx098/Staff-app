import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BusFront,
  ChevronRight,
  RefreshCw,
  Ticket,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "../../../components/admin/AdminLayout";
import { GlassEmptyState, GlassSkeleton } from "../../../components/glass";
import {
  getCompanyRevenue,
  getBusRevenue,
} from "../../../services/revenueService";
import { formatPrice } from "../../../utils/tours";
import { getUploadUrl } from "../../../config";
import useMyCompany from "./useMyCompany";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function BusAdminBuses() {
  const company = useMyCompany();

  const [buses, setBuses] = useState([]);
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBuses = async () => {
    if (!company.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getCompanyRevenue(company.id);
      setBuses(res?.data?.buses || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your buses");
    } finally {
      setLoading(false);
    }
  };

  const openBus = async (row) => {
    setLoading(true);
    try {
      const res = await getBusRevenue(row._id);
      setBus(res?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load that bus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuses();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [company.id]);

  return (
    <AdminLayout
      requireRole="busAdmin"
      title={bus ? bus.bus.busNo : "Earnings"}
      subtitle={
        bus ? "Bookings on this bus" : company.name || "What each bus has taken"
      }
      actions={
        bus ? (
          <button
            type="button"
            onClick={() => setBus(null)}
            className="glass-surface flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-content-muted transition-colors hover:text-content"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={loadBuses}
            aria-label="Refresh"
            className="glass-surface flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )
      }
    >
      {loading ? (
        <div className="space-y-3">
          <GlassSkeleton className="h-[72px]" count={4} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LIST */}
          {!bus && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {buses.map((b, i) => (
                <motion.button
                  key={b._id}
                  type="button"
                  onClick={() => openBus(b)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                  className="glass-surface flex w-full cursor-pointer items-center gap-3 rounded-card p-3.5 text-left shadow-glass transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
                    {getImageUrl(b.image) ? (
                      <img
              loading="lazy"
              decoding="async"
                        src={getImageUrl(b.image)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BusFront className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[14px] font-bold text-content">
                      {b.busNo}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-content-muted">
                      {b.category}
                      {b.subCategory ? ` · ${b.subCategory}` : ""} ·{" "}
                      {b.totalSeats || "?"} seats
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-[14px] font-bold text-content">
                      {formatPrice(b.revenue)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-content-muted">
                      {b.tickets} ticket{b.tickets === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
                </motion.button>
              ))}

              {buses.length === 0 && (
                <GlassEmptyState
                  icon={BusFront}
                  title="No buses yet"
                  description="Your Super Admin adds buses to your company."
                  className="mt-14"
                />
              )}
            </motion.div>
          )}

          {/* ONE BUS */}
          {bus && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="glass-surface rounded-card p-4 shadow-glass">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                    <Wallet className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-3 font-display text-xl font-black leading-none text-content">
                    {formatPrice(bus.revenue)}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-content-muted">
                    This bus&apos;s revenue
                  </p>
                </div>
                <div className="glass-surface rounded-card p-4 shadow-glass">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Ticket className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-3 font-display text-xl font-black leading-none text-content">
                    {bus.tickets}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-content-muted">
                    Tickets sold
                  </p>
                </div>
                <div className="glass-surface rounded-card p-4 shadow-glass">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Ticket className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-3 font-display text-xl font-black leading-none text-content">
                    {bus.cancelled}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-content-muted">Cancelled</p>
                </div>
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
                    className="mt-12"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </AdminLayout>
  );
}

export default BusAdminBuses;
