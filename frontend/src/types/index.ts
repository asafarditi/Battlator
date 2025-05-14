export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  path: Coordinates[];
  distance: number;
  elevation: number;
  riskScore: number;
}

export interface ThreatArea {
  id: string;
  polygon: Coordinates[];
  riskLevel: "high" | "medium" | "low";
  description?: string;
}

export interface VantagePoint {
  id: string;
  position: Coordinates;
  visibilityPolygon: Coordinates[];
  coverageScore: number;
}

export interface RouteRequest {
  start: Coordinates;
  end: Coordinates;
  threatAreas: ThreatArea[];
}

export interface RouteResponse {
  route: Route;
  alternativeRoutes?: Route[];
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
}

export interface MapControlsProps {
  onAddThreatArea: () => void;
  onRemoveThreatArea: (id: string) => void;
  onClearMap: () => void;
  onCalculateRoute: () => void;
  onFindVantage: () => void;
  isCalculatingRoute: boolean;
  isFindingVantage: boolean;
  threatAreas: ThreatArea[];
}

export type MapMode = "view" | "placeEnd" | "drawThreat";

export interface MapLayerToggleProps {
  layers: {
    id: string;
    label: string;
    isActive: boolean;
  }[];
  onToggleLayer: (id: string) => void;
}

export interface RouteInfoProps {
  route: Route | null;
  vantagePoint?: VantagePoint | null;
  isLoading?: boolean;
  threatAreas: ThreatArea[];
}

export interface MapMarkerProps {
  position: Coordinates;
  type: "blueforce" | "end" | "vantage";
  icon?: string;
}
