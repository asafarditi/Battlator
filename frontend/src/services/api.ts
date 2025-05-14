import { Position, Route, ThreatZone, ThreatLevel } from '../types';
import { generateId, simulateNetworkDelay } from '../utils/helpers';

/**
 * Mock API service for backend communication
 * TODO: Replace with actual API calls when backend is available
 */

export const api = {
  /**
   * Plans a route between two points
   */
  planRoute: async (from: Position, to: Position): Promise<Route> => {
    await simulateNetworkDelay();
    
    // Mock response - create a straight line between points
    const routeId = generateId();
    
    // Create a simple route with 5 points between start and end
    const points = Array.from({ length: 5 }, (_, i) => {
      const ratio = (i + 1) / 6;
      return {
        latitude: from.latitude + (to.latitude - from.latitude) * ratio,
        longitude: from.longitude + (to.longitude - from.longitude) * ratio
      };
    });
    
    // Add start and end points
    const routePoints = [from, ...points, to];
    
    return {
      id: routeId,
      points: routePoints
    };
  },
  
  /**
   * Submits a threat zone to the backend
   */
  submitThreatZone: async (
    coordinates: number[][][], 
    level: ThreatLevel
  ): Promise<{ status: string }> => {
    await simulateNetworkDelay();
    
    // In a real app, this would submit the zone to the backend
    console.log('Submitting threat zone:', { coordinates, level });
    
    return { status: 'ok' };
  },
  
  /**
   * Starts a mission with the given route
   */
  startMission: async (routeId: string): Promise<{ status: string }> => {
    await simulateNetworkDelay();
    
    console.log('Starting mission with route:', routeId);
    
    return { status: 'ok' };
  },
  
  /**
   * Ends the current mission
   */
  endMission: async (): Promise<{ status: string }> => {
    await simulateNetworkDelay();
    
    console.log('Ending mission');
    
    return { status: 'ok' };
  }
};