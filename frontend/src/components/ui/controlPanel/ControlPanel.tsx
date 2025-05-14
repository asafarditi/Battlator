import React from 'react';
import { useMapStore } from '../../../store/mapStore';
import { MapMode, ThreatLevel } from '../../../types';
import { formatCoordinates } from '../../../utils/helpers';
import { websocketService } from '../../../services/websocket';
import { api } from '../../../services/api';
import { generateId } from '../../../utils/helpers';
import { Map, RouteIcon, ShieldAlert, ShieldCheck, PlayCircle, PauseCircle, Navigation, AlertTriangle } from 'lucide-react';

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
                selectedThreatLevel === ThreatLevel.MEDIUM
                  ? "bg-yellow-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <ShieldAlert size={18} className="mr-2" />
              Medium
            </button>
            <button
              onClick={() => setSelectedThreatLevel(ThreatLevel.HIGH)}
              className={`p-2 rounded-md flex items-center justify-center ${
                selectedThreatLevel === ThreatLevel.HIGH
                  ? "bg-red-600"
                  : "bg-gray-700 hover:bg-gray-600"
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
      
      {/* Mission control */}
      <div className="mt-4">
        <p className="text-gray-400 mb-2">MISSION CONTROL:</p>
        <div className="grid grid-cols-1 gap-2">
          {!isMissionActive ? (
            <button
              onClick={handleStartMission}
              disabled={!currentRoute}
              className={`p-3 rounded-md flex items-center justify-center ${
                currentRoute
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              <PlayCircle size={20} className="mr-2" />
              Start Mission
            </button>
          ) : (
            <button
              onClick={handleEndMission}
              className="p-3 rounded-md flex items-center justify-center bg-red-600 hover:bg-red-700"
            >
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
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;