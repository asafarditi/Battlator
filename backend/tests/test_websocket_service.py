import pytest
import asyncio
from unittest.mock import MagicMock, patch
from fastapi import WebSocket
from app.services.websocket_service import (
    connect, disconnect, broadcast_position, position_broadcast_loop
)
from app.models import Coordinates

@pytest.mark.asyncio
async def test_connect_disconnect():
    """Test WebSocket connection handling"""
    # Create a mock websocket
    mock_ws = MagicMock(spec=WebSocket)
    mock_ws.accept = MagicMock(return_value=asyncio.Future())
    mock_ws.accept.return_value.set_result(None)
    
    # Test connect
    await connect(mock_ws)
    mock_ws.accept.assert_called_once()
    
    # Test disconnect
    await disconnect(mock_ws)
    
    # Connect again to test the connection was removed
    await connect(mock_ws)
    mock_ws.accept.assert_called()

@pytest.mark.asyncio
async def test_broadcast_position():
    """Test position broadcasting"""
    # Create mock websockets
    mock_ws1 = MagicMock(spec=WebSocket)
    mock_ws1.send_json = MagicMock(return_value=asyncio.Future())
    mock_ws1.send_json.return_value.set_result(None)
    
    mock_ws2 = MagicMock(spec=WebSocket)
    mock_ws2.send_json = MagicMock(return_value=asyncio.Future())
    mock_ws2.send_json.return_value.set_result(None)
    
    # Add connections
    await connect(mock_ws1)
    await connect(mock_ws2)
    
    # Mock get_current_position
    test_position = Coordinates(lat=10.0, lng=20.0)
    with patch('app.services.websocket_service.get_current_position', return_value=test_position):
        await broadcast_position()
    
    # Check both websockets were sent the position
    mock_ws1.send_json.assert_called_once()
    mock_ws2.send_json.assert_called_once()
    
    # Clean up
    await disconnect(mock_ws1)
    await disconnect(mock_ws2)

@pytest.mark.asyncio
async def test_broadcast_loop():
    """Test the broadcast loop (basic functionality)"""
    # Mock the broadcast_position function
    with patch('app.services.websocket_service.broadcast_position') as mock_broadcast:
        mock_broadcast.return_value = asyncio.Future()
        mock_broadcast.return_value.set_result(None)
        
        # Mock sleep to make the test faster
        with patch('asyncio.sleep') as mock_sleep:
            mock_sleep.return_value = asyncio.Future()
            mock_sleep.return_value.set_result(None)
            
            # Create a task for the loop
            task = asyncio.create_task(position_broadcast_loop())
            
            # Give it a moment to run a few iterations
            await asyncio.sleep(0.1)
            
            # Cancel the task
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            
            # Verify broadcast was called
            assert mock_broadcast.called, "Broadcast should have been called" 