import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BusFront,
  Camera,
  Clock,
  ImageMinus,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { GlassModal } from "../glass";
import EntityCard from "./EntityCard";
import {
  addButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  searchInputClass,
  searchWrapClass,
  selectClass,
  textareaClass,
} from "./adminFormStyles";
import {
  createBus,
  deleteBus,
  getBusesByCompany,
  updateBus,
} from "../../services/busService";
import { getCities } from "../../services/cityService";
import { planBusRoute } from "../../services/routeSuggestionService";
import {
  DEFAULT_PREFERENCE,
  TRAVEL_PREFERENCE_OPTIONS,
  preferenceLabel,
} from "../../config/travelPreferences";
import CitySelect from "../shared/CitySelect";
import StopsEditor from "../shared/StopsEditor";
import { BUS_BRANDS, BUS_TYPES, DEFAULT_BUS_TYPE } from "../../utils/busTypes";
import { getUploadUrl } from "../../config";

const getImageUrl = (img, width) => getUploadUrl(img, width);

const normalizeData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.buses)) return response.buses;
  return [];
};

/* ---------------------------------------------------------------- */
/* Buses panel — always scoped to one company, so the form never    */
/* needs a company picker of its own.                               */
/* ---------------------------------------------------------------- */

const emptyRoute = {
  fromCity: "",
  toCity: "",
  stops: [],
  travelPreference: DEFAULT_PREFERENCE,
};

const EMPTY_BUS_FORM = {
  busNo: "",
  category: "Luxury",
  subCategory: "",
  description: "",
  image: null,
  preview: "",
  busType: DEFAULT_BUS_TYPE,
  brand: "Others",
  model: "",
  departureTime: "",
  arrivalTime: "",
  totalSeats: 45,
  fare: "",
  amenities: "",
  legFares: [],
  stopTimes: [],
  stopPoints: [],
  route: emptyRoute,
};

