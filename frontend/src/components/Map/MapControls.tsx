import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapControlsProps, MapMode } from "@/types";
import { Flag, Shield, Eye, Route as RouteIcon, X } from "lucide-react";

const MapControls: React.FC<{
  onEnterMode: (mode: MapMode) => void;
  onRemoveThreatArea: (id: string) => void;
  onClearMap: () => void;
  onCalculateRoute: () => void;
  onFindVantage: () => void;
  isCalculatingRoute: boolean;
  isFindingVantage: boolean;
  threatAreas: any[];
  endPoint: boolean;
}> = ({
  onEnterMode,
  onRemoveThreatArea,
  onClearMap,
  onCalculateRoute,
  onFindVantage,
  isCalculatingRoute,
  isFindingVantage,
  threatAreas,
  endPoint,
}) => {
  return (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50 p-3">
      <div className="space-y-2">
        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className={`w-full ${
              endPoint ? "bg-tactical-blue/20 hover:bg-tactical-blue/30" : "bg-tactical-blue/80 hover:bg-tactical-blue"
            } backdrop-blur-sm text-white`}
            onClick={() => onEnterMode("placeEnd")}
          >
            <Flag className="h-4 w-4 mr-2" />
            Target
            {endPoint && <Badge className="ml-2 bg-tactical-red/80 text-[10px]">SET</Badge>}
          </Button>

          <Button
            size="sm"
            className="w-full bg-tactical-red/80 hover:bg-tactical-red backdrop-blur-sm text-white"
            onClick={() => onEnterMode("drawThreat")}
          >
            <Shield className="h-4 w-4 mr-2" />
            Threat
            {threatAreas.length > 0 && <Badge className="ml-2 bg-white/20 text-[10px]">{threatAreas.length}</Badge>}
          </Button>
        </div>

        {/* Operation Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="w-full bg-tactical-green/80 hover:bg-tactical-green backdrop-blur-sm text-white"
            onClick={onCalculateRoute}
            disabled={isCalculatingRoute || !endPoint}
          >
            <RouteIcon className="h-4 w-4 mr-2" />
            {isCalculatingRoute ? "..." : "Route"}
          </Button>

          <Button
            size="sm"
            className="w-full bg-tactical-lightBlue/80 hover:bg-tactical-lightBlue backdrop-blur-sm text-white"
            onClick={onFindVantage}
            disabled={isFindingVantage || !endPoint}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isFindingVantage ? "..." : "OP"}
          </Button>
        </div>

        {/* Clear Button */}
        <Button
          size="sm"
          variant="ghost"
          className="w-full hover:bg-background/40 text-muted-foreground hover:text-foreground"
          onClick={onClearMap}
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </Card>
  );
};

export default MapControls;
