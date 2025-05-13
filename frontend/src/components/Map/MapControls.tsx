
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapControlsProps, MapMode } from '@/types';
import { 
  MapPin, 
  Flag, 
  Shield, 
  Eye, 
  Route as RouteIcon, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';

const MapControls: React.FC<{
  onEnterMode: (mode: MapMode) => void;
  onRemoveThreatArea: (id: string) => void;
  onClearMap: () => void;
  onCalculateRoute: () => void;
  onFindVantage: () => void;
  isCalculatingRoute: boolean;
  isFindingVantage: boolean;
  threatAreas: any[];
  startPoint: boolean;
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
  startPoint,
  endPoint
}) => {
  return (
    <Card className="w-full h-full bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RouteIcon className="h-5 w-5" />
          Planning Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 justify-start"
            onClick={() => onEnterMode('placeStart')}
          >
            <MapPin className="h-4 w-4" />
            <span>Start Point</span>
            {startPoint && (
              <Badge className="ml-auto bg-tactical-green text-white">Set</Badge>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2 justify-start"
            onClick={() => onEnterMode('placeEnd')}
          >
            <Flag className="h-4 w-4" />
            <span>End Point</span>
            {endPoint && (
              <Badge className="ml-auto bg-tactical-red text-white">Set</Badge>
            )}
          </Button>
        </div>

        <div>
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-start"
            onClick={() => onEnterMode('drawThreat')}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Add Threat Area</span>
            {threatAreas.length > 0 && (
              <Badge className="ml-auto bg-tactical-orange text-white">{threatAreas.length}</Badge>
            )}
          </Button>
          
          {threatAreas.length > 0 && (
            <div className="mt-2 max-h-28 overflow-y-auto p-2 border rounded-md border-border">
              <ul className="space-y-1">
                {threatAreas.map((area) => (
                  <li key={area.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full 
                        ${area.riskLevel === 'high' ? 'bg-threat-high' : 
                          area.riskLevel === 'medium' ? 'bg-threat-medium' : 
                          'bg-threat-low'}`} 
                      />
                      <span className="text-xs">{area.description}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onRemoveThreatArea(area.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="space-y-2 pt-2">
          <Button 
            className="w-full bg-tactical-green hover:bg-tactical-green/90"
            disabled={!startPoint || !endPoint || isCalculatingRoute}
            onClick={onCalculateRoute}
          >
            {isCalculatingRoute ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RouteIcon className="h-4 w-4" />
                Calculate Route
              </span>
            )}
          </Button>
          
          <Button 
            variant="outline"
            className="w-full"
            disabled={!startPoint || !endPoint || isFindingVantage}
            onClick={onFindVantage}
          >
            {isFindingVantage ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finding...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Find Vantage Point
              </span>
            )}
          </Button>
          
          <Button 
            variant="destructive" 
            className="w-full mt-4"
            onClick={onClearMap}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Map
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapControls;