function BusesPanel({ companyId }) {
  const fileRef = useRef(null);

  const [buses, setBuses] = useState([]);
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [suggestedStops, setSuggestedStops] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  /* What the road itself says about the stops: their real order, and any that
     this road never passes. */
  const [routePlan, setRoutePlan] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_BUS_FORM);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [busData, cityData] = await Promise.all([
        getBusesByCompany(companyId),
        getCities(),
      ]);
      setBuses(normalizeData(busData));
      setCities(normalizeData(cityData));
    } catch {
      toast.error("Unable to load buses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const filteredBuses = useMemo(() => {
    const text = query.toLowerCase().trim();
    if (!text) return buses;
    return buses.filter(
      (bus) =>
        bus.busNo?.toLowerCase().includes(text) ||
        bus.category?.toLowerCase().includes(text) ||
        bus.subCategory?.toLowerCase().includes(text) ||
        bus.busType?.toLowerCase().includes(text) ||
        bus.brand?.toLowerCase().includes(text)
    );
  }, [buses, query]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_BUS_FORM);
    setSuggestedStops([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  /* Re-planned whenever the ends, the road or the stops change: the same call
     answers "which towns is this road actually on" and "are these stops in
     the order the bus drives them". Debounced because it hits a routing
     service, and the stops change on every keystroke of an edit.

     The first plan for a journey nobody has planned before comes back with
     `stopSuggestionsPending`, because finding every town beside a new road
     means asking OpenStreetMap and that takes far longer than a form can
     wait. It is looked up in the background and cached, so one more call a
     few seconds later picks the answer up. */
  useEffect(() => {
    const { fromCity, toCity, stops, travelPreference } = form.route;

    if (!fromCity || !toCity || fromCity === toCity) {
      setSuggestedStops([]);
      setRoutePlan(null);
      return;
    }

    let cancelled = false;
    let retry;

    const plan = async () => {
      const response = await planBusRoute({
        from: fromCity,
        to: toCity,
        preference: travelPreference || DEFAULT_PREFERENCE,
        stops,
      });

      if (cancelled) return;

      setSuggestedStops(response?.data?.suggestedStops || []);
      setRoutePlan(response?.data || null);

      if (response?.data?.stopSuggestionsPending) {
        retry = setTimeout(() => plan().catch(() => {}), 8000);
      }
    };

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        await plan();
      } catch {
        if (!cancelled) {
          setSuggestedStops([]);
          setRoutePlan(null);
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.route.fromCity,
    form.route.toCity,
    form.route.travelPreference,
    form.route.stops,
  ]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, image: file, preview: URL.createObjectURL(file) });
  };

  const removeImage = () => {
    setForm({ ...form, image: null, preview: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  /* Leg fares follow the Preset Route's path (fromCity -> stops -> toCity), rebuilt whenever
     the path changes, preserving already-entered fares by matching (from,to). */
  useEffect(() => {
    const { fromCity, toCity, stops } = form.route;
    const path = fromCity && toCity ? [fromCity, ...stops, toCity] : [];

    setForm((f) => {
      if (path.length < 2) {
        return f.legFares.length === 0 ? f : { ...f, legFares: [] };
      }

      const nextLegs = [];
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        const existing = f.legFares.find((l) => l.from === from && l.to === to);
        nextLegs.push({ from, to, fare: existing ? existing.fare : "" });
      }

      const same =
        nextLegs.length === f.legFares.length &&
        nextLegs.every((l, i) => l.from === f.legFares[i]?.from && l.to === f.legFares[i]?.to);

      return same ? f : { ...f, legFares: nextLegs };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.route.fromCity, form.route.toCity, form.route.stops]);

  const updateLegFare = (idx, value) => {
    setForm((f) => {
      const legs = [...f.legFares];
      legs[idx] = { ...legs[idx], fare: value };
      return { ...f, legFares: legs };
    });
  };

  /* One row per stop on the whole path, origin and destination included —
     those are stops the bus reaches too, and tracking has to know where they
     are. Rebuilt whenever the route changes, keeping anything already typed by
     matching on the name so editing the middle of a route does not wipe the
     coordinates either side of it. */
  useEffect(() => {
    const { fromCity, toCity, stops } = form.route;
    const path = fromCity && toCity ? [fromCity, ...stops, toCity] : [];

    setForm((f) => {
      const next = path.map((name) => {
        const kept = f.stopPoints.find((p) => p.name === name);
        return (
          kept || {
            name,
            lat: "",
            lng: "",
            scheduledArrival: "",
            scheduledDeparture: "",
            dwellMinutes: "",
            isActive: true,
          }
        );
      });

      const same =
        next.length === f.stopPoints.length &&
        next.every((p, i) => p.name === f.stopPoints[i]?.name);

      return same ? f : { ...f, stopPoints: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.route.fromCity, form.route.toCity, form.route.stops]);

  const updateStopPoint = (idx, field, value) => {
    setForm((f) => {
      const points = [...f.stopPoints];
      points[idx] = { ...points[idx], [field]: value };
      return { ...f, stopPoints: points };
    });
  };

  const openEdit = (bus) => {
    setEditingId(bus._id);
    setForm({
      busNo: bus.busNo || "",
      category: bus.category || "Luxury",
      subCategory: bus.subCategory || "",
      description: bus.description || "",
      image: null,
      preview: getImageUrl(bus.image),
      busType: bus.busType || DEFAULT_BUS_TYPE,
      brand: bus.brand || "Others",
      model: bus.model || "",
      departureTime: bus.departureTime || "",
      arrivalTime: bus.arrivalTime || "",
      totalSeats: bus.totalSeats || 45,
      fare: bus.fare || "",
      amenities: Array.isArray(bus.amenities) ? bus.amenities.join(", ") : "",
      legFares: Array.isArray(bus.legFares) ? bus.legFares : [],
      stopTimes: Array.isArray(bus.stopTimes) ? bus.stopTimes : [],
      /* Blanks rather than nulls, so an unset coordinate shows as an empty box
         instead of the word "null" in the field. */
      stopPoints: (bus.route?.stopPoints || []).map((p) => ({
        name: p.name,
        lat: p.lat ?? "",
        lng: p.lng ?? "",
        scheduledArrival: p.scheduledArrival || "",
        scheduledDeparture: p.scheduledDeparture || "",
        dwellMinutes: p.dwellMinutes ?? "",
        isActive: p.isActive !== false,
      })),
      route: {
        fromCity: bus.route?.fromCity || "",
        toCity: bus.route?.toCity || "",
        stops: Array.isArray(bus.route?.stops) ? bus.route.stops : [],
        travelPreference: bus.route?.travelPreference || DEFAULT_PREFERENCE,
      },
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteBus(id);
      toast.success("Bus deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bus delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.busNo || !form.category || !form.description) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("company", companyId);
      formData.append("busNo", form.busNo);
      formData.append("category", form.category);
      formData.append("subCategory", form.subCategory);
      formData.append("description", form.description);
      formData.append("route", JSON.stringify(form.route));
      formData.append("busType", form.busType);
      formData.append("brand", form.brand);
      formData.append("model", form.model);
      formData.append("departureTime", form.departureTime);
      formData.append("arrivalTime", form.arrivalTime);
      formData.append("totalSeats", form.totalSeats);
      formData.append("fare", form.fare || 0);
      formData.append(
        "amenities",
        JSON.stringify(
          form.amenities
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        )
      );
      formData.append(
        "legFares",
        JSON.stringify(form.legFares.filter((l) => l.from && l.to && l.fare !== ""))
      );
      /* stopTimes is not sent: the server derives it from these, so the
         schedule cannot be entered twice and end up disagreeing with itself. */
      formData.append(
        "stopPoints",
        JSON.stringify(
          form.stopPoints.filter(
            (p) =>
              p.name &&
              (p.lat !== "" || p.scheduledArrival || p.scheduledDeparture)
          )
        )
      );
      if (form.image) formData.append("image", form.image);

      if (editingId) {
        await updateBus(editingId, formData);
        toast.success("Bus updated successfully");
      } else {
        await createBus(formData);
        toast.success("Bus added successfully");
      }

      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bus operation failed");
    } finally {
      setSaving(false);
    }
  };

  const seatConfig = BUS_TYPES[form.busType] || BUS_TYPES[DEFAULT_BUS_TYPE];

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={`${searchWrapClass} flex-1`}>
          <Search className="h-4 w-4 shrink-0 text-content-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buses..."
            className={searchInputClass}
          />
        </div>
        <button
          type="button"
          onClick={fetchData}
          aria-label="Refresh"
          className="glass-surface flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors duration-200 hover:text-content"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button type="button" onClick={openCreate} className={`${addButtonClass} shrink-0`}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-surface h-[160px] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredBuses.length === 0 ? (
          <div className="glass-surface rounded-2xl p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <BusFront className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-content">No buses found</h2>
            <p className="mt-2 text-sm text-content-muted">
              Add this company&apos;s first bus to allow drivers to start trips.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBuses.map((bus) => (
              <EntityCard
                key={bus._id}
                image={getImageUrl(bus.image)}
                icon={BusFront}
                title={bus.busNo}
                subtitle={bus.busType || DEFAULT_BUS_TYPE}
                meta={
                  bus.route?.fromCity && bus.route?.toCity
                    ? `${bus.route.fromCity} → ${bus.route.toCity}${
                        bus.route.stops?.length ? ` (${bus.route.stops.length} stops)` : ""
                      }`
                    : bus.description
                }
                badges={[bus.category]}
                status={{
                  label: bus.isActive === false ? "Inactive" : "Active",
                  active: bus.isActive !== false,
                }}
                onEdit={() => openEdit(bus)}
                onDelete={() => handleDelete(bus._id)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Bus" : "Add Bus"}
        subtitle="Route and stops are optional — drivers can override before starting a trip."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-surface rounded-xl p-3.5">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                {form.preview ? (
                  <img
              loading="lazy"
              decoding="async" src={form.preview} alt="Bus" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-accent">
                    <BusFront className="h-7 w-7" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-content-muted">Bus Image</p>
                <p className="mt-1 text-[11px] leading-4 text-content-muted">
                  Shown in passenger and driver panels.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-9 items-center justify-center gap-1.5 rounded-input bg-accent text-[12.5px] font-bold text-white"
              >
                <Camera className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="flex h-9 items-center justify-center gap-1.5 rounded-input bg-white/50 text-[12.5px] font-bold text-content-muted"
              >
                <ImageMinus className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Bus Number</label>
            <input
              value={form.busNo}
              onChange={(e) => setForm({ ...form, busNo: e.target.value })}
              placeholder="e.g LGT-101"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={selectClass}
            >
              <option value="Luxury">Luxury</option>
              <option value="Business">Business</option>
              <option value="Local">Local</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Sub Category</label>
            <input
              value={form.subCategory}
              onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
              placeholder="AC / Non AC"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Bus Type</label>
              <select
                value={form.busType}
                onChange={(e) => setForm({ ...form, busType: e.target.value })}
                className={selectClass}
              >
                {Object.keys(BUS_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={selectClass}
              >
                {BUS_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Model</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g Coaster 2023"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {seatConfig.unit === "Bed" ? "Beds" : "Seats"}
              </label>
              <input
                type="number"
                min="1"
                value={form.totalSeats}
                onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                placeholder="45"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Departure Time
                </span>
              </label>
              <input
                type="time"
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Arrival Time
                </span>
              </label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Base Fare (Rs)</label>
            <input
              type="number"
              min="0"
              value={form.fare}
              onChange={(e) => setForm({ ...form, fare: e.target.value })}
              placeholder="2500"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Amenities (comma separated)</label>
            <input
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              placeholder="WiFi, Charging ports, Water, Blanket"
              className={inputClass}
            />
          </div>

          <div className="rounded-xl bg-white/50 p-3.5">
            <p className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-content-muted">
              <RouteIcon className="h-4 w-4 text-accent" />
              Preset Route (optional)
            </p>

            <div className="space-y-3">
              <CitySelect
                cities={cities}
                value={form.route.fromCity}
                onChange={(v) => setForm({ ...form, route: { ...form.route, fromCity: v } })}
                placeholder="From city"
                icon={MapPin}
              />
              <CitySelect
                cities={cities}
                value={form.route.toCity}
                onChange={(v) => setForm({ ...form, route: { ...form.route, toCity: v } })}
                placeholder="To city"
                icon={Navigation}
              />

              {/* Which road, asked before the stops — the answer decides which
                  towns are even on the way. A run that stays on the motorway
                  never touches the towns on the old road beside it; take that
                  road instead and it passes every one. */}
              {form.route.fromCity && form.route.toCity && (
                <div>
                  <span className={labelClass}>Which road does it take?</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {TRAVEL_PREFERENCE_OPTIONS.map((option) => {
                      const active =
                        (form.route.travelPreference || DEFAULT_PREFERENCE) === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              route: { ...form.route, travelPreference: option.id },
                            })
                          }
                          className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            active
                              ? "border-accent bg-accent-soft"
                              : "border-line bg-white/60 hover:bg-white"
                          }`}
                        >
                          <span
                            className={`block text-[13px] font-bold ${
                              active ? "text-accent" : "text-content"
                            }`}
                          >
                            {option.label}
                          </span>
                          <span className="block text-[11px] leading-4 text-content-muted">
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {routePlan?.corridor && (
                    <p className="mt-2 text-[11.5px] text-content-muted">
                      {routePlan.corridor.distanceKm} km · about{" "}
                      {Math.floor(routePlan.corridor.durationMinutes / 60)}h{" "}
                      {routePlan.corridor.durationMinutes % 60}m by road ·{" "}
                      {routePlan.corridor.averageSpeedKph} km/h average
                    </p>
                  )}

                  {/* Said plainly rather than silently taking the other road:
                      the operator picked a road we could not find. */}
                  {routePlan && !routePlan.preferenceApplied && (
                    <p className="mt-1.5 text-[11.5px] leading-5 text-warning">
                      {routePlan.preferenceNotice}
                    </p>
                  )}
                </div>
              )}

              {/* The road's own verdict on what they typed. */}
              {routePlan?.sequence && !routePlan.sequence.inOrder && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
                  <p className="flex items-start gap-2 text-[12px] font-bold text-content">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    Route sequence appears incorrect
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-content-muted">
                    On this road the bus reaches them as{" "}
                    <span className="font-semibold text-content">
                      {routePlan.sequence.correctOrder.join(" → ")}
                    </span>
                    .
                    {routePlan.sequence.destinationShouldBe && (
                      <>
                        {" "}
                        That makes{" "}
                        <span className="font-semibold text-content">
                          {routePlan.sequence.destinationShouldBe}
                        </span>{" "}
                        the far end of the route, not a stop along it.
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        route: {
                          ...form.route,
                          stops: routePlan.sequence.correctStops,
                          toCity: routePlan.sequence.correctDestination,
                        },
                      })
                    }
                    className="mt-2 cursor-pointer rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-bold text-white"
                  >
                    Put them in order
                  </button>
                </div>
              )}

              {routePlan?.sequence?.offRoute?.length > 0 && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 p-3">
                  <p className="flex items-start gap-2 text-[12px] font-bold text-content">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    Not on this road
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-content-muted">
                    {routePlan.sequence.offRoute
                      .map((s) => `${s.name} is ${s.offRouteKm} km off`)
                      .join(", ")}
                    . The bus would have to leave the{" "}
                    {preferenceLabel(form.route.travelPreference).toLowerCase()} to
                    call there — switch roads, or drop the stop.
                  </p>
                </div>
              )}

              {/* Once there are stops, the numbers that matter are the ones
                  for the journey through them, not the direct road. */}
              {routePlan?.journey && (
                <p className="text-[11.5px] text-content-muted">
                  Through these stops: {routePlan.journey.distanceKm} km ·{" "}
                  {Math.floor(routePlan.journey.durationMinutes / 60)}h{" "}
                  {routePlan.journey.durationMinutes % 60}m
                </p>
              )}

              {routePlan?.unknownStops?.length > 0 && (
                <p className="text-[11.5px] leading-5 text-danger">
                  We couldn't find {routePlan.unknownStops.join(", ")} on the map, so
                  {routePlan.unknownStops.length > 1 ? " they were" : " it was"} left
                  out of the check.
                </p>
              )}

              {form.route.fromCity && form.route.toCity && (
                <StopsEditor
                  cities={cities}
                  stops={form.route.stops}
                  onChange={(stops) => setForm({ ...form, route: { ...form.route, stops } })}
                  suggestions={suggestedStops}
                  loadingSuggestions={loadingSuggestions}
                  fromCity={form.route.fromCity}
                  toCity={form.route.toCity}
                />
              )}

              {form.stopPoints.length > 0 && (
                <div className="space-y-2.5 border-t border-line pt-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      Where each stop is, and when the bus is due
                    </p>
                    {/* Said once, here, because it is the reason the fields
                        exist: a city's centre is not its bus stand, and live
                        tracking can only be as accurate as these. */}
                    <p className="mt-1 text-[10.5px] leading-relaxed text-content-muted">
                      A stop with no coordinates falls back to the city centre, which
                      can be kilometres from the terminal. Set them to track arrivals
                      properly.
                    </p>
                  </div>

                  {form.stopPoints.map((point, idx) => {
                    const placed = point.lat !== "" && point.lng !== "";

                    return (
                      <div
                        key={point.name}
                        className="rounded-lg border border-line bg-surface p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-content-muted">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-content">
                            {point.name}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase ${
                              placed
                                ? "bg-status-live-soft text-status-live"
                                : "bg-surface-2 text-content-muted"
                            }`}
                          >
                            {placed ? "Placed" : "City centre"}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <input
                            inputMode="decimal"
                            placeholder="Latitude"
                            value={point.lat}
                            onChange={(e) => updateStopPoint(idx, "lat", e.target.value)}
                            className={`${inputClass} h-9 text-[12px]`}
                          />
                          <input
                            inputMode="decimal"
                            placeholder="Longitude"
                            value={point.lng}
                            onChange={(e) => updateStopPoint(idx, "lng", e.target.value)}
                            className={`${inputClass} h-9 text-[12px]`}
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <label className="block">
                            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-content-muted">
                              Arrives
                            </span>
                            <input
                              type="time"
                              value={point.scheduledArrival}
                              onChange={(e) =>
                                updateStopPoint(idx, "scheduledArrival", e.target.value)
                              }
                              className={`${inputClass} h-9 text-[12px]`}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-content-muted">
                              Departs
                            </span>
                            <input
                              type="time"
                              value={point.scheduledDeparture}
                              onChange={(e) =>
                                updateStopPoint(idx, "scheduledDeparture", e.target.value)
                              }
                              className={`${inputClass} h-9 text-[12px]`}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-wide text-content-muted">
                              Dwell min
                            </span>
                            <input
                              inputMode="numeric"
                              placeholder="—"
                              value={point.dwellMinutes}
                              onChange={(e) =>
                                updateStopPoint(idx, "dwellMinutes", e.target.value)
                              }
                              className={`${inputClass} h-9 text-[12px]`}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/50 p-3.5">
            <p className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-content-muted">
              <RouteIcon className="h-4 w-4 text-accent" />
              Leg Fares (optional)
            </p>

            {form.legFares.length === 0 ? (
              <p className="text-[11px] text-content-muted">
                Set the Preset Route above first — each stop-to-stop leg gets its own fare
                here, and a passenger's total is the sum of the legs they travel. Until then,
                every booking uses the base fare above.
              </p>
            ) : (
              <div className="space-y-2">
                {form.legFares.map((leg, idx) => (
                  <div key={`${leg.from}-${leg.to}`} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-content">
                      {leg.from} → {leg.to}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={leg.fare}
                      onChange={(e) => updateLegFare(idx, e.target.value)}
                      placeholder="Rs"
                      className={`${inputClass} w-24 shrink-0 px-2 text-center`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Write bus description..."
              rows={3}
              className={textareaClass}
            />
          </div>

          <button type="submit" disabled={saving} className={primaryButtonClass}>
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Update Bus" : "Add Bus"}
          </button>
        </form>
      </GlassModal>
    </div>
  );
}

export default BusesPanel;
