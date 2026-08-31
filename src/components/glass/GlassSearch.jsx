import { Search, X } from "lucide-react";

/* Glass search bar with a leading icon and a clear button — replaces the
   4+ byte-identical search bars hand-rolled across passenger/admin pages. */
function GlassSearch({ value, onChange, placeholder = "Search...", className = "", ...props }) {
  return (
    <div
      className={`glass-surface flex h-[52px] items-center gap-3 rounded-input px-4 transition-colors duration-300 ease-in-out focus-within:border-accent-line ${className}`}
    >
      <Search className="h-4 w-4 shrink-0 text-content-muted" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-content outline-none placeholder:text-content-muted"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.({ target: { value: "" } })}
          aria-label="Clear search"
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/60"
        >
          <X className="h-3.5 w-3.5 text-content-muted" />
        </button>
      )}
    </div>
  );
}

export default GlassSearch;
