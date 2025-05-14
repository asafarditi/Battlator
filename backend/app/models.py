from pydantic import BaseModel
from typing import List, Optional, Literal, Dict


class EnemyType(int, Enum):
    SNIPER = 0
    LAUNCHER = 1

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class Coordinates(BaseModel):
    lat: float
    lng: float
    alt: float

class Enemy(BaseModel):
    id: str
    type: str
    location: List[Coordinates]
    capability: Dict[str, float]
    risk_potential: float

class ThreatArea(BaseModel):
    id: str
    polygon: List[Coordinates]
    riskLevel: Literal['high', 'medium', 'low']
    description: Optional[str] = None
    enemies: Optional[List[Enemy]] = None

class PathPoint(BaseModel):
    coordinates: Coordinates
    threatScore: float

class Route(BaseModel):
    id: str
    path: List[PathPoint]
    distance: float
    riskScore: float

class VantagePoint(BaseModel):
    id: str
    position: Coordinates
    visibilityPolygon: List[Coordinates]
    coverageScore: float

class RouteRequest(BaseModel):
    start: Coordinates
    end: Coordinates

class RouteResponse(BaseModel):
    route: Route
    alternativeRoutes: Optional[List[Route]] = None