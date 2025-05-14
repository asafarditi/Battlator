import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from shapely.geometry import Polygon, Point, mapping, MultiPolygon
from typing import List, Dict, Tuple
from app.models import Coordinates, ThreatArea, Enemy
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
    'area_weight': 1.0,
    'risk_potential_weight': 1.0  # Added missing weight
}

# Simulated threat data - attach this via a threat intelligence source or extend model later
def calculate_area_size(polygon: List[Coordinates]) -> float:
    """Calculates polygon area in approximate square meters using shapely."""
    coords = [(point.lng, point.lat) for point in polygon]
    return Polygon(coords).area  # Assumes planar coordinates; for geo coords, use `geopy` or `pyproj`.

def create_threat_circle(center: Coordinates, radius: float, points: int = 32) -> List[Coordinates]:
    """Create a circular polygon around a point with given radius."""
    circle_points = []
    for i in range(points):
        angle = (i / points) * 2 * math.pi
        lat = center.lat + (radius * math.cos(angle))
        lng = center.lng + (radius * math.sin(angle))
        circle_points.append(Coordinates(lat=lat, lng=lng))
    # Close the circle
    circle_points.append(circle_points[0])
    return circle_points

def calculate_threat_radius(enemy: Enemy) -> float:
    """Calculate the effective threat radius based on enemy capabilities."""
    return max(enemy.capability.values()) if enemy.capability else 0

def determine_risk_level(score: float) -> str:
    """Determine risk level based on threat score."""
    if score >= THREAT_THRESHOLDS['Critical']:
        return "high"
    elif score >= THREAT_THRESHOLDS['High']:
        return "high"
    elif score >= THREAT_THRESHOLDS['Moderate']:
        return "medium"
    else:
        return "low"

def calculate_threat_score(enemies: List[Enemy]) -> Tuple[float, str]:
    """Calculate threat score and risk level based on enemies in an area."""
    if not enemies:
        return 0.0, "low"
        
    # Calculate components
    enemy_count = len(enemies)
    max_range = max([calculate_threat_radius(enemy) for enemy in enemies])
    total_risk_potential = sum(enemy.risk_potential for enemy in enemies)
    
    # Calculate score using weights
    score = (
        enemy_count * WEIGHTS['enemy_count_weight'] +
        max_range * WEIGHTS['range_weight'] +
        total_risk_potential * WEIGHTS['risk_potential_weight']
    )
    score = round(score, 2)
    
    # Determine risk level
    risk_level = determine_risk_level(score)
    
    return score, risk_level

def create_threat_area_for_enemy(enemy: Enemy) -> ThreatArea:
    """Create a threat area based on enemy's location and capabilities."""
    threat_circles = []
    radius = calculate_threat_radius(enemy)
    
    # Create threat circles for each enemy location
    for location in enemy.location:
        circle = create_threat_circle(location, radius)
        threat_circles.extend(circle)
    
    # Calculate initial threat score and risk level
    threat_score, risk_level = calculate_threat_score([enemy])
    
    return ThreatArea(
        id=f"threat_{enemy.id}",
        polygon=threat_circles,
        riskLevel=risk_level,
        description=f"Threat area for {enemy.type} unit with {max(enemy.capability.keys())} capability",
        enemies=[enemy]
    )

def merge_overlapping_areas(areas: List[ThreatArea]) -> List[ThreatArea]:
    """Merge threat areas that overlap with each other."""
    if not areas:
        return []

    # Convert areas to shapely polygons for geometric operations
    area_polygons = []
    for area in areas:
        coords = [(point.lng, point.lat) for point in area.polygon]
        try:
            poly = Polygon(coords).buffer(0)  # buffer(0) helps fix self-intersections
            area_polygons.append((poly, area))
        except Exception as e:
            print(f"Warning: Could not create polygon for area {area.id}: {e}")
            continue

    merged_areas = []
    processed = set()

    for i, (poly1, area1) in enumerate(area_polygons):
        if i in processed:
            continue

        merged_poly = poly1
        merged_enemies = list(area1.enemies)
        processed.add(i)

        # Check for overlaps with other polygons
        for j, (poly2, area2) in enumerate(area_polygons):
            if j in processed:
                continue

            try:
                if merged_poly.intersects(poly2):
                    # Use buffer(0) to clean up the geometry after union
                    merged_poly = merged_poly.union(poly2).buffer(0)
                    merged_enemies.extend(area2.enemies)
                    processed.add(j)
            except Exception as e:
                print(f"Warning: Error merging areas {area1.id} and {area2.id}: {e}")
                continue

        # Convert merged polygon back to coordinates
        try:
            if isinstance(merged_poly, MultiPolygon):
                merged_poly = max(merged_poly.geoms, key=lambda p: p.area)
            
            coords = [(float(x), float(y)) for x, y in merged_poly.exterior.coords]
            merged_polygon = [Coordinates(lat=y, lng=x) for x, y in coords]

            # Calculate new threat score and risk level for merged area
            threat_score, risk_level = calculate_threat_score(merged_enemies)
            
            # Create description for merged area
            enemy_types = set(enemy.type for enemy in merged_enemies)
            description = f"Merged threat area containing {', '.join(enemy_types)} units"

            # Create new merged threat area
            merged_area = ThreatArea(
                id=f"merged_{'_'.join(e.id for e in merged_enemies)}",
                polygon=merged_polygon,
                riskLevel=risk_level,
                description=description,
                enemies=merged_enemies
            )
            merged_areas.append(merged_area)
        except Exception as e:
            print(f"Warning: Error creating merged area: {e}")
            continue

    return merged_areas

def analyze_threat_areas(enemies: List[Enemy]) -> List[ThreatArea]:
    """Create and merge threat areas based on enemy positions and capabilities."""
    # Create initial threat areas for each enemy
    threat_areas = [create_threat_area_for_enemy(enemy) for enemy in enemies]
    
    # Merge overlapping areas
    merged_areas = merge_overlapping_areas(threat_areas)
    
    return merged_areas

if __name__ == "__main__":
    # Create multiple enemy entities with different capabilities
    enemies = [
        Enemy(
            id="e1",
            type="infantry",
            location=[
                Coordinates(lat=34.5553, lng=135.5553),
                Coordinates(lat=34.5554, lng=135.5554)
            ],
            capability={"Assault Rifles": 500.0, "Rocket-Propelled Grenades (RPGs)": 700.0},
            risk_potential=75.0
        ),
        Enemy(
            id="e2",
            type="sniper",
            location=[Coordinates(lat=34.5560, lng=135.5560)],
            capability={"Sniper Rifles": 1200.0},
            risk_potential=85.0
        ),
        Enemy(
            id="e3",
            type="artillery",
            location=[Coordinates(lat=34.5570, lng=135.5570)],
            capability={"Mortars - Medium (81mm)": 5600.0},
            risk_potential=90.0
        )
    ]

    # Analyze threat areas and print results
    result = analyze_threat_areas(enemies)
    
    print("Threat Area Analysis Results:")
    print("=" * 50)
    
    for area in result:
        print(f"\nThreat Area ID: {area.id}")
        print(f"Risk Level: {area.riskLevel}")
        print(f"Description: {area.description}")
        print(f"Number of enemies: {len(area.enemies)}")
        
        print("\nPolygon Coordinates:")
        for point in area.polygon:
            print(f"  Lat: {point.lat}, Lng: {point.lng}")
            
        print("\nEnemy Units in Area:")
        for enemy in area.enemies:
            print(f"- {enemy.type} unit with capabilities:")
            for weapon, range in enemy.capability.items():
                print(f"  * {weapon}: {range}m range")
        print("-" * 50)







