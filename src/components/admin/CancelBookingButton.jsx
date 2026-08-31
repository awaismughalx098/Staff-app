import { useRef, useState } from "react";

/**
 * Cancelling takes two taps.
 *
 * It cannot be undone and the customer is told immediately, so a mis-tap in a
 * list of bookings must not be enough. The confirm state resets after four
 * seconds rather than sitting there armed.
 */
function CancelBookingButton({ onCancel, disabled, label = "Cancel booking" }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const click = () => {
    if (!confirming) {
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(timer.current);
    setConfirming(false);
    onCancel();
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled}
      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-transform active:scale-95 disabled:opacity-50 ${
        confirming
          ? "bg-danger text-white"
          : "glass-surface text-danger hover:bg-danger/10"
      }`}
    >
      {confirming ? "Tap again to confirm" : label}
    </button>
  );
}

export default CancelBookingButton;
