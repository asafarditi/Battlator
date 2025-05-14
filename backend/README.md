# Battlator Backend

A FastAPI backend service for military route planning and threat zone analysis.

## Goals

- Provide endpoints for route planning and threat zone avoidance
- Implement efficient algorithms for path finding and risk assessment
- Support real-time updates and notifications

## Current Status

- Basic FastAPI setup with health check endpoint
- Route planning endpoints (mock data)
- Basic error handling and logging

## Project Structure

```
backend/
  ├── app/
  │   ├── api/
  │   │   └── routes.py     # All API endpoints (health, plan-route)
  │   ├── models.py         # Pydantic models
  │   └── main.py          # FastAPI app setup
  ├── tests/
  └── requirements.txt
```

## API Endpoints

- `GET /health` — Health check endpoint
- `POST /api/plan-route` — Plan optimal route (returns mock route)

## Development

1. Create virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run development server:

```bash
uvicorn app.main:app --reload
```

## Testing

Run tests with pytest:

```bash
pytest
```

## Purpose

- Serve as the backend for the Battlator geospatial intelligence app
- Provide endpoints for route planning, threat zone avoidance, and vantage point analysis
- Designed for easy extension and integration with the React frontend

## Features

- Health check endpoint (`/health`)
- CORS enabled for frontend-backend communication
- Route planning and vantage point suggestion endpoints (mock data)
- **Best-practice folder structure for scalability and maintainability**

## Setup & Usage

### 1. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the development server

```bash
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000` by default.

## Endpoints

- `GET /health` — Health check (returns `{ "status": "ok" }`)
- `POST /api/plan-route` — Calculate optimal route (returns mock route)
- `GET /api/suggest-vantage` — Suggest vantage point (returns mock vantage point)

## Project Structure

```
backend/
  app/
    __init__.py
    main.py         # FastAPI app entry point (app creation, router inclusion)
    models.py       # Pydantic models for API schemas
    api/
      __init__.py
      routes.py     # All API endpoints (health, plan-route, suggest-vantage)
  requirements.txt  # Python dependencies
  README.md         # This file
```

- All business logic and endpoints are organized in `app/api/routes.py`.
- All Pydantic models are in `app/models.py`.
- The app is created and routers included in `app/main.py`.

## Next Steps

- Add error handling and input validation
- (Optional) Replace mock logic with real algorithms

---

For more details, see the main project README in the root directory.
