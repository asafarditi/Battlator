from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import Coordinates, PathPoint, ThreatArea, Route, Enemy, RouteRequest, RouteResponse
from app.services.movement_service import add_new_enemy, calculate_route, start_movement, stop_movement, get_current_position
from app.services import websocket_service
import asyncio
from app.services.path_finder_service import PathFinderService
from pydantic import BaseModel

router = APIRouter()
pathfinder = PathFinderService()
routes: list[Route] = []

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
    print(len(path_points))
    
    new_routes = []
    for i, path in enumerate(path_points):
        path_coords = [PathPoint(coordinates=Coordinates(lat=pt[1], lng=pt[0], alt=1.1), threatScore=0.0) for pt in path]
        route = Route(
            id=f"generated-route-{i}",
            path=path_coords,
            distance=0.0,  # Optionally calculate distance
            riskScore=0.0  # Optionally calculate risk
        )
        new_routes.append(route)

    global routes
    routes = new_routes
    return RouteResponse(routes=routes)


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
    selected_route = next((route for route in routes if route.id == request.routeId), None)
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
    # Reuse the existing add_new_enemy function
    return {"success": add_new_enemy(enemy_request)}

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

