import { BUS_TYPES, DEFAULT_BUS_TYPE } from "./busTypes";

const shapeFor = (busType) => BUS_TYPES[busType] || BUS_TYPES[DEFAULT_BUS_TYPE];

/** Rows of `perRow` seats (shape depends on busType), numbered 1..totalSeats in reading
 *  order, always ending in a 4-seat back row (like a real coach's back bench). Mirrors
 *  backend/utils/seatLayout.js. */
export function buildSeatLayout(busType, totalSeats) {
  const { perRow } = shapeFor(busType);
  const seats = Math.max(Number(totalSeats) || 1, 1);
  const backRowSize = Math.min(4, seats);
  const rows = [];
  let remaining = seats - backRowSize;
  let seatNumber = 1;

  const makeRow = (count) => {
    const row = [];
    for (let i = 0; i < count; i += 1) {
      row.push(String(seatNumber));
      seatNumber += 1;
    }
    return row;
  };

  while (remaining > 0) {
    const count = Math.min(perRow, remaining);
    rows.push(makeRow(count));
    remaining -= count;
  }

  rows.push(makeRow(backRowSize));

  return rows;
}

export function flattenSeatNumbers(busType, totalSeats) {
  return buildSeatLayout(busType, totalSeats).flat();
}
