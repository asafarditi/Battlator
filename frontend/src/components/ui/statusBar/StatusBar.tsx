import React from 'react';
import { useMapStore } from '../../../store/mapStore';
import { formatCoordinates } from '../../../utils/helpers';
import { Wifi, WifiOff, Target, MapPin } from 'lucide-react';
import { websocketService } from '../../../services/websocket';

const StatusBar: React.FC = () => {
  const { 
    currentPosition, 
    selectedDestination,
    isMissionActive
  } = useMapStore();
  
  const isConnected = websocketService.isConnected();
  
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-85 text-white px-4 py-2 flex justify-between items-center text-xs">
      <div className="flex items-center space-x-4">
        {/* Connection status */}
        <div className="flex items-center">
          {isConnected ? (
            <>
              <Wifi size={14} className="mr-1 text-green-400" />
              <span className="text-green-400">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="mr-1 text-red-400" />
              <span className="text-red-400">DISCONNECTED</span>
            </>
          )}
        </div>
        
        {/* Mission status */}
        <div>
          <span className="text-gray-400 mr-1">STATUS:</span>
          <span className={isMissionActive ? "text-green-400" : "text-yellow-400"}>
            {isMissionActive ? "MISSION ACTIVE" : "STANDBY"}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 font-mono">
        {/* Current position */}
        <div className="flex items-center">
          <MapPin size={14} className="mr-1 text-blue-400" />
          <span className="text-gray-400 mr-1">POS:</span>
          <span>{formatCoordinates(currentPosition.latitude, currentPosition.longitude)}</span>
        </div>
        
        {/* Selected destination */}
        {selectedDestination && (
          <div className="flex items-center">
            <Target size={14} className="mr-1 text-red-400" />
            <span className="text-gray-400 mr-1">DEST:</span>
            <span>{formatCoordinates(selectedDestination.latitude, selectedDestination.longitude)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBar;