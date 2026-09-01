import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BusFront,
  Clock,
  MapPin,
  Navigation,
  Power,
  RefreshCw,
  Signal,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import SeatMapSheet from "../../components/driver/SeatMapSheet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  endTrip,
  getDriverRunningTrip,
  updateTripLocation,
} from "../../services/TripService";
import {
  ROUTE_LINE,
  buildRoute,
  computeBearingDeg,
  createBusIcon,
  createStopDotIcon,
  createStopIcon,
} from "../../utils/mapMarkers";
import MapLayers from "../../components/maps/MapLayers";

/* A phone gets a GPS fix in seconds; a laptop relies on Wi-Fi positioning and
   can need far longer, so the first attempt is patient and the retry drops the
   high-accuracy requirement rather than giving up. */
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 30000,
};

const GEO_OPTIONS_RELAXED = {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 60000,
};

/* Remembers that the driver switched GPS on, so a page refresh or an accidental
   reload resumes sharing location instead of silently going dark and leaving
   passengers with a frozen bus. Cleared only when the driver explicitly stops
   GPS or ends the trip — not on ordinary unmount/navigation. */
const GPS_ACTIVE_KEY = "driverGpsActive";

/* Frames the full route once, then follows the bus as GPS pings arrive */
function FitRoute({ points, tripId }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), {
      padding: [70, 90],
      maxZoom: 13,
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, map]);

  return null;
}

function FollowBus({ position, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position?.lat || !position?.lng) return;
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.8 });
  }, [position, enabled, map]);

  return null;
}

