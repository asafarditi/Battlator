import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { ThreatZone, Position, Route, MapMode } from "../../types";
import { api, EnemyType } from "../../services/api";
import { FriendlyMarker } from "./FriendlyMarker";
import { DestinationMarker } from "./DestinationMarker";
import { getRouteLayer, getRouteGlowLayer, getThreatZoneLayer } from "./mapLayers";
import { Position as MapPosition } from "geojson";
import * as turf from "@turf/turf";
import { User, Truck, AlertTriangle, Navigation, Clock, PlayCircle, PauseCircle, X, Target } from "lucide-react";
import RouteCountdown from "../ui/RouteCountdown";
import { websocketService } from "../../services/websocket";

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

const EnhancedMapContainer: React.FC = () => {
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
    // Route selection state
    selectedRouteId,
    showRouteCountdown,
    selectRoute,
    confirmRouteSelection,
    cancelRouteSelection,
    startRouteSelection,
    setMapMode,
    // Mission state
    isMissionActive,
    missionPaused,
    startMission,
    endMission,
    clearMissionData,
  } = useMapStore();

  // State for placed enemies
  const [placedEnemies, setPlacedEnemies] = useState<PlacedEnemy[]>([]);

  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: currentPosition.longitude,
    latitude: currentPosition.latitude,
    zoom: 12,
  });

  // Check if route planning is disabled due to mission state
  const isRoutePlanningDisabled = isMissionActive || missionPaused;

  // Start the mission
  const handleStartMission = async () => {
    if (!currentRoute) {
      alert("Please plan a route first");
      return;
    }

    try {
      await api.startMission(currentRoute.id);
      startMission(currentRoute.id);

      // Connect to WebSocket for position updates
      websocketService.connect();
    } catch (error) {
      console.error("Error starting mission:", error);
    }
  };

  // End the mission (pause)
  const handleEndMission = async () => {
    try {
      await api.endMission();
      endMission();

      // Disconnect from WebSocket
      websocketService.disconnect();
    } catch (error) {
      console.error("Error ending mission:", error);
    }
  };

  // Stop mission and clear all data
  const handleStopMission = async () => {
    try {
      // End mission on the backend
      await api.endMission();

      // Disconnect WebSocket
      websocketService.disconnect();

      // Clear all mission data
      clearMissionData();

      // Clear placed enemies (since they're not part of the store)
      setPlacedEnemies([]);
    } catch (error) {
      console.error("Error stopping mission:", error);
    }
  };

  // Switch to route selection mode when routes are available
  useEffect(() => {
    if (routes.length > 1 && mapMode === "ROUTE") {
      // Switch to route selection mode when multiple routes are available
      setMapMode("CHOOSING_ROUTE");
    }
  }, [routes, mapMode, setMapMode]);

  // Handle map click events
  const handleMapClick = async (event: any) => {
    const { lngLat } = event;
    const clickedPosition: Position = {
      longitude: lngLat.lng,
      latitude: lngLat.lat,
      altitude: 0,
    };

    // Skip route-related operations if mission is active or paused
    if (mapMode === "ROUTE" && !isRoutePlanningDisabled) {
      // Always update the destination when in ROUTE mode and click on the map
      setSelectedDestination(clickedPosition);

      try {
        // Clear any existing routes first to avoid stale data
        setRoutes([]);

        // Call the route planning API and get 3 routes
        const routes: Route[] = await api.planRoute(currentPosition, clickedPosition);

        // Set the first route as current route
        setCurrentRoute(routes[0] as Route);

        // Add all routes to the store
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

  // Handle route click event in choosing route mode
  const handleRouteClick = (routeId: string) => {
    // Only allow route selection if mission is not active or paused
    if (mapMode === "CHOOSING_ROUTE" && !isRoutePlanningDisabled) {
      selectRoute(routeId);
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

  // Get the appropriate icon component based on enemy type
  const getEnemyIcon = (type: EnemyType) => {
    switch (type) {
      case EnemyType.PERSON:
        return <User size={24} className="text-red-500" />;
      case EnemyType.VEHICLE:
        return <Truck size={28} className="text-amber-500" />;
      case EnemyType.TANK:
        return <TankIcon size={32} className="text-red-700" />;
      default:
        return <AlertTriangle size={24} className="text-white" />;
    }
  };

  // Display different routes depending on the map mode
  const getRoutesToDisplay = () => {
    if (mapMode === "CHOOSING_ROUTE") {
      // When choosing a route, show all routes
      return routes;
    } else {
      // In other modes, show only the current route if available
      return currentRoute ? [currentRoute] : [];
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

        {/* Route lines */}
        {getRoutesToDisplay().map((route, index) => {
          const isSelected = route.id === selectedRouteId;

          return (
            <React.Fragment key={route.id}>
              {/* Glow effect for selected route */}
              {isSelected && (
                <Source
                  id={`route-glow-source-${route.id}`}
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
                  <Layer {...({ ...getRouteGlowLayer(), id: `route-glow-layer-${route.id}` } as any)} />
                </Source>
              )}

              {/* Main route layer */}
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
                <Layer {...({ ...getRouteLayer(isSelected, index), id: `route-layer-${route.id}` } as any)} />
              </Source>

              {/* Route labels for selection mode */}
              {mapMode === "CHOOSING_ROUTE" && (
                <Marker
                  longitude={route.points[Math.floor(route.points.length / 3)].coordinates.longitude}
                  latitude={route.points[Math.floor(route.points.length / 3)].coordinates.latitude}
                >
                  <div
                    className={`p-2 rounded-full ${
                      isSelected ? "bg-green-600" : "bg-blue-600"
                    } text-white font-bold flex items-center justify-center h-8 w-8 shadow-lg cursor-pointer`}
                    onClick={() => handleRouteClick(route.id)}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

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
            <Layer {...({ ...getThreatZoneLayer(zone.level), id: `threat-zone-layer-${zone.id}` } as any)} />
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

      {/* Mission Control Buttons in top center */}
      {currentRoute && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex space-x-3">
            {!isMissionActive ? (
              <button
                onClick={handleStartMission}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center transition-all duration-200 hover:scale-105"
              >
                <PlayCircle size={24} className="mr-2" />
                Start Mission
              </button>
            ) : (
              <>
                <button
                  onClick={handleEndMission}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center transition-all duration-200 hover:scale-105"
                >
                  <PauseCircle size={24} className="mr-2" />
                  Pause Mission
                </button>
                <button
                  onClick={handleStopMission}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center transition-all duration-200 hover:scale-105"
                >
                  <X size={24} className="mr-2" />
                  Stop Mission
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Route selection instruction panel */}
      {mapMode === "CHOOSING_ROUTE" && !showRouteCountdown && (
        <div className="absolute top-32 left-4 bg-gray-900 bg-opacity-85 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="text-lg font-bold mb-2 flex items-center">
            <Navigation className="mr-2" /> Choose a Route
          </h3>
          {isRoutePlanningDisabled ? (
            <div className="bg-red-900 bg-opacity-75 p-3 rounded-md mb-2">
              <p className="text-sm text-white">
                Route selection is disabled during active or paused missions.
                {missionPaused ? " Resume and stop" : " Stop"} the mission to change routes.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-300 mb-3">Click on your preferred route to select it:</p>
              <div className="space-y-2">
                {routes.map((route, index) => (
                  <div
                    key={route.id}
                    className={`p-2 rounded flex items-center cursor-pointer ${
                      route.id === selectedRouteId ? "bg-green-800" : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => handleRouteClick(route.id)}
                  >
                    <div
                      className={`h-8 w-8 rounded-full ${
                        route.id === selectedRouteId ? "bg-green-600" : "bg-blue-600"
                      } flex items-center justify-center mr-3`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div>
                      <p className="font-medium">Route {String.fromCharCode(65 + index)}</p>
                      <p className="text-xs text-gray-400">
                        {(route.points.length / 10).toFixed(1)} km • {Math.floor(route.points.length / 60)} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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

      {/* Route countdown overlay */}
      {showRouteCountdown && selectedRouteId && <RouteCountdown onConfirm={confirmRouteSelection} onCancel={cancelRouteSelection} />}

      {/* Add route planning instruction when in route mode */}
      {mapMode === "ROUTE" && !isRoutePlanningDisabled && (
        <div className="absolute top-32 right-4 bg-gray-900 bg-opacity-85 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="text-lg font-bold mb-2 flex items-center">
            <Target className="mr-2" /> Set Destination
          </h3>
          <p className="text-sm text-gray-300">
            Click anywhere on the map to set your destination point and calculate routes.
            {selectedDestination && " This will replace your current destination."}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedMapContainer;
