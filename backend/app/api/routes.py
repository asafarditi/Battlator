from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import Coordinates, ThreatArea, Route, Enemy, RouteRequest, RouteResponse
from app.services.movement_service import add_new_enemy, calculate_route, start_movement, stop_movement, get_current_position
from app.services import websocket_service
import asyncio

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/api/plan-route", response_model=RouteResponse)
async def plan_route(request: RouteRequest):
    # Return mock route
    route = Route(
        id="mock-route",
        path=[
            Coordinates(lat=request.start.lat, lng=request.start.lng, alt=1.1),
            Coordinates(lat=request.end.lat, lng=request.end.lng, alt=1.1)
        ],
        distance=1234.5,
        riskScore=0.2
    )
    return RouteResponse(route=route)


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
async def start_mission():
    # Start the movement in the background
    asyncio.create_task(start_movement())
    return True

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
            # Get the current position and send it back
            position = get_current_position()
            if position:
                await websocket.send_json({"position": position})
            else:
                await websocket.send_json({"error": "No active position"})
    except WebSocketDisconnect:
        await websocket_service.disconnect(websocket)

