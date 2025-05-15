import math
import heapq
import numpy as np
import pandas as pd
import os
from scipy.ndimage import distance_transform_edt
from pyproj import Proj, Transformer
from shapely.geometry import LineString
from matplotlib.path import Path

class PathFinderService:
    def __init__(self, csv_path=None):
        # Set up UTM transformer (assume zone 13N for Colorado, WGS84)
        self.transformer = Transformer.from_crs("epsg:4326", "epsg:32613", always_xy=True)
        # Load cost map on initialization
        self.load_cost_map(csv_path)
        # Initialize polygon storage and cost map
        self.polygons = [] 
        self.init_polygon_cost_map()
        self.original_cost = None

    def load_cost_map(self, csv_path=None):
        # Always load from the src directory at the project root
        if csv_path is None:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
            csv_file = os.path.join(project_root, 'src', 'downscaled_dem_10m.csv')
        else:
            csv_file = csv_path
        if not os.path.exists(csv_file):
            raise FileNotFoundError(f"DEM CSV file not found: {csv_file}")
        df = pd.read_csv(csv_file)
        self.x_coords = np.sort(df['x_center'].unique())
        self.y_coords = np.sort(df['y_center'].unique())
        self.nx, self.ny = len(self.x_coords), len(self.y_coords)
        elev_grid = np.full((self.ny, self.nx), np.nan)
        self.x_idx = {x: j for j, x in enumerate(self.x_coords)}
        self.y_idx = {y: i for i, y in enumerate(self.y_coords)}
        for _, row in df.iterrows():
            i = self.y_idx[row['y_center']]
            j = self.x_idx[row['x_center']]
            elev_grid[i, j] = row['elevation']
        dz_dy, dz_dx = np.gradient(elev_grid, self.y_coords, self.x_coords)
        slope_deg = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2)))
        self.cost = np.full_like(slope_deg, np.inf)
        self.cost[(slope_deg >= 0) & (slope_deg < 3)]   = 10
        self.cost[(slope_deg >= 3) & (slope_deg < 6)]   = 30
        self.cost[(slope_deg >= 6) & (slope_deg < 15)]  = 50
        self.cost[(slope_deg >= 15) & (slope_deg < 30)] = 70
        self.cost[(slope_deg >= 30) & (slope_deg < 45)] = 100
        mask_missing = np.isnan(self.cost) | np.isinf(self.cost)
        if mask_missing.any():
            _, (inds_y, inds_x) = distance_transform_edt(mask_missing, return_indices=True)
            self.cost[mask_missing] = self.cost[inds_y[mask_missing], inds_x[mask_missing]]
        # Apply road cost reduction
        self.apply_road_cost_reduction()
        self.init_polygon_cost_map()
        
    def apply_road_cost_reduction(self):
        """
        Load roads from CSV file and reduce the cost of cells containing roads by 15
        """
        try:
            # Find the roads CSV file
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
            roads_file = os.path.join(project_root, 'src', 'clipped_roads_utm.csv')
            if not os.path.exists(roads_file):
                print("Roads file not found, skipping road cost reduction.")
                return
            roads_df = pd.read_csv(roads_file)
            road_mask = np.zeros_like(self.cost, dtype=bool)
            for _, road in roads_df.iterrows():
                if 'geometry' not in road:
                    continue
                linestring_str = road['geometry']
                if isinstance(linestring_str, str) and linestring_str.startswith('LINESTRING'):
                    coords_str = linestring_str.strip('LINESTRING ()').split(',')
                    coords = []
                    for coord_str in coords_str:
                        try:
                            x, y = map(float, coord_str.strip().split())
                            coords.append((x, y))
                        except ValueError:
                            continue
                    points = self.interpolate_line(coords)
                    for x, y in points:
                        x_idx = np.abs(self.x_coords - x).argmin()
                        y_idx = np.abs(self.y_coords - y).argmin()
                        if 0 <= y_idx < self.ny and 0 <= x_idx < self.nx:
                            road_mask[y_idx, x_idx] = True
            road_cost_reduction = 15
            self.cost[road_mask] = np.maximum(0, self.cost[road_mask] - road_cost_reduction)
            print(f"Roads loaded successfully: found {np.sum(road_mask)} road cells")
        except Exception as e:
            print(f"Error processing roads file: {str(e)}")

    def interpolate_line(self, coords, spacing=10):
        """
        Interpolate points along a line with specified spacing
        """
        if len(coords) < 2:
            return coords
        line = LineString(coords)
        distances = np.arange(0, line.length, spacing)
        points = [line.interpolate(distance) for distance in distances]
        return [(point.x, point.y) for point in points]

    def heuristic(self, a, b):
        return math.sqrt((b[0] - a[0])**2 + (b[1] - a[1])**2)

    def get_neighbors(self, point):
        i, j = point
        neighbors = []
        for di in [-1, 0, 1]:
            for dj in [-1, 0, 1]:
                if di == 0 and dj == 0:
                    continue
                ni, nj = i + di, j + dj
                if 0 <= ni < self.ny and 0 <= nj < self.nx:
                    neighbors.append((ni, nj))
        return neighbors

    def get_movement_cost(self, from_node, to_node, cost_map=None):
        """
        Calculate movement cost between two nodes
        
        Args:
            from_node: Starting node (i, j)
            to_node: Destination node (i, j)
            cost_map: Cost map to use (if None, uses self.cost)
            
        Returns:
            Movement cost including terrain and polygon costs
        """
        if cost_map is None:
            cost_map = self.cost
            
        # Add polygon costs to the cost map
        cost_value = cost_map[to_node] + self.polygon_cost[to_node]
        
        # Apply diagonal movement cost adjustment (√2 distance for diagonal moves)
        if from_node[0] != to_node[0] and from_node[1] != to_node[1]:
            return cost_value * 1.414  # √2 ≈ 1.414
        else:
            return cost_value

    def find_paths(self, start, end, num_paths=3):
        self.original_cost = self.cost.copy()
        """
        Find multiple paths between start and end points, considering polygon costs
        
        Args:
            start: (longitude, latitude) tuple
            end: (longitude, latitude) tuple
            num_paths: Number of paths to find (max 3)
            
        Returns:
            List of paths, where each path is a list of (longitude, latitude) tuples
        """
        # Convert to UTM
        start_utm = self.transformer.transform(start[0], start[1])
        end_utm = self.transformer.transform(end[0], end[1])
        
        # Find indices in the grid
        x_idx = lambda x: np.abs(self.x_coords - x).argmin()
        y_idx = lambda y: np.abs(self.y_coords - y).argmin()
        start_idx = (y_idx(start_utm[1]), x_idx(start_utm[0]))
        end_idx = (y_idx(end_utm[1]), x_idx(end_utm[0]))
        
        # Store original cost map
        original_cost = self.cost.copy()
        
        # Path penalty parameters
        penalty = 1000
        penalty_radius = 200
        
        # Lists to store results
        paths = []
        path_costs = []
        unique_paths = set()
        
        # Use find_paths_with_penalty approach (like in GUI)
        for _ in range(num_paths):
            # A* search considers combined costs (terrain + polygon)
            path_nodes, cost = self._a_star_search(start_idx, end_idx)
            
            if not path_nodes:
                break  # No more paths found
                
            # Check if this path is unique
            path_tuple = tuple(map(tuple, path_nodes))
            if path_tuple in unique_paths:
                continue
                
            unique_paths.add(path_tuple)
            
            # Calculate path metrics including risk points
            path_cost = 0
            
            # Process each node in the path
            for i, node in enumerate(path_nodes):
                
                
                # Calculate actual path cost (skip last point)
                if i < len(path_nodes) - 1:
                    from_node = node
                    to_node = path_nodes[i+1]
                    
                    # Base movement cost
                    move_cost = self.original_cost[to_node]
                    # Add polygon cost
                    move_cost += self.polygon_cost[to_node]
                    
                    # Adjust for diagonal movement
                    if from_node[0] != to_node[0] and from_node[1] != to_node[1]:
                        move_cost *= 1.414  # Diagonal cost adjustment
                        
                    path_cost += move_cost
            
            # Calculate road usage if available
            road_usage = 0.0
            if hasattr(self, 'road_mask'):
                road_points = 0
                for node in path_nodes:
                    if self.road_mask[node]:
                        road_points += 1
                if path_nodes:
                    road_usage = (road_points / len(path_nodes)) * 100
            

            # Convert to geo coordinates
            path = []
            for node in path_nodes:
                utm_coords = (float(self.x_coords[node[1]]), float(self.y_coords[node[0]]))
                geo_coords = self.transformer.transform(utm_coords[0], utm_coords[1], direction='INVERSE')
                path.append(geo_coords)
            paths.append(path)
            # Apply penalty to path area

            # Apply penalty to path area for next iteration
            self._apply_path_penalty(path_nodes, penalty, penalty_radius)
        
        # Restore original cost map
        self.cost = original_cost
        
        print(f"Found {len(paths)} unique paths")
        print(paths)
        return paths

    def find_paths_simple(self, start, end, num_paths=3):
        """
        Legacy implementation - kept for backward compatibility
        Find multiple paths without detailed info
        """
        paths = self.find_paths(start, end, num_paths)
        # Extract just the geometry for backward compatibility
        return [path['geometry'] for path in paths]

    def _a_star_search(self, start, goal):
        """
        A* search algorithm
        
        Args:
            start: Start node coordinates (i, j)
            goal: Goal node coordinates (i, j)
            
        Returns:
            Tuple of (path, cost)
        """
        # Create combined cost map
        combined_cost = self.cost.copy()
        
        frontier = []
        count = 0
        heapq.heappush(frontier, (0, count, start))
        came_from = {start: None}
        cost_so_far = {start: 0}
        
        while frontier:
            _, _, current = heapq.heappop(frontier)
            if current == goal:
                break
                
            for next_node in self.get_neighbors(current):
                movement_cost = self.get_movement_cost(current, next_node, combined_cost)
                
                # Skip impassable terrain (infinity cost)
                if np.isinf(movement_cost):
                    continue
                    
                new_cost = cost_so_far[current] + movement_cost
                if next_node not in cost_so_far or new_cost < cost_so_far[next_node]:
                    cost_so_far[next_node] = new_cost
                    count += 1
                    priority = new_cost + self.heuristic(next_node, goal)
                    heapq.heappush(frontier, (priority, count, next_node))
                    came_from[next_node] = current
                    
        # Reconstruct path
        path = []
        if goal in came_from:
            current = goal
            while current is not None:
                path.append(current)
                current = came_from[current]
            path.reverse()
            return path, cost_so_far[goal]
            
        return None, float('inf')

    def _apply_path_penalty(self, path_nodes, penalty, radius):
        # Apply penalty to path and surrounding area
        if not path_nodes:
            return
        path_utm = [ (self.x_coords[node[1]], self.y_coords[node[0]]) for node in path_nodes ]
        y_grid, x_grid = np.meshgrid(self.y_coords, self.x_coords, indexing='ij')
        all_points = np.column_stack((x_grid.flatten(), y_grid.flatten()))
        from scipy.spatial.distance import cdist
        path_utm_array = np.array(path_utm)
        distances = cdist(all_points, path_utm_array).min(axis=1)
        distances = distances.reshape(self.cost.shape)
        penalty_mask = distances < radius
        self.cost[penalty_mask] += penalty 

    def _transform_polygon_to_utm(self, polygon_vertices):
        """
        Transform polygon vertices from geographic (lon,lat) to UTM coordinates
        
        Args:
            polygon_vertices: List of (longitude, latitude) coordinates
            
        Returns:
            List of (easting, northing) UTM coordinates
        """
        utm_vertices = []
        for vertex in polygon_vertices:
            easting, northing = self.transformer.transform(vertex.lng, vertex.lat)
            utm_vertices.append((easting, northing))
        return utm_vertices

    def add_polygon(self, polygon_vertices, cost_type):
        
        # Add polygon to list
        self.polygons.append((self._transform_polygon_to_utm(polygon_vertices), cost_type))
        
        # Update the polygon cost map
        self.update_polygon_cost_map()
        
        return len(self.polygons)
    
    def update_polygon_cost_map(self):
        """Update the polygon cost map based on defined polygons"""
        # Reset the polygon cost map
        self.polygon_cost = np.zeros_like(self.cost)
        
        # Create a grid of all points
        y_grid, x_grid = np.meshgrid(np.arange(self.ny), np.arange(self.nx), indexing='ij')
        grid_points = np.vstack((y_grid.flatten(), x_grid.flatten())).T
        
        # For each polygon, update the costs
        for polygon_vertices, cost_type in self.polygons:
            # Convert vertices to grid coordinates
            grid_vertices = []
            for x, y in polygon_vertices:
                x_idx = np.abs(self.x_coords - x).argmin()
                y_idx = np.abs(self.y_coords - y).argmin()
                grid_vertices.append((y_idx, x_idx))
                
            # Create a matplotlib path for contains_points test
            path = Path(grid_vertices)
            
            # Test which points are inside the polygon
            mask = path.contains_points(grid_points)
            mask = mask.reshape(self.ny, self.nx)
            
            # Update the cost map
            cost_value = np.inf if cost_type == "high" else 50
            self.polygon_cost[mask] = np.maximum(self.polygon_cost[mask], cost_value) 

    def init_polygon_cost_map(self):
        """Initialize the polygon cost map with zeros"""
        self.polygon_cost = np.zeros_like(self.cost) 