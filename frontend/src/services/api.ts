import { Position, Route, ThreatZone, ThreatLevel } from "../types";
import { generateId, simulateNetworkDelay } from "../utils/helpers";

/**
 * Mock API service for backend communication
 * TODO: Replace with actual API calls when backend is available
 */
const api_path = "http://127.0.0.1:8000";
export const api = {
  /**
   * Plans a route between two points
   */
  planRoute: async (from: Position, to: Position): Promise<Route> => {
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

    const points = data.route.path.map((point: any) => ({
      latitude: point.lat,
      longitude: point.lng,
      altitude: point.alt,
    }));

    return {
      id: data.id,
      points: points,
    };
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
   * Starts a mission with the given route
   */
  startMission: async (routeId: string): Promise<{ status: string }> => {
    await simulateNetworkDelay();

    console.log("Starting mission with route:", routeId);

    return { status: "ok" };
  },

  /**
   * Ends the current mission
   */
  endMission: async (): Promise<{ status: string }> => {
    await simulateNetworkDelay();

    console.log("Ending mission");

    return { status: "ok" };
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
    const response = await fetch(`${api_path}/api/add-enemy`, {
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
};
