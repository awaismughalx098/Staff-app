import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BusFront,
  Radio,
  MapPin,
  Navigation,
  Play,
  Loader2,
  Users,
  Route as RouteIcon,
  Flag,
} from "lucide-react";
import { toast } from "sonner";

import { getDriverRunningTrip, startTrip } from "../../services/TripService";
import { getCities } from "../../services/cityService";
import { getRouteSuggestions } from "../../services/routeSuggestionService";
import CitySelect from "../../components/shared/CitySelect";
import StopsEditor from "../../components/shared/StopsEditor";

function StepBadge({ n }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-text">
      {n}
    </span>
  );
}

function StartTrip() {
  const navigate = useNavigate();

  const [selectedBus, setSelectedBus] = useState(null);
  const [cities, setCities] = useState([]);
  const [suggestedStops, setSuggestedStops] = useState([]);
  const [stops, setStops] = useState([]);

  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [starting, setStarting] = useState(false);

  /* The trip this driver already has running, if any. Checked on arrival
     rather than discovered by failing: a driver who came back to the app to
     look at their trip should not have to fill this form in and be refused to
     find out it is already going. */
  const [runningTrip, setRunningTrip] = useState(null);

  const [form, setForm] = useState({
    fromCity: "",
    toCity: "",
    freeSeats: "",
  });

  const fetchCities = async () => {
    try {
      setLoadingCities(true);
      const response = await getCities();
      setCities(Array.isArray(response?.data) ? response.data : []);
    } catch {
      toast.error("Unable to load cities");
    } finally {
      setLoadingCities(false);
    }
  };

  useEffect(() => {
    const storedBus = localStorage.getItem("selectedDriverBus");

    if (!storedBus) {
      toast.error("Please select a bus first");
      navigate("/driver");
      return;
    }

    const bus = JSON.parse(storedBus);
    setSelectedBus(bus);

    if (bus?.route?.fromCity) {
      setForm((prev) => ({
        ...prev,
        fromCity: bus.route.fromCity || "",
        toCity: bus.route.toCity || "",
      }));
      setStops(Array.isArray(bus.route.stops) ? bus.route.stops : []);
    }

    fetchCities();
  }, [navigate]);

  const fetchRouteSuggestions = async (fromCity, toCity) => {
    if (!fromCity || !toCity || fromCity === toCity) {
      setSuggestedStops([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const response = await getRouteSuggestions(fromCity, toCity);
      setSuggestedStops(Array.isArray(response?.data) ? response.data : []);
    } catch {
      toast.error("Unable to load route suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (form.fromCity && form.toCity) {
      fetchRouteSuggestions(form.fromCity, form.toCity);
    } else {
      setSuggestedStops([]);
    }
  }, [form.fromCity, form.toCity]);

  const getCityObject = (cityName) => {
    return cities.find(
      (city) => city.name.toLowerCase() === cityName.toLowerCase()
    );
  };

  const handleStartTrip = async () => {
    if (!form.fromCity || !form.toCity || !form.freeSeats) {
      toast.error("Please fill all required fields");
      return;
    }

    if (form.fromCity === form.toCity) {
      toast.error("From city and destination cannot be same");
      return;
    }

    const fromCityObj = getCityObject(form.fromCity);
    const toCityObj = getCityObject(form.toCity);

    if (!fromCityObj || !toCityObj) {
      toast.error("Invalid city selected");
      return;
    }

    const stopObjects = stops.map((stopName) => getCityObject(stopName)).filter(Boolean);
    const finalCities = [fromCityObj, ...stopObjects, toCityObj];

    try {
      setStarting(true);

      const response = await startTrip({
        bus: selectedBus._id,
        freeSeats: Number(form.freeSeats),
        cities: finalCities.map((city) => ({
          city: city.name,
          lat: city.latitude,
          lng: city.longitude,
        })),
      });

      localStorage.setItem("activeDriverTrip", JSON.stringify(response.data));
      toast.success("Trip started successfully");
      navigate("/driver/live-trip");
    } catch (error) {
      const conflict = error?.response?.data?.activeTrip;

      /* Their own trip, running. Surface the way back instead of leaving them
         with an error and no next step. */
      if (conflict?.isMine) {
        const res = await getDriverRunningTrip().catch(() => null);
        if (res?.data) setRunningTrip(res.data);
      }

      toast.error(error?.response?.data?.message || "Failed to start trip");
    } finally {
      setStarting(false);
    }
  };

  /* Shown above the form whenever a trip of this driver's is already running.
     Deliberately not a redirect: the driver may have come here to start a trip
     on a different bus, and deciding for them would make that impossible.
     Plain JSX rather than a component declared here — a component defined in
     the render body is a new type on every render, so React remounts it. */
  const runningTripBanner = runningTrip ? (
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center gap-3 rounded-card border border-accent-line bg-accent-soft px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <Radio className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-content">
            You have a trip running
          </span>
          <span className="block truncate text-[11.5px] text-content-muted">
            {runningTrip.bus?.busNo ? `${runningTrip.bus.busNo} · ` : ""}
            {runningTrip.stops?.[0]?.city} →{" "}
            {runningTrip.stops?.[runningTrip.stops.length - 1]?.city}
          </span>
        </span>

        <button
          type="button"
          onClick={() => {
            /* Live Trip reads this to reopen without waiting on a fetch. */
            localStorage.setItem("activeDriverTrip", JSON.stringify(runningTrip));
            navigate("/driver/live-trip");
          }}
          className="shrink-0 rounded-input bg-accent px-4 py-2 text-[13px] font-bold text-white"
        >
          Show my trip
        </button>
      </div>
  ) : null;

  if (!selectedBus) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <div className="glass-surface flex items-center gap-3 rounded-card px-6 py-4 text-content-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="text-sm font-semibold">Loading selected bus...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-bg px-4 py-5 pb-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => navigate("/driver")}
          className="glass-surface mb-5 flex h-11 items-center gap-2 rounded-input px-4 text-sm font-bold text-content transition-colors duration-300 ease-in-out hover:bg-white/60"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        {runningTripBanner}

        {/* Colorful gradient hero */}
        <section
          className="relative overflow-hidden rounded-card p-6 shadow-glass md:p-9"
          style={{
            background:
              "linear-gradient(120deg, var(--accent) 0%, var(--secondary) 60%, var(--route-blue) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

          <p className="relative text-xs font-black uppercase tracking-[0.2em] text-white/80">
            Start Trip
          </p>

          <h1 className="relative mt-2 text-2xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
            Plan your route
          </h1>

          <p className="relative mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
            Pick any city in Pakistan as your start, stops or destination —
            suggestions come from your route, not just a fixed list.
          </p>

          <div className="relative mt-6 flex items-center gap-4 rounded-card border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-accent">
              <BusFront className="h-8 w-8" />
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-black text-white">
                {selectedBus.busNo}
              </h2>
              <p className="text-sm font-medium text-white/80">
                {selectedBus.company?.name || "Transit Company"}
                {selectedBus.route?.fromCity ? " · Preset route loaded" : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Route step card */}
          <div className="glass-surface rounded-card p-5 shadow-glass">
            <div className="flex items-center gap-3">
              <StepBadge n={1} />
              <h2 className="flex items-center gap-2 text-lg font-black text-content md:text-xl">
                <RouteIcon className="h-5 w-5 text-route-blue" />
                Route
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-content-muted">
                  From City
                </label>
                <CitySelect
                  cities={cities}
                  value={form.fromCity}
                  onChange={(v) => setForm((p) => ({ ...p, fromCity: v }))}
                  placeholder="Select start city"
                  icon={MapPin}
                  disabled={loadingCities}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-content-muted">
                  Destination
                </label>
                <CitySelect
                  cities={cities}
                  value={form.toCity}
                  onChange={(v) => setForm((p) => ({ ...p, toCity: v }))}
                  placeholder="Select destination"
                  icon={Navigation}
                  disabled={loadingCities}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <StepBadge n={2} />
                <h3 className="flex items-center gap-2 text-base font-black text-content">
                  <Users className="h-5 w-5 text-route-green" />
                  Free Seats
                </h3>
              </div>

              <input
                type="number"
                min="0"
                value={form.freeSeats}
                onChange={(e) => setForm({ ...form, freeSeats: e.target.value })}
                placeholder="e.g 24"
                className="glass-surface h-12 w-full rounded-input px-4 text-sm font-bold text-content outline-none transition-colors duration-300 ease-in-out focus-visible:border-accent placeholder:text-content-muted md:text-base"
              />

              <button
                type="button"
                onClick={handleStartTrip}
                disabled={starting || loadingCities}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-input bg-accent text-base font-black text-accent-text shadow-premium transition-all duration-300 ease-in-out hover:brightness-110 disabled:opacity-60"
              >
                {starting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                {starting ? "Starting Trip..." : "Start Live Trip"}
              </button>
            </div>
          </div>

          {/* Stops step card */}
          <div className="glass-surface rounded-card p-5 shadow-glass">
            <div className="flex items-center gap-3">
              <StepBadge n={3} />
              <h2 className="flex items-center gap-2 text-lg font-black text-content md:text-xl">
                <Flag className="h-5 w-5 text-route-red" />
                Stops
              </h2>
            </div>

            <p className="mt-2 pl-10 text-sm font-medium leading-6 text-content-muted">
              Search any city to add a stop, or tap a suggestion.
            </p>

            <div className="mt-5">
              {!form.fromCity || !form.toCity ? (
                <div className="glass-surface rounded-input p-4 text-center text-sm font-bold text-content-muted">
                  Select from city and destination first.
                </div>
              ) : (
                <StopsEditor
                  cities={cities}
                  stops={stops}
                  onChange={setStops}
                  suggestions={suggestedStops}
                  loadingSuggestions={loadingSuggestions}
                  fromCity={form.fromCity}
                  toCity={form.toCity}
                />
              )}
            </div>

            {(form.fromCity || stops.length > 0 || form.toCity) && (
              <div className="mt-5 rounded-input border border-accent-line bg-accent-soft p-4">
                <p className="text-xs font-black uppercase tracking-wide text-accent">
                  Final Route
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-content">
                  {[form.fromCity, ...stops, form.toCity].filter(Boolean).join(" → ")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default StartTrip;
