/**
 * Mirrors backend/config/hotelPlans.js.
 *
 * Kept in step by hand: the server is the authority and rejects anything past
 * these limits, so this only drives what the console shows and says.
 */
export const HOTEL_PLANS = {
  free: {
    label: "Free",
    maxRoomImages: 1,
    maxRoomVideos: 0,
    maxHotelVideos: 1,
    chargesBookingFee: true,
  },
  pro: {
    label: "Pro",
    maxRoomImages: 5,
    maxRoomVideos: 2,
    maxHotelVideos: 2,
    chargesBookingFee: false,
  },
};

export const planFor = (hotel) => HOTEL_PLANS[hotel?.plan] || HOTEL_PLANS.free;
export const isPro = (hotel) => hotel?.plan === "pro";
