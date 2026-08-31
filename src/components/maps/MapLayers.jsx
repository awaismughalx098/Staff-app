import { LayersControl, TileLayer } from "react-leaflet";

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const CARTO_ATTR = `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

/* Base layers shared by the passenger and driver live maps.
   The default is CARTO Positron — a pale, low-clutter basemap that matches the
   Aurora Glass theme and lets the blue route and bus marker read cleanly,
   instead of raw OpenStreetMap's dense yellow roads and label soup. Voyager
   (a touch more detail), Dark, and Satellite stay as alternates — satellite is
   genuinely useful for spotting where a bus actually is on the ground. */
function MapLayers() {
  return (
    <>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Light">
          <TileLayer
            attribution={CARTO_ATTR}
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Streets">
          <TileLayer
            attribution={CARTO_ATTR}
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Dark">
          <TileLayer
            attribution={CARTO_ATTR}
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
    </>
  );
}

export default MapLayers;
