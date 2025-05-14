from shapely.geometry import Polygon
from typing import List
from models import Coordinates, ThreatArea
import math

# Configurable threat level thresholds
THREAT_THRESHOLDS = {
    'Low': 0,
    'Moderate': 300,
    'High': 700,
    'Critical': 1200
}

# Configurable weights for risk calculation
WEIGHTS = {
    'enemy_count_weight': 1.0,
    'range_weight': 1.0,
    'area_weight': 1.0
}

# Simulated threat data - attach this via a threat intelligence source or extend model later
class EnemyUnit:
    def __init__(self, type_: str, location: List[Coordinates], capability: dict):
        self.type = type_
        self.location = location
        self.capability = capability

def calculate_area_size(polygon: List[Coordinates]) -> float:
    """Calculates polygon area in approximate square meters using shapely."""
    coords = [(point.lng, point.lat) for point in polygon]
    return Polygon(coords).area  # Assumes planar coordinates; for geo coords, use `geopy` or `pyproj`.

def calculate_effective_range(capabilities: dict) -> float:
    return max(capabilities.values()) if capabilities else 0

def categorize_threat_level(score: float) -> str:
    for level, threshold in sorted(THREAT_THRESHOLDS.items(), key=lambda x: x[1]):
        if score < threshold:
            return level
    return "Critical"

def calculate_risk_score(
    polygon: List[Coordinates],
    enemies: List[EnemyUnit],
    weights: dict
) -> float:
    area_size = calculate_area_size(polygon)
    enemy_count = sum(len(enemy.location) for enemy in enemies)
    max_range = max([calculate_effective_range(enemy.capability) for enemy in enemies], default=0)

    score = (
        enemy_count * weights['enemy_count_weight'] +
        max_range * weights['range_weight'] -
        area_size * weights['area_weight']
    )
    return round(score, 2)

# Main function to analyze a list of ThreatArea and return results
def analyze_threat_areas(areas: List[ThreatArea], all_enemies: dict):
    results = []
    for area in areas:
        enemies = all_enemies.get(area.id, [])
        risk_score = calculate_risk_score(area.polygon, enemies, WEIGHTS)
        threat_level = categorize_threat_level(risk_score)

        results.append({
            'area_id': area.id,
            'risk_score': risk_score,
            'area_size': calculate_area_size(area.polygon),
            'enemies': len([loc for enemy in enemies for loc in enemy.location]),
            'max_range': max([calculate_effective_range(enemy.capability) for enemy in enemies], default=0),
            'threat_level': threat_level
        })

    return results

# Example usage (replace with actual threat data)
if __name__ == "__main__":
    area1 = ThreatArea(
        id="a1",
        polygon=[
            Coordinates(lat=0, lng=0),
            Coordinates(lat=0, lng=5),
            Coordinates(lat=5, lng=5),
            Coordinates(lat=5, lng=0)
        ],
        riskLevel="high"
    )

    enemies_example = {
        "a1": [
            EnemyUnit(
                type_="infantry",
                location=[Coordinates(lat=1, lng=1), Coordinates(lat=2, lng=2)],
                capability={'gun': 200, 'RPG': 900}
            ),
            EnemyUnit(
                type_="sniper",
                location=[Coordinates(lat=3, lng=3)],
                capability={'sniper': 800}
            )
        ]
    }

    result = analyze_threat_areas([area1], enemies_example)
    for res in result:
        print(res)
