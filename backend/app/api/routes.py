from fastapi import APIRouter
from app.models import Coordinates, ThreatArea, Route, VantagePoint, RouteRequest, RouteResponse

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