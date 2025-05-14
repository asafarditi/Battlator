import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import { MapMode, Coordinates, ThreatArea, Route, VantagePoint } from "../../types";

// Import Marker Icons
import { Crosshair, MapPin, Flag, Eye } from "lucide-react";

// Define the props interface
interface MapComponentProps {
  mode: MapMode;
  start: Coordinates | null;
  end: Coordinates | null;
  threatAreas: ThreatArea[];
  route: Route | null;
  vantagePoint: VantagePoint | null;
  visibleLayers: {
    threatAreas: boolean;
    route: boolean;
    viewshed: boolean;
  };
  onMapClick: (latLng: Coordinates) => void;
}

// Create custom markers - using proper HTML string for Leaflet
const createStartIcon = () => {
  return L.divIcon({
    html: `<div class="marker-start-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/></svg></div>`,
    className: "custom-marker-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createEndIcon = () => {
  return L.divIcon({
    html: `<div class="marker-end-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><rect width="18" height="18" rx="2"/></svg></div>`,
    className: "custom-marker-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createVantageIcon = () => {
  return L.divIcon({
    html: `<div class="bg-tactical-lightBlue rounded-full border-2 border-white shadow-lg p-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </div>`,
    className: "custom-marker-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const MapEvents: React.FC<{ onClick: (latLng: Coordinates) => void; mode: MapMode }> = ({ onClick, mode }) => {
  const map = useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useEffect(() => {
    // Change cursor based on mode
    const container = map.getContainer();

    if (mode !== "view") {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "grab";
    }

    return () => {
      container.style.cursor = "grab";
    };
  }, [map, mode]);

  return null;
};

// Set initial view
const SetViewOnLoad: React.FC<{ center: Coordinates; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ mode, start, end, threatAreas, route, vantagePoint, visibleLayers, onMapClick }) => {
  // Default to a central position
  const defaultCenter: Coordinates = { lat: 32.321457, lng: 34.853195 };
  const defaultZoom = 15;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-muted">
      <MapContainer
        className="h-full w-full"
        // Note: We don't set center and zoom as props, but use the SetViewOnLoad component instead
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />

        <SetViewOnLoad center={start || end || defaultCenter} zoom={start && end ? 12 : defaultZoom} />

        <MapEvents onClick={onMapClick} mode={mode} />

        {/* Render start marker */}
        {start && <Marker position={[start.lat, start.lng]} icon={createStartIcon()} />}

        {/* Render end marker */}
        {end && <Marker position={[end.lat, end.lng]} icon={createEndIcon()} />}

        {/* Render threat areas */}
        {visibleLayers.threatAreas &&
          threatAreas.map((area) => (
            <Polygon
              key={area.id}
              positions={area.polygon.map((coord) => [coord.lat, coord.lng])}
              pathOptions={{
                color: area.riskLevel === "high" ? "#e74c3c" : area.riskLevel === "medium" ? "#f39c12" : "#2ecc71",
                fillColor: area.riskLevel === "high" ? "#e74c3c" : area.riskLevel === "medium" ? "#f39c12" : "#2ecc71",
                fillOpacity: 0.4,
                weight: 2,
              }}
            />
          ))}

        {/* Render route path */}
        {visibleLayers.route && route && (
          <Polyline
            positions={route.path.map((coord) => [coord.lat, coord.lng])}
            pathOptions={{
              color: "#2a9d8f",
              weight: 4,
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Render vantage point and viewshed */}
        {vantagePoint && (
          <>
            <Marker position={[vantagePoint.position.lat, vantagePoint.position.lng]} icon={createVantageIcon()} />

            {visibleLayers.viewshed && (
              <Polygon
                positions={vantagePoint.visibilityPolygon.map((coord) => [coord.lat, coord.lng])}
                pathOptions={{
                  color: "#a8dadc",
                  fillColor: "#a8dadc",
                  fillOpacity: 0.3,
                  weight: 2,
                  dashArray: "5, 5",
                }}
              />
            )}
          </>
        )}

        {/* Indicator for current map mode */}
        {mode !== "view" && (
          <div className="absolute top-2 left-2 bg-background/90 text-foreground px-3 py-2 rounded-md border border-border z-[1000] shadow-md">
            {mode === "placeStart" && (
              <span className="flex items-center gap-2">
                <Crosshair size={16} /> Place Start Point
              </span>
            )}
            {mode === "placeEnd" && (
              <span className="flex items-center gap-2">
                <Crosshair size={16} /> Place End Point
              </span>
            )}
            {mode === "drawThreat" && (
              <span className="flex items-center gap-2">
                <Crosshair size={16} /> Place Threat Area
              </span>
            )}
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
