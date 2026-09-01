import { LayerGroup, LayersControl, TileLayer } from "react-leaflet";

const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI_ATTR = "Tiles &copy; Esri";

/* Base layers shared by the passenger and driver live maps.
 *
 * CARTO's basemaps were the default until they began stamping "API KEY
 * REQUIRED" across every tile — their free tier now wants a key. These need
 * none.
 *
 * Esri splits its grey canvas in two: the base carries roads and land, and a
 * separate reference layer carries the place names. The base alone is why the
 * map came up with no city on it, so the two are grouped and drawn together.
 *
 * The canvas is only rendered to zoom 16, so maxNativeZoom pins that and
 * Leaflet stretches the last tiles for the closer zooms tracking needs —
 * slightly soft rather than blank. Streets is plain OpenStreetMap, sharp at
 * every zoom; satellite is genuinely useful for seeing where a bus is.
 */
function MapLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Light">
        <LayerGroup>
          <TileLayer
            attribution={ESRI_ATTR}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={16}
            maxZoom={19}
          />
          {/* Place names, roads labels and boundaries, over the plain canvas */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={16}
            maxZoom={19}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Streets">
        <TileLayer
          attribution={OSM_ATTR}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Satellite">
        <LayerGroup>
          <TileLayer
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={19}
          />
          {/* Satellite imagery has no lettering of its own either */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={19}
            maxZoom={19}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}

export default MapLayers;
