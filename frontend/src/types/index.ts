export type Position = {
  latitude: number;
  longitude: number;
  altitude: number;
};

export type Route = {
  id: string;
  points: Position[];
};

export enum ThreatLevel {
  MEDIUM = "medThreat",
  HIGH = "highThreat",
}

export type ThreatZone = {
  id: string;
  coordinates: number[][][]; // GeoJSON Polygon coordinates
  level: ThreatLevel;
};

export type WebSocketMessage =
  | {
      type: "position";
      data: Position;
    }
  | {
      type: "alert";
      data: {
        message: string;
        level: "info" | "warning" | "danger";
      };
    };

export type MapMode = "VIEW" | "DRAW_THREAT" | "ROUTE";
