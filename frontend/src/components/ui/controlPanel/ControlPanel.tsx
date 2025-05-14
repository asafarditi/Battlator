import React from 'react';
import { useMapStore } from '../../../store/mapStore';
import { MapMode, ThreatLevel } from '../../../types';
import { formatCoordinates } from '../../../utils/helpers';
import { websocketService } from '../../../services/websocket';
import { api, EnemyType } from '../../../services/api';
import { generateId } from '../../../utils/helpers';
import { Map, RouteIcon, ShieldAlert, ShieldCheck, PlayCircle, PauseCircle, Navigation, AlertTriangle, Users, Truck } from 'lucide-react';

// Add TankIcon if not available in lucide-react
const TankIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
    isMissionActive,
    currentRoute,
    startMission,
    endMission,
    selectedEnemyType,
    setSelectedEnemyType,
  } = useMapStore();

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

  // End the mission
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

  return (
    <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-85 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-bold flex items-center">
          <Map className="mr-2" /> Waze for Commanders
        </h2>
        {isMissionActive && (
          <div className="flex items-center text-green-400">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            ACTIVE MISSION
          </div>
        )}
      </div>

      {/* Position info */}
      <div className="mb-4 font-mono text-sm">
        <p className="text-gray-400">CURRENT POSITION:</p>
        <p className="text-white">{formatCoordinates(currentPosition.latitude, currentPosition.longitude)}</p>
      </div>

      {/* Mode buttons */}
      <div className="mb-4">
        <p className="text-gray-400 mb-2">MAP MODE:</p>
        <div className="grid grid-cols-4 gap-2">
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
            onClick={() => setMapMode("ROUTE")}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              mapMode === "ROUTE" ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <RouteIcon size={20} className="mb-1" />
            Route
          </button>
          <button
            onClick={() => setMapMode("DRAW_THREAT")}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              mapMode === "DRAW_THREAT" ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <AlertTriangle size={20} className="mb-1" />
            Threat
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
                selectedEnemyType === EnemyType.PERSON
                  ? "bg-blue-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <Users size={20} className="mb-1" />
              Person
            </button>
            <button
              onClick={() => setSelectedEnemyType(EnemyType.VEHICLE)}
              className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
                selectedEnemyType === EnemyType.VEHICLE
                  ? "bg-blue-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <Truck size={20} className="mb-1" />
              Vehicle
            </button>
            <button
              onClick={() => setSelectedEnemyType(EnemyType.TANK)}
              className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
                selectedEnemyType === EnemyType.TANK
                  ? "bg-blue-700"
                  : "bg-gray-700 hover:bg-gray-600"
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
      
      {/* Mission control */}
      <div className="mt-4">
        <p className="text-gray-400 mb-2">MISSION CONTROL:</p>
        <div className="grid grid-cols-1 gap-2">
          {!isMissionActive ? (
            <button
              onClick={handleStartMission}
              disabled={!currentRoute}
              className={`p-3 rounded-md flex items-center justify-center ${
                currentRoute ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              <PlayCircle size={20} className="mr-2" />
              Start Mission
            </button>
          ) : (
            <button onClick={handleEndMission} className="p-3 rounded-md flex items-center justify-center bg-red-600 hover:bg-red-700">
              <PauseCircle size={20} className="mr-2" />
              End Mission
            </button>
          )}
        </div>
      </div>

      {/* Usage instructions */}
      <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-2">
        <p className="mb-1">MAP MODE INSTRUCTIONS:</p>
        <ul className="list-disc pl-4">
          <li>VIEW: Pan and zoom the map</li>
          <li>ROUTE: Click destination to plan route</li>
          <li>THREAT: Draw threat zones on the map</li>
          <li>ENEMY: Place single enemies on the map</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;
