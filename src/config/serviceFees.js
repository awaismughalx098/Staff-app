/* Mirrors backend/config/serviceFees.js. Kept in step by hand.
 *
 * The server is the authority: it computes the fee a booking is actually
 * charged and stores it on the record. These figures exist only so a sheet
 * can show the traveller what they are about to pay before they submit.
 *
 * Buses are deliberately absent — the seat map reply already carries the fee
 * for that particular coach, which is better than guessing from a copy.
 */

export const HOTEL_SERVICE_FEE = 100;

/* Per ticket, like buses. */
export const EVENT_SERVICE_FEE = 14;

export const NORTHERN_TOUR_SERVICE_FEE = 100;
export const RELIGIOUS_TOUR_SERVICE_FEE = 0;

/** Religious packages carry no fee; northern trips do. */
export const serviceFeeForTour = (tour) =>
  tour?.type === "Religious"
    ? RELIGIOUS_TOUR_SERVICE_FEE
    : NORTHERN_TOUR_SERVICE_FEE;
