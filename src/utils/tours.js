/* Group a flat tour list into one entry per company */
export const groupToursByCompany = (tours) => {
  const map = new Map();
  tours.forEach((tour) => {
    const id = tour.company?._id;
    if (!id) return;
    if (!map.has(id)) map.set(id, { company: tour.company, tours: [] });
    map.get(id).tours.push(tour);
  });
  return [...map.values()];
};

export const formatPrice = (price) =>
  `Rs ${Number(price || 0).toLocaleString("en-PK")}`;

/** "Mon, 24 Aug 2026" — the operator's scheduled departure. */
export const formatDepartureDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Date with the operator's free-text time appended, when they set one. */
export const formatDeparture = (date, time) => {
  const day = formatDepartureDate(date);
  if (!day) return null;
  return time ? `${day} · ${time}` : day;
};
