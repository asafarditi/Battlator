import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { MapMode, Coordinates, ThreatArea, Route, VantagePoint } from "../types";
import { api } from "../services/api";
import { generateMockThreatArea } from "../utils/mockData";

export default function useMap() {
  // Map view state
  const [mapMode, setMapMode] = useState<MapMode>("view");
  const [currentPosition, setCurrentPosition] = useState<Coordinates>({ lat: 32.321457, lng: 34.853195 });
  const [end, setEnd] = useState<Coordinates | null>(null);
  const [threatAreas, setThreatAreas] = useState<ThreatArea[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [vantagePoint, setVantagePoint] = useState<VantagePoint | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    threatAreas: true,
    route: true,
    viewshed: true,
  });

  // Loading states
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isFindingVantage, setIsFindingVantage] = useState(false);

  // Simulate movement of current position
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPosition((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0001,
        lng: prev.lng + (Math.random() - 0.5) * 0.0001,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleMapClick = useCallback(
    (latLng: Coordinates) => {
      if (mapMode === "placeEnd") {
        setEnd(latLng);
        setMapMode("view");
      } else if (mapMode === "drawThreat") {
        const newThreatArea = generateMockThreatArea(latLng);
        setThreatAreas((prev) => [...prev, newThreatArea]);
        setMapMode("view");
      }
    },
    [mapMode]
  );

  const enterMode = useCallback((mode: MapMode) => {
    setMapMode(mode);
  }, []);

  const toggleLayer = useCallback(
    (layer: keyof typeof visibleLayers) => {
      setVisibleLayers((prev) => ({
        ...prev,
        [layer]: !prev[layer],
      }));
    },
    [visibleLayers]
  );

  const removeThreatArea = useCallback((id: string) => {
    setThreatAreas((prev) => prev.filter((area) => area.id !== id));
  }, []);

  const clearMap = useCallback(() => {
    setRoute(null);
    setEnd(null);
    setThreatAreas([]);
    setVantagePoint(null);
    setVisibleLayers({
      threatAreas: true,
      route: true,
      viewshed: true,
    });
    setMapMode("view");
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!end) {
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const response = await api.planRoute({
        start: currentPosition,
        end,
        threatAreas,
      });

      setRoute(response.route);
    } catch (error) {
      console.error("Failed to calculate route:", error);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [currentPosition, end, threatAreas]);

  const findVantagePoint = useCallback(async () => {
    if (!end) {
      return;
    }

    setIsFindingVantage(true);
    try {
      const vantage = await api.suggestVantage(currentPosition, end, threatAreas);
      setVantagePoint(vantage);
    } catch (error) {
      console.error("Failed to find vantage point:", error);
    } finally {
      setIsFindingVantage(false);
    }
  }, [currentPosition, end, threatAreas]);

  return {
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
  };
}
