import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";

/* Searchable single-value city picker over the full city list. Falls back to
   a plain filtered list — no portal/positioning library needed since it only
   ever opens downward inside a normal-flow card. */
function CitySelect({ cities = [], value, onChange, placeholder = "Select city", icon: Icon = MapPin, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...cities].sort((a, b) => a.name.localeCompare(b.name));
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter(
      (city) =>
        city.name.toLowerCase().includes(q) ||
        city.province?.toLowerCase().includes(q)
    );
  }, [cities, query]);

  const handleSelect = (cityName) => {
    onChange(cityName);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="glass-surface flex h-12 w-full items-center gap-3 rounded-input px-4 text-left text-sm font-semibold text-content outline-none transition focus-visible:border-accent disabled:opacity-50 md:text-base"
      >
        <Icon className="h-5 w-5 shrink-0 text-accent" />
        <span className={value ? "truncate text-content" : "truncate text-content-muted"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-content-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="glass-surface absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-hidden rounded-input shadow-premium">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-content-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any city in Pakistan..."
              className="h-8 w-full bg-transparent text-sm text-content outline-none placeholder:text-content-muted"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                <X className="h-4 w-4 text-content-muted" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm font-medium text-content-muted">
                No matching city
              </p>
            ) : (
              filtered.map((city) => (
                <button
                  key={city._id}
                  type="button"
                  onClick={() => handleSelect(city.name)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-accent-soft ${
                    city.name === value ? "bg-accent-soft text-accent" : "text-content"
                  }`}
                >
                  <span className="font-semibold">{city.name}</span>
                  <span className="text-xs text-content-muted">{city.province}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CitySelect;
