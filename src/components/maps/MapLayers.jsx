import { useState } from "react";
import { TileLayer } from "react-leaflet";
import { Layers, Map as MapIcon, Moon, Satellite, Sun } from "lucide-react";

/* MapTiler, when a key is configured, gives the clean navigation-grade light
   and dark basemaps this screen wants. Without one the app still works: the
   Esri layers below need no key and are what ships by default.
   Set VITE_MAPTILER_KEY (free tier) to switch over — nothing else changes. */
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const ESRI_ATTR = "Tiles &copy; Esri";
const MAPTILER_ATTR =
  '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const maptiler = (style, ext = "png") => ({
  tiles: [
    {
      url: `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.${ext}?key=${MAPTILER_KEY}`,
      maxNative: 19,
    },
  ],
  attribution: MAPTILER_ATTR,
});

/* Four styles, one entry each — a switcher with near-duplicate entries is
   worse than no switcher.
   Esri splits its canvases into a base that draws the ground and a reference
   layer that draws the names, so both halves are listed: the base alone is a
   map with no city on it. Satellite needs the same, since imagery carries no
   lettering. Canvas tiles stop at zoom 16, so maxNativeZoom pins that and
   Leaflet stretches the last ones for the closer zooms tracking needs. */
const BASES = MAPTILER_KEY
  ? {
      streets: { label: "Streets", icon: MapIcon, ...maptiler("streets-v2") },
      light: { label: "Light", icon: Sun, ...maptiler("basic-v2") },
      dark: { label: "Dark", icon: Moon, ...maptiler("dataviz-dark") },
      satellite: { label: "Satellite", icon: Satellite, ...maptiler("hybrid", "jpg") },
    }
  : {
      streets: {
        label: "Streets",
        icon: MapIcon,
        /* Plain OpenStreetMap — the map this screen was built on, sharp at
           every zoom and free of any key. */
        tiles: [
          { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", maxNative: 19 },
        ],
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
      light: {
        label: "Light",
        icon: Sun,
        tiles: [
          { url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxNative: 16 },
          { url: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, maxNative: 16 },
        ],
        attribution: ESRI_ATTR,
      },
      dark: {
        label: "Dark",
        icon: Moon,
        tiles: [
          { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxNative: 16 },
          { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, maxNative: 16 },
        ],
        attribution: ESRI_ATTR,
      },
      satellite: {
        label: "Satellite",
        icon: Satellite,
        tiles: [
          { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxNative: 19 },
          { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxNative: 19 },
        ],
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      },
    };

const ORDER = ["streets", "light", "dark", "satellite"];

/**
 * The base map, and the control that switches it.
 *
 * Leaflet's own LayersControl is deliberately not used. A base map here can be
 * two stacked tile layers (ground plus lettering), and that control registers
 * every layer handed to it as a separate entry — which is how the list came to
 * show two "Satellite" rows and no "Dark" one, with the dark map hiding behind
 * the wrong name. Holding the choice in React state makes the list exactly
 * these three, each drawing exactly its own tiles, and lets the control wear
 * the app's own styling instead of being wrestled into it with CSS.
 */
function MapLayers({ topOffset = 12 }) {
  const [active, setActive] = useState("streets");
  const [open, setOpen] = useState(false);

  const base = BASES[active] || BASES.streets;

  return (
    <>
      {base.tiles.map((tile, i) => (
        <TileLayer
          /* Keyed by style as well as position: without it React reuses the
             previous style's layer and only swaps its src, leaving the old map
             faintly underneath. */
          key={`${active}-${i}`}
          url={tile.url}
          /* Only the ground layer carries the credit; naming it on both would
             print it twice. */
          attribution={i === 0 ? base.attribution : undefined}
          maxNativeZoom={tile.maxNative}
          maxZoom={19}
        />
      ))}

      {/* Above Leaflet's panes, which top out around z-index 700. topOffset
          clears whatever each screen floats over its map — the live maps have
          a search bar and trip chips up there, a directions sheet has none. */}
      <div
        className="pointer-events-none absolute right-3 z-[800] flex flex-col items-end"
        style={{ top: `calc(${topOffset}px + env(safe-area-inset-top, 0px))` }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Change map style"
          aria-expanded={open}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-content shadow-premium transition-colors hover:text-accent"
        >
          <Layers className="h-5 w-5" />
        </button>

        {open && (
          <div className="pointer-events-auto mt-2 w-40 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-premium">
            {ORDER.map((key) => {
              const style = BASES[key];
              const Icon = style.icon;
              const selected = active === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActive(key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors duration-150 ${
                    selected
                      ? "bg-accent-soft text-accent"
                      : "text-content-muted hover:bg-surface-2 hover:text-content"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{style.label}</span>
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${
                      selected
                        ? "border-accent bg-accent shadow-[inset_0_0_0_2.5px_var(--surface)]"
                        : "border-line"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default MapLayers;
