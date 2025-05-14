from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from enum import Enum


class EnemyType(str, Enum):
    PERSON = "person"
    VEHICLE = "vehicle"
    TANK = "tank"
    SNIPER = "sniper"
    LAUNCHER = "launcher"

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class Coordinates(BaseModel):
    lat: float
    lng: float
    alt: Optional[float] = Field(default=0.0)

class Enemy(BaseModel):
    id: str
    type: EnemyType
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

class RouteRequest(BaseModel):
    start: Coordinates
    end: Coordinates

class RouteResponse(BaseModel):
    route: Route
    alternativeRoutes: Optional[List[Route]] = None