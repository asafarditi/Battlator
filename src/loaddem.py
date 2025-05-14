#!/usr/bin/env python3
"""
visualize_cost_map_from_csv.py

Read a downscaled DEM CSV with metric UTM (x/y) cell centers and elevation,
compute slope in degrees using true metric distances from UTM coordinates,
assign traversal cost based on slope ranges, interpolate missing cost values (NaN or infinite) via nearest-neighbor,
and display the cost map in UTM coordinates.
"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import distance_transform_edt


def main():
    # Input CSV file
    csv_file = 'downscaled_dem_50m.csv'

    # Load downscaled DEM (expects x_center, y_center, elevation)
    df = pd.read_csv(csv_file)

    # Unique sorted UTM coordinates
    x_coords = np.sort(df['x_center'].unique())  # Easting (m)
    y_coords = np.sort(df['y_center'].unique())  # Northing (m)
    nx, ny = len(x_coords), len(y_coords)

    # Build elevation grid
    elev_grid = np.full((ny, nx), np.nan)
    x_idx = {x: j for j, x in enumerate(x_coords)}
    y_idx = {y: i for i, y in enumerate(y_coords)}
    for _, row in df.iterrows():
        i = y_idx[row['y_center']]
        j = x_idx[row['x_center']]
        elev_grid[i, j] = row['elevation']

    # Compute slope (degrees) using true metric spacing
    dz_dy, dz_dx = np.gradient(elev_grid, y_coords, x_coords)
    slope_deg = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2)))

    # Assign traversal cost by slope bands
    cost = np.full_like(slope_deg, np.inf)
    cost[(slope_deg >= 0) & (slope_deg < 3)]   = 10
    cost[(slope_deg >= 3) & (slope_deg < 6)]   = 30
    cost[(slope_deg >= 6) & (slope_deg < 15)]  = 50
    cost[(slope_deg >= 15) & (slope_deg < 30)] = 70
    cost[(slope_deg >= 30) & (slope_deg < 45)] = 100
    # slope_deg >= 45 remains infinity

    # Interpolate missing cost (NaN or inf) via nearest neighbor
    mask_missing = np.isnan(cost) | np.isinf(cost)
    if mask_missing.any():
        _, (inds_y, inds_x) = distance_transform_edt(mask_missing, return_indices=True)
        cost[mask_missing] = cost[inds_y[mask_missing], inds_x[mask_missing]]

    # Plot cost map in UTM coordinates
    extent = [x_coords.min(), x_coords.max(), y_coords.min(), y_coords.max()]

    plt.figure(figsize=(8, 6))
    img = plt.imshow(cost, origin='lower', extent=extent, aspect='auto')
    cb = plt.colorbar(img, label='Traversal Cost')
    plt.title('Cost Map (50m grid) in UTM Coordinates')
    plt.xlabel('Easting (m)')
    plt.ylabel('Northing (m)')
    plt.tight_layout()
    plt.show()

if __name__ == '__main__':
    main()
