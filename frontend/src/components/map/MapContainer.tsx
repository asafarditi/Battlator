import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "../../store/mapStore";
import { ThreatZone, Position, Route, MapMode } from "../../types";
import { api } from "../../services/api";
import { FriendlyMarker } from "./FriendlyMarker";
import { DestinationMarker } from "./DestinationMarker";
import { getRouteLayer, getThreatZoneLayer } from "./mapLayers";
import { Position as MapPosition } from "geojson";
import * as turf from "@turf/turf";

// Mapbox API key from the requirements
const MAPBOX_TOKEN = "pk.eyJ1IjoiYW10cnRtIiwiYSI6ImNrcWJzdG41aTBsbHEyb2sxeTdsa2FkOG4ifQ.bmaBLt4tVWrM4CVr5DLVYQ";

const MapContainer: React.FC = () => {
  const {
    currentPosition,
    selectedDestination,
    mapMode,
    currentRoute,
    threatZones,
    drawingCoordinates,
    selectedThreatLevel,
    setSelectedDestination,
    setCurrentRoute,
    addRoute,
    addThreatZone,
    updateDrawingCoordinates,
    clearDrawingCoordinates,
  } = useMapStore();

  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: currentPosition.longitude,
    latitude: currentPosition.latitude,
    zoom: 12,
  });

  // Update view state when current position changes
  useEffect(() => {
    if (currentPosition) {
      setViewState((prev) => ({
        ...prev,
        longitude: currentPosition.longitude,
        latitude: currentPosition.latitude,
      }));
    }
  }, [currentPosition]);

  // Handle map click events
  const handleMapClick = async (event: any) => {
    const { lngLat } = event;
    const clickedPosition: Position = {
      longitude: lngLat.lng,
      latitude: lngLat.lat,
    };

    if (mapMode === "ROUTE") {
      // Set destination and plan route
      setSelectedDestination(clickedPosition);

      try {
        // Call the route planning API
        const route = await api.planRoute(currentPosition, clickedPosition);
        setCurrentRoute(route);
        addRoute(route);
      } catch (error) {
        console.error("Error planning route:", error);
      }
    } else if (mapMode === "DRAW_THREAT") {
      // Add point to drawing coordinates
      const newCoordinates = [...drawingCoordinates, [lngLat.lng, lngLat.lat]];
      updateDrawingCoordinates(newCoordinates);
    }
  };

  // Complete threat zone drawing
  const completeThreatZone = async () => {
    if (drawingCoordinates.length < 3) {
      alert("Please draw at least 3 points for a valid polygon");
      return;
    }

    // Close the polygon
    const closedCoordinates = [...drawingCoordinates, drawingCoordinates[0]];

    // Create a GeoJSON polygon
    const polygon = turf.polygon([[...closedCoordinates]]);

    try {
      // Submit the threat zone to the API
      await api.submitThreatZone([closedCoordinates], selectedThreatLevel);

      // Add the threat zone to the store
      addThreatZone([closedCoordinates], selectedThreatLevel);

      // Clear drawing coordinates
      clearDrawingCoordinates();
    } catch (error) {
      console.error("Error submitting threat zone:", error);
    }
  };

  // Transform drawing coordinates into GeoJSON format for rendering
  const drawingGeoJSON = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: drawingCoordinates,
    },
  };

  return (
    <div className="w-full h-screen relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        attributionControl={false}
      >
        {/* Current position marker */}
        <FriendlyMarker position={currentPosition} />

        {/* Destination marker */}
        {selectedDestination && <DestinationMarker position={selectedDestination} />}

        {/* Route line if available */}
        {currentRoute && (
          <Source
            id="route-source"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: currentRoute.points.map((p) => [p.longitude, p.latitude]),
              },
            }}
          >
            <Layer {...getRouteLayer()} />
          </Source>
        )}

        {/* Threat zones */}
        {threatZones.map((zone) => (
          <Source
            key={zone.id}
            id={`threat-zone-${zone.id}`}
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: zone.coordinates,
              },
            }}
          >
            <Layer {...getThreatZoneLayer(zone.level)} />
          </Source>
        ))}

        {/* Drawing line for threat zone creation */}
        {drawingCoordinates.length > 0 && (
          <Source id="drawing-source" type="geojson" data={drawingGeoJSON as any}>
            <Layer
              id="drawing-line"
              type="line"
              paint={{
                "line-color": "#FFC107",
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}
      </Map>

      {/* Threat zone drawing controls */}
      {mapMode === "DRAW_THREAT" && drawingCoordinates.length > 0 && (
        <div className="absolute bottom-24 right-4 flex flex-col space-y-2">
          <button onClick={completeThreatZone} className="bg-green-600 text-white px-4 py-2 rounded-md shadow-lg font-bold">
            Complete Zone
          </button>
          <button onClick={clearDrawingCoordinates} className="bg-red-600 text-white px-4 py-2 rounded-md shadow-lg font-bold">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default MapContainer;
