import { LayerGroup, LayersControl, TileLayer } from "react-leaflet";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const ESRI_ATTR = "Tiles &copy; Esri";

/* Base layers shared by the passenger and driver live maps.
 *
 * All four are Esri's, and none needs an API key — CARTO's did, once its free
 * tier closed and it began stamping "API KEY REQUIRED" across every tile.
 *
 * Streets leads because this is a map you follow a bus on: the grey canvases
 * are drawn as backdrops for data, so stripped of detail that their place
 * names float on almost-empty ground. Street Map keeps the roads under the
 * lettering, and is sharp all the way to zoom 19.
 *
 * The two canvases are kept for anyone who wants the quiet look, light or
 * dark. Esri splits each into a base that carries the ground and a reference
 * layer that carries the lettering, so both halves are grouped — the base
 * alone is a map with no city on it. They stop at zoom 16, so maxNativeZoom
 * pins that and Leaflet stretches the last tiles for closer zooms: slightly
 * soft rather than blank.
 */
function MapLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Streets">
        <TileLayer
          attribution={ESRI_ATTR}
          url={`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`}
          maxNativeZoom={19}
          maxZoom={19}
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Light">
        <LayerGroup>
          <TileLayer
            attribution={ESRI_ATTR}
            url={`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={16}
            maxZoom={19}
          />
          <TileLayer
            url={`${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={16}
            maxZoom={19}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Dark">
        <LayerGroup>
          <TileLayer
            attribution={ESRI_ATTR}
            url={`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={16}
            maxZoom={19}
          />
          <TileLayer
            url={`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={16}
            maxZoom={19}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Satellite">
        <LayerGroup>
          <TileLayer
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={19}
            maxZoom={19}
          />
          {/* Imagery has no lettering of its own */}
          <TileLayer
            url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`}
            maxNativeZoom={19}
            maxZoom={19}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}

export default MapLayers;
