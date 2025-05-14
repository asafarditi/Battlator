import tkinter as tk
from tkinter import messagebox
import math
import heapq
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from scipy.ndimage import distance_transform_edt
import os

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
        self.path_line = None
        self.start_marker = None
        self.end_marker = None
        
        # Connect to matplotlib event handler
        self.cid = self.fig.canvas.mpl_connect('button_press_event', self.on_canvas_click)
        
        # Buttons
        self.button_frame = tk.Frame(root)
        self.button_frame.pack(pady=5)
        
        self.clear_button = tk.Button(self.button_frame, text="Clear", command=self.clear_canvas)
        self.clear_button.pack(side=tk.LEFT, padx=5)
        
        self.find_path_button = tk.Button(self.button_frame, text="Find Path", command=self.find_path)
        self.find_path_button.pack(side=tk.LEFT, padx=5)
        
        # Instructions label
        self.instructions = tk.Label(root, text="Click to place start point, then end point")
        self.instructions.pack(pady=5)

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
        
        if self.start_point is None:
            # Remove previous start marker if it exists
            if self.start_marker is not None:
                self.start_marker.remove()
                
            self.start_point = (grid_x, grid_y)
            self.start_grid_point = (y_idx, x_idx)  # Note: grid is (y, x) indexed
            
            # Draw start point
            self.start_marker = self.ax.plot(grid_x, grid_y, 'go', markersize=10)[0]
            self.canvas.draw()
            
            self.instructions.config(text="Now click to place end point")
        elif self.end_point is None:
            # Remove previous end marker if it exists
            if self.end_marker is not None:
                self.end_marker.remove()
                
            self.end_point = (grid_x, grid_y)
            self.end_grid_point = (y_idx, x_idx)  # Note: grid is (y, x) indexed
            
            # Draw end point
            self.end_marker = self.ax.plot(grid_x, grid_y, 'ro', markersize=10)[0]
            self.canvas.draw()
            
            self.instructions.config(text="Click 'Find Path' to find shortest path")

    def clear_canvas(self):
        # Remove markers if they exist
        if self.start_marker is not None:
            self.start_marker.remove()
            self.start_marker = None
            
        if self.end_marker is not None:
            self.end_marker.remove()
            self.end_marker = None
            
        if self.path_line is not None:
            self.path_line.remove()
            self.path_line = None
            
        self.start_point = None
        self.end_point = None
        self.start_grid_point = None
        self.end_grid_point = None
        
        self.canvas.draw()
        self.instructions.config(text="Click to place start point, then end point")

    def heuristic(self, a, b):
        # Euclidean distance heuristic
        return math.sqrt((b[0] - a[0])**2 + (b[1] - a[1])**2)

    def get_neighbors(self, point):
        i, j = point
        neighbors = []
        # Check 8 directions
        for di in [-1, 0, 1]:
            for dj in [-1, 0, 1]:
                if di == 0 and dj == 0:
                    continue
                ni, nj = i + di, j + dj
                if 0 <= ni < self.ny and 0 <= nj < self.nx:
                    neighbors.append((ni, nj))
        return neighbors

    def get_movement_cost(self, from_node, to_node):
        # Cost of moving from one grid cell to another
        cost_value = self.cost[to_node]
        
        # Apply diagonal movement cost adjustment (√2 distance for diagonal moves)
        if from_node[0] != to_node[0] and from_node[1] != to_node[1]:
            return cost_value * 1.414  # √2 ≈ 1.414
        else:
            return cost_value

    def find_path(self):
        if not self.start_point or not self.end_point:
            messagebox.showwarning("Warning", "Please select both start and end points")
            return

        # A* algorithm implementation
        frontier = []
        start = self.start_grid_point
        goal = self.end_grid_point
        
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
                movement_cost = self.get_movement_cost(current, next_node)
                
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
            path = []
            while current is not None:
                # Convert grid coordinates to UTM coordinates
                utm_coords = (self.x_coords[current[1]], self.y_coords[current[0]])
                path.append(utm_coords)
                current = came_from[current]
            path.reverse()

            # Draw path on plot
            path_x = [p[0] for p in path]
            path_y = [p[1] for p in path]
            
            if self.path_line is not None:
                self.path_line.remove()
            
            self.path_line = self.ax.plot(path_x, path_y, 'b-', linewidth=2)[0]
            self.canvas.draw()
            
            # Calculate total path cost
            total_cost = cost_so_far[goal]
            self.instructions.config(text=f"Path found! Total cost: {total_cost:.2f}")
        else:
            messagebox.showinfo("No Path", "No path found between the points")

if __name__ == "__main__":
    root = tk.Tk()
    app = PathFinderGUI(root)
    root.mainloop() 