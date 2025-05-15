from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import Coordinates, PathPoint, ThreatArea, Route, Enemy, RouteRequest, RouteResponse
from app.services.movement_service import add_new_enemy, calculate_route, start_movement, stop_movement, get_current_position
from app.services import websocket_service
from app.riskAssesment.calculateThreatArea import process_enemy_threat, analyze_threat_areas
import asyncio
from app.services.path_finder_service import PathFinderService
from pydantic import BaseModel
from logging import getLogger

logger = getLogger(__name__)
router = APIRouter()
pathfinder = PathFinderService()
routes: dict[str, Route] = {}

class StartMissionRequest(BaseModel):
    routeId: str

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/api/plan-route", response_model=RouteResponse)
async def plan_route(request: RouteRequest):
    # Use the pathfinder to get the path
    start = (request.start.lng, request.start.lat)
    end = (request.end.lng, request.end.lat)
    path_points = pathfinder.find_paths(start, end)
    
    new_routes = {}
    for i, path in enumerate(path_points):
        path_coords = [PathPoint(coordinates=Coordinates(lat=pt[1], lng=pt[0], alt=1.1), threatScore=pt[2]) for pt in path]
        
        # Calculate total distance by summing distances between consecutive points
        total_distance = 0
        for i in range(len(path_coords)-1):
            p1 = path_coords[i].coordinates
            p2 = path_coords[i+1].coordinates
            # Calculate distance using Euclidean distance formula
            dist = ((p2.lat - p1.lat)**2 + (p2.lng - p1.lng)**2)**0.5
            total_distance += dist
            
        route = Route(
            id=f"generated-route-{i}",
            path=path_coords,
            distance=total_distance,
            riskScore=0.0  # Optionally calculate risk
        )
        new_routes[route.id] = route

    global routes
    routes = new_routes
    return RouteResponse(routes=list(routes.values()))


@router.post("/api/calculate-route")
async def api_calculate_route(route_request: RouteRequest):
    # Create a route from start to end
    route_path = [
        route_request.start,
        # You could add waypoints here
        route_request.end
    ]
    
    success = calculate_route(route_path)
    return {"success": success}

@router.post("/api/start-mission")
async def start_mission(request: StartMissionRequest):
    # Start the movement in the background
    print(f"Starting mission with route {request.routeId}")
    selected_route = routes.get(request.routeId)
    if not selected_route:
        return {"error": "Route not found"}
    asyncio.create_task(start_movement(selected_route))
    return {"success": True}

@router.post("/api/stop-mission")
async def stop_mission():
    return {"success": stop_movement()}

@router.get("/api/blue-force-position")
async def get_blue_force_position():
    position = get_current_position()
    if position:
        return position
    return {"error": "No active mission"}

@router.post("/api/add-threat-area")
async def add_enemy(enemy_request: Enemy):
    return {"success": add_new_enemy(enemy_request)}

@router.post("/api/add-enemy")
async def add_single_enemy(enemy_request: Enemy):
    """
    Add a single-point enemy (person, vehicle, or tank) to the map
    """
    # Process the enemy threat first
    processed_enemy = process_enemy_threat(enemy_request)
    
    # Analyze threat areas with the processed enemy
    threat_areas : List[ThreatArea] = analyze_threat_areas([processed_enemy]) 
    
    # Print the analysis results
    print("Threat Area Analysis Results:")
    print("=" * 50)
    
    for area in threat_areas:
        length = pathfinder.add_polygon(area.polygon, area.riskLevel)
        print(f"length {length}")
    
    # Reuse the existing add_new_enemy function
    add_new_enemy(processed_enemy)
    
    # Convert threat areas to a format suitable for the frontend
    formatted_threat_areas = []
    for area in threat_areas:
        # Debug the polygon structure
        print(f"\nDebugging polygon structure for area {area.id}:")
        print(f"Polygon type: {type(area.polygon)}")
        print(f"Polygon length: {len(area.polygon)}")
        if area.polygon:
            print(f"First point type: {type(area.polygon[0])}")
            print(f"First point sample: {area.polygon[0]}")
        
        # Convert polygon coordinates to GeoJSON format (lng, lat)
        # GeoJSON expects coordinates as [[[lng1, lat1], [lng2, lat2], ...]]
        polygon_coords = [[[point.lng, point.lat] for point in area.polygon]]
        
        # Debug the converted coordinates
        print(f"Converted polygon coordinates structure:")
        print(f"- Type: {type(polygon_coords)}")
        print(f"- Levels: {len(polygon_coords)} > {len(polygon_coords[0]) if polygon_coords else 0}")
        print(f"- Sample: {polygon_coords[0][:2] if polygon_coords and polygon_coords[0] else []}")
        
        # Debug the risk level value
        print(f"Original risk level: {area.riskLevel}, type: {type(area.riskLevel)}")
        
        # Determine risk level - ThreatArea uses Literal['high', 'medium', 'low']
        # Convert to frontend's ThreatLevel format which is medThreat or highThreat
        if area.riskLevel == 'high':
            risk_level = "highThreat"
        elif area.riskLevel == 'medium':
            risk_level = "medThreat"
        else:
            risk_level = "medThreat"  # Default to medium for 'low' or any other value
        
        print(f"Formatted risk level: {risk_level}")
        
        formatted_threat_areas.append({
            "id": area.id,
            "coordinates": polygon_coords,
            "level": risk_level,
            "description": area.description
        })
    
    # Log the complete formatted response
    print("\nFormatted Threat Areas for Frontend:")
    for area in formatted_threat_areas:
        print(f"- ID: {area['id']}")
        print(f"  Level: {area['level']}")
        print(f"  Coordinates structure: {type(area['coordinates'])}, Length: {len(area['coordinates'])}")
        if area['coordinates']:
            print(f"  First ring: {type(area['coordinates'][0])}, Length: {len(area['coordinates'][0])}")
            if area['coordinates'][0]:
                print(f"  First point: {area['coordinates'][0][0]}")
    
    return {
        "success": True,
        "threatAreas": formatted_threat_areas
    }

@router.websocket("/ws/position")
async def position_websocket(websocket: WebSocket):
    await websocket_service.connect(websocket)
    try:
        while True:
            # Wait for any message from client (can be used for keep-alive)
            await websocket.receive_text()
            print("Waiting for message")

            # Get the current position and send it back
            position = get_current_position()
            if position:
                await websocket.send_json({"position": position})
            else:
                await websocket.send_json({"error": "No active position"})
    except WebSocketDisconnect:
        await websocket_service.disconnect(websocket)

