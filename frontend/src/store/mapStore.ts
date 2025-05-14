import { create } from "zustand";
import { Position, Route, ThreatZone, MapMode, ThreatLevel } from "../types";
import { generateId } from "../utils/helpers";

interface MapState {
  // Map state
  currentPosition: Position;
  selectedDestination: Position | null;
  mapMode: MapMode;

  // Route state
  currentRoute: Route | null;
  routes: Route[];

  // Threat zones
  threatZones: ThreatZone[];
  drawingCoordinates: number[][];
  selectedThreatLevel: ThreatLevel;

  // Mission state
  isMissionActive: boolean;
  missionId: string | null;

  // Actions
  setCurrentPosition: (position: Position) => void;
  setSelectedDestination: (position: Position | null) => void;
  setMapMode: (mode: MapMode) => void;

  setCurrentRoute: (route: Route | null) => void;
  addRoute: (route: Route) => void;

  addThreatZone: (coordinates: number[][][], level: ThreatLevel) => void;
  updateDrawingCoordinates: (coordinates: number[][]) => void;
  clearDrawingCoordinates: () => void;
  setSelectedThreatLevel: (level: ThreatLevel) => void;

  startMission: (routeId: string) => void;
  endMission: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Initial state
  currentPosition: { latitude: 40.012, longitude: -105.3, altitude: 1.1 }, // Default to Northern Israel
  selectedDestination: null,
  mapMode: "VIEW",

  currentRoute: null,
  routes: [],

  threatZones: [],
  drawingCoordinates: [],
  selectedThreatLevel: ThreatLevel.MEDIUM,

  isMissionActive: false,
  missionId: null,

  // Actions
  setCurrentPosition: (position) => set({ currentPosition: position }),
  setSelectedDestination: (position) => set({ selectedDestination: position }),
  setMapMode: (mode) => set({ mapMode: mode }),

  setCurrentRoute: (route) => set({ currentRoute: route }),
  addRoute: (route) =>
    set((state) => ({
      routes: [...state.routes, route],
    })),

  addThreatZone: (coordinates, level) =>
    set((state) => ({
      threatZones: [
        ...state.threatZones,
        {
          id: generateId(),
          coordinates,
          level,
        },
      ],
    })),

  updateDrawingCoordinates: (coordinates) => set({ drawingCoordinates: coordinates }),
  clearDrawingCoordinates: () => set({ drawingCoordinates: [] }),

  setSelectedThreatLevel: (level) => set({ selectedThreatLevel: level }),

  startMission: (routeId) =>
    set({
      isMissionActive: true,
      missionId: routeId,
    }),

  endMission: () =>
    set({
      isMissionActive: false,
      missionId: null,
    }),
}));
