
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Route as RouteIcon, Eye, AlertTriangle } from 'lucide-react';
import { MapLayerToggleProps } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MapLayers: React.FC<{
  visibleLayers: {
    threatAreas: boolean;
    route: boolean;
    viewshed: boolean;
  };
  onToggleLayer: (layer: string) => void;
}> = ({ visibleLayers, onToggleLayer }) => {
  return (
    <Card className="w-full bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Map Layers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="threat-layer" 
              checked={visibleLayers.threatAreas}
              onCheckedChange={() => onToggleLayer('threatAreas')}
            />
            <Label htmlFor="threat-layer" className="flex items-center gap-2 cursor-pointer">
              <AlertTriangle className="h-4 w-4 text-tactical-orange" />
              Threat Areas
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="route-layer" 
              checked={visibleLayers.route}
              onCheckedChange={() => onToggleLayer('route')}
            />
            <Label htmlFor="route-layer" className="flex items-center gap-2 cursor-pointer">
              <RouteIcon className="h-4 w-4 text-tactical-green" />
              Route Path
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="viewshed-layer" 
              checked={visibleLayers.viewshed}
              onCheckedChange={() => onToggleLayer('viewshed')}
            />
            <Label htmlFor="viewshed-layer" className="flex items-center gap-2 cursor-pointer">
              <Eye className="h-4 w-4 text-tactical-lightBlue" />
              View-Shed
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapLayers;
