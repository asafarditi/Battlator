import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { ThreatZone, Position, Route, MapMode, ThreatLevel } from "../../types";
import { api, EnemyType } from "../../services/api";
import { FriendlyMarker } from "./FriendlyMarker";
import { DestinationMarker } from "./DestinationMarker";
import { getRouteLayer, getRouteGlowLayer, getThreatZoneLayer } from "./mapLayers";
import { Position as MapPosition } from "geojson";
// @ts-ignore: turf.js typing issue
import * as turf from "@turf/turf";
import {
  User,
  Truck,
  AlertTriangle,
  Navigation,
  Clock,
  PlayCircle,
  PauseCircle,
  X,
  Target,
  Crosshair,
  Loader,
  RefreshCw,
} from "lucide-react";
import RouteCountdown from "../ui/RouteCountdown";
import { websocketService } from "../../services/websocket";
import { useNotificationStore } from "../../store/notificationStore";

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

// Interface for route recalculation confirmation
interface RouteRecalculationProps {
  onConfirm: () => void;
  onCancel: () => void;
  enemyType: string;
}

// Route recalculation confirmation component
const RouteRecalculationConfirm: React.FC<RouteRecalculationProps> = ({ onConfirm, onCancel, enemyType }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-6 max-w-sm w-full border border-gray-700 animate-fade-in">
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">Threat Detected!</h3>
          <p className="text-gray-300 text-sm mb-4">
            {enemyType} detected intersecting with your route. Would you like to recalculate safer routes or continue with your current
            route?
          </p>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-md flex items-center justify-center"
          >
            Continue Current Route
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md flex items-center justify-center"
          >
            <RefreshCw size={18} className="mr-1" />
            Find New Routes
          </button>
        </div>
      </div>
    </div>
  );
};

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

  // Access notification store
  const { addNotification } = useNotificationStore();

  // State for placed enemies
  const [placedEnemies, setPlacedEnemies] = useState<PlacedEnemy[]>([]);
  // State for tracking if follow mode is enabled
  const [followMode, setFollowMode] = useState<boolean>(true);
  // Add state for route planning progress
  const [isRoutePlanning, setIsRoutePlanning] = useState<boolean>(false);

  // State to track the selected route letter (A, B, C, etc.)
  const [selectedRouteLetter, setSelectedRouteLetter] = useState<string>("");

  // Add state for route recalculation confirmation
  const [showRecalculationConfirm, setShowRecalculationConfirm] = useState<boolean>(false);
  const [recalculationEnemyType, setRecalculationEnemyType] = useState<string>("");
  const [pendingDestination, setPendingDestination] = useState<Position | null>(null);

  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: currentPosition.longitude,
    latitude: currentPosition.latitude,
    zoom: 12,
  });

  // Check if route planning is disabled due to mission state
  const isRoutePlanningDisabled = isMissionActive || missionPaused;

  // Effect for bird's-eye view follow mode
  useEffect(() => {
    // Only auto-follow position when mission is active and follow mode is enabled
    if (isMissionActive && followMode) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentPosition.longitude,
        latitude: currentPosition.latitude,
      }));
    }
  }, [currentPosition, isMissionActive, followMode]);

  // Handle manual map movements - disable follow mode
  const handleMapMove = (evt: any) => {
    // Disable follow mode when user manually pans the map
    if (followMode && isMissionActive) {
      // Check if the map center is different from current position
      const centerChanged =
        Math.abs(evt.viewState.longitude - currentPosition.longitude) > 0.0001 ||
        Math.abs(evt.viewState.latitude - currentPosition.latitude) > 0.0001;

      if (centerChanged) {
        setFollowMode(false);
      }
    }

    // Update the view state
    setViewState(evt.viewState);
  };

  // Toggle follow mode
  const toggleFollowMode = () => {
    const newFollowMode = !followMode;
    setFollowMode(newFollowMode);

    // If enabling follow mode, immediately center on current position
    if (newFollowMode) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentPosition.longitude,
        latitude: currentPosition.latitude,
      }));

      // Add notification for follow mode enabled
      addNotification({
        type: "info",
        message: "Follow mode enabled. Map will automatically center on your position.",
        duration: 3000,
      });
    } else {
      // Add notification for follow mode disabled
      addNotification({
        type: "info",
        message: "Follow mode disabled. You can now pan the map freely.",
        duration: 3000,
      });
    }
  };

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

      // Add notification
      addNotification({
        type: "info",
        message: "Mission started. Follow the planned route.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error starting mission:", error);

      // Error notification
      addNotification({
        type: "danger",
        message: "Failed to start mission. Please try again.",
        duration: 5000,
      });
    }
  };

  // Confirm route selection and start mission immediately
  const handleConfirmRoute = async () => {
    // Find the selected route
    const selectedRoute = routes.find((route) => route.id === selectedRouteId);

    if (selectedRoute) {
      // Set it as the current route
      setCurrentRoute(selectedRoute);

      // Then confirm the route selection - this updates state in the store
      confirmRouteSelection();

      try {
        // Always send the start-mission request with the new route ID
        await api.startMission(selectedRoute.id);

        // If mission is already active, just update mission state with new route
        if (isMissionActive) {
          addNotification({
            type: "info",
            message: "Route updated. Continuing mission with new route.",
            duration: 5000,
          });
        } else {
          // Start a new mission
          startMission(selectedRoute.id);

          // Connect to WebSocket for position updates
          websocketService.connect();

          addNotification({
            type: "info",
            message: "Mission started. Follow the planned route.",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error starting/updating mission:", error);

        addNotification({
          type: "danger",
          message: "Failed to update mission route. Please try again.",
          duration: 5000,
        });
      }
    }
  };

  // Cancel route selection
  const handleCancelRoute = () => {
    // Simply cancel the route selection, don't do anything else
    cancelRouteSelection();
  };

  // End the mission (pause)
  const handleEndMission = async () => {
    try {
      await api.endMission();
      endMission();

      // Disconnect from WebSocket
      websocketService.disconnect();

      // Add notification
      addNotification({
        type: "warning",
        message: "Mission paused. Resume when ready.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error ending mission:", error);

      // Error notification
      addNotification({
        type: "danger",
        message: "Failed to pause mission. Please try again.",
        duration: 5000,
      });
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

      // Add notification
      addNotification({
        type: "info",
        message: "Mission terminated. All data cleared.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error stopping mission:", error);

      // Error notification
      addNotification({
        type: "danger",
        message: "Failed to stop mission. Please try again.",
        duration: 5000,
      });
    }
  };

  // Switch to route selection mode when routes are available
  useEffect(() => {
    if (routes.length > 1 && mapMode === "ROUTE") {
      // Switch to route selection mode when multiple routes are available
      setMapMode("CHOOSING_ROUTE");
    }
  }, [routes, mapMode, setMapMode]);

  // New function for route recalculation
  const recalculateRoutes = async () => {
    try {
      setIsRoutePlanning(true);

      // Get destination either from pendingDestination, selectedDestination, or from the end of current route
      const destination =
        pendingDestination ||
        selectedDestination ||
        (currentRoute && currentRoute.points.length > 0 ? currentRoute.points[currentRoute.points.length - 1].coordinates : null);

      if (!destination) {
        throw new Error("No destination available for route planning");
      }

      // Get new routes bypassing the threat zones
      const newRoutes: Route[] = await api.planRoute(currentPosition, destination);

      // Store the new routes
      if (newRoutes && newRoutes.length > 0) {
        setRoutes(newRoutes);

        // Switch to route selection mode to let the user choose
        setMapMode("CHOOSING_ROUTE");

        addNotification({
          type: "info",
          message: "New routes calculated. Please select a route to continue your mission.",
          duration: 8000,
        });
      } else {
        addNotification({
          type: "danger",
          message: "Unable to find alternative routes. Continue with caution!",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Error finding alternative routes:", error);
      addNotification({
        type: "danger",
        message: "Failed to calculate alternative routes. Continue with caution!",
        duration: 5000,
      });
    } finally {
      setIsRoutePlanning(false);
      // Clear pending destination after recalculation
      setPendingDestination(null);
    }
  };

  // Handle confirm recalculation
  const handleConfirmRecalculation = () => {
    setShowRecalculationConfirm(false);
    recalculateRoutes();
  };

  // Handle cancel recalculation
  const handleCancelRecalculation = async () => {
    setShowRecalculationConfirm(false);
    setPendingDestination(null);

    try {
      // Send start mission request with current route ID to reaffirm the route choice
      if (currentRoute) {
        await api.startMission(currentRoute.id);

        // Notify user that they're continuing with current route
        addNotification({
          type: "warning",
          message: "Continuing with current route. Current position confirmed. Proceed with caution!",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error confirming current route:", error);

      // Still notify the user, but with a different message
      addNotification({
        type: "warning",
        message: "Continuing with current route. Proceed with caution!",
        duration: 5000,
      });
    }
  };

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

      // Add notification for destination set
      addNotification({
        type: "info",
        message: "Destination selected. Calculating routes...",
        duration: 3000,
      });

      try {
        // Show route planning indicator
        setIsRoutePlanning(true);

        // Clear any existing routes first to avoid stale data
        setRoutes([]);

        // Call the route planning API and get 3 routes
        const routes: Route[] = await api.planRoute(currentPosition, clickedPosition);

        // Set the first route as current route
        setCurrentRoute(routes[0] as Route);

        // Add all routes to the store
        setRoutes(routes);

        // Add notification for routes calculated
        addNotification({
          type: "info",
          message: `${routes.length} routes calculated. Select your preferred route.`,
          duration: 5000,
        });
      } catch (error) {
        console.error("Error planning route:", error);

        // Error notification
        addNotification({
          type: "danger",
          message: "Failed to calculate routes. Please try again.",
          duration: 5000,
        });
      } finally {
        // Hide route planning indicator
        setIsRoutePlanning(false);
      }
    } else if (mapMode === "DRAW_THREAT") {
      // Add point to drawing coordinates
      const newCoordinates = [...drawingCoordinates, [lngLat.lng, lngLat.lat]];
      updateDrawingCoordinates(newCoordinates);

      // Add notification for point added to threat zone
      if (drawingCoordinates.length === 0) {
        addNotification({
          type: "info",
          message: "Started drawing threat zone. Add more points to complete.",
          duration: 3000,
        });
      }
    } else if (mapMode === "ADD_ENEMY") {
      // Place an enemy on the map
      try {
        console.log("Adding enemy at position:", clickedPosition);
        const response = await api.addSingleEnemy(clickedPosition, selectedEnemyType);
        console.log("Response from API:", response);

        if (response.success) {
          const newEnemy: PlacedEnemy = {
            id: `enemy-${Date.now()}`,
            position: clickedPosition,
            type: selectedEnemyType,
          };
          setPlacedEnemies((prev) => [...prev, newEnemy]);

          // Process and add threat areas returned from the backend
          const responseWithThreat = response as { success: boolean; threatAreas?: { coordinates: any; level: string }[] };
          if (responseWithThreat.threatAreas && responseWithThreat.threatAreas.length > 0) {
            console.log("Received threat areas from backend:", responseWithThreat.threatAreas);

            // Check if there's an intersection with the current route when mission is active
            let hasIntersection = false;

            // Add each threat area to the store
            responseWithThreat.threatAreas.forEach((threatArea) => {
              console.log("Adding threat area to map store:", threatArea);
              addThreatZone(threatArea.coordinates, threatArea.level as ThreatLevel);

              // Check for intersection with current route if mission is active
              if (isMissionActive && currentRoute) {
                try {
                  // Create a polygon from the threat area
                  const threatPolygon = turf.polygon(threatArea.coordinates);

                  // Create a linestring from the route
                  const routeCoordinates = currentRoute.points.map((p) => [p.coordinates.longitude, p.coordinates.latitude]);
                  const routeLine = turf.lineString(routeCoordinates);

                  // Check for intersection
                  const intersection = turf.booleanIntersects(threatPolygon, routeLine);
                  if (intersection) {
                    hasIntersection = true;
                  }
                } catch (error) {
                  console.error("Error checking route intersection:", error);
                }
              }
            });

            // If in a mission and there's an intersection with the route, ask user for confirmation
            if (isMissionActive && hasIntersection) {
              // Save the destination for later use if recalculation is confirmed
              const destination =
                selectedDestination ||
                (currentRoute && currentRoute.points.length > 0 ? currentRoute.points[currentRoute.points.length - 1].coordinates : null);

              if (destination) {
                setPendingDestination(destination);
              }

              // Show enemy type in a more readable format
              const formattedEnemyType = selectedEnemyType.charAt(0).toUpperCase() + selectedEnemyType.slice(1);
              setRecalculationEnemyType(formattedEnemyType);

              // Show confirmation dialog
              setShowRecalculationConfirm(true);

              // Add notification
              addNotification({
                type: "danger",
                message: `${formattedEnemyType} enemy detected intersecting with your route!`,
                duration: 5000,
              });
            }
            // Only show notification if not in a mission or if there's no intersection
            else if (!isMissionActive) {
              // Add notification for enemy added when not in mission
              addNotification({
                type: "danger",
                message: `${selectedEnemyType.charAt(0).toUpperCase() + selectedEnemyType.slice(1)} enemy detected on the map.`,
                duration: 5000,
              });
            }
          } else {
            console.log("No threat areas received from backend");

            // No threat areas, so no intersection check needed
            if (!isMissionActive) {
              // Only show notification when not in mission mode
              addNotification({
                type: "danger",
                message: `${selectedEnemyType.charAt(0).toUpperCase() + selectedEnemyType.slice(1)} enemy detected on the map.`,
                duration: 5000,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error adding ${selectedEnemyType} enemy:`, error);

        // Error notification
        addNotification({
          type: "danger",
          message: `Failed to add ${selectedEnemyType} enemy. Please try again.`,
          duration: 5000,
        });
      }
    }
  };

  // Handle route click event in choosing route mode
  const handleRouteClick = (routeId: string, routeIndex: number) => {
    // Allow route selection if in CHOOSING_ROUTE mode regardless of mission state
    // This enables rerouting during active missions when a threat is detected
    if (mapMode === "CHOOSING_ROUTE") {
      // Find the selected route
      const selectedRoute = routes.find((route) => route.id === routeId);

      if (selectedRoute) {
        // Set it as the current route
        setCurrentRoute(selectedRoute);

        // Store the route letter (A, B, C, etc.)
        const routeLetter = String.fromCharCode(65 + routeIndex); // Convert 0 -> A, 1 -> B, etc.
        setSelectedRouteLetter(routeLetter);

        // Select the route and show countdown
        selectRoute(routeId);
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

      // Add notification for threat zone created
      const threatLevelName = selectedThreatLevel === "highThreat" ? "High" : selectedThreatLevel === "medThreat" ? "Medium" : "Low";

      addNotification({
        type: selectedThreatLevel === "highThreat" ? "danger" : "warning",
        message: `${threatLevelName} threat zone added to the map.`,
        duration: 5000,
      });
    } catch (error) {
      console.error("Error submitting threat zone:", error);

      // Error notification
      addNotification({
        type: "danger",
        message: "Failed to create threat zone. Please try again.",
        duration: 5000,
      });
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
        onMove={handleMapMove}
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
                    onClick={() => handleRouteClick(route.id, index)}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Threat zones */}
        {threatZones.map((zone) => {
          console.log("Rendering threat zone:", zone);
          console.log("Zone coordinates type:", typeof zone.coordinates);
          console.log("Zone coordinates length:", zone.coordinates?.length);

          // Validate coordinates format
          const coordsValid = Array.isArray(zone.coordinates) && zone.coordinates.length > 0;

          if (!coordsValid) {
            console.error("Invalid coordinates format:", zone.coordinates);
            return null;
          }

          // Debug the structure of the coordinates
          console.log("First coordinate array:", zone.coordinates[0]);

          // Get the threat zone layer style
          const layerStyle = getThreatZoneLayer(zone.level);
          console.log("Threat zone layer style:", layerStyle);

          // Ensure coordinates are in the proper GeoJSON format
          // GeoJSON Polygon expects: [[[lng1, lat1], [lng2, lat2], ...]]
          let formattedCoords = zone.coordinates;

          // If coordinates aren't properly nested, wrap them
          if (!Array.isArray(zone.coordinates[0][0])) {
            formattedCoords = [zone.coordinates as any];
            console.log("Fixed coordinates format:", formattedCoords);
          }

          // Construct the GeoJSON feature with proper coordinates
          const geoJsonData = {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Polygon" as const,
              coordinates: formattedCoords,
            },
          };

          console.log("GeoJSON data:", JSON.stringify(geoJsonData));

          // Generate unique IDs for this threat zone's layers
          const sourceId = `threat-zone-${zone.id}`;
          const fillLayerId = `threat-zone-fill-${zone.id}`;
          const lineLayerId = `threat-zone-line-${zone.id}`;

          return (
            <Source key={sourceId} id={sourceId} type="geojson" data={geoJsonData}>
              {/* Fill layer for the threat zone */}
              <Layer
                id={fillLayerId}
                type="fill"
                paint={{
                  "fill-color": layerStyle.paint["fill-color"] || "rgba(255, 0, 0, 0.5)",
                  "fill-opacity": 0.7,
                }}
              />
              {/* Outline layer to make the border more visible */}
              <Layer
                id={lineLayerId}
                type="line"
                paint={{
                  "line-color": layerStyle.paint["fill-outline-color"] || "rgba(255, 0, 0, 1.0)",
                  "line-width": 3,
                  "line-opacity": 1.0,
                }}
              />
            </Source>
          );
        })}

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
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                title="Start Mission"
              >
                <PlayCircle size={28} />
              </button>
            ) : (
              <>
                <button
                  onClick={handleEndMission}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  title="Pause Mission"
                >
                  <PauseCircle size={28} />
                </button>
                <button
                  onClick={handleStopMission}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                  title="Stop Mission"
                >
                  <X size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Route selection instruction panel */}
      {mapMode === "CHOOSING_ROUTE" && (
        <div className="absolute top-[39rem] left-4 bg-gray-900 bg-opacity-85 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="text-lg font-bold mb-2 flex items-center">
            <Navigation className="mr-2" /> {isMissionActive ? "Rerouting Required" : "Choose a Route"}
          </h3>
          <p className="text-sm text-gray-300 mb-3">Click on your preferred route to select it:</p>
          <div className="space-y-2">
            {routes.map((route, index) => (
              <div
                key={route.id}
                className={`p-2 rounded flex items-center cursor-pointer ${
                  route.id === selectedRouteId ? "bg-green-800" : "bg-gray-800 hover:bg-gray-700"
                }`}
                onClick={() => handleRouteClick(route.id, index)}
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
      {showRouteCountdown && selectedRouteId && (
        <RouteCountdown onConfirm={handleConfirmRoute} onCancel={handleCancelRoute} routeName={selectedRouteLetter} />
      )}

      {/* Route Planning Loading Indicator */}
      {isRoutePlanning && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-5 flex flex-col items-center">
            <Loader size={40} className="text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-800">Planning Routes</h3>
            <p className="text-gray-600">Calculating the best routes for your mission...</p>
          </div>
        </div>
      )}

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

      {/* Follow mode toggle button - only show during active missions */}
      {isMissionActive && (
        <div className="absolute bottom-24 right-4 z-10">
          <button
            onClick={toggleFollowMode}
            className={`${
              followMode ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
            } text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center transition-all duration-200`}
          >
            <Crosshair size={20} className="mr-2" />
            {followMode ? "Following" : "Follow Me"}
          </button>
        </div>
      )}

      {/* Route recalculation confirmation */}
      {showRecalculationConfirm && (
        <RouteRecalculationConfirm
          onConfirm={handleConfirmRecalculation}
          onCancel={handleCancelRecalculation}
          enemyType={recalculationEnemyType}
        />
      )}
    </div>
  );
};

export default EnhancedMapContainer;
