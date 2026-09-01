import { LayersControl, TileLayer } from "react-leaflet";

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI_ATTR = "Tiles &copy; Esri";

/* Base layers shared by the passenger and driver live maps.
 *
 * CARTO's basemaps were the default until they began stamping "API KEY
 * REQUIRED" across every tile — their free tier now wants a key. These three
 * need none.
 *
 * Light is Esri's grey canvas: pale and low-clutter, so the blue route and the
 * bus marker carry the map. It is only drawn up to zoom 16, so maxNativeZoom
 * pins that and Leaflet stretches the last tiles for the closer zooms tracking
 * needs — slightly soft rather than blank. Streets is plain OpenStreetMap, the
 * fallback that is always there and sharp at every zoom. Satellite is genuinely
 * useful for seeing where a bus actually is on the ground.
 */
function MapLayers() {
  return (
    <>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Light">
          <TileLayer
            attribution={ESRI_ATTR}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={16}
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Streets">
          <TileLayer
            attribution={OSM_ATTR}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
    </>
  );
}

export default MapLayers;
