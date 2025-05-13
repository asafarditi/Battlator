
# Tactical Route Planner Boilerplate

A full-stack geospatial intelligence application for route planning with threat zone avoidance, built for rapid hackathon development.

## Features

- **Interactive Map**: Browse and interact with a map interface
- **Marker Placement**: Add start/end points for route planning
- **Threat Zone Drawing**: Draw areas to avoid during route planning
- **Route Planning**: Calculate optimal routes avoiding threat zones
- **Vantage Point Analysis**: Identify optimal observation positions with view-shed
- **Layer Controls**: Toggle map features on/off

## Installation

```bash
# Clone the repository
git clone <repo-url>

# Navigate to project folder
cd tactical-route-planner

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`.

## Project Structure

### Frontend

```
src/
├── components/         # UI components
│   ├── InfoPanel/      # Information display components
│   └── Map/            # Map-related components
├── hooks/              # Custom React hooks
├── pages/              # Application pages
├── services/           # API service layer
├── types/              # TypeScript type definitions
└── utils/              # Utility functions and mock data
```

### Backend API (Stubbed)

The backend is currently stubbed with mock implementations for:

- **POST /api/plan-route**: Calculate a route between two points
  - Input: `{ start, end, threatAreas }`
  - Output: `{ route: { path, distance, elevation, riskScore } }`
  
- **GET /api/suggest-vantage**: Find optimal observation point
  - Output: `{ position, visibilityPolygon, coverageScore }`

## Implementation Details

### A* Pathfinding (Stubbed)

The route planning uses a mock implementation that simulates A* pathfinding:

- Each threat area increases the "cost" of traveling through that region
- The algorithm balances the shortest path with threat avoidance
- The route includes metadata about distance, elevation gain, and risk score

### View-shed Analysis (Stubbed)

The vantage point finder uses a mock implementation that:

- Calculates a theoretical position with good visibility of the route
- Generates a polygon representing the observable area
- Assigns a coverage score indicating visibility quality

## Extension Points

Areas ready for hackathon development:

1. **Real A* Implementation**: Replace mock route planning with actual algorithm
2. **Terrain Data**: Add elevation data for more realistic route planning
3. **Multiple Routes**: Implement alternative route suggestions
4. **Threat Analysis**: Add more detailed threat scoring and visualization
5. **Real-time Updates**: Add WebSocket for collaborative planning
6. **Authentication**: Add user authentication and route saving

## Technologies Used

- React with TypeScript
- Leaflet for interactive maps
- Tailwind CSS for styling
- Mock API services (ready for real backend integration)

## License

This project is meant as a hackathon starting point and is available for unrestricted use.
