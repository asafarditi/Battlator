import React from "react";
import { Marker } from "react-map-gl";
import { Position } from "../../types";
import { GiTank } from "react-icons/gi";

interface FriendlyMarkerProps {
  position: Position;
}

export const FriendlyMarker: React.FC<FriendlyMarkerProps> = ({ position }) => {
  return (
    <Marker longitude={position.longitude} latitude={position.latitude} anchor="center">
      <div className="relative">
        {/* Pulsing circle effect */}
        <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-500 rounded-full opacity-25 animate-ping"></div>

        {/* Main marker */}
        <div className="relative bg-blue-600 text-white p-1.5 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <GiTank size={22} />
        </div>
      </div>
    </Marker>
  );
};
