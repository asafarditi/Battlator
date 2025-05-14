import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapMode, Coordinates, ThreatArea, Route, VantagePoint } from "../../types";
import { Button } from "@/components/ui/button";
import { LayersIcon } from "lucide-react";

// Set Mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoiYW10cnRtIiwiYSI6ImNrcWJzdG41aTBsbHEyb2sxeTdsa2FkOG4ifQ.bmaBLt4tVWrM4CVr5DLVYQ";

// Define the props interface
interface MapComponentProps {
  mode: MapMode;
  currentPosition: Coordinates;
  end: Coordinates | null;
  threatAreas: ThreatArea[];
  route: Route | null;
  vantagePoint: VantagePoint | null;
  visibleLayers: {
    threatAreas: boolean;
    route: boolean;
    viewshed: boolean;
  };
  onMapClick: (latLng: Coordinates) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  mode,
  currentPosition,
  end,
  threatAreas,
  route,
  vantagePoint,
  visibleLayers,
  onMapClick,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<"satellite" | "3d">("satellite");
  const initialCenterRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!map.current && mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle === "3d" ? "mapbox://styles/mapbox/outdoors-v12" : "mapbox://styles/mapbox/satellite-v9",
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 15,
        pitch: mapStyle === "3d" ? 60 : 0,
        bearing: mapStyle === "3d" ? 0 : 0,
      });

      // Add terrain and contours if in 3D mode
      if (mapStyle === "3d") {
        map.current.on("load", () => {
          // Add terrain source
          map.current?.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });

          // Add terrain layer
          map.current?.setTerrain({
            source: "mapbox-dem",
            exaggeration: 1.2,
          });

          // Add contour lines source
          map.current?.addSource("contours", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-terrain-v2",
          });

          // Add contour lines layer
          map.current?.addLayer({
            id: "contours",
            type: "line",
            source: "contours",
            "source-layer": "contour",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#847543",
              "line-width": 1,
              "line-opacity": 0.5,
            },
          });

          // Add contour labels
          map.current?.addLayer({
            id: "contour-label",
            type: "symbol",
            source: "contours",
            "source-layer": "contour",
            layout: {
              "symbol-placement": "line",
              "text-field": ["concat", ["to-string", ["get", "ele"]], " m"],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#666",
              "text-halo-color": "rgba(255,255,255,0.8)",
              "text-halo-width": 1.2,
            },
          });
        });
      }
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapStyle]);

  // Handle click events and cursor style based on mode
  useEffect(() => {
    if (!map.current) return;

    // Update cursor style
    map.current.getCanvas().style.cursor = mode === "view" ? "grab" : "crosshair";

    // Create click handler
    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (mode !== "view") {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    };

    // Add click handler
    map.current.on("click", handleClick);

    // Cleanup
    return () => {
      if (map.current) {
        map.current.off("click", handleClick);
      }
    };
  }, [mode, onMapClick]);

  // Update map center only on initial load
  useEffect(() => {
    if (map.current && !initialCenterRef.current) {
      map.current.setCenter([currentPosition.lng, currentPosition.lat]);
      initialCenterRef.current = true;
    }
  }, [currentPosition]);

  // Update markers and layers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers and layers
    const markers = document.getElementsByClassName("mapboxgl-marker");
    while (markers[0]) {
      markers[0].remove();
    }

    // Remove existing layers and sources
    const routeId = "route-layer";
    const viewshedId = "viewshed-layer";

    // Remove route layer and source if it exists
    if (map.current.getLayer(routeId)) {
      map.current.removeLayer(routeId);
    }
    if (map.current.getSource(routeId)) {
      map.current.removeSource(routeId);
    }

    // Remove viewshed layer and source if it exists
    if (map.current.getLayer(viewshedId)) {
      map.current.removeLayer(viewshedId);
    }
    if (map.current.getSource(viewshedId)) {
      map.current.removeSource(viewshedId);
    }

    // Remove threat layers and sources
    threatAreas.forEach((_, index) => {
      const threatId = `threat-${index}`;
      if (map.current?.getLayer(threatId)) {
        map.current.removeLayer(threatId);
      }
      if (map.current?.getSource(threatId)) {
        map.current.removeSource(threatId);
      }
    });

    // Add current position marker
    const blueforceMarker = document.createElement("div");
    blueforceMarker.className = "marker-blueforce-icon";
    new mapboxgl.Marker(blueforceMarker).setLngLat([currentPosition.lng, currentPosition.lat]).addTo(map.current);

    // Add end marker if exists
    if (end) {
      const endMarker = document.createElement("div");
      endMarker.className = "marker-end-icon";
      new mapboxgl.Marker(endMarker).setLngLat([end.lng, end.lat]).addTo(map.current);
    }

    // Add route if exists and visible
    if (route && visibleLayers.route) {
      map.current.addSource(routeId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.path.map((coord) => [coord.lng, coord.lat]),
          },
        },
      });

      map.current.addLayer({
        id: routeId,
        type: "line",
        source: routeId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#2a9d8f",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });
    }

    // Add threat areas if visible
    if (visibleLayers.threatAreas && threatAreas.length > 0) {
      threatAreas.forEach((area, index) => {
        const threatId = `threat-${index}`;
        map.current?.addSource(threatId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { riskLevel: area.riskLevel },
            geometry: {
              type: "Polygon",
              coordinates: [area.polygon.map((coord) => [coord.lng, coord.lat])],
            },
          },
        });

        map.current?.addLayer({
          id: threatId,
          type: "fill",
          source: threatId,
          paint: {
            "fill-color": ["match", ["get", "riskLevel"], "high", "#e74c3c", "medium", "#f39c12", "#2ecc71"],
            "fill-opacity": 0.4,
          },
        });
      });
    }

    // Add vantage point and viewshed if exists
    if (vantagePoint) {
      const vantageMarker = document.createElement("div");
      vantageMarker.className = "marker-vantage-icon";
      new mapboxgl.Marker(vantageMarker).setLngLat([vantagePoint.position.lng, vantagePoint.position.lat]).addTo(map.current);

      if (visibleLayers.viewshed) {
        map.current.addSource(viewshedId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [vantagePoint.visibilityPolygon.map((coord) => [coord.lng, coord.lat])],
            },
          },
        });

        map.current.addLayer({
          id: viewshedId,
          type: "fill",
          source: viewshedId,
          paint: {
            "fill-color": "#a8dadc",
            "fill-opacity": 0.3,
          },
        });
      }
    }
  }, [currentPosition, end, route, threatAreas, vantagePoint, visibleLayers]);

  // Toggle map style
  const toggleMapStyle = () => {
    const newStyle = mapStyle === "satellite" ? "3d" : "satellite";
    setMapStyle(newStyle);

    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${newStyle === "satellite" ? "satellite-v9" : "outdoors-v12"}`);

      if (newStyle === "3d") {
        map.current.setPitch(60);
        map.current.setBearing(0);
        map.current.on("style.load", () => {
          // Add terrain source
          map.current?.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });

          // Add terrain layer
          map.current?.setTerrain({
            source: "mapbox-dem",
            exaggeration: 1.2,
          });

          // Add contour lines source
          map.current?.addSource("contours", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-terrain-v2",
          });

          // Add contour lines layer
          map.current?.addLayer({
            id: "contours",
            type: "line",
            source: "contours",
            "source-layer": "contour",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#847543",
              "line-width": 1,
              "line-opacity": 0.5,
            },
          });

          // Add contour labels
          map.current?.addLayer({
            id: "contour-label",
            type: "symbol",
            source: "contours",
            "source-layer": "contour",
            layout: {
              "symbol-placement": "line",
              "text-field": ["concat", ["to-string", ["get", "ele"]], " m"],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#666",
              "text-halo-color": "rgba(255,255,255,0.8)",
              "text-halo-width": 1.2,
            },
          });
        });
      } else {
        map.current.setPitch(0);
        map.current.setBearing(0);
        map.current.setTerrain(null);
        // Remove terrain-specific layers
        if (map.current.getLayer("contours")) {
          map.current.removeLayer("contours");
        }
        if (map.current.getLayer("contour-label")) {
          map.current.removeLayer("contour-label");
        }
        if (map.current.getSource("contours")) {
          map.current.removeSource("contours");
        }
        if (map.current.getSource("mapbox-dem")) {
          map.current.removeSource("mapbox-dem");
        }
      }
    }
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0" />

      {/* Map Style Toggle */}
      <Button
        variant="default"
        size="sm"
        className="absolute bottom-4 left-4 z-[1000] bg-background/80 backdrop-blur-sm hover:bg-background/90"
        onClick={toggleMapStyle}
      >
        <LayersIcon className="h-4 w-4 mr-2" />
        {mapStyle === "satellite" ? "3D View" : "2D View"}
      </Button>
    </div>
  );
};

export default MapComponent;
