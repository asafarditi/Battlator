import tkinter as tk
from tkinter import messagebox, ttk
import math
import heapq
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.patches import Polygon as MplPolygon
from scipy.ndimage import distance_transform_edt
import os
import random
import copy
from scipy.spatial.distance import cdist
from matplotlib.path import Path

class PathFinderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Path Finder")
        
        # Load cost map
        self.load_cost_map()
        
        # Create matplotlib figure for plotting
        self.fig, self.ax = plt.subplots(figsize=(10, 8))
        self.extent = [self.x_coords.min(), self.x_coords.max(), 
                      self.y_coords.min(), self.y_coords.max()]
        
        # Display cost map
        self.img = self.ax.imshow(self.cost, origin='lower', extent=self.extent, 
                               aspect='auto', cmap='viridis')
        plt.colorbar(self.img, ax=self.ax, label='Traversal Cost')
        self.ax.set_title('Cost Map - Click to set start and end points')
        self.ax.set_xlabel('Easting (m)')
        self.ax.set_ylabel('Northing (m)')
        
        # Embed matplotlib figure in tkinter
        self.canvas = FigureCanvasTkAgg(self.fig, master=root)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Variables to store points
        self.start_point = None
        self.end_point = None
        self.start_grid_point = None
        self.end_grid_point = None
        self.path_lines = []
        self.start_marker = None
        self.end_marker = None
        
        # Path colors
        self.path_colors = ['blue', 'red', 'green']
        self.path_names = ['Primary', 'Alternative 1', 'Alternative 2']
        
        # Path penalty parameters
        self.path_penalty = 1000  # Large cost penalty for path cells
        self.penalty_radius = 200  # Radius in meters for penalty area
        
        # Polygon variables
        self.mode = "points"  # "points", "polygon"
        self.polygon_points = []
        self.polygon_scatter = None
        self.polygon_line = None
        self.polygons = []  # List to store (polygon_vertices, cost_type)
        self.polygon_patches = []  # List to store matplotlib polygon patches
        
        # Polygon cost map
        self.polygon_cost = None  # Will be initialized with same shape as self.cost
        
        # Connect to matplotlib event handler
        self.cid = self.fig.canvas.mpl_connect('button_press_event', self.on_canvas_click)
        
        # Create control panel
        self.control_frame = tk.Frame(root)
        self.control_frame.pack(pady=5, fill=tk.X)
        
        # Mode selection
        self.mode_frame = tk.LabelFrame(self.control_frame, text="Mode")
        self.mode_frame.pack(side=tk.LEFT, padx=10, pady=5)
        
        self.mode_var = tk.StringVar(value="points")
        self.points_radio = tk.Radiobutton(self.mode_frame, text="Start/End Points", 
                                          variable=self.mode_var, value="points",
                                          command=self.set_mode)
        self.points_radio.pack(side=tk.LEFT)
        
        self.polygon_radio = tk.Radiobutton(self.mode_frame, text="Draw Polygon", 
                                           variable=self.mode_var, value="polygon",
                                           command=self.set_mode)
        self.polygon_radio.pack(side=tk.LEFT)
        
        # Polygon controls
        self.polygon_frame = tk.LabelFrame(self.control_frame, text="Polygon Options")
        self.polygon_frame.pack(side=tk.LEFT, padx=10, pady=5)
        
        self.cost_var = tk.StringVar(value="medium")
        self.medium_radio = tk.Radiobutton(self.polygon_frame, text="Medium Cost", 
                                          variable=self.cost_var, value="medium")
        self.medium_radio.pack(side=tk.LEFT)
        
        self.high_radio = tk.Radiobutton(self.polygon_frame, text="High Cost", 
                                        variable=self.cost_var, value="high")
        self.high_radio.pack(side=tk.LEFT)
        
        self.finish_polygon_btn = tk.Button(self.polygon_frame, text="Finish Polygon", 
                                           command=self.finish_polygon, state=tk.DISABLED)
        self.finish_polygon_btn.pack(side=tk.LEFT, padx=5)
        
        self.cancel_polygon_btn = tk.Button(self.polygon_frame, text="Cancel", 
                                           command=self.cancel_polygon, state=tk.DISABLED)
        self.cancel_polygon_btn.pack(side=tk.LEFT, padx=5)
        
        # Visualization controls
        self.viz_frame = tk.LabelFrame(self.control_frame, text="Visualization")
        self.viz_frame.pack(side=tk.LEFT, padx=10, pady=5)
        
        self.viz_var = tk.StringVar(value="terrain")
        self.viz_menu = ttk.Combobox(self.viz_frame, textvariable=self.viz_var, 
                                     values=["Terrain Cost", "Polygon Cost", "Combined Cost"])
        self.viz_menu.pack(side=tk.LEFT, padx=5)
        self.viz_menu.bind("<<ComboboxSelected>>", self.update_visualization)
        
        # Buttons
        self.button_frame = tk.Frame(root)
        self.button_frame.pack(pady=5)
        
        self.clear_button = tk.Button(self.button_frame, text="Clear All", command=self.clear_canvas)
        self.clear_button.pack(side=tk.LEFT, padx=5)
        
        self.clear_polygons_button = tk.Button(self.button_frame, text="Clear Polygons", 
                                              command=self.clear_polygons)
        self.clear_polygons_button.pack(side=tk.LEFT, padx=5)
        
        self.find_path_button = tk.Button(self.button_frame, text="Find Paths", command=self.find_paths)
        self.find_path_button.pack(side=tk.LEFT, padx=5)
        
        # Instructions label
        self.instructions = tk.Label(root, text="Click to place start point, then end point")
        self.instructions.pack(pady=5)
        
        # Path information frame
        self.path_info_frame = tk.Frame(root)
        self.path_info_frame.pack(pady=5)
        
        # Path labels
        self.path_labels = []
        for i in range(3):
            label = tk.Label(self.path_info_frame, text="", fg=self.path_colors[i])
            label.pack(anchor='w')
            self.path_labels.append(label)
            
        # Initialize polygon cost map
        self.init_polygon_cost_map()

    def load_cost_map(self):
        # Define the directory path
        csv_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Find path to CSV file
        csv_file = os.path.join(csv_dir, 'downscaled_dem_50m.csv')
        if not os.path.exists(csv_file):
            # Try looking in src directory
            csv_file = os.path.join(os.path.dirname(csv_dir), 'src', 'downscaled_dem_50m.csv')
        
        if not os.path.exists(csv_file):
            # Use a dialog to select the file if not found
            from tkinter import filedialog
            messagebox.showinfo("Select CSV File", "Please select the downscaled_dem_50m.csv file")
            csv_file = filedialog.askopenfilename(title="Select DEM CSV file", 
                                                 filetypes=[("CSV files", "*.csv")])
        
        # Load downscaled DEM (expects x_center, y_center, elevation)
        df = pd.read_csv(csv_file)

        # Unique sorted UTM coordinates
        self.x_coords = np.sort(df['x_center'].unique())  # Easting (m)
        self.y_coords = np.sort(df['y_center'].unique())  # Northing (m)
        self.nx, self.ny = len(self.x_coords), len(self.y_coords)

        # Build elevation grid
        elev_grid = np.full((self.ny, self.nx), np.nan)
        self.x_idx = {x: j for j, x in enumerate(self.x_coords)}
        self.y_idx = {y: i for i, y in enumerate(self.y_coords)}
        for _, row in df.iterrows():
            i = self.y_idx[row['y_center']]
            j = self.x_idx[row['x_center']]
            elev_grid[i, j] = row['elevation']

        # Compute slope (degrees) using true metric spacing
        dz_dy, dz_dx = np.gradient(elev_grid, self.y_coords, self.x_coords)
        slope_deg = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2)))

        # Assign traversal cost by slope bands
        self.cost = np.full_like(slope_deg, np.inf)
        self.cost[(slope_deg >= 0) & (slope_deg < 3)]   = 10
        self.cost[(slope_deg >= 3) & (slope_deg < 6)]   = 30
        self.cost[(slope_deg >= 6) & (slope_deg < 15)]  = 50
        self.cost[(slope_deg >= 15) & (slope_deg < 30)] = 70
        self.cost[(slope_deg >= 30) & (slope_deg < 45)] = 100
        # slope_deg >= 45 remains infinity

        # Interpolate missing cost (NaN or inf) via nearest neighbor
        mask_missing = np.isnan(self.cost) | np.isinf(self.cost)
        if mask_missing.any():
            _, (inds_y, inds_x) = distance_transform_edt(mask_missing, return_indices=True)
            self.cost[mask_missing] = self.cost[inds_y[mask_missing], inds_x[mask_missing]]
        
        # Store original cost map for reuse
        self.original_cost = self.cost.copy()

    def on_canvas_click(self, event):
        if event.xdata is None or event.ydata is None:
            return  # Click outside the plot area
            
        # Get the x,y coordinates from the plot
        x, y = event.xdata, event.ydata
        
        # Find the closest grid point
        x_idx = np.abs(self.x_coords - x).argmin()
        y_idx = np.abs(self.y_coords - y).argmin()
        
        grid_x = self.x_coords[x_idx]
        grid_y = self.y_coords[y_idx]
        
        if self.mode == "points":
            if self.start_point is None:
                # Remove previous start marker if it exists
                if self.start_marker is not None:
                    self.start_marker.remove()
                    
                self.start_point = (grid_x, grid_y)
                self.start_grid_point = (y_idx, x_idx)  # Note: grid is (y, x) indexed
                
                # Draw start point
                self.start_marker = self.ax.plot(grid_x, grid_y, 'mo', markersize=10)[0]
                self.canvas.draw()
                
                self.instructions.config(text="Now click to place end point")
            elif self.end_point is None:
                # Remove previous end marker if it exists
                if self.end_marker is not None:
                    self.end_marker.remove()
                    
                self.end_point = (grid_x, grid_y)
                self.end_grid_point = (y_idx, x_idx)  # Note: grid is (y, x) indexed
                
                # Draw end point
                self.end_marker = self.ax.plot(grid_x, grid_y, 'ko', markersize=10)[0]
                self.canvas.draw()
                
                self.instructions.config(text="Click 'Find Paths' to find multiple path options")
        else:  # polygon mode
            # Add the point to our list
            self.polygon_points.append((x, y))
            
            # Update the polygon visualization
            if self.polygon_scatter:
                self.polygon_scatter.remove()
            if self.polygon_line:
                self.polygon_line.remove()
                
            # Draw all points
            if self.polygon_points:
                x_values = [p[0] for p in self.polygon_points]
                y_values = [p[1] for p in self.polygon_points]
                self.polygon_scatter = self.ax.scatter(x_values, y_values, color='blue', s=30, zorder=3)
                
                # Draw lines connecting points
                if len(self.polygon_points) > 1:
                    poly_points = self.polygon_points + [self.polygon_points[0]]  # Close the polygon
                    x_line = [p[0] for p in poly_points]
                    y_line = [p[1] for p in poly_points]
                    self.polygon_line = self.ax.plot(x_line, y_line, 'b--', zorder=3)[0]
                
            self.canvas.draw()
            self.instructions.config(text=f"Added point {len(self.polygon_points)}. Click for more points or 'Finish Polygon' when done.")

    def clear_canvas(self):
        # Remove markers if they exist
        if self.start_marker is not None:
            self.start_marker.remove()
            self.start_marker = None
            
        if self.end_marker is not None:
            self.end_marker.remove()
            self.end_marker = None
            
        # Remove all paths
        for path_line in self.path_lines:
            if path_line is not None:
                path_line.remove()
        self.path_lines = []
            
        self.start_point = None
        self.end_point = None
        self.start_grid_point = None
        self.end_grid_point = None
        
        # Reset cost map to original
        self.cost = self.original_cost.copy()
        
        # Clear path labels
        for label in self.path_labels:
            label.config(text="")
        
        self.canvas.draw()
        self.instructions.config(text="Click to place start point, then end point")

    def heuristic(self, a, b, weight=1.0):
        # Euclidean distance heuristic with weight parameter
        return weight * math.sqrt((b[0] - a[0])**2 + (b[1] - a[1])**2)

    def get_neighbors(self, point):
        i, j = point
        neighbors = []
        
        # Standard 8-direction neighbors
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1), 
                    (-1, -1), (-1, 1), (1, -1), (1, 1)]
        
        for di, dj in directions:
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
            Movement cost
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

    def apply_path_penalty(self, path_nodes):
        """
        Apply penalty to a path and its surrounding area
        
        Args:
            path_nodes: List of (i, j) grid coordinates for the path
        """
        if not path_nodes:
            return
            
        # Convert path nodes to UTM coordinates
        path_utm = []
        for node in path_nodes:
            utm_coords = (self.x_coords[node[1]], self.y_coords[node[0]])
            path_utm.append(utm_coords)
            
        # Create grids of all UTM coordinates
        y_grid, x_grid = np.meshgrid(self.y_coords, self.x_coords, indexing='ij')
        all_points = np.column_stack((x_grid.flatten(), y_grid.flatten()))
        
        # Calculate distances from each grid point to the nearest path point
        path_utm_array = np.array(path_utm)
        distances = cdist(all_points, path_utm_array).min(axis=1)
        distances = distances.reshape(self.cost.shape)
        
        # Apply penalty to points within the radius
        penalty_mask = distances < self.penalty_radius
        self.cost[penalty_mask] += self.path_penalty

    def a_star_search(self, start, goal):
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
        
        # A* algorithm implementation
        frontier = []
        
        # (priority, count, node) - count is used to break ties consistently
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
        if goal in came_from:
            current = goal
            path_nodes = []
            while current is not None:
                path_nodes.append(current)
                current = came_from[current]
            path_nodes.reverse()
            
            # Calculate total path cost
            total_cost = cost_so_far[goal]
            
            return path_nodes, total_cost
        else:
            return None, float('inf')

    def reconstruct_path_coordinates(self, path_nodes):
        """Convert grid nodes to UTM coordinates for display"""
        if not path_nodes:
            return None
            
        path = []
        for node in path_nodes:
            # Convert grid coordinates to UTM coordinates
            utm_coords = (self.x_coords[node[1]], self.y_coords[node[0]])
            path.append(utm_coords)
        
        return path

    def find_paths_with_penalty(self):
        """
        Find multiple paths using the path-penalty approach
        
        Returns:
            List of (path_nodes, cost) tuples
        """
        # Make a copy of the original cost map
        self.cost = self.original_cost.copy()
        
        # List to store paths
        paths = []
        
        # Find first path - shortest path
        path1, cost1 = self.a_star_search(self.start_grid_point, self.end_grid_point)
        if path1:
            paths.append((path1, cost1))
            
            # Apply penalty to first path area
            self.apply_path_penalty(path1)
            
            # Find second path with updated costs
            path2, cost2 = self.a_star_search(self.start_grid_point, self.end_grid_point)
            if path2:
                paths.append((path2, cost2))
                
                # Apply penalty to second path area
                self.apply_path_penalty(path2)
                
                # Find third path with updated costs
                path3, cost3 = self.a_star_search(self.start_grid_point, self.end_grid_point)
                if path3:
                    paths.append((path3, cost3))
        
        # Reset cost map to original
        self.cost = self.original_cost.copy()
        
        return paths

    def find_paths(self):
        if not self.start_point or not self.end_point:
            messagebox.showwarning("Warning", "Please select both start and end points")
            return
        print(self.start_point, self.end_point)
        # Remove any existing path lines
        for path_line in self.path_lines:
            if path_line is not None:
                path_line.remove()
        self.path_lines = []
        
        # Show the combined cost map
        self.viz_var.set("Combined Cost")
        self.update_visualization()
        
        # Find multiple paths using path penalty approach
        paths = self.find_paths_with_penalty()
        
        # Check if at least one path was found
        if not paths:
            messagebox.showinfo("No Path", "No path found between the points")
            return
        
        # Draw all found paths
        for i, (path_nodes, cost) in enumerate(paths):
            # Convert grid nodes to UTM coordinates
            path = self.reconstruct_path_coordinates(path_nodes)
            
            path_x = [p[0] for p in path]
            path_y = [p[1] for p in path]
            
            line = self.ax.plot(path_x, path_y, color=self.path_colors[i], 
                              linewidth=3-i*0.5, label=f"Path {i+1}")[0]
            self.path_lines.append(line)
            
            # Calculate path cost on original cost map plus polygon costs
            original_cost = 0
            for j in range(len(path_nodes) - 1):
                from_node = path_nodes[j]
                to_node = path_nodes[j+1]
                # Calculate base movement cost
                move_cost = self.original_cost[to_node]
                # Add polygon cost
                move_cost += self.polygon_cost[to_node]
                # Adjust for diagonal movement
                if from_node[0] != to_node[0] and from_node[1] != to_node[1]:
                    move_cost *= 1.414  # Diagonal cost adjustment
                original_cost += move_cost
            
            # Update path info label
            self.path_labels[i].config(text=f"{self.path_names[i]}: Cost = {original_cost:.2f}")
            
        self.canvas.draw()
        
        # Display legend
        self.ax.legend()
        
        self.instructions.config(text=f"Found {len(paths)} distinct paths!")

    def init_polygon_cost_map(self):
        """Initialize the polygon cost map with zeros"""
        self.polygon_cost = np.zeros_like(self.cost)
        
    def set_mode(self):
        """Change the interaction mode"""
        self.mode = self.mode_var.get()
        if self.mode == "points":
            self.instructions.config(text="Click to place start point, then end point")
            self.finish_polygon_btn.config(state=tk.DISABLED)
            self.cancel_polygon_btn.config(state=tk.DISABLED)
        else:  # polygon mode
            self.instructions.config(text="Click to add polygon vertices. Press 'Finish Polygon' when done.")
            self.finish_polygon_btn.config(state=tk.NORMAL)
            self.cancel_polygon_btn.config(state=tk.NORMAL)
            
    def cancel_polygon(self):
        """Cancel the current polygon drawing"""
        self.polygon_points = []
        if self.polygon_scatter:
            self.polygon_scatter.remove()
            self.polygon_scatter = None
        if self.polygon_line:
            self.polygon_line.remove()
            self.polygon_line = None
        self.canvas.draw()
        
    def finish_polygon(self):
        """Complete the polygon and add it to the cost map"""
        if len(self.polygon_points) < 3:
            messagebox.showwarning("Warning", "A polygon must have at least 3 points")
            return
            
        # Get the cost type
        cost_type = self.cost_var.get()
        
        # Add the polygon to our list
        self.polygons.append((self.polygon_points.copy(), cost_type))
        
        # Create a polygon patch for visualization
        poly_vertices = np.array(self.polygon_points)
        if cost_type == "high":
            color = 'red'
            alpha = 0.3
        else:  # medium
            color = 'yellow'
            alpha = 0.3
            
        poly_patch = MplPolygon(poly_vertices, closed=True, 
                               facecolor=color, edgecolor='black', 
                               alpha=alpha, zorder=2)
        self.ax.add_patch(poly_patch)
        self.polygon_patches.append(poly_patch)
        
        # Update the polygon cost map
        self.update_polygon_cost_map()
        
        # Reset the current polygon
        self.cancel_polygon()
        
        # Update visualization if needed
        if self.viz_var.get() != "Terrain Cost":
            self.update_visualization()
            
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
            
    def update_visualization(self, event=None):
        """Update the displayed cost map visualization"""
        viz_type = self.viz_var.get()
        
        if viz_type == "Terrain Cost":
            # Show the original terrain cost
            self.img.set_data(self.original_cost)
            self.img.set_clim(vmin=self.original_cost[~np.isinf(self.original_cost)].min(), 
                           vmax=self.original_cost[~np.isinf(self.original_cost)].max())
            self.ax.set_title("Terrain Cost Map")
        elif viz_type == "Polygon Cost":
            # Show the polygon cost map
            display_cost = self.polygon_cost.copy()
            display_cost[np.isinf(display_cost)] = 200  # Cap for visualization
            self.img.set_data(display_cost)
            self.img.set_clim(vmin=0, vmax=200)
            self.ax.set_title("Polygon Cost Map")
        else:  # Combined Cost
            # Show the combined cost map
            combined_cost = self.original_cost + self.polygon_cost
            display_cost = combined_cost.copy()
            display_cost[np.isinf(display_cost)] = 200  # Cap for visualization
            self.img.set_data(display_cost)
            self.img.set_clim(vmin=display_cost[~np.isinf(combined_cost)].min(), 
                           vmax=200)
            self.ax.set_title("Combined Cost Map")
            
        self.canvas.draw()
        
    def clear_polygons(self):
        """Clear all polygons"""
        # Remove all polygon patches
        for patch in self.polygon_patches:
            patch.remove()
        self.polygon_patches = []
        
        # Clear polygon list
        self.polygons = []
        
        # Reset the polygon cost map
        self.init_polygon_cost_map()
        
        # Update visualization
        self.update_visualization()
        
        self.canvas.draw()

if __name__ == "__main__":
    root = tk.Tk()
    app = PathFinderGUI(root)
    root.mainloop() 