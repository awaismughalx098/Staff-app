import GlassButton from "./GlassButton";

/* Fixed full-width action bar pinned above the bottom nav — replaces the
   duplicated "Call to Book/Reserve" bars in HotelDetail/AirlineDetail/
   TourDetail/BusDetail. */
function StickyCTA({ label, onClick, icon: Icon, disabled = false }) {
  return (
    <div className="fixed inset-x-0 bottom-[92px] z-[60] px-4">
      <GlassButton
        onClick={onClick}
        disabled={disabled}
        size="md"
        className="mx-auto flex h-[54px] w-full max-w-md shadow-premium"
      >
        {Icon && <Icon className="h-5 w-5" />}
        {label}
      </GlassButton>
    </div>
  );
}

export default StickyCTA;
