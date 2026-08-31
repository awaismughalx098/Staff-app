const VARIANTS = {
  primary:
    "bg-accent text-white shadow-glass hover:brightness-105",
  secondary:
    "glass-surface text-accent hover:bg-white/60",
  ghost:
    "text-content-muted hover:text-content hover:bg-white/40",
  danger:
    "bg-danger text-white shadow-glass hover:brightness-105",
};

const SIZES = {
  md: "h-11 px-5 text-[13.5px]",
  sm: "h-9 px-4 text-[12.5px]",
  icon: "h-10 w-10 shrink-0",
};

/* Rounded, glass, soft-blue premium button — the one shared control behind
   every CTA/add/icon button across passenger, driver and admin. */
function GlassButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-display font-bold transition-all duration-300 ease-in-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default GlassButton;
