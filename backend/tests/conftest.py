import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import Coordinates, Enemy
import asyncio

@pytest.fixture
def client():
    """Return a TestClient instance for API testing"""
    return TestClient(app)

@pytest.fixture
def sample_coordinates():
    """Return sample coordinates for testing"""
    return [
        Coordinates(lat=38.897957, lng=-77.036560),  # Washington DC
        Coordinates(lat=40.730610, lng=-73.935242),  # New York
        Coordinates(lat=34.052235, lng=-118.243683)  # Los Angeles
    ]

@pytest.fixture
def sample_enemy():
    """Return a sample enemy for testing"""
    return Enemy(
        id="test-enemy-1",
        enemyType="infantry",
        position=Coordinates(lat=39.5, lng=-75.5),
        radius=2.0
    )

# Helper for async tests
@pytest.fixture
def event_loop():
    """Create and yield an event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close() 