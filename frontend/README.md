# Waze for Commanders

A tactical map application that helps battlefield commanders respond to real-time mission updates.

## Features

- Interactive map integration with Mapbox GL JS
- Real-time position tracking with WebSocket integration
- Threat zone drawing with polygon creation
- Mission control with route planning functionality
- Army-inspired, futuristic UI

## Installation

```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

This will start the development server, typically at http://localhost:5173.

## Project Structure

- `src/components/map/` - Map-related components (markers, layers)
- `src/components/ui/` - UI components (control panel, notifications)
- `src/services/` - API and WebSocket services (mocked for now)
- `src/store/` - Application state management
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

## Implementation Notes

This is a frontend-only implementation with mocked backend services:

- Backend API endpoints are mocked in `src/services/api.ts`
- WebSocket connections are simulated in `src/services/websocket.ts`
- All data is stored in memory using Zustand state management

### Mock Services

The application uses several mock services that will be replaced with actual implementations when a backend is available:

1. **API Service** (`src/services/api.ts`)
   - Route planning
   - Threat zone submission
   - Mission control

2. **WebSocket Service** (`src/services/websocket.ts`)
   - Position updates
   - Alert messages

Look for `TODO` comments throughout the codebase for notes on where actual backend integration should be implemented.

## Future Improvements

- Integration with actual backend services
- Offline mode support
- Enhanced threat visualization
- Multi-user collaboration features
- Historical mission replay