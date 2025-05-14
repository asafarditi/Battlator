from pydantic import BaseModel
from typing import List, Optional, Literal

class Coordinates(BaseModel):
    lat: float
    lng: float
    alt: float

class ThreatArea(BaseModel):
    id: str
    polygon: List[Coordinates]
    riskLevel: Literal['high', 'medium', 'low']
    description: Optional[str] = None

class Route(BaseModel):
    id: str
    path: List[Coordinates]
    distance: float
    elevation: float
    riskScore: float

class VantagePoint(BaseModel):
    id: str
    position: Coordinates
    visibilityPolygon: List[Coordinates]
    coverageScore: float

class RouteRequest(BaseModel):
    start: Coordinates
    end: Coordinates
    threatAreas: List[ThreatArea]

class RouteResponse(BaseModel):
    route: Route
    alternativeRoutes: Optional[List[Route]] = None 