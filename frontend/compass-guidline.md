# Compass Development Guideline & Checklist

This document serves as a living checklist and guideline for developing the Tactical Route Planner (Battlator). Tasks are broken down into small, actionable components and sections.

---

## 1. Project Setup & Environment

- [ ] Ensure all dependencies are installed (`npm install`)
- [ ] Verify development server runs (`npm run dev`)
- [ ] Confirm map loads and basic UI renders

---

## 2. Core Map Features

### 2.1. Marker Placement

- [ ] Implement placing a start marker
- [ ] Implement placing an end marker
- [ ] Visual feedback for marker placement

### 2.2. Threat Zone Drawing

- [ ] Enable drawing polygons on the map
- [ ] Assign risk levels and descriptions to threat zones
- [ ] Edit/remove threat zones

### 2.3. Layer Controls

- [ ] Toggle threat areas visibility
- [ ] Toggle route visibility
- [ ] Toggle viewshed/vantage visibility

---

## 3. Route Planning

- [ ] Connect frontend to `/api/plan-route` (mock)
- [ ] Display calculated route on the map
- [ ] Show route metadata (distance, elevation, risk score)
- [ ] Handle loading and error states

---

## 4. Vantage Point Analysis

- [ ] Connect frontend to `/api/suggest-vantage` (mock)
- [ ] Display vantage point and visibility polygon
- [ ] Show coverage score and related info

---

## 5. UI/UX Enhancements

- [ ] Responsive design for mobile/desktop
- [ ] Info panels for route and vantage details
- [ ] Tooltips, modals, and user guidance
- [ ] Loading spinners and feedback

---

## 6. Data & State Management

- [ ] Centralize map state (start, end, threat areas, route, vantage)
- [ ] Use React context or state management as needed
- [ ] Persist state (optional/extension)

---

## 7. Extension Points (Future)

- [ ] Replace mock route planning with real A\* algorithm
- [ ] Integrate real elevation/terrain data
- [ ] Suggest multiple alternative routes
- [ ] Advanced threat analysis and visualization
- [ ] Real-time collaboration (WebSocket)
- [ ] User authentication and route saving

---

## 8. Testing

- [ ] Unit tests for utility functions
- [ ] Component tests for map and UI
- [ ] Integration tests for API interactions

---

## 9. Documentation

- [ ] Update README with new features
- [ ] Document API endpoints and data structures
- [ ] Add usage examples and screenshots

---

## 10. Deployment

- [ ] Prepare production build
- [ ] Deployment scripts/instructions
- [ ] Verify production environment

---

## 11. Backend (Python FastAPI)

### 11.1. Setup

- [ ] Create `backend/` directory with FastAPI project structure
- [ ] Add `requirements.txt` (FastAPI, uvicorn, etc.)
- [ ] Implement health check endpoint (`/health`)

### 11.2. Core Endpoints

- [ ] POST `/api/plan-route` – Calculate optimal route
- [ ] GET `/api/suggest-vantage` – Suggest vantage point
- [ ] Define and document Pydantic models for all request/response types

### 11.3. Logic & Services

- [ ] Implement route planning logic (mock or real A\*)
- [ ] Implement vantage point calculation (mock or real)
- [ ] Add error handling and validation

### 11.4. Integration

- [ ] Enable CORS for frontend-backend communication
- [ ] Update frontend to use real backend endpoints

### 11.5. (Optional/Future)

- [ ] Advanced threat analysis endpoint
- [ ] Multiple route suggestions
- [ ] User authentication

---

> Update this section as backend development progresses.

---

> Update this checklist as tasks are completed or new requirements arise.
