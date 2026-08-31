import { useMemo, useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, MapPinPlus, Search, Sparkles, X } from "lucide-react";

import { computeRouteProgress } from "../../utils/routeProgress";

/* Search-to-add chip list for building an ordered stop list from any city,
   plus a "Suggested" quick-add row fed by whatever route-suggestion data
   the caller passes in. Used for both the driver's live stop list and the
   admin's bus-preset route stops.

   When fromCity/toCity are known, a newly added stop is inserted at its
   actual geographic position along that route instead of always being
   appended — otherwise clicking suggestions out of order (or searching one
   in directly) leaves the final route jumbled, since suggestions and search
   results aren't guaranteed to be tapped in route order. The up/down arrows
   still let an admin/driver manually override the result afterward. */
function StopsEditor({
  cities = [],
  stops = [],
  onChange,
  suggestions = [],
  loadingSuggestions = false,
  fromCity = "",
  toCity = "",
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return [...cities]
      .filter((city) => !stops.includes(city.name))
      .filter((city) => city.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [cities, query, stops]);

  const addStop = (cityName) => {
    if (!cityName || stops.includes(cityName)) return;

    if (fromCity && toCity) {
      const newProgress = computeRouteProgress(cityName, fromCity, toCity, cities);

      if (newProgress !== null) {
        let insertIndex = stops.length;
        for (let i = 0; i < stops.length; i += 1) {
          const existingProgress = computeRouteProgress(stops[i], fromCity, toCity, cities);
          if (existingProgress !== null && existingProgress > newProgress) {
            insertIndex = i;
            break;
          }
        }
        onChange([...stops.slice(0, insertIndex), cityName, ...stops.slice(insertIndex)]);
        setQuery("");
        return;
      }
    }

    onChange([...stops, cityName]);
    setQuery("");
  };

  const removeStop = (cityName) => {
    onChange(stops.filter((s) => s !== cityName));
  };

  const availableSuggestions = suggestions.filter((s) => !stops.includes(s));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any city to add as a stop..."
          className="glass-surface h-12 w-full rounded-input pl-12 pr-4 text-sm font-semibold text-content outline-none transition-colors duration-300 ease-in-out focus-visible:border-accent placeholder:text-content-muted md:text-base"
        />

        {filtered.length > 0 && (
          <div className="glass-surface absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-input py-1 shadow-glass">
            {filtered.map((city) => (
              <button
                key={city._id}
                type="button"
                onClick={() => addStop(city.name)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-content transition-colors duration-200 hover:bg-accent-soft"
              >
                <span className="font-semibold">{city.name}</span>
                <span className="text-xs text-content-muted">{city.province}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingSuggestions ? (
        <p className="text-xs font-medium text-content-muted">Finding suggested stops...</p>
      ) : availableSuggestions.length > 0 ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-route-blue">
            <Sparkles className="h-3.5 w-3.5" />
            Suggested stops
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addStop(name)}
                className="flex items-center gap-1.5 rounded-full border border-route-blue-soft bg-route-blue-soft px-3 py-1.5 text-xs font-semibold text-route-blue transition hover:brightness-125"
              >
                <MapPinPlus className="h-3.5 w-3.5" />
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {stops.length > 0 && (
        <Reorder.Group axis="y" values={stops} onReorder={onChange} className="space-y-2">
          {stops.map((name, index) => (
            <Reorder.Item
              key={name}
              value={name}
              className="glass-surface flex items-center gap-3 rounded-input px-4 py-2.5"
              whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(59,130,246,0.25)" }}
            >
              <span
                className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent active:cursor-grabbing"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-content">{name}</span>

              <div className="flex items-center gap-1">
                <span className="cursor-grab p-1.5 text-content-muted active:cursor-grabbing" aria-hidden="true">
                  <GripVertical className="h-4 w-4" />
                </span>
                <button
                  type="button"
                  onClick={() => removeStop(name)}
                  aria-label={`Remove ${name}`}
                  className="cursor-pointer rounded-lg p-1.5 text-danger transition-colors duration-200 hover:bg-danger/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

export default StopsEditor;
