import { create } from "zustand";
import { Position, Route, ThreatZone, MapMode, ThreatLevel } from "../types";
import { generateId } from "../utils/helpers";
import { EnemyType } from "../services/api";

interface MapState {
  // Map state
  currentPosition: Position;
  selectedDestination: Position | null;
  mapMode: MapMode;

  // Route state
  currentRoute: Route | null;
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  // Route selection state
  selectedRouteId: string | null;
  showRouteCountdown: boolean;

  // Threat zones
  threatZones: ThreatZone[];
  drawingCoordinates: number[][];
  selectedThreatLevel: ThreatLevel;

  // Enemy state
  selectedEnemyType: EnemyType;

  // Mission state
  isMissionActive: boolean;
  missionPaused: boolean;
  missionId: string | null;

  // Actions
  setCurrentPosition: (position: Position) => void;
  setSelectedDestination: (position: Position | null) => void;
  setMapMode: (mode: MapMode) => void;

  setCurrentRoute: (route: Route | null) => void;
  addRoute: (route: Route) => void;

  // Route selection actions
  selectRoute: (routeId: string) => void;
  confirmRouteSelection: () => void;
  cancelRouteSelection: () => void;
  startRouteSelection: () => void;

  // Reset route planning data
  resetRouteData: () => void;

  addThreatZone: (coordinates: number[][][], level: ThreatLevel) => void;
  updateDrawingCoordinates: (coordinates: number[][]) => void;
  clearDrawingCoordinates: () => void;
  setSelectedThreatLevel: (level: ThreatLevel) => void;

  setSelectedEnemyType: (type: EnemyType) => void;

  startMission: (routeId: string) => void;
  endMission: () => void;

  // Clear mission data
  clearMissionData: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  currentPosition: { latitude: 40.012, longitude: -105.3, altitude: 1.1 }, // Default to Northern Israel
  selectedDestination: null,
  mapMode: "VIEW",

  currentRoute: null,
  routes: [],
  setRoutes: (routes: Route[]) => set({ routes }),
  // Route selection state
  selectedRouteId: null,
  showRouteCountdown: false,

  threatZones: [],
  drawingCoordinates: [],
  selectedThreatLevel: ThreatLevel.MEDIUM,

  selectedEnemyType: EnemyType.PERSON,

  isMissionActive: false,
  missionPaused: false,
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

  // Route selection actions
  selectRoute: (routeId) =>
    set({
      selectedRouteId: routeId,
      showRouteCountdown: true,
    }),

  confirmRouteSelection: () => {
    const { routes, selectedRouteId } = get();
    const selectedRoute = routes.find((route) => route.id === selectedRouteId);

    if (selectedRoute) {
      set({
        currentRoute: selectedRoute,
        showRouteCountdown: false,
        mapMode: "VIEW",
      });
    }
  },

  cancelRouteSelection: () =>
    set({
      showRouteCountdown: false,
      selectedRouteId: null,
    }),

  startRouteSelection: () => {
    const { isMissionActive, missionPaused } = get();

    // Only allow route selection if mission is not active or paused
    if (!isMissionActive && !missionPaused) {
      set({
        mapMode: "CHOOSING_ROUTE",
      });
    }
  },

  // Reset route planning data - clears destination and routes without affecting mission state
  resetRouteData: () =>
    set({
      selectedDestination: null,
      currentRoute: null,
      routes: [],
      selectedRouteId: null,
      showRouteCountdown: false,
      mapMode: "ROUTE", // Switch to route planning mode
    }),

  addThreatZone: (coordinates, level) => {
    console.log('Adding threat zone to store with coordinates:', coordinates);
    console.log('Threat level:', level);
    
    set((state) => ({
      threatZones: [
        ...state.threatZones,
        {
          id: generateId(),
          coordinates,
          level,
        },
      ],
    }));
  },

  updateDrawingCoordinates: (coordinates) => set({ drawingCoordinates: coordinates }),
  clearDrawingCoordinates: () => set({ drawingCoordinates: [] }),

  setSelectedThreatLevel: (level) => set({ selectedThreatLevel: level }),

  setSelectedEnemyType: (type) => set({ selectedEnemyType: type }),

  startMission: (routeId) =>
    set({
      isMissionActive: true,
      missionPaused: false,
      missionId: routeId,
      // Cancel any active route selection
      showRouteCountdown: false,
      selectedRouteId: null,
      // Force view mode
      mapMode: "VIEW",
    }),

  endMission: () =>
    set({
      isMissionActive: false,
      missionPaused: true, // Mission is paused but not fully ended
      // Keep missionId to maintain mission context
    }),

  // Clear all mission data
  clearMissionData: () =>
    set({
      isMissionActive: false,
      missionPaused: false,
      missionId: null,
      currentRoute: null,
      routes: [],
      selectedRouteId: null,
      showRouteCountdown: false,
      threatZones: [],
      selectedDestination: null,
      drawingCoordinates: [],
      mapMode: "VIEW",
    }),
}));
