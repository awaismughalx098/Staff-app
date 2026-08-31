import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";

import MapLayers from "./MapLayers";

/* Pins for the two ends of a directions route. Built as divIcons so they pick
   up the app's accent colour instead of Leaflet's default blue PNG, which
   404s under Vite anyway. */
const pin = (color, glyph) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        border:2px solid #fff;
        box-shadow:0 4px 10px rgba(15,23,42,.35);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1">${glyph}</span>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -28],
  });

const originIcon = pin("#3B82F6", "🧍");
const hotelIcon = pin("#22C55E", "🏨");

/* Leaflet cannot fit bounds until it knows its own size, and the container is
   animated in — so the fit runs after the container reports a size. */
function FitToRoute({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    map.invalidateSize();

    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);

  return null;
}

/**
 * @param {[number,number][]} route  road polyline, empty when unavailable
 * @param {{lat:number,lng:number}} origin  where the guest is (optional)
 * @param {{lat:number,lng:number,name:string}} destination  the hotel
 * @param {boolean} followsRoads  false → straight fallback, drawn dashed
 */
function DirectionsMap({ route = [], origin, destination, followsRoads, className = "" }) {
  const dest = [destination.lat, destination.lng];
  const start = origin ? [origin.lat, origin.lng] : null;

  const line = route.length > 1 ? route : start ? [start, dest] : [];
  const points = line.length ? line : [dest];

  return (
    <MapContainer
      center={dest}
      zoom={14}
      scrollWheelZoom
      className={`h-full w-full ${className}`}
      style={{ background: "var(--elevated)" }}
    >
      <MapLayers />
      <FitToRoute points={points} />

      {line.length > 1 && (
        <>
          {/* Casing under the line keeps it readable over satellite tiles */}
          <Polyline positions={line} pathOptions={{ color: "#1E293B", weight: 9, opacity: 0.35 }} />
          <Polyline
            positions={line}
            pathOptions={{
              color: followsRoads ? "#3B82F6" : "#F59E0B",
              weight: 5,
              opacity: 0.95,
              dashArray: followsRoads ? null : "8 10",
            }}
          />
        </>
      )}

      {start && (
        <Marker position={start} icon={originIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      <Marker position={dest} icon={hotelIcon}>
        <Popup>{destination.name}</Popup>
      </Marker>
    </MapContainer>
  );
}

export default DirectionsMap;
