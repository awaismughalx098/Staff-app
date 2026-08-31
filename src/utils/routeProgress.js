/* How far along the straight From->To line a city sits (0 = at From, 1 = at
   To), using the same planar lat/lng projection as the backend's route
   suggestion corridor. Used purely to auto-insert a newly added stop at its
   correct position instead of always appending to the end. */
export function computeRouteProgress(cityName, fromCity, toCity, cities) {
  const byName = new Map(cities.map((c) => [c.name, c]));
  const fromDoc = byName.get(fromCity);
  const toDoc = byName.get(toCity);
  const cityDoc = byName.get(cityName);

  if (
    !fromDoc?.latitude || !fromDoc?.longitude ||
    !toDoc?.latitude || !toDoc?.longitude ||
    !cityDoc?.latitude || !cityDoc?.longitude
  ) {
    return null;
  }

  const x1 = fromDoc.longitude, y1 = fromDoc.latitude;
  const x2 = toDoc.longitude, y2 = toDoc.latitude;
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return null;

  const px = cityDoc.longitude, py = cityDoc.latitude;
  return ((px - x1) * dx + (py - y1) * dy) / lenSq;
}
