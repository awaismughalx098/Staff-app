import { motion } from "framer-motion";
import { Bus } from "lucide-react";

/* One scheduled service, as a route row: departure and arrival in mono figures
   at each end, a connecting rail with the running time and stop count in the
   middle, then the operator and the fare. The shared visual language for route
   search results and the live-tracking bus picker. Props are unchanged so both
   callers keep working. */
function RouteResultCard({
  index = 0,
  onClick,
  leftTime,
  leftCity,
  rightTime,
  rightCity,
  centerCaption,
  stopsLabel = "Direct",
  live = false,
  footerLeftTitle,
  footerLeftSubtitle,
  footerRightValue,
  footerRightLabel,
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="block w-full cursor-pointer rounded-card border border-line bg-surface p-4 text-left transition-colors duration-200 hover:border-accent-line active:bg-surface-2"
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        {/* Departure */}
        <div className="min-w-0">
          <p className="data-mono text-[18px] font-bold leading-none text-content">
            {leftTime || "--:--"}
          </p>
          <p className="mt-1 truncate text-[12px] text-content-muted">{leftCity}</p>
        </div>

        {/* Connecting rail */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {centerCaption && (
            <span className="data-mono whitespace-nowrap text-[10px] text-content-muted">
              {centerCaption}
            </span>
          )}
          <div className="flex w-full items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="h-px flex-1 bg-line" />
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-content-muted">
              <Bus className="h-3 w-3" />
            </span>
            <span className="h-px flex-1 bg-line" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </div>
          {live ? (
            <span className="status-pill is-live">Live</span>
          ) : (
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-content-muted">
              {stopsLabel}
            </span>
          )}
        </div>

        {/* Arrival */}
        <div className="min-w-0 text-right">
          <p className="data-mono text-[18px] font-bold leading-none text-content">
            {rightTime || "--:--"}
          </p>
          <p className="mt-1 truncate text-[12px] text-content-muted">{rightCity}</p>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-line" />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-content">
            {footerLeftTitle}
          </p>
          {footerLeftSubtitle && (
            <p className="truncate text-[11.5px] text-content-muted">
              {footerLeftSubtitle}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="data-mono text-[15px] font-bold text-accent">
            {footerRightValue}
          </p>
          {footerRightLabel && (
            <p className="text-[10.5px] text-content-muted">{footerRightLabel}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default RouteResultCard;
