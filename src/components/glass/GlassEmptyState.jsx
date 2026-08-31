import GlassButton from "./GlassButton";

/* Icon + message + optional retry/CTA button — replaces the 13+ near-
   identical empty/error state blocks found across passenger + admin pages. */
function GlassEmptyState({ icon: Icon, title, description, actionLabel, onAction, className = "" }) {
  return (
    <div className={`flex flex-col items-center py-16 text-center ${className}`}>
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <p className="mt-4 font-display text-[15px] font-bold text-content">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-[13px] leading-6 text-content-muted">{description}</p>
      )}
      {actionLabel && (
        <GlassButton onClick={onAction} className="mt-5">
          {actionLabel}
        </GlassButton>
      )}
    </div>
  );
}

export default GlassEmptyState;
