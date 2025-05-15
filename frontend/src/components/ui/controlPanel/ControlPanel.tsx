import React from "react";
import { useMapStore } from "../../../store/mapStore";
import { MapMode, ThreatLevel } from "../../../types";
import { formatCoordinates } from "../../../utils/helpers";
import { websocketService } from "../../../services/websocket";
import { api, EnemyType } from "../../../services/api";
import { generateId } from "../../../utils/helpers";
import {
  Map,
  RouteIcon,
  ShieldAlert,
  ShieldCheck,
  PlayCircle,
  PauseCircle,
  Navigation,
  AlertTriangle,
  Users,
  Truck,
  Target,
  RotateCcw,
} from "lucide-react";

// Add TankIcon if not available in lucide-react
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

const ControlPanel: React.FC = () => {
  const {
    currentPosition,
    mapMode,
    setMapMode,
    selectedThreatLevel,
    setSelectedThreatLevel,
    currentRoute,
    selectedDestination,
    selectedEnemyType,
    setSelectedEnemyType,
    routes,
    startRouteSelection,
    setSelectedDestination,
    resetRouteData,
    isMissionActive,
    missionPaused,
    setRoutes,
    setCurrentRoute,
  } = useMapStore();

  // Mission control functionality moved to EnhancedMapContainer

  // Check if route planning/selection should be disabled
  const isRoutePlanningDisabled = isMissionActive || missionPaused;

  // Check if there's any route planning data
  const hasRoutePlanningData = selectedDestination !== null || routes.length > 0;

  // Function to allow changing destination
  const handleChangeDestination = () => {
    setMapMode("ROUTE");
    // Clear the selected destination and routes to start over
    setSelectedDestination(null);
    // Clear existing routes by setting an empty array
    setRoutes([]);
    // Reset current route
    setCurrentRoute(null);
  };

  return (
    <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-85 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-bold flex items-center">
          <Map className="mr-2" /> Waze Of War
        </h2>
      </div>

      {/* Position info */}
      <div className="mb-4 font-mono text-sm">
        <p className="text-gray-400">CURRENT POSITION:</p>
        <p className="text-white">{formatCoordinates(currentPosition.latitude, currentPosition.longitude)}</p>
      </div>

      {/* Destination info - only shown when a destination is selected */}
      {selectedDestination && (
        <div className="mb-4 font-mono text-sm">
          <p className="text-gray-400">DESTINATION:</p>
          <p className="text-white">{formatCoordinates(selectedDestination.latitude, selectedDestination.longitude)}</p>
        </div>
      )}

      {/* Mode buttons */}
      <div className="mb-4">
        <p className="text-gray-400 mb-2">MAP MODE:</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMapMode("VIEW")}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              mapMode === "VIEW" ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Map size={20} className="mb-1" />
            View
          </button>
          <button
            onClick={() => !isRoutePlanningDisabled && setMapMode("ROUTE")}
            disabled={isRoutePlanningDisabled}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              mapMode === "ROUTE" || mapMode === "CHOOSING_ROUTE"
                ? "bg-blue-700"
                : isRoutePlanningDisabled
                ? "bg-gray-700 opacity-50 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <RouteIcon size={20} className="mb-1" />
            Route
          </button>
          <button
            onClick={() => setMapMode("ADD_ENEMY")}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              mapMode === "ADD_ENEMY" ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Users size={20} className="mb-1" />
            Enemy
          </button>
        </div>
      </div>

      {/* Change Destination button - shown if destination exists and mission not started */}
      {selectedDestination && !isRoutePlanningDisabled && (
        <div className="mb-4">
          <button
            onClick={handleChangeDestination}
            className="w-full p-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center"
          >
            <Target className="mr-2" />
            Change Destination
          </button>
        </div>
      )}

      {/* Start Over button - completely reset route planning when there's existing data */}
      {hasRoutePlanningData && !isRoutePlanningDisabled && (
        <div className="mb-4">
          <button
            onClick={resetRouteData}
            className="w-full p-3 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-medium flex items-center justify-center"
          >
            <RotateCcw className="mr-2" />
            Start Over
          </button>
        </div>
      )}

      {/* Route selection button - show when routes are available and mission is not active or paused */}
      {routes.length > 1 && mapMode !== "CHOOSING_ROUTE" && !isRoutePlanningDisabled && (
        <div className="mb-4">
          <button
            onClick={startRouteSelection}
            className="w-full p-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center"
          >
            <Navigation className="mr-2" />
            Choose Different Route
          </button>
        </div>
      )}

      {/* Show message when route selection is disabled during active/paused mission */}
      {routes.length > 1 && mapMode !== "CHOOSING_ROUTE" && isRoutePlanningDisabled && (
        <div className="mb-4">
          <div className="w-full p-3 rounded-md bg-gray-800 text-gray-400 font-medium flex items-center justify-center border border-gray-700">
            <Navigation className="mr-2 text-gray-500" />
            Route changes locked during mission
          </div>
        </div>
      )}

      {/* Threat level selector (only visible in DRAW_THREAT mode) */}
      {mapMode === "DRAW_THREAT" && (
        <div className="mb-4">
          <p className="text-gray-400 mb-2">THREAT LEVEL:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedThreatLevel(ThreatLevel.MEDIUM)}
              className={`p-2 rounded-md flex items-center justify-center ${
                selectedThreatLevel === ThreatLevel.MEDIUM ? "bg-yellow-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <ShieldAlert size={18} className="mr-2" />
              Medium
            </button>
            <button
              onClick={() => setSelectedThreatLevel(ThreatLevel.HIGH)}
              className={`p-2 rounded-md flex items-center justify-center ${
                selectedThreatLevel === ThreatLevel.HIGH ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <ShieldCheck size={18} className="mr-2" />
              High
            </button>
          </div>

          {mapMode === "DRAW_THREAT" && (
            <div className="mt-2 text-xs text-gray-400">
              <p>Click on the map to create threat zone points. Click "Complete Zone" when finished.</p>
            </div>
          )}
        </div>
      )}

      {/* Enemy type selector (only visible in ADD_ENEMY mode) */}
      {mapMode === "ADD_ENEMY" && (
        <div className="mb-4">
          <p className="text-gray-400 mb-2">ENEMY TYPE:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedEnemyType(EnemyType.PERSON)}
              className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
                selectedEnemyType === EnemyType.PERSON ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <Users size={20} className="mb-1" />
              Person
            </button>
            <button
              onClick={() => setSelectedEnemyType(EnemyType.VEHICLE)}
              className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
                selectedEnemyType === EnemyType.VEHICLE ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <Truck size={20} className="mb-1" />
              Vehicle
            </button>
            <button
              onClick={() => setSelectedEnemyType(EnemyType.TANK)}
              className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
                selectedEnemyType === EnemyType.TANK ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <TankIcon size={20} className="mb-1" />
              Tank
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            <p>Select an enemy type and click on the map to place it.</p>
          </div>
        </div>
      )}

      {/* Show route selection instructions when in choosing route mode */}
      {mapMode === "CHOOSING_ROUTE" && (
        <div className="mb-4 border-t border-b border-gray-700 py-2 my-2">
          <p className="text-green-400 font-medium flex items-center justify-center">
            <Navigation className="mr-2" />
            Choose a route on the map
          </p>
          <p className="text-xs text-gray-300 text-center mt-1">Click on your preferred route to select it</p>
        </div>
      )}

      {/* Mission control section moved to map top-center */}

      {/* Usage instructions */}
      <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-2">
        <p className="mb-1">MAP MODE INSTRUCTIONS:</p>
        <ul className="list-disc pl-4">
          <li>VIEW: Pan and zoom the map</li>
          <li>ROUTE: Click destination to plan route</li>
          <li>ENEMY: Place single enemies on the map</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;
