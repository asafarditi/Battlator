import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
from app.models import Coordinates

# We'll remove the import here and move it inside the functions
# from app.services.movement_service import get_current_position

# Store active connections
active_connections: List[WebSocket] = []

async def connect(websocket: WebSocket):
    """Accept and store a new websocket connection"""
    await websocket.accept()
    active_connections.append(websocket)
    print(f"WebSocket client connected. Active connections: {len(active_connections)}")
    
async def disconnect(websocket: WebSocket):
    """Remove a websocket connection"""
    if websocket in active_connections:
        active_connections.remove(websocket)
        print(f"WebSocket client disconnected. Active connections: {len(active_connections)}")

async def broadcast_position():
    """Broadcast current position to all connected clients"""
    if not active_connections:
        # No active connections, don't do anything
        await asyncio.sleep(1)  # Sleep to avoid busy waiting
        return
    
    # Import here to avoid circular import
    from app.services.movement_service import get_current_position
        
    position = get_current_position()
    if not position:
        return
        
    # Convert to dict for serialization
    position_data = {
        "lat": position.lat,
        "lng": position.lng
    }
    
    # Broadcast to all connections
    for connection in active_connections:
        try:
            await connection.send_json(position_data)
        except Exception as e:
            print(f"Error sending to WebSocket: {e}")
            # We'll remove failed connections on next loop
            try:
                active_connections.remove(connection)
            except ValueError:
                pass

async def position_broadcast_loop():
    """Loop that periodically broadcasts position updates"""
    while True:
        await broadcast_position()
        await asyncio.sleep(1)  # Send update every second 