function LiveTrip() {
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestLocationRef = useRef(null);
  const previousLocationRef = useRef(null);
  const warnedRef = useRef(false);
  const syncFailedRef = useRef(false);
  const prevCityRef = useRef(undefined);
  const wakeLockRef = useRef(null);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [hasFix, setHasFix] = useState(false);
  const [ending, setEnding] = useState(false);

  const [seatPromptOpen, setSeatPromptOpen] = useState(false);

  const [location, setLocation] = useState({
    lat: 30.8081,
    lng: 73.4458,
    speed: 0,
    heading: 0,
  });

  const route = useMemo(
    () =>
      buildRoute(
        trip,
        location?.lat && location?.lng ? [location.lat, location.lng] : null
      ),
    [trip, location]
  );

  const normalizeTrip = (response) => response?.data || response;

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calculateSpeed = (current) => {
    const previous = previousLocationRef.current;

    if (!previous) {
      previousLocationRef.current = { ...current, time: Date.now() };
      return current.speed || 0;
    }

    const distance = calculateDistanceMeters(
      previous.lat,
      previous.lng,
      current.lat,
      current.lng
    );

    const seconds = (Date.now() - previous.time) / 1000;
    previousLocationRef.current = { ...current, time: Date.now() };

    if (seconds <= 0 || distance < 3) return current.speed || 0;

    return Math.round((distance / seconds) * 3.6);
  };

  const loadRunningTrip = async () => {
    try {
      setLoading(true);
      const response = await getDriverRunningTrip();
      const runningTrip = normalizeTrip(response);

      if (!runningTrip) {
        toast.error("No running trip found");
        navigate("/driver");
        return;
      }

      setTrip(runningTrip);

      if (runningTrip.currentLatitude && runningTrip.currentLongitude) {
        setLocation({
          lat: runningTrip.currentLatitude,
          lng: runningTrip.currentLongitude,
          speed: runningTrip.speed || 0,
          heading: runningTrip.heading || 0,
        });
      }

      /* Refreshed mid-trip with GPS on before? Resume sharing automatically.
         If permission is still granted this is silent; if it was revoked,
         handleGeoError surfaces it and clears the intent. */
      if (localStorage.getItem(GPS_ACTIVE_KEY) === "1") {
        startGPS();
      }
    } catch {
      navigate("/driver");
    } finally {
      setLoading(false);
    }
  };

  const handlePosition = (position) => {
    /* position.coords.heading is null whenever the device can't determine it
       (very common at low speed, or on plenty of phones even in motion) — that's
       what makes the bus icon rotate to a stale/garbage direction. When that
       happens, fall back to the bearing between the last two real fixes, and
       only when they're far enough apart that GPS jitter can't fake a turn. */
    const previous = previousLocationRef.current;
    const rawHeading = position.coords.heading;

    const movedFarEnough =
      previous &&
      calculateDistanceMeters(
        previous.lat,
        previous.lng,
        position.coords.latitude,
        position.coords.longitude
      ) > 8;

    const fallbackHeading = !Number.isFinite(rawHeading) && movedFarEnough
      ? computeBearingDeg(
          previous.lat,
          previous.lng,
          position.coords.latitude,
          position.coords.longitude
        )
      : null;

    const rawLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      /* Horizontal accuracy in metres, so the server can flag a vague fix
         rather than trusting it as a precise position. */
      accuracy: Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : null,
      speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0,
      heading: Number.isFinite(rawHeading)
        ? rawHeading
        : fallbackHeading ?? previous?.heading ?? 0,
    };

    const nextLocation = {
      ...rawLocation,
      speed: calculateSpeed(rawLocation),
    };

    latestLocationRef.current = nextLocation;
    setLocation(nextLocation);
    setHasFix(true);
    warnedRef.current = false;
  };

  const beginWatch = (options, relaxed) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => handleGeoError(error, relaxed),
      options
    );
  };

  /* watchPosition reports transient failures (a slow first fix, a moment
     without signal) through the same callback as a hard permission denial.
     Only a denial should end the session — anything else keeps the watch
     alive, otherwise one slow fix silently switches GPS back off. */
  const handleGeoError = (error, relaxed) => {
    if (error.code === error.PERMISSION_DENIED) {
      toast.error(
        "Location blocked. Allow it from the icon in the browser's address bar, then start GPS again."
      );
      stopGPS();
      return;
    }

    if (!relaxed) {
      /* First fix failed at high accuracy — retry without it, which works on
         laptops and indoors where there is no GPS chip to talk to. */
      toast.message("Still finding your location…");
      beginWatch(GEO_OPTIONS_RELAXED, true);
      return;
    }

    if (!warnedRef.current) {
      warnedRef.current = true;
      toast.error(
        error.code === error.TIMEOUT
          ? "Location is taking a while — keeping GPS on and retrying."
          : "Location unavailable. Check that location services are switched on for this device."
      );
    }
  };

  /* Keep the screen awake while sharing location. A phone that dims or locks
     throttles the sync timer and GPS to roughly once a minute — which is exactly
     what makes the bus look frozen to passengers. Best-effort: some browsers
     don't support it, and the lock releases itself when the tab is hidden, so it
     is re-acquired on visibility change below. */
  const acquireWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* Denied, unsupported, or the tab isn't visible — not fatal. */
    }
  };

  const releaseWakeLock = () => {
    try {
      wakeLockRef.current?.release?.();
    } catch {
      /* Already released. */
    }
    wakeLockRef.current = null;
  };

  const startGPS = () => {
    if (!navigator.geolocation) {
      toast.error("This browser does not support location");
      return;
    }

    warnedRef.current = false;
    setHasFix(false);
    setGpsActive(true);
    /* Persist the intent so a refresh resumes sharing (see GPS_ACTIVE_KEY). */
    localStorage.setItem(GPS_ACTIVE_KEY, "1");
    acquireWakeLock();
    beginWatch(GEO_OPTIONS, false);
  };

  /* Stops the watch and the sync loop but leaves the "GPS was on" intent alone —
     used on unmount, where the component is leaving (navigation, refresh) but
     the driver has not chosen to stop sharing. */
  const teardownWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    releaseWakeLock();
  };

  const stopGPS = () => {
    teardownWatch();
    setGpsActive(false);
    setHasFix(false);
    /* An explicit stop — forget the intent so a later refresh stays off. */
    localStorage.removeItem(GPS_ACTIVE_KEY);
  };

  const syncLocationToServer = async () => {
    if (!trip?._id || !latestLocationRef.current) return;

    try {
      const current = latestLocationRef.current;

      const response = await updateTripLocation(trip._id, {
        latitude: current.lat,
        longitude: current.lng,
        speed: current.speed,
        heading: current.heading,
        accuracy: current.accuracy,
      });

      const updatedTrip = normalizeTrip(response);
      if (updatedTrip) setTrip(updatedTrip);
      syncFailedRef.current = false;
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      /* The trip is gone or finished — retrying can never succeed, so stop
         rather than leaving the driver staring at a failing screen. */
      if (status === 404 || status === 400) {
        stopGPS();
        toast.error(message || "This trip is no longer running");
        navigate("/driver");
        return;
      }

      /* Surface what the server actually said — "Failed to sync" alone gives
         the driver nothing to act on. Warn once per failure streak so a patchy
         signal doesn't bury the screen in toasts. */
      if (!syncFailedRef.current) {
        syncFailedRef.current = true;
        toast.error(message || "Couldn't reach the server to sync GPS");
      }
    }
  };

  const openSeatPrompt = () => setSeatPromptOpen(true);


  const handleEndTrip = async () => {
    if (!trip?._id) return;

    try {
      setEnding(true);
      stopGPS();
      await endTrip(trip._id);

      localStorage.removeItem("activeDriverTrip");
      localStorage.removeItem("selectedDriverBus");

      toast.success("Trip ended successfully");
      navigate("/driver");
    } catch {
      toast.error("Failed to end trip");
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    loadRunningTrip();
    /* Only tear down the watch on unmount — keep the intent so a refresh or a
       trip back to this screen resumes sharing. An explicit Stop GPS / End Trip
       clears it. */
    return () => teardownWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gpsActive || !trip?._id) return;

    intervalRef.current = setInterval(syncLocationToServer, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gpsActive, trip?._id]);

  /* A screen wake lock releases whenever the tab is hidden; re-acquire it when
     the driver comes back to the tab, as long as GPS is still on. */
  useEffect(() => {
    if (!gpsActive) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") acquireWakeLock();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [gpsActive]);

  /* First render just records the baseline city — only a change AFTER that
     means the bus actually reached a new stop, worth interrupting for. */
  useEffect(() => {
    if (!trip) return;
    const city = trip.currentCity || "";

    if (prevCityRef.current === undefined) {
      prevCityRef.current = city;
      return;
    }

    if (city && city !== prevCityRef.current) {
      prevCityRef.current = city;
      openSeatPrompt();
    } else {
      prevCityRef.current = city;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.currentCity]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="glass-surface rounded-card p-6 text-center shadow-glass">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-accent" />
          <p className="mt-3 text-sm font-black text-content">
            Loading live trip...
          </p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="glass-surface rounded-card p-6 text-center shadow-glass">
          <AlertCircle className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-3 text-sm font-black text-content">
            No running trip found.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-bg text-content">
      <section className="relative h-full w-full">
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={14}
          scrollWheelZoom
          className="h-full w-full"
        >
          <MapLayers topOffset={150} />

          {/* White casing so the blue route pops off the pale basemap */}
          {route.all.length > 1 && (
            <Polyline
              positions={route.all}
              weight={6}
              color={ROUTE_LINE.casing}
              opacity={0.9}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {route.travelled.length > 1 && (
            <Polyline
              positions={route.travelled}
              weight={3}
              color={ROUTE_LINE.travelled}
              opacity={1}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Light-blue round dots for the part still ahead — a 1px dash with
              round caps renders as evenly spaced dots (matches the design).
              Static, not animated: the moving version read as busy. */}
          {route.ahead.length > 1 && (
            <Polyline
              positions={route.ahead}
              weight={3}
              color={ROUTE_LINE.ahead}
              opacity={1}
              lineCap="round"
              dashArray="1 8"
            />
          )}

          {(trip.stops || []).map((stop, i, arr) => {
            if (!stop.lat || !stop.lng) return null;

            const isEndpoint = i === 0 || i === arr.length - 1;
            const isCurrent = stop.status === "current";
            const isHighlighted = isEndpoint || isCurrent;

            return (
              <Marker
                key={`${stop.city}-${stop.order}`}
                position={[stop.lat, stop.lng]}
                icon={
                  isHighlighted
                    ? createStopIcon(stop.status, stop.order)
                    : createStopDotIcon(stop.status)
                }
                zIndexOffset={isCurrent ? 400 : isEndpoint ? 200 : 0}
              >
                <Tooltip
                  permanent={isHighlighted}
                  direction="right"
                  offset={[isHighlighted ? 14 : 8, 0]}
                  className={`lg-stop-label ${stop.status === "passed" ? "is-passed" : ""}`}
                >
                  {stop.city}
                </Tooltip>
                <Popup>
                  <b>{stop.city}</b>
                  <br />
                  Stop {stop.order} · {stop.status}
                  {stop.distanceFromBus
                    ? ` · ${(stop.distanceFromBus / 1000).toFixed(1)} km away`
                    : ""}
                </Popup>
              </Marker>
            );
          })}

          <Marker
            position={[location.lat, location.lng]}
            icon={createBusIcon({ live: hasFix })}
            zIndexOffset={1000}
          >
            <Popup>
              <b>{trip.bus?.busNo}</b>
              <br />
              {trip.bus?.company?.name}
              <br />
              {location.speed || 0} km/h · ETA {trip.eta || "Updating"}
            </Popup>
          </Marker>

          <FitRoute points={route.all} tripId={trip?._id} />
          <FollowBus position={location} enabled={hasFix} />
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] p-4 pt-safe">
          <div className="glass-surface pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between rounded-card p-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Driver Live Trip
              </p>
              <h1 className="mt-0.5 truncate font-display text-xl font-bold text-content">
                {trip.bus?.busNo || "Bus"}
              </h1>
            </div>

            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                !gpsActive
                  ? "bg-elevated text-content-muted"
                  : hasFix
                  ? "bg-route-green-soft text-route-green"
                  : "bg-accent-soft text-accent"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-current ${
                  gpsActive ? "animate-soft-pulse" : ""
                }`}
              />
              {!gpsActive ? "GPS OFF" : hasFix ? "GPS ON" : "SEARCHING"}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[600] p-4 pb-safe">
          <div className="glass-surface mx-auto w-full max-w-md rounded-card p-4">
            <div className="flex items-center gap-3 rounded-card border border-line bg-elevated p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                <BusFront className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Current Route
                </p>
                <h2 className="truncate font-display text-lg font-bold text-content">
                  {trip.currentCity || "Starting"} →{" "}
                  {trip.nextStop || "Final Stop"}
                </h2>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              <Info icon={Signal} label="Speed" value={`${location.speed || 0} km/h`} />
              <Info
                icon={MapPin}
                label="Next in"
                value={
                  trip.nextStopEtaMinutes === null ||
                  trip.nextStopEtaMinutes === undefined
                    ? "—"
                    : `${trip.nextStopEtaMinutes}m`
                }
              />
              <Info icon={Clock} label="ETA" value={trip.eta || "Updating"} />
              <Info
                icon={Navigation}
                label="Left"
                value={trip.remainingKm ? `${trip.remainingKm} km` : "—"}
              />
              <button
                type="button"
                onClick={() => openSeatPrompt()}
                className="rounded-xl border border-route-green-soft bg-route-green-soft p-2.5 text-center transition hover:brightness-110"
              >
                <Users className="mx-auto h-4 w-4 text-route-green" />
                <p className="mt-1 text-[10px] text-content-muted">Seats</p>
                <p className="truncate font-display text-[12px] font-bold text-route-green">
                  {trip.freeSeats ?? 0}
                </p>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={gpsActive ? stopGPS : startGPS}
                className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full font-display text-sm font-bold transition-colors duration-200 ${
                  gpsActive
                    ? "border border-line bg-elevated text-content"
                    : "bg-accent text-white"
                }`}
              >
                <Navigation className="h-5 w-5" />
                {!gpsActive ? "Start GPS" : hasFix ? "Stop GPS" : "Searching…"}
              </button>

              <button
                type="button"
                onClick={handleEndTrip}
                disabled={ending}
                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/15 font-display text-sm font-bold text-danger transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <Power className="h-5 w-5" />
                {ending ? "Ending..." : "End Trip"}
              </button>
            </div>

            <div className="mt-3 max-h-28 space-y-1.5 overflow-y-auto rounded-card border border-line bg-elevated p-3">
              {(trip.stops || []).map((stop) => (
                <div
                  key={`${stop.city}-${stop.order}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${
                        stop.status === "passed"
                          ? "text-route-green"
                          : stop.status === "current"
                          ? "text-accent"
                          : "text-content-muted"
                      }`}
                    />
                    <span className="truncate text-xs font-semibold text-content">
                      {stop.city}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-content-muted">
                    {stop.distanceFromBus
                      ? `${(stop.distanceFromBus / 1000).toFixed(1)} km`
                      : stop.status}
                    {stop.freeSeatsAtStop !== null && stop.freeSeatsAtStop !== undefined
                      ? ` · ${stop.freeSeatsAtStop} seats`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Opened on arrival at each stop, and from the Seats tile. The seat
            layout replaces the old "how many free seats?" number — the driver
            can see who is aboard and give a seat to whoever gets on here. */}
        <SeatMapSheet
          tripId={trip._id}
          open={seatPromptOpen}
          onClose={() => setSeatPromptOpen(false)}
          onChanged={loadRunningTrip}
        />

      </section>
    </main>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-accent" />
      <p className="mt-1 text-[10px] text-content-muted">{label}</p>
      <p className="truncate font-display text-[12px] font-bold text-content">{value}</p>
    </div>
  );
}

export default LiveTrip;