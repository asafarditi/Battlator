import React from "react";
import { toast } from "sonner";
import MapContainer from "@/components/Map/MapContainer";
import MapControls from "@/components/Map/MapControls";
import MapLayers from "@/components/Map/MapLayers";
import RouteInfo from "@/components/InfoPanel/RouteInfo";
import useMap from "@/hooks/useMap";

const Index = () => {
  const {
    mapMode,
    currentPosition,
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
    findVantagePoint,
  } = useMap();

  // Handle route calculation
  const handleCalculateRoute = () => {
    if (!end) {
      toast.error("Please set a destination first");
      return;
    }

    calculateRoute();
    toast.success("Calculating optimal route...");
  };

  // Handle vantage point finder
  const handleFindVantage = () => {
    if (!end) {
      toast.error("Please set a destination first");
      return;
    }

    findVantagePoint();
    toast.success("Finding optimal vantage point...");
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Full-screen Map */}
      <MapContainer
        mode={mapMode}
        currentPosition={currentPosition}
        end={end}
        threatAreas={threatAreas}
        route={route}
        vantagePoint={vantagePoint}
        visibleLayers={visibleLayers}
        onMapClick={handleMapClick}
      />

      {/* Floating Controls - Top Left */}
      <div className="absolute top-4 left-4 z-[1001] flex flex-col gap-4">
        <MapLayers visibleLayers={visibleLayers} onToggleLayer={toggleLayer} />
      </div>

      {/* Floating Controls - Top Right */}
      <div className="absolute top-4 right-4 z-[1001] w-[320px]">
        <MapControls
          onEnterMode={enterMode}
          onRemoveThreatArea={removeThreatArea}
          onClearMap={clearMap}
          onCalculateRoute={handleCalculateRoute}
          onFindVantage={handleFindVantage}
          isCalculatingRoute={isCalculatingRoute}
          isFindingVantage={isFindingVantage}
          threatAreas={threatAreas}
          endPoint={!!end}
        />
      </div>

      {/* Floating Info Panel - Bottom Right */}
      {route && (
        <div className="absolute bottom-4 right-4 z-[1001] w-[320px]">
          <RouteInfo route={route} threatAreas={threatAreas} vantagePoint={vantagePoint} isLoading={false} />
        </div>
      )}
    </div>
  );
};

export default Index;
