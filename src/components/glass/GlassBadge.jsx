const TONES = {
  accent: "bg-accent-soft text-accent",
  success: "bg-route-green-soft text-route-green",
  danger: "bg-route-red-soft text-route-red",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-white/50 text-content-muted",
};

/* Small pill label — status tags, category eyebrows, count badges. */
function GlassBadge({ tone = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default GlassBadge;
