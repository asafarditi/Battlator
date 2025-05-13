
import React from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import MapContainer from '@/components/Map/MapContainer';
import MapControls from '@/components/Map/MapControls';
import MapLayers from '@/components/Map/MapLayers';
import RouteInfo from '@/components/InfoPanel/RouteInfo';
import useMap from '@/hooks/useMap';
import { MapPin, Flag, Shield, Layers, Info } from 'lucide-react';

const Index = () => {
  const {
    mapMode,
    start,
    end,
    threatAreas,
    route,
    vantagePoint,
    visibleLayers,
    isCalculatingRoute,
    isFindingVantage,
    handleMapClick,
    enterMode,
    toggleLayer,
    removeThreatArea,
    clearMap,
    calculateRoute,
    findVantagePoint
  } = useMap();

  // Handle route calculation
  const handleCalculateRoute = () => {
    if (!start || !end) {
      toast.error('You need to set start and end points first');
      return;
    }
    
    calculateRoute();
    toast.success('Calculating optimal route...');
  };

  // Handle vantage point finder
  const handleFindVantage = () => {
    if (!start || !end) {
      toast.error('You need to set start and end points first');
      return;
    }
    
    findVantagePoint();
    toast.success('Finding optimal vantage point...');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tactical Route Planner</h1>
        <p className="text-muted-foreground">Plan optimal routes while avoiding threat zones</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Main map area */}
        <div className="lg:col-span-8 h-[60vh] md:h-[70vh]">
          <MapContainer
            mode={mapMode}
            start={start}
            end={end}
            threatAreas={threatAreas}
            route={route}
            vantagePoint={vantagePoint}
            visibleLayers={visibleLayers}
            onMapClick={handleMapClick}
          />
        </div>
        
        {/* Control sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <MapControls
            onEnterMode={enterMode}
            onRemoveThreatArea={removeThreatArea}
            onClearMap={clearMap}
            onCalculateRoute={handleCalculateRoute}
            onFindVantage={handleFindVantage}
            isCalculatingRoute={isCalculatingRoute}
            isFindingVantage={isFindingVantage}
            threatAreas={threatAreas}
            startPoint={!!start}
            endPoint={!!end}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            <MapLayers 
              visibleLayers={visibleLayers}
              onToggleLayer={toggleLayer}
            />
            
            <RouteInfo 
              route={route} 
              vantagePoint={vantagePoint} 
              isLoading={isCalculatingRoute || isFindingVantage} 
            />
          </div>
        </div>
      </div>
      
      <footer className="mt-6 text-center text-sm text-muted-foreground">
        <p>Tactical Route Planner Boilerplate © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
