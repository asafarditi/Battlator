
import { v4 as uuidv4 } from 'uuid';
import { 
  Coordinates,
  Route,
  ThreatArea,
  VantagePoint
} from '../types';

/**
 * Calculate midpoint between two coordinates
 */
const midPoint = (coord1: Coordinates, coord2: Coordinates): Coordinates => {
  return {
    lat: (coord1.lat + coord2.lat) / 2,
    lng: (coord1.lng + coord2.lng) / 2
  };
};

/**
 * Calculate a point offset from the midpoint
 */
const offsetPoint = (midpoint: Coordinates, offset: number): Coordinates => {
  return {
    lat: midpoint.lat + (Math.random() - 0.5) * offset,
    lng: midpoint.lng + (Math.random() - 0.5) * offset
  };
};

/**
 * Calculate distance between two coordinates in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round((R * c) * 100) / 100; // Round to 2 decimal places
};

/**
 * Generate a mock route between start and end points
 */
export const generateMockRoute = (
  start: Coordinates, 
  end: Coordinates, 
  threatAreas: ThreatArea[]
): Route => {
  // Create a path with a slight curve to simulate an optimal route
  const midpoint = midPoint(start, end);
  const waypointCount = Math.floor(calculateDistance(start, end) * 3);
  
  // Generate intermediary points for the route
  const path = [start];
  
  // Create a slight curve offset from direct path
  const offset = 0.01; // adjust for more/less curve
  const curvePoint = offsetPoint(midpoint, offset);
  
  // Add some randomization to the path
  for (let i = 1; i <= waypointCount; i++) {
    const t = i / (waypointCount + 1);
    const lat = start.lat * (1 - t) * (1 - t) + 
                curvePoint.lat * 2 * (1 - t) * t + 
                end.lat * t * t;
                
    const lng = start.lng * (1 - t) * (1 - t) + 
                curvePoint.lng * 2 * (1 - t) * t + 
                end.lng * t * t;
    
    // Add some small randomness
    const jitter = 0.0005;
    path.push({
      lat: lat + (Math.random() - 0.5) * jitter,
      lng: lng + (Math.random() - 0.5) * jitter
    });
  }
  
  path.push(end);
  
  // Calculate mock statistics
  const distance = calculateDistance(start, end);
  const elevation = Math.floor(Math.random() * 120) + 20; // Random elevation gain
  
  // Calculate risk score based on proximity to threat areas
  let riskScore = Math.floor(Math.random() * 30) + 10;
  if (threatAreas.length > 0) {
    riskScore += threatAreas.length * 10;
  }
  
  return {
    id: uuidv4(),
    path,
    distance,
    elevation,
    riskScore: Math.min(riskScore, 100) // Cap risk score at 100
  };
};

/**
 * Generate a mock vantage point between start and end
 */
export const generateMockVantagePoint = (
  start: Coordinates,
  end: Coordinates
): VantagePoint => {
  const midpoint = midPoint(start, end);
  
  // Offset the vantage point from the midpoint
  const position = offsetPoint(midpoint, 0.02);
  
  // Generate a visibility polygon (rough circle for mock)
  const visibilityPolygon = [];
  const radius = 0.01; // roughly 1km at most latitudes
  const points = 12;
  
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Add some randomness to make it look more natural
    const jitter = 0.2;
    const adjustedRadius = radius * (1 + (Math.random() - 0.5) * jitter);
    
    visibilityPolygon.push({
      lat: position.lat + Math.sin(angle) * adjustedRadius,
      lng: position.lng + Math.cos(angle) * adjustedRadius
    });
  }
  
  return {
    id: uuidv4(),
    position,
    visibilityPolygon,
    coverageScore: Math.floor(Math.random() * 60) + 40 // Random coverage between 40-100%
  };
};

/**
 * Generate a mock threat area
 */
export const generateMockThreatArea = (center: Coordinates): ThreatArea => {
  const riskLevels: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
  
  // Generate a random polygon around the center
  const polygon = [];
  const points = 5;
  const radius = 0.005 + Math.random() * 0.01; // Random radius between 0.005-0.015
  
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Add some randomness to make irregular shapes
    const jitter = 0.4;
    const adjustedRadius = radius * (1 + (Math.random() - 0.5) * jitter);
    
    polygon.push({
      lat: center.lat + Math.sin(angle) * adjustedRadius,
      lng: center.lng + Math.cos(angle) * adjustedRadius
    });
  }
  
  // Close the polygon
  polygon.push(polygon[0]);
  
  return {
    id: uuidv4(),
    polygon,
    riskLevel,
    description: `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk area`
  };
};
