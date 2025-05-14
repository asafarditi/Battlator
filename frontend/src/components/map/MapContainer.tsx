import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { ThreatZone, Position, Route, MapMode } from "../../types";
import { api, EnemyType } from "../../services/api";
import { FriendlyMarker } from "./FriendlyMarker";
import { DestinationMarker } from "./DestinationMarker";
import { getRouteLayer, getThreatZoneLayer } from "./mapLayers";
import { Position as MapPosition } from "geojson";
import * as turf from "@turf/turf";
import { User, Truck, AlertTriangle } from "lucide-react";

// Mapbox API key from the requirements
const MAPBOX_TOKEN = "pk.eyJ1IjoiYW10cnRtIiwiYSI6ImNrcWJzdG41aTBsbHEyb2sxeTdsa2FkOG4ifQ.bmaBLt4tVWrM4CVr5DLVYQ";

// Tank icon component
const TankIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="12" width="20" height="8" rx="2" />
    <rect x="6" y="8" width="12" height="4" rx="1" />
    <line x1="2" y1="16" x2="22" y2="16" />
    <line x1="6" y1="20" x2="6" y2="16" />
    <line x1="10" y1="20" x2="10" y2="16" />
    <line x1="14" y1="20" x2="14" y2="16" />
    <line x1="18" y1="20" x2="18" y2="16" />
  </svg>
);

// Interface for placed enemies
interface PlacedEnemy {
  id: string;
  position: Position;
  type: EnemyType;
}

