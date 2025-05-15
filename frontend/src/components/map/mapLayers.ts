import { ThreatLevel } from "../../types";

/**
 * Get the layer style for a route
 * @param isSelected - Whether this route is currently selected
 * @param index - The index of the route for color variation
 */
export const getRouteLayer = (isSelected = false, index = 0) => {
  // Color variations for different routes
  const routeColors = ["#3070FF", "#30B0FF", "#6A30FF"];
  const color = routeColors[index % routeColors.length];

  return {
    id: "route-layer",
    type: "line",
    paint: {
      "line-color": isSelected ? "#00C853" : color,
      "line-width": isSelected ? 9 : 7,
      "line-opacity": isSelected ? 0.9 : 0.7,
      "line-blur": isSelected ? 0 : 1,
      "line-cap": "round",
      "line-join": "round",
    },
  };
};

/**
 * Get the glow effect layer for the selected route
 */
export const getRouteGlowLayer = () => ({
  id: "route-glow-layer",
  type: "line",
  paint: {
    "line-color": "rgba(0, 200, 83, 0.5)",
    "line-width": 14,
    "line-blur": 8,
    "line-opacity": 0.6,
    "line-cap": "round",
    "line-join": "round",
  },
});

/**
 * Get the layer style for a threat zone based on its level
 */
export const getThreatZoneLayer = (level: ThreatLevel) => {
  // Colors based on threat level
  const colors = {
    [ThreatLevel.MEDIUM]: "rgba(255, 170, 0, 0.35)", // Orange for medium threat
    [ThreatLevel.HIGH]: "rgba(255, 50, 50, 0.35)", // Red for high threat
  };

  const borderColors = {
    [ThreatLevel.MEDIUM]: "rgba(255, 170, 0, 0.8)",
    [ThreatLevel.HIGH]: "rgba(255, 50, 50, 0.8)",
  };

  return {
    id: `threat-zone-layer-${level}`,
    type: "fill",
    paint: {
      "fill-color": colors[level],
      "fill-outline-color": borderColors[level],
    },
  };
};

/**
 * Get the layer style for the threat zone being drawn
 */
export const getDrawingLayer = () => ({
  id: "drawing-layer",
  type: "line",
  paint: {
    "line-color": "#FFC107",
    "line-width": 3,
    "line-dasharray": [2, 1],
  },
});
