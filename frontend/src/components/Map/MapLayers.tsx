import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Route, Shield } from "lucide-react";

interface LayerVisibility {
  threatAreas: boolean;
  route: boolean;
  viewshed: boolean;
}

interface MapLayersProps {
  visibleLayers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

const MapLayers: React.FC<MapLayersProps> = ({ visibleLayers, onToggleLayer }) => {
  return (
    <Card className="p-2 bg-background/80 backdrop-blur-sm border-border/50">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${visibleLayers.route ? "text-tactical-green" : "text-muted-foreground"}`}
          onClick={() => onToggleLayer("route")}
        >
          <Route className="h-4 w-4" />
          {visibleLayers.route ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${visibleLayers.threatAreas ? "text-tactical-red" : "text-muted-foreground"}`}
          onClick={() => onToggleLayer("threatAreas")}
        >
          <Shield className="h-4 w-4" />
          {visibleLayers.threatAreas ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${visibleLayers.viewshed ? "text-tactical-lightBlue" : "text-muted-foreground"}`}
          onClick={() => onToggleLayer("viewshed")}
        >
          <Eye className="h-4 w-4" />
          {visibleLayers.viewshed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
      </div>
    </Card>
  );
};

export default MapLayers;
