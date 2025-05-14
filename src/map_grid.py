import numpy as np
import matplotlib.pyplot as plt
from shapely.geometry import Polygon, LineString, Point
import networkx as nx
from typing import List, Tuple, Dict

class ThreatPolygon:
    def __init__(self, vertices: List[Tuple[float, float]], cost: float):
        self.polygon = Polygon(vertices)
        self.cost = cost

class MapGrid:
    def __init__(self, width: float, height: float, grid_size: float = 50.0):
        self.width = width
        self.height = height
        self.grid_size = grid_size
        self.threat_polygons: List[ThreatPolygon] = []
        
        # Calculate grid dimensions
        self.n_cols = int(width / grid_size) + 1
        self.n_rows = int(height / grid_size) + 1
        
        # Create grid points
        self.x_coords = np.linspace(0, width, self.n_cols)
        self.y_coords = np.linspace(0, height, self.n_rows)
        
        # Create graph
        self.graph = nx.Graph()
        self._create_grid_points()
        self._create_edges()

    def _create_grid_points(self):
        """Create grid points and add them to the graph."""
        for i in range(self.n_rows):
            for j in range(self.n_cols):
                point_id = f"{i}_{j}"
                self.graph.add_node(point_id, pos=(self.x_coords[j], self.y_coords[i]))

    def _create_edges(self):
        """Create edges between adjacent grid points (only horizontal and vertical connections)."""
        for i in range(self.n_rows):
            for j in range(self.n_cols):
                current = f"{i}_{j}"
                
                # Connect to right neighbor
                if j < self.n_cols - 1:
                    right = f"{i}_{j+1}"
                    self._add_edge(current, right)
                
                # Connect to bottom neighbor
                if i < self.n_rows - 1:
                    bottom = f"{i+1}_{j}"
                    self._add_edge(current, bottom)

    def _add_edge(self, node1: str, node2: str):
        """Add an edge between two nodes with appropriate cost."""
        pos1 = self.graph.nodes[node1]['pos']
        pos2 = self.graph.nodes[node2]['pos']
        
        line = LineString([pos1, pos2])
        max_cost = 10.0  # Default cost for edges not intersecting any polygon
        
        # Check intersection with all threat polygons
        for threat in self.threat_polygons:
            if line.intersects(threat.polygon):
                max_cost = max(max_cost, threat.cost)
        
        # Calculate actual edge length and scale cost
        edge_length = line.length
        self.graph.add_edge(node1, node2, weight=max_cost * edge_length)

    def add_threat_polygon(self, vertices: List[Tuple[float, float]], cost: float):
        """Add a threat polygon to the map."""
        self.threat_polygons.append(ThreatPolygon(vertices, cost))
        self._create_edges()  # Recreate edges to update costs

    def visualize(self):
        """Visualize the map with grid and threat polygons."""
        plt.figure(figsize=(12, 8))
        
        # Plot grid points
        pos = nx.get_node_attributes(self.graph, 'pos')
        nx.draw_networkx_nodes(self.graph, pos, node_size=20, node_color='blue', alpha=0.6)
        
        # Plot edges with different colors based on cost
        edges = self.graph.edges()
        weights = [self.graph[u][v]['weight'] for u, v in edges]
        nx.draw_networkx_edges(self.graph, pos, edge_color=weights, 
                             edge_cmap=plt.cm.Reds, width=2)
        
        # Plot threat polygons
        for threat in self.threat_polygons:
            x, y = threat.polygon.exterior.xy
            plt.fill(x, y, alpha=0.3, color='red')
            plt.plot(x, y, color='red')
        
        plt.title('Map Grid with Threat Polygons')
        plt.axis('equal')
        plt.show()

    def find_shortest_path(self, start: Tuple[float, float], end: Tuple[float, float]) -> List[Tuple[float, float]]:
        """Find the shortest path between two points."""
        # Find nearest grid points
        start_node = self._find_nearest_node(start)
        end_node = self._find_nearest_node(end)
        
        try:
            path = nx.shortest_path(self.graph, start_node, end_node, weight='weight')
            return [self.graph.nodes[node]['pos'] for node in path]
        except nx.NetworkXNoPath:
            return []

    def _find_nearest_node(self, point: Tuple[float, float]) -> str:
        """Find the nearest grid node to a given point."""
        min_dist = float('inf')
        nearest_node = None
        
        for node, pos in self.graph.nodes(data='pos'):
            dist = Point(point).distance(Point(pos))
            if dist < min_dist:
                min_dist = dist
                nearest_node = node
        
        return nearest_node 