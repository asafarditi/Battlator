import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from app.main import app
from app.services.movement_service import calculate_route, start_movement, stop_movement
import asyncio
import json

def test_websocket_connection():
    """Test the WebSocket connection endpoint"""
    client = TestClient(app)
    
    # First create a route
    route_request = {
        "start": {"lat": 40.0, "lng": -75.0},
        "end": {"lat": 41.0, "lng": -76.0}
    }
    client.post("/api/calculate-route", json=route_request)
    
    # Create background task to start movement
    # In a real test environment we'd use something more robust
    client.post("/api/start-mission")
    
    # Test WebSocket connection
    try:
        with client.websocket_connect("/ws/position") as websocket:
            # Send a message to receive a response
            websocket.send_text("ping")
            data = websocket.receive_json()
            
            # Verify we got position data
            assert "position" in data
            assert "lat" in data["position"]
            assert "lng" in data["position"]
    except WebSocketDisconnect:
        assert False, "WebSocket connection was closed unexpectedly"
    finally:
        # Cleanup
        client.post("/api/stop-mission") 