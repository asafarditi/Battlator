
import { 
  Coordinates,
  Route,
  RouteRequest,
  RouteResponse,
  VantagePoint
} from '../types';
import { generateMockRoute, generateMockVantagePoint } from '../utils/mockData';

// Simulate API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  /**
   * Plan a route between start and end points, avoiding threat areas
   */
  planRoute: async (request: RouteRequest): Promise<RouteResponse> => {
    // Simulate API call latency
    await delay(1200);
    
    // Generate mock route data
    const route = generateMockRoute(request.start, request.end, request.threatAreas);
    
    return {
      route,
    };
  },
  
  /**
   * Suggest the optimal vantage point for surveillance
   */
  suggestVantage: async (start: Coordinates, end: Coordinates, threatAreas: any[]): Promise<VantagePoint> => {
    // Simulate API call latency
    await delay(800);
    
    // Generate mock vantage point
    return generateMockVantagePoint(start, end);
  }
};
