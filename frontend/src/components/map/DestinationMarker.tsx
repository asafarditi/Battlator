import React from "react";
import { Marker } from "react-map-gl";
import { Position } from "../../types";
import { Target } from "lucide-react";

interface DestinationMarkerProps {
  position: Position;
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({ position }) => {
  return (
    <Marker longitude={position.longitude} latitude={position.latitude} anchor="center">
      <div className="relative">
        <div className="relative bg-red-600 text-white p-1 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2">
          <Target size={20} />
        </div>
      </div>
    </Marker>
  );
};
