import asyncio
import time
import math
from app.models import Coordinates, Enemy, Route

# Global state to track current position and route
current_position = None
is_moving = False
route_waypoints = []
route_segments = []  # Will store pre-calculated segments for movement
enemies = []  # List of enemies
routes = []

def calculate_distance(point1: Coordinates, point2: Coordinates) -> float:
    """Calculate distance between two coordinates in kilometers (haversine formula)"""
    R = 6371  # Earth radius in km
    print(point1)
    print(point2)
    lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
    lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def interpolate_position(start: Coordinates, end: Coordinates, fraction: float) -> Coordinates:
    """Interpolate between two points by a fraction (0-1)"""
    return Coordinates(
        lat=start[0] + (end[0] - start[0]) * fraction,
        lng=start[1] + (end[1] - start[1]) * fraction
    )

def calculate_route(route_path: list[Coordinates]):
    """Calculate and save the route segments for later movement"""
    global route_waypoints, route_segments
    
    if not route_path or len(route_path) < 2:
        print("Invalid route - need at least 2 points")
        return False
    
    route_waypoints = route_path
    route_segments = []
    
    # Speed in km/h
    speed = 5.0
    
    # Pre-calculate all segments
    for i in range(len(route_waypoints) - 1):
        start_point = route_waypoints[i]
        end_point = route_waypoints[i+1]
        
        # Calculate segment distance
        segment_distance = calculate_distance(start_point, end_point)
        
        # Calculate time needed to travel this segment at given speed (in seconds)
        travel_time = (segment_distance / speed) * 3600
        
        # Number of updates (1 per second)
        updates = int(travel_time)
        
        # Pre-calculate positions along the segment
        positions = []
        for step in range(updates + 1):  # +1 to include the end position
            fraction = step / updates if updates > 0 else 1.0
            positions.append(interpolate_position(start_point, end_point, fraction))
        
        route_segments.append({
            "start": start_point,
            "end": end_point,
            "positions": positions,
            "updates": updates
        })
    
    print(f"Route calculated with {len(route_segments)} segments")
    return True

async def start_movement(route: Route):
    """Start moving along the pre-calculated route"""
    global current_position, is_moving
    # Extract coordinates from route path
    coords = [[p.coordinates.lat, p.coordinates.lng] for p in route.path]
    calculate_route(coords)
    
    if not route_segments:
        print("No route calculated")
        return False
    
    if is_moving:
        print("Already moving")
        return False
    
    is_moving = True
    if(current_position is None):
        current_position = route_waypoints[0]
    try:
        # Move through each segment of the route
        for segment in route_segments:
            # Move along the segment using pre-calculated positions
            for position in segment["positions"]:
                if not is_moving:  # Check if movement was stopped
                    return False

                current_position = position
                print(f"Current position: {current_position}")
                await asyncio.sleep(1)
            
            print(f"Reached waypoint: {segment['end']}")
    
    finally:
        is_moving = False
        print("Movement completed")
    
    return True

def stop_movement():
    """Stop the current movement"""
    global is_moving
    is_moving = False
    return True

def get_current_position() -> Coordinates:
    """Return the current position of the blue force"""
    return current_position 

def add_new_enemy(new_enemy: Enemy):
    """Add a new enemy to the route"""
    global enemies

    enemies.append(new_enemy)

    stop_movement()
    # Send to algo the new_enemy and get new routes
    # updated_routes = add_new_enemy_to_route(new_enemy)
    #websocket_service.broadcast({"updated_routes": updated_routes}) 
    return True 
    
        
        