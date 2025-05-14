import pytest
import asyncio
import random
from app.services.movement_service import (
    calculate_distance, interpolate_position, calculate_route,
    start_movement, stop_movement, get_current_position, add_new_enemy
)
from app.models import Coordinates, Enemy

def test_calculate_distance(sample_coordinates):
    """Test distance calculation between two points"""
    point1 = sample_coordinates[0]
    point2 = sample_coordinates[1]
    
    distance = calculate_distance(point1, point2)
    
    # Washington DC to New York is roughly 328 km
    assert 300 < distance < 350, f"Expected distance ~328km, got {distance}km"

def test_interpolate_position():
    """Test position interpolation"""
    start = Coordinates(lat=0.0, lng=0.0)
    end = Coordinates(lat=10.0, lng=10.0)
    
    # Test interpolation at different points
    mid_point = interpolate_position(start, end, 0.5)
    assert mid_point.lat == 5.0
    assert mid_point.lng == 5.0
    
    quarter_point = interpolate_position(start, end, 0.25)
    assert quarter_point.lat == 2.5
    assert quarter_point.lng == 2.5

def test_calculate_route(sample_coordinates):
    """Test route calculation"""
    # Use the first two points for a route
    route = sample_coordinates[:2]
    
    result = calculate_route(route)
    assert result is True, "Route calculation should succeed"
    
    # Test with invalid route (less than 2 points)
    invalid_route = [sample_coordinates[0]]
    result = calculate_route(invalid_route)
    assert result is False, "Should return False for invalid route"

@pytest.mark.asyncio
async def test_start_stop_movement(sample_coordinates):
    """Test starting and stopping movement"""
    # Calculate a route first
    route = sample_coordinates[:2]
    calculate_route(route)
    
    # Start movement in background
    task = asyncio.create_task(start_movement())
    
    # Give it a moment to start
    await asyncio.sleep(0.1)
    
    # Check if we're moving and have a position
    assert get_current_position() is not None, "Should have a position after starting"
    
    # Stop movement
    stop_result = stop_movement()
    assert stop_result is True, "Stop should return True"
    
    # Wait for the task to complete
    try:
        await asyncio.wait_for(task, timeout=1.0)
    except asyncio.TimeoutError:
        # Cancel the task if it's taking too long
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

def test_add_new_enemy(sample_enemy):
    """Test adding a new enemy"""
    result = add_new_enemy(sample_enemy)
    assert result is True, "Adding enemy should succeed"

@pytest.mark.asyncio
async def test_movement_with_complex_route():
    """Test movement along a complex 10-point route"""
    # Create a 10-point route in roughly a circle pattern around Washington DC
    # Starting at the National Mall and making a loop
    route_points = [
        Coordinates(lat=38.889931, lng=-77.009003),  # National Mall
        Coordinates(lat=38.897957, lng=-77.036560),  # White House
        Coordinates(lat=38.921120, lng=-77.044632),  # Adams Morgan
        Coordinates(lat=38.933277, lng=-77.020349),  # Columbia Heights
        Coordinates(lat=38.929951, lng=-76.988877),  # Brookland
        Coordinates(lat=38.897676, lng=-76.991967),  # H Street Corridor
        Coordinates(lat=38.881342, lng=-76.988190),  # Capitol Hill East
        Coordinates(lat=38.870932, lng=-77.021080),  # Navy Yard
        Coordinates(lat=38.881433, lng=-77.050552),  # Arlington
        Coordinates(lat=38.889931, lng=-77.009003),  # Back to National Mall
    ]
    
    # Calculate the route
    result = calculate_route(route_points)
    assert result is True, "Route calculation should succeed with 10 points"
    
    # Create a background task for movement
    movement_task = asyncio.create_task(start_movement())
    
    # Wait a bit for movement to start
    await asyncio.sleep(0.2)
    
    # Check that position is being updated
    initial_position = get_current_position()
    assert initial_position is not None, "Should have a position after starting"
    assert initial_position.lat == pytest.approx(route_points[0].lat), "Should start at first waypoint"
    assert initial_position.lng == pytest.approx(route_points[0].lng), "Should start at first waypoint"
    
    # Wait a bit longer for some movement to occur (but not the full route)
    await asyncio.sleep(2)
    
    # Check that position has changed from the start
    current_position = get_current_position()
    assert current_position is not None, "Should have a position during movement"
    assert (current_position.lat != initial_position.lat or 
            current_position.lng != initial_position.lng), "Position should change during movement"
    
    # Stop the movement
    stop_result = stop_movement()
    assert stop_result is True, "Stop should return True"
    
    # Clean up the task
    try:
        await asyncio.wait_for(movement_task, timeout=1.0)
    except asyncio.TimeoutError:
        # Cancel the task if it's taking too long
        movement_task.cancel()
        try:
            await movement_task
        except asyncio.CancelledError:
            pass

@pytest.mark.asyncio
async def test_random_route_generation_and_movement():
    """Test with a randomly generated 10-point route"""
    # Generate 10 random points within a reasonable area (around Washington DC)
    base_lat, base_lng = 38.889931, -77.009003  # National Mall as center
    route_points = []
    
    for i in range(10):
        # Generate points within ~5km of the base point
        lat_offset = random.uniform(-0.05, 0.05)
        lng_offset = random.uniform(-0.05, 0.05)
        route_points.append(Coordinates(
            lat=base_lat + lat_offset,
            lng=base_lng + lng_offset
        ))
    
    # Calculate the route
    result = calculate_route(route_points)
    assert result is True, "Route calculation should succeed with random 10 points"
    
    # Start movement
    movement_task = asyncio.create_task(start_movement())
    
    # Wait a bit for movement to start
    await asyncio.sleep(0.2)
    
    # Verify we're moving
    position1 = get_current_position()
    assert position1 is not None, "Should have a position after starting movement"
    
    # Wait a bit and check position changed
    await asyncio.sleep(1.0)
    position2 = get_current_position()
    assert position2 is not None, "Should still have a position"
    assert (position1.lat != position2.lat or position1.lng != position2.lng), "Position should change"
    
    # Stop movement and clean up
    stop_movement()
    
    try:
        await asyncio.wait_for(movement_task, timeout=1.0)
    except asyncio.TimeoutError:
        movement_task.cancel()
        try:
            await movement_task
        except asyncio.CancelledError:
            pass 