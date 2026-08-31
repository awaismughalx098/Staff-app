import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BusFront,
  CheckCircle2,
  LogOut,
  Navigation,
  Play,
  QrCode,
  Route as RouteIcon,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { getBusesByCompany } from "../../services/busService";
import { getUploadUrl } from "../../config";

function Dashboard() {
  const navigate = useNavigate();

  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const driverInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("driverInfo") || "null");
    } catch {
      return null;
    }
  }, []);

  const companyId = driverInfo?.company?._id || driverInfo?.company;
  const companyName = driverInfo?.company?.name || "your company";

  const normalizeData = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.buses)) return response.buses;
    return [];
  };

  const getImageUrl = (image, width) => getUploadUrl(image, width);

  const fetchBuses = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getBusesByCompany(companyId);
      setBuses(normalizeData(response));
    } catch {
      toast.error("Unable to load buses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const availableBuses = useMemo(() => {
    return buses
      .filter((bus) => bus.isActive !== false)
      /* Searchable by route as well as number: a driver knows the road
         they are running, not always which coach is set to it. */
      .filter((bus) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          bus.busNo,
          bus.route?.fromCity,
          bus.route?.toCity,
          ...(bus.route?.stops || []),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [buses, search]);

  const handleSelectBus = (bus) => {
    localStorage.setItem("selectedDriverBus", JSON.stringify(bus));
    toast.success(`${bus.busNo} selected`);
    navigate("/driver/start-trip");
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverInfo");
    localStorage.removeItem("selectedDriverBus");
    toast.success("Logged out");
    navigate("/driver-login");
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="glass-surface rounded-card p-5 text-content shadow-glass md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-accent">
                Driver Portal &middot; {companyName}
              </p>

              <h1 className="mt-2 font-display text-2xl font-black tracking-tight md:text-4xl lg:text-5xl">
                Select your bus
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-content-muted md:text-base lg:text-lg">
                Choose an available bus, add route stops, then start live GPS
                tracking for passengers.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/driver/scan-ticket")}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-white shadow-glass transition-all duration-300 ease-in-out hover:brightness-110"
              >
                <QrCode className="h-5 w-5" />
                <span className="hidden sm:inline">Scan Ticket</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="glass-surface flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-content transition-colors duration-300 ease-in-out hover:bg-white/60"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/50 p-4">
              <BusFront className="h-6 w-6 text-accent" />
              <h3 className="mt-3 text-xl font-black text-content">
                {buses.length}
              </h3>
              <p className="text-sm text-content-muted">Total Buses</p>
            </div>

            <div className="rounded-2xl bg-white/50 p-4">
              <CheckCircle2 className="h-6 w-6 text-accent" />
              <h3 className="mt-3 text-xl font-black text-content">
                {availableBuses.length}
              </h3>
              <p className="text-sm text-content-muted">Available Buses</p>
            </div>

            <div className="rounded-2xl bg-white/50 p-4">
              <Navigation className="h-6 w-6 text-accent" />
              <h3 className="mt-3 text-xl font-black text-content">GPS</h3>
              <p className="text-sm text-content-muted">
                Ready for live tracking
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-faint" />

            <input
              type="text"
              placeholder="Search by bus number or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-surface h-12 w-full rounded-input pl-12 pr-4 text-sm font-medium text-content outline-none transition-colors duration-300 ease-in-out focus:border-accent-line md:text-base"
            />
          </div>
        </section>

        <section className="mt-6">
          {!companyId ? (
            <div className="glass-surface rounded-card p-8 text-center shadow-glass">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <AlertCircle className="h-7 w-7" />
              </div>

              <h2 className="mt-4 text-xl font-black text-content">
                No company assigned
              </h2>

              <p className="mt-2 text-sm leading-6 text-content-muted md:text-base">
                Ask your admin to assign your driver account to a bus company.
              </p>
            </div>
          ) : loading ? (
            <div className="glass-surface rounded-card p-8 text-center shadow-glass">
              <p className="text-sm font-bold text-accent md:text-base">
                Loading buses...
              </p>
            </div>
          ) : availableBuses.length === 0 ? (
            <div className="glass-surface rounded-card p-8 text-center shadow-glass">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <AlertCircle className="h-7 w-7" />
              </div>

              <h2 className="mt-4 text-xl font-black text-content">
                No buses available
              </h2>

              <p className="mt-2 text-sm leading-6 text-content-muted md:text-base">
                Admin has not added any active bus for {companyName} yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {availableBuses.map((bus) => (
                <article
                  key={bus._id}
                  className="glass-surface overflow-hidden rounded-card shadow-glass"
                >
                  <div className="h-40 w-full bg-accent-soft sm:h-44 md:h-48">
                    {getImageUrl(bus.image) ? (
                      <img
              loading="lazy"
              decoding="async"
                        src={getImageUrl(bus.image)}
                        alt={bus.busNo}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-accent">
                        <BusFront className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="break-words text-xl font-black text-content md:text-2xl">
                      {bus.busNo}
                    </h2>

                    {/* The route is what a driver picks a bus by — they are
                        running a particular road today and need the coach
                        already set to it. */}
                    {bus.route?.fromCity && bus.route?.toCity ? (
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-content md:text-base">
                        <RouteIcon className="h-4 w-4 shrink-0 text-accent" />
                        {bus.route.fromCity} → {bus.route.toCity}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-content-faint">
                        No route set on this bus
                      </p>
                    )}

                    {bus.route?.stops?.length > 0 && (
                      <p className="mt-1 text-xs text-content-muted md:text-sm">
                        via {bus.route.stops.join(" · ")}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">
                        {bus.category || "Luxury"}
                      </span>

                      <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">
                        {bus.subCategory || "Standard"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectBus(bus)}
                      className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-input bg-accent text-sm font-black text-white shadow-premium transition-transform duration-300 ease-in-out active:scale-[0.98] md:text-base"
                    >
                      Select Bus
                      <Play className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
