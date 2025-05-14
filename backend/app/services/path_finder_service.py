import math
import heapq
import numpy as np
import pandas as pd
import os
from scipy.ndimage import distance_transform_edt
from pyproj import Proj, Transformer
from shapely.geometry import LineString

class PathFinderService:
    def __init__(self, csv_path=None):
        # Set up UTM transformer (assume zone 13N for Colorado, WGS84)
        self.transformer = Transformer.from_crs("epsg:4326", "epsg:32613", always_xy=True)
        # Load cost map on initialization
        self.load_cost_map(csv_path)

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

    def get_movement_cost(self, from_node, to_node):
        cost_value = self.cost[to_node]
        if from_node[0] != to_node[0] and from_node[1] != to_node[1]:
            return cost_value * 1.414
        else:
            return cost_value

    def find_paths(self, start, end, num_paths=3):
        # start, end: (x, y) in geographic coordinates (lng, lat)
        # Convert to UTM
        start_utm = self.transformer.transform(start[0], start[1])
        end_utm = self.transformer.transform(end[0], end[1])
        x_idx = lambda x: np.abs(self.x_coords - x).argmin()
        y_idx = lambda y: np.abs(self.y_coords - y).argmin()
        start_idx = (y_idx(start_utm[1]), x_idx(start_utm[0]))
        end_idx = (y_idx(end_utm[1]), x_idx(end_utm[0]))
        # Store original cost map
        original_cost = self.cost.copy()
        penalty = 1000
        penalty_radius = 200
        paths = []
        unique_paths = set()
        for _ in range(num_paths):
            # A* search
            path_nodes, cost = self._a_star_search(start_idx, end_idx)
            if not path_nodes:
                break
                
            # Convert path nodes to tuple for hashing
            path_tuple = tuple(map(tuple, path_nodes))
            if path_tuple in unique_paths:
                continue
            unique_paths.add(path_tuple)
                
            # Convert to geo coordinates
            path = []
            for node in path_nodes:
                utm_coords = (float(self.x_coords[node[1]]), float(self.y_coords[node[0]]))
                geo_coords = self.transformer.transform(utm_coords[0], utm_coords[1], direction='INVERSE')
                path.append(geo_coords)
            paths.append(path)
            # Apply penalty to path area
            self._apply_path_penalty(path_nodes, penalty, penalty_radius)
        # Restore original cost map
        self.cost = original_cost
        
        print(f"Found {len(paths)} unique paths")
        return paths

    def _a_star_search(self, start, goal):
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
                movement_cost = self.get_movement_cost(current, next_node)
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