const MapContainer: React.FC = () => {
  const {
    currentPosition,
    selectedDestination,
    mapMode,
    currentRoute,
    routes,
    setRoutes,
    threatZones,
    drawingCoordinates,
    selectedThreatLevel,
    selectedEnemyType,
    setSelectedDestination,
    setCurrentRoute,
    addRoute,
    addThreatZone,
    updateDrawingCoordinates,
    clearDrawingCoordinates,
  } = useMapStore();

  // State for placed enemies
  const [placedEnemies, setPlacedEnemies] = useState<PlacedEnemy[]>([]);

  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: currentPosition.longitude,
    latitude: currentPosition.latitude,
    zoom: 12,
  });

  // Update view state when current position changes
  useEffect(() => {
    if (currentPosition) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentPosition.longitude,
        latitude: currentPosition.latitude,
      }));
    }
  }, [currentPosition]);

  // Handle map click events
  const handleMapClick = async (event: any) => {
    const { lngLat } = event;
    const clickedPosition: Position = {
      longitude: lngLat.lng,
      latitude: lngLat.lat,
      altitude: 0,
    };

    if (mapMode === "ROUTE") {
      // Set destination and plan route
      setSelectedDestination(clickedPosition);

      try {
        // Call the route planning API and get 3 routes
        const routes: Route[] = await api.planRoute(currentPosition, clickedPosition);
        // Set the first route as current route
        setCurrentRoute(routes[0] as Route);
        // Add all 3 routes to the store
        setRoutes(routes);
      } catch (error) {
        console.error("Error planning route:", error);
      }
    } else if (mapMode === "DRAW_THREAT") {
      // Add point to drawing coordinates
      const newCoordinates = [...drawingCoordinates, [lngLat.lng, lngLat.lat]];
      updateDrawingCoordinates(newCoordinates);
    } else if (mapMode === "ADD_ENEMY") {
      // Place an enemy on the map
      try {
        const response = await api.addSingleEnemy(clickedPosition, selectedEnemyType);
        if (response.success) {
          const newEnemy: PlacedEnemy = {
            id: `enemy-${Date.now()}`,
            position: clickedPosition,
            type: selectedEnemyType,
          };
          setPlacedEnemies((prev) => [...prev, newEnemy]);
        }
      } catch (error) {
        console.error(`Error adding ${selectedEnemyType} enemy:`, error);
      }
    }
  };

  // Complete threat zone drawing
  const completeThreatZone = async () => {
    if (drawingCoordinates.length < 3) {
      alert("Please draw at least 3 points for a valid polygon");
      return;
    }

    // Close the polygon
    const closedCoordinates = [...drawingCoordinates, drawingCoordinates[0]];

    // Create a GeoJSON polygon
    const polygon = turf.polygon([[...closedCoordinates]]);

    try {
      // Submit the threat zone to the API
      await api.submitThreatZone([closedCoordinates], selectedThreatLevel);

      // Add the threat zone to the store
      addThreatZone([closedCoordinates], selectedThreatLevel);

      // Send add-enemy request to backend
      const enemyId = `enemy-${Date.now()}`;
      const enemyType = selectedThreatLevel === "highThreat" ? "LAUNCHER" : "SNIPER";
      const riskPotential = selectedThreatLevel === "highThreat" ? 1.0 : 0.5;
      const enemy = {
        id: enemyId,
        type: enemyType,
        location: closedCoordinates.map(([lng, lat]) => ({ lat, lng, alt: 0.0 })),
        capability: { range: 1000 },
        risk_potential: riskPotential,
      };
      await api.addEnemy(enemy);

      // Clear drawing coordinates
      clearDrawingCoordinates();
    } catch (error) {
      console.error("Error submitting threat zone:", error);
    }
  };

  // Transform drawing coordinates into GeoJSON format for rendering
  const drawingGeoJSON = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: drawingCoordinates,
    },
  };

  // Get enemy icon based on type
  const getEnemyMarkerStyle = (type: EnemyType) => {
    switch (type) {
      case EnemyType.PERSON:
        return {
          color: "#FF5555",
          size: 15,
        };
      case EnemyType.VEHICLE:
        return {
          color: "#FF9900",
          size: 20,
        };
      case EnemyType.TANK:
        return {
          color: "#FF0000",
          size: 25,
        };
      default:
        return {
          color: "#FFFFFF",
          size: 15,
        };
    }
  };

  // Get the appropriate icon component based on enemy type
  const getEnemyIcon = (type: EnemyType) => {
    switch (type) {
      case EnemyType.PERSON:
        return <User size={24} color="#FF5555" />;
      case EnemyType.VEHICLE:
        return <Truck size={28} color="#FF9900" />;
      case EnemyType.TANK:
        return <TankIcon size={32} color="#FF0000" />;
      default:
        return <AlertTriangle size={24} color="#FFFFFF" />;
    }
  };

  return (
    <div className="w-full h-screen relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        attributionControl={false}
      >
        {/* Current position marker */}
        <FriendlyMarker position={currentPosition} />

        {/* Destination marker */}
        {selectedDestination && <DestinationMarker position={selectedDestination} />}

        {/* Route line if available */}
        {console.log(routes)}
        {routes.map((route) => (
          <Source
            id={`route-source-${route.id}`}
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.points.map((p) => [p.coordinates.longitude, p.coordinates.latitude]),
              },
            }}
          >
            <Layer {...({ ...getRouteLayer(), id: `route-layer-${route.id}` } as any)} />
          </Source>
        ))}

        {/* Threat zones */}
        {threatZones.map((zone) => (
          <Source
            key={zone.id}
            id={`threat-zone-${zone.id}`}
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: zone.coordinates,
              },
            }}
          >
            <Layer {...getThreatZoneLayer(zone.level)} />
          </Source>
        ))}

        {/* Drawing line for threat zone creation */}
        {drawingCoordinates.length > 0 && (
          <Source id="drawing-source" type="geojson" data={drawingGeoJSON as any}>
            <Layer
              id="drawing-line"
              type="line"
              paint={{
                "line-color": "#FFC107",
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}

        {/* Placed enemy markers */}
        {placedEnemies.map((enemy) => (
          <Marker key={enemy.id} longitude={enemy.position.longitude} latitude={enemy.position.latitude}>
            <div className="bg-gray-900 bg-opacity-75 p-1 rounded-full border-2 border-white flex items-center justify-center">
              {getEnemyIcon(enemy.type)}
            </div>
          </Marker>
        ))}
      </Map>

      {/* Threat zone drawing controls */}
      {mapMode === "DRAW_THREAT" && drawingCoordinates.length > 0 && (
        <div className="absolute bottom-24 right-4 flex flex-col space-y-2">
          <button onClick={completeThreatZone} className="bg-green-600 text-white px-4 py-2 rounded-md shadow-lg font-bold">
            Complete Zone
          </button>
          <button onClick={clearDrawingCoordinates} className="bg-red-600 text-white px-4 py-2 rounded-md shadow-lg font-bold">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default MapContainer;
