import { ThreatLevel } from '../../types';

/**
 * Get the layer style for a route
 */
export const getRouteLayer = () => ({
  id: 'route-layer',
  type: 'line',
  paint: {
    'line-color': '#3070FF',
    'line-width': 4,
    'line-opacity': 0.8
  }
});

/**
 * Get the layer style for a threat zone based on its level
 */
export const getThreatZoneLayer = (level: ThreatLevel) => {
  // Colors based on threat level
  const colors = {
    [ThreatLevel.MEDIUM]: 'rgba(255, 170, 0, 0.35)', // Orange for medium threat
    [ThreatLevel.HIGH]: 'rgba(255, 50, 50, 0.35)'    // Red for high threat
  };
  
  const borderColors = {
    [ThreatLevel.MEDIUM]: 'rgba(255, 170, 0, 0.8)',
    [ThreatLevel.HIGH]: 'rgba(255, 50, 50, 0.8)'
  };

  return {
    id: `threat-zone-layer-${level}`,
    type: 'fill',
    paint: {
      'fill-color': colors[level],
      'fill-outline-color': borderColors[level]
    }
  };
};

/**
 * Get the layer style for the threat zone being drawn
 */
export const getDrawingLayer = () => ({
  id: 'drawing-layer',
  type: 'line',
  paint: {
    'line-color': '#FFC107',
    'line-width': 3,
    'line-dasharray': [2, 1]
  }
});