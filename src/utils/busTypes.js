export const BUS_BRANDS = ["Daewoo", "Yutong", "Hyundai", "Golden Dragon", "Toyota", "Others"];

/**
 * perRow: seats per row before wrapping to the next row.
 * aisleAfter: how many seats sit before the aisle gap (0 = no gap, packed row).
 * unit: label used in the UI ("Seat" vs "Bed").
 * Seat/bed COUNT is always admin-editable per bus — busType only decides shape.
 * Mirrors backend/utils/busTypes.js.
 */
export const BUS_TYPES = {
  "Executive": { perRow: 4, aisleAfter: 2, unit: "Seat" },
  "Business Class": { perRow: 3, aisleAfter: 1, unit: "Seat" },
  "Sleeper": { perRow: 2, aisleAfter: 1, unit: "Bed" },
  "Mini Coach": { perRow: 4, aisleAfter: 2, unit: "Seat" },
  "Hiace/Van": { perRow: 3, aisleAfter: 0, unit: "Seat" },
};

export const DEFAULT_BUS_TYPE = "Executive";
