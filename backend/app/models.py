from pydantic import BaseModel
from typing import List, Optional, Literal
from enum import Enum


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

class ThreatArea(BaseModel):
    id: str
    polygon: List[Coordinates]
    riskLevel: RiskLevel

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

class AlternativeRoute(BaseModel):
    alternativeRoutes: Optional[List[Route]] = None 

class Enemy(BaseModel):
    id: int
    position: List[Coordinates]
    enemyType: EnemyType
    enemyInfo: Optional[dict] = None

ENEMY_CAPABILITIES = {
    EnemyType.SNIPER: {
        "capability": "Long-range precision shooting",
        "range": 1000,  # in meters
        "risk": RiskLevel.HIGH
    },
    EnemyType.LAUNCHER: {
        "capability": "Projectile launching",
        "range": 5000,  # in meters
        "risk": RiskLevel.MEDIUM
    }
}