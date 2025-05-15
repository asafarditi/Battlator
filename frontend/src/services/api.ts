import { Position, Route, ThreatZone, ThreatLevel } from "../types";
import { generateId, simulateNetworkDelay } from "../utils/helpers";

/**
 * Mock API service for backend communication
 * TODO: Replace with actual API calls when backend is available
 */
const api_path = "http://192.168.0.2:8000";

export enum EnemyType {
  PERSON = "person",
  VEHICLE = "vehicle",
  TANK = "tank",
}

export interface ApiEnemy {
  id: string;
  type: string;
  location: { lat: number; lng: number; alt?: number }[];
  capability: { [key: string]: number };
  risk_potential: number;
}

export interface ApiThreatArea {
  id: string;
  coordinates: number[][][];
  level: string;
  description: string;
}

export const api = {
  /**
   * Fetches all enemies from the backend
   */
  fetchEnemies: async (): Promise<ApiEnemy[]> => {
    try {
      const response = await fetch(`${api_path}/api/enemies`);
      if (!response.ok) {
        throw new Error("Failed to fetch enemies");
      }
      const data = await response.json();
      console.log('Fetched enemies from backend:', data);
      return data.enemies || [];
    } catch (error) {
      console.error("Error fetching enemies:", error);
      return [];
    }
  },

  /**
   * Fetches all threat areas from the backend
   */
  fetchThreatAreas: async (): Promise<ApiThreatArea[]> => {
    try {
      const response = await fetch(`${api_path}/api/threat-areas`);
      if (!response.ok) {
        throw new Error("Failed to fetch threat areas");
      }
      const data = await response.json();
      console.log('Fetched threat areas from backend:', data);
      return data.threatAreas || [];
    } catch (error) {
      console.error("Error fetching threat areas:", error);
      return [];
    }
  },

  /**
   * Resets (clears) all threat areas in the backend
   */
  resetThreatAreas: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${api_path}/api/reset-threat-areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to reset threat areas");
      }
      
      const data = await response.json();
      console.log('Reset threat areas response:', data);
      return data;
    } catch (error) {
      console.error("Error resetting threat areas:", error);
      return { success: false, message: "Failed to reset threat areas" };
    }
  },

  /**
   * Plans a route between two points
   */
  planRoute: async (from: Position, to: Position): Promise<Route[]> => {
    // Log the points being sent to the backend

    const response = await fetch(`${api_path}/api/plan-route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: {
          lat: from.latitude,
          lng: from.longitude,
          alt: from?.altitude,
        },
        end: {
          lat: to.latitude,
          lng: to.longitude,
          alt: to?.altitude,
        },
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to plan route");
    }

    const data = await response.json();

    console.log("Received route from backend:", data);

    return data.routes.map((route: any) => ({
      id: route.id,
      points: route.path.map((point: any) => ({
        coordinates: {
          latitude: point.coordinates.lat,
          longitude: point.coordinates.lng,
          altitude: point.coordinates.alt,
        },
        threatScore: point.threatScore,
      })),
    }));
  },

  /**
   * Starts a mission with the given route
   */
  startMission: async (routeId: string): Promise<{ status: string }> => {
    const response = await fetch(`${api_path}/api/start-mission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routeId: routeId }),
    });
    if (!response.ok) {
      throw new Error("Failed to start mission");
    }

    return response.json();
  },

  /**
   * Submits a threat zone to the backend
   */
  submitThreatZone: async (coordinates: number[][][], level: ThreatLevel): Promise<{ status: string }> => {
    await simulateNetworkDelay();

    // In a real app, this would submit the zone to the backend
    console.log("Submitting threat zone:", { coordinates, level });

    return { status: "ok" };
  },

  /**
   * Ends the current mission
   */
  endMission: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${api_path}/api/stop-mission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error("Failed to stop mission");
    }

    return response.json();
  },

  /**
   * Adds an enemy (threat zone) to the backend
   */
  addEnemy: async (enemy: {
    id: string;
    type: string;
    location: { lat: number; lng: number; alt?: number }[];
    capability: { [key: string]: number };
    risk_potential: number;
  }): Promise<{ success: boolean }> => {
    const response = await fetch(`${api_path}/api/add-threat-area`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enemy),
    });
    if (!response.ok) {
      throw new Error("Failed to add enemy");
    }
    return response.json();
  },

  /**
   * Adds a single point enemy with a specific type (person, vehicle, tank)
   */
  addSingleEnemy: async (position: Position, type: EnemyType): Promise<{ success: boolean, threatAreas?: ThreatZone[] }> => {
    // Define capabilities and risk based on enemy type
    const enemyConfig = {
      [EnemyType.PERSON]: {
        capability: { range: 200, damage: 0.3 },
        risk_potential: 0.2,
      },
      [EnemyType.VEHICLE]: {
        capability: { range: 500, damage: 0.6 },
        risk_potential: 0.5,
      },
      [EnemyType.TANK]: {
        capability: { range: 1000, damage: 0.9 },
        risk_potential: 0.8,
      },
    };

    const response = await fetch(`${api_path}/api/add-enemy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: generateId(),
        type: type,
        location: [
          {
            lat: position.latitude,
            lng: position.longitude,
            alt: position.altitude,
          },
        ],
        capability: enemyConfig[type].capability,
        risk_potential: enemyConfig[type].risk_potential,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add ${type} enemy`);
    }

    const data = await response.json();
    
    // Debugging
    console.log('API response for addSingleEnemy:', data);
    
    // Convert the threat areas from the backend to our ThreatZone type
    const threatAreas = data.threatAreas?.map((area: any) => {
      console.log('Processing threat area from API:', area);
      
      // Validate the coordinates format
      if (!area.coordinates || !Array.isArray(area.coordinates)) {
        console.error('Missing or invalid coordinates in threat area:', area);
        return null;
      }
      
      // Ensure level is a valid ThreatLevel enum value
      const level = area.level === "highThreat" || area.level === "medThreat" 
        ? area.level 
        : "medThreat"; // Default to medium if invalid
      
      // Log the detailed structure of coordinates to troubleshoot
      console.log('Coordinates structure:');
      console.log('- Type:', typeof area.coordinates);
      console.log('- Is Array:', Array.isArray(area.coordinates));
      console.log('- Length:', area.coordinates.length);
      if (area.coordinates.length > 0) {
        console.log('- First element type:', typeof area.coordinates[0]);
        console.log('- First element is Array:', Array.isArray(area.coordinates[0]));
        console.log('- First element sample:', JSON.stringify(area.coordinates[0]).substring(0, 100));
      }
      
      return {
        id: area.id || generateId(),
        coordinates: area.coordinates,
        level: level as ThreatLevel,
      };
    }).filter(Boolean) || [];
    
    // Log the processed threat areas
    console.log('Processed threat areas:', threatAreas);
    
    return {
      success: data.success,
      threatAreas
    };
  },
  
  /**
   * Fetches the current position of the blue force (user)
   */
  fetchCurrentPosition: async (): Promise<Position | null> => {
    try {
      const response = await fetch(`${api_path}/api/blue-force-position`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch current position");
      }
      
      const data = await response.json();
      
      // Check if we have an error in the response
      if (data.error) {
        console.log("No active position available:", data.error);
        return null;
      }
      
      // Return position in our app's format
      return {
        latitude: data.lat,
        longitude: data.lng,
        altitude: data.alt || 0,
      };
    } catch (error) {
      console.error("Error fetching current position:", error);
      return null;
    }
  },
};
