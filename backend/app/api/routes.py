from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models import Coordinates, ThreatArea, Route, VantagePoint, RouteRequest, RouteResponse
from app.services.movement_service import calculate_route, start_movement, stop_movement, get_current_position
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
        path=[request.start, request.end],
        distance=1234.5,
        elevation=56.7,
        riskScore=0.2
    )
    return RouteResponse(route=route)

@router.get("/api/suggest-vantage", response_model=VantagePoint)
async def suggest_vantage():
    # Return mock vantage point
    vp = VantagePoint(
        id="mock-vantage",
        position=Coordinates(lat=0.0, lng=0.0),
        visibilityPolygon=[Coordinates(lat=0.0, lng=0.0), Coordinates(lat=0.1, lng=0.1)],
        coverageScore=0.8
    )
    return vp 

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

@router.websocket("/ws/position")
async def position_websocket(websocket: WebSocket):
    await websocket_service.connect(websocket)
    try:
        while True:
            # Wait for any message from client (can be used for keep-alive)
            await websocket.receive_text()
            await websocket.send_json({"position": get_current_position()})
    except WebSocketDisconnect:
        await websocket_service.disconnect(websocket)

