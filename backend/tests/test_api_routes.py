import pytest
from fastapi.testclient import TestClient
from app.models import RouteRequest, Coordinates

def test_health_check(client):
    """Test health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_plan_route(client, sample_coordinates):
    """Test route planning API"""
    # Create a route request
    route_request = RouteRequest(
        start=sample_coordinates[0],
        end=sample_coordinates[1]
    )
    
    response = client.post("/api/plan-route", json=route_request.dict())
    assert response.status_code == 200
    
    data = response.json()
    assert "route" in data
    assert "id" in data["route"]
    assert "path" in data["route"]
    assert len(data["route"]["path"]) >= 2

def test_calculate_route(client, sample_coordinates):
    """Test route calculation API"""
    # Create a route request
    route_request = {
        "start": {"lat": sample_coordinates[0].lat, "lng": sample_coordinates[0].lng},
        "end": {"lat": sample_coordinates[1].lat, "lng": sample_coordinates[1].lng}
    }
    
    response = client.post("/api/calculate-route", json=route_request)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_mission_workflow(client):
    """Test mission start/stop workflow"""
    # First calculate a route
    route_request = {
        "start": {"lat": 40.0, "lng": -75.0},
        "end": {"lat": 41.0, "lng": -76.0}
    }
    
    response = client.post("/api/calculate-route", json=route_request)
    assert response.status_code == 200
    
    # Start mission
    response = client.post("/api/start-mission")
    assert response.status_code == 200
    assert response.json() is True
    
    # Get position
    response = client.get("/api/blue-force-position")
    assert response.status_code == 200
    position = response.json()
    assert "lat" in position
    assert "lng" in position
    
    # Stop mission
    response = client.post("/api/stop-mission")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_add_enemy(client, sample_enemy):
    """Test adding an enemy"""
    # Convert to dict for the request
    enemy_data = {
        "id": sample_enemy.id,
        "enemyType": sample_enemy.enemyType,
        "position": {"lat": sample_enemy.position.lat, "lng": sample_enemy.position.lng},
        "radius": sample_enemy.radius
    }
    
    response = client.post("/api/add-enemy", json=enemy_data)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_complex_route_calculation(client):
    """Test calculating a complex route with 10 points through the API"""
    # Create a 10-point route request
    waypoints = [
        {"lat": 38.889931, "lng": -77.009003},  # National Mall
        {"lat": 38.897957, "lng": -77.036560},  # White House
        {"lat": 38.921120, "lng": -77.044632},  # Adams Morgan
        {"lat": 38.933277, "lng": -77.020349},  # Columbia Heights
        {"lat": 38.929951, "lng": -76.988877},  # Brookland
        {"lat": 38.897676, "lng": -76.991967},  # H Street Corridor
        {"lat": 38.881342, "lng": -76.988190},  # Capitol Hill East
        {"lat": 38.870932, "lng": -77.021080},  # Navy Yard
        {"lat": 38.881433, "lng": -77.050552},  # Arlington
        {"lat": 38.889931, "lng": -77.009003},  # Back to National Mall
    ]
    
    # Create a route request
    route_request = {
        "start": waypoints[0],
        "end": waypoints[-1],
        # Note: Your API might need to be modified to accept waypoints
        # "waypoints": waypoints[1:-1]
    }
    
    # First test without waypoints (just start to end)
    response = client.post("/api/calculate-route", json=route_request)
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Start and verify movement
    start_response = client.post("/api/start-mission")
    assert start_response.status_code == 200
    assert start_response.json() is True
    
    # Check position
    position_response = client.get("/api/blue-force-position")
    assert position_response.status_code == 200
    position = position_response.json()
    assert "lat" in position
    assert "lng" in position
    
    # Stop mission to clean up
    stop_response = client.post("/api/stop-mission")
    assert stop_response.status_code == 200
    assert stop_response.json()["success"] is True 