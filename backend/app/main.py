from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
import asyncio
from app.services import websocket_service

app = FastAPI()

# Enable CORS for all origins (adjust for production as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    # Start the websocket broadcast loop
    asyncio.create_task(websocket_service.position_broadcast_loop()) 