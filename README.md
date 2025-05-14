# Map Grid with Threat Polygons

This program creates a grid-based map with threat polygons and calculates the shortest path between two points while avoiding high-threat areas.

## Features

- Creates a grid with 50-meter spacing between points
- Supports multiple threat polygons with different costs (20-100)
- Calculates edge costs based on threat polygon intersections
- Finds the shortest path between two points
- Visualizes the map, threat polygons, and path

## Requirements

- Python 3.7+
- Required packages (install using `pip install -r requirements.txt`):
  - numpy
  - matplotlib
  - shapely
  - networkx

## Usage

1. Install the required packages:
```bash
pip install -r requirements.txt
```

2. Run the demo:
```bash
python src/demo.py
```

## How it Works

1. The program creates a grid with points spaced 50 meters apart
2. Threat polygons are added to the map with associated costs
3. Edges between grid points are created with costs based on:
   - Default cost of 10 for edges not intersecting any polygon
   - Higher costs (20-100) for edges intersecting threat polygons
4. The shortest path is calculated using Dijkstra's algorithm
5. The result is visualized showing:
   - Grid points (blue dots)
   - Edges (colored by cost)
   - Threat polygons (red areas)
   - Shortest path (green line)

## Customization

You can modify the demo script to:
- Change the map size
- Add different threat polygons
- Modify threat costs
- Change start and end points 