import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from shapely.geometry import Polygon, Point, mapping, MultiPolygon
from typing import List, Dict, Tuple
from app.models import Coordinates, EnemyType, ThreatArea, Enemy
import math

# Configurable threat level thresholds
THREAT_THRESHOLDS = {
    'Low': 0,
    'Moderate': 500,
    'High': 1200,
    'Critical': 5000
}

# Configurable weights for risk calculation
WEIGHTS = {
    'enemy_count_weight': 6.0,
    'range_weight': 0.4,
    'area_weight': 0.5,
    'risk_potential_weight': 0.8  # Added missing weight
}

# Simulated threat data - attach this via a threat intelligence source or extend model later
def calculate_area_size(polygon: List[Coordinates]) -> float:
    """Calculates polygon area in approximate square meters using shapely."""
    coords = [(point.lng, point.lat) for point in polygon]
    return Polygon(coords).area  # Assumes planar coordinates; for geo coords, use `geopy` or `pyproj`.

def create_threat_circle(center: Coordinates, radius: float, points: int = 32) -> List[Coordinates]:
    """Create a circular polygon around a point with given radius.
    
    Args:
        center: Center point coordinates
        radius: Radius in meters
        points: Number of points to create the circle
    
    Returns:
        List of coordinates forming the circle
    """
    # Make the circle smaller by dividing radius by 10
    adjusted_radius = radius / 15.0
    
    # Convert radius from meters to degrees
    radius_deg = adjusted_radius / 111111.0
    
    circle_points = []
    for i in range(points):
        angle = (i / points) * 2 * math.pi
        lat = center.lat + (radius_deg * math.cos(angle))
        lng = center.lng + (radius_deg * math.sin(angle) / math.cos(math.radians(center.lat)))
        # Include the alt field with a default value, e.g., 0.0
        circle_points.append(Coordinates(lat=lat, lng=lng, alt=center.alt))
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
    
    # Create a single threat circle for each enemy location
    for location in enemy.location:
        circle = create_threat_circle(location, radius)
        # Only add one circle per location
        threat_circles = circle
        break
    
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

def calculate_risk_potential(enemy: Enemy) -> float:
    """Calculate risk potential based on enemy type and capabilities."""
    # Base risk values for different enemy types
    type_risk = {
        'infantry': 50.0,
        'sniper': 70.0,
        'artillery': 30.0
    }
    
    # Get base risk from type, default to 40 if type unknown
    base_risk = type_risk.get(enemy.type.lower(), 40.0)
    
    # Calculate capability factor (based on maximum range)
    effective_range = calculate_effective_range(enemy)
    capability_factor = effective_range / 1000  # Normalize by 1000m
    
    # Calculate final risk potential
    risk_potential = base_risk * (1 + capability_factor)
    
    # Ensure risk potential stays within 0-100 range
    return min(max(risk_potential, 0), 100)

def calculate_effective_range(enemy: Enemy) -> float:
    """Calculate effective range based on enemy capabilities."""
    # Capability-based effective ranges (in meters)
    capability_ranges = {
        "Assault Rifles": 500.0,
        "Rocket-Propelled Grenades (RPGs)": 700.0,
        "Sniper Rifles": 1200.0,
        "Mortars - Light (60mm)": 3500.0,
        "Mortars - Medium (81mm)": 5600.0,
        "Mortars - Heavy (120mm)": 7200.0,
        "Machine Guns": 800.0,
        "Anti-Tank Missiles": 2900.0
    }

    # Get the maximum range from enemy capabilities
    max_range = 0.0
    for weapon in enemy.capability.keys():
        if weapon in capability_ranges:
            max_range = max(max_range, capability_ranges[weapon])
    
    return max_range

def process_enemy_threat(enemy: Enemy) -> Enemy:
    """Process enemy entity and calculate its risk potential and effective range."""
    # Calculate effective range and update capability values
    
        
    if enemy.type == EnemyType.PERSON:
        enemy.capability["Assault Rifles"] = 100.0
    elif enemy.type == EnemyType.VEHICLE:
        enemy.capability["Sniper Rifles"] = 1000.0
    elif enemy.type == EnemyType.TANK:
        enemy.capability["Anti-Tank Missiles"] = 10000.0
    
    
    for weapon in enemy.capability.keys():
        enemy.capability[weapon] = calculate_effective_range(enemy)
    
    # Calculate and set risk potential
    enemy.risk_potential = calculate_risk_potential(enemy)
    
    return enemy

def analyze_threat_areas(enemies: List[Enemy]) -> List[ThreatArea]:
    """Create and merge threat areas based on enemy positions and capabilities."""
    # Process each enemy to ensure risk potential and effective ranges are calculated
    processed_enemies = [process_enemy_threat(enemy) for enemy in enemies]
    
    # Create initial threat areas for each enemy
    threat_areas = [create_threat_area_for_enemy(enemy) for enemy in processed_enemies]
    
    # Merge overlapping areas
    merged_areas = merge_overlapping_areas(threat_areas)
    
    return merged_areas

# Example usage:
if __name__ == "__main__":
    # Create temporary enemy to calculate initial risk potential
    temp_enemy = Enemy(
        id="e1",
        type="infantry",
        location=[
            Coordinates(lat=34.5553, lng=135.5553, alt=0.0)  # Added alt field
        ],
        capability={"Assault Rifles": 500.0, "Rocket-Propelled Grenades (RPGs)": 700.0},
        risk_potential=0.0  # Initialize with a default value
    )
    
    # Process single enemy to get actual risk potential
    processed_enemy = process_enemy_threat(temp_enemy)
    print(f"Calculated Risk Potential: {processed_enemy.risk_potential}")
    
    # Create multiple enemy entities with different capabilities
    enemies = [
        Enemy(
            id="e1",
            type="infantry",
            location=[
                Coordinates(lat=34.5553, lng=135.5553, alt=0.0),  # Added alt field
                Coordinates(lat=34.5554, lng=135.5554, alt=0.0)   # Added alt field
            ],
            capability={"Assault Rifles": 500.0, "Rocket-Propelled Grenades (RPGs)": 700.0},
            risk_potential=0.0  # Initialize with default value
        ),
        Enemy(
            id="e2",
            type="sniper",
            location=[Coordinates(lat=34.5560, lng=135.5560, alt=0.0)],  # Added alt field
            capability={"Sniper Rifles": 1200.0},
            risk_potential=0.0  # Initialize with default value
        ),
        Enemy(
            id="e3",
            type="artillery",
            location=[Coordinates(lat=34.5570, lng=135.5570, alt=0.0)],  # Added alt field
            capability={"Mortars - Medium (81mm)": 5600.0},
            risk_potential=0.0  # Initialize with default value
        )
    ]

    # Process enemies to calculate actual risk potentials
    enemies = [process_enemy_threat(enemy) for enemy in enemies]

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







