/* Pill tab/scope toggle — e.g. Buses/Bookings, Current/Past. `options` is
   [{id, label, icon?}]. */
function GlassSegmentedControl({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-all duration-300 ease-in-out ${
              active
                ? "bg-accent text-white shadow-glass"
                : "glass-surface text-content-muted hover:text-content"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default GlassSegmentedControl;
