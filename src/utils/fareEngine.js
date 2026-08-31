/* The service fee is not defined here. It varies by what is being booked and
   is decided by the server — the seat map reply carries the figure for the
   coach in question, so the client always quotes what it will be charged. */

/** [fromCity, ...stops, toCity] — the bus's full boarding order, or [] if no preset route. Mirrors backend/utils/fareEngine.js. */
export function getRoutePath(bus) {
  if (!bus?.route?.fromCity || !bus?.route?.toCity) return [];
  return [bus.route.fromCity, ...(bus.route.stops || []), bus.route.toCity];
}

/** Sum of leg fares between fromCity and toCity along the bus's route; falls back to the flat `fare`
 *  when the route/leg fares aren't configured or don't cover the requested cities. */
export function computeLegFare(bus, fromCity, toCity) {
  const path = getRoutePath(bus);
  const fromIdx = path.indexOf(fromCity);
  const toIdx = path.indexOf(toCity);

  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) {
    return bus.fare || 0;
  }

  let total = 0;
  for (let i = fromIdx; i < toIdx; i += 1) {
    const leg = (bus.legFares || []).find((l) => l.from === path[i] && l.to === path[i + 1]);
    if (!leg) return bus.fare || 0;
    total += leg.fare;
  }

  return total;
}

/** Departure/arrival "HH:MM" at a leg's two endpoints plus how many intermediate
 *  stops sit between them, read off the bus's own schedule (departureTime/arrivalTime
 *  at the two route endpoints, stopTimes for everything in between). Returns null if
 *  fromCity/toCity aren't both on the bus's route in order. */
export function getLegSchedule(bus, fromCity, toCity) {
  const path = getRoutePath(bus);
  const fromIdx = path.indexOf(fromCity);
  const toIdx = path.indexOf(toCity);

  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return null;

  const timeAt = (idx) => {
    if (idx === 0) return bus.departureTime || "";
    if (idx === path.length - 1) return bus.arrivalTime || "";
    const city = path[idx];
    return (bus.stopTimes || []).find((s) => s.city === city)?.time || "";
  };

  return {
    fromTime: timeAt(fromIdx),
    toTime: timeAt(toIdx),
    stopsBetween: toIdx - fromIdx - 1,
  };
}
