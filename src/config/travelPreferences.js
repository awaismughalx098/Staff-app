/**
 * The roads an operator can ask a route to take.
 *
 * Mirrors backend/config/travelPreferences.js — the ids are stored on the bus
 * and validated by the model's enum, so the two lists have to agree.
 */
export const TRAVEL_PREFERENCES = ["motorway", "main-road", "any"];

export const DEFAULT_PREFERENCE = "any";

export const TRAVEL_PREFERENCE_OPTIONS = [
  {
    id: "motorway",
    label: "Motorway",
    hint: "The fast road, past the towns",
  },
  {
    id: "main-road",
    label: "Main road",
    hint: "The old road, through them",
  },
  {
    id: "any",
    label: "Either",
    hint: "Whichever is quickest",
  },
];

export const preferenceLabel = (id) =>
  TRAVEL_PREFERENCE_OPTIONS.find((option) => option.id === id)?.label || "road";
