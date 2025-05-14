from map_grid import MapGrid
import matplotlib.pyplot as plt
import networkx as nx

def create_grid_around_points(start_point, end_point, padding=1000, grid_size=50.0):
    """
    Create a grid around start and end points with padding.
    
    Args:
        start_point (tuple): (x, y) coordinates of start point
        end_point (tuple): (x, y) coordinates of end point
        padding (float): Padding in meters around the points (default: 1000)
        grid_size (float): Size of each grid cell in meters (default: 50.0)
    
    Returns:
        MapGrid: A new MapGrid instance with the calculated dimensions
    """
    # Calculate the bounding box with padding
    min_x = min(start_point[0], end_point[0]) - padding
    max_x = max(start_point[0], end_point[0]) + padding
    min_y = min(start_point[1], end_point[1]) - padding
    max_y = max(start_point[1], end_point[1]) + padding
    
    # Calculate width and height
    width = max_x - min_x
    height = max_y - min_y
    
    # Create and return the grid
    return MapGrid(width=width, height=height, grid_size=grid_size)

def main():
    # Define start and end points in UTM coordinates (Zone 32N)
    # Example: Converting from approximately 48.1°N, 11.6°E to UTM
    start_point = (473825.01,4427475.16, 39.99705309718838)  # UTM coordinates in meters
    end_point = (474975.01,4428425.16,40.00564715327689)    # UTM coordinates in meters
    
    # Create a grid around the points with 500m padding
    map_grid = create_grid_around_points(start_point, end_point, padding=500)
    
    # Add some threat polygons with different costs (in UTM coordinates)
    # threat_polygons = [
    #     # Triangle threat (cost: 50)
    #     ([(452000, 5327000), (453000, 5327000), (452500, 5328000)], 50),
    #     # Rectangle threat (cost: 80)
    #     ([(455000, 5330000), (456000, 5330000), (456000, 5331000), (455000, 5331000)], 80),
    #     # Pentagon threat (cost: 30)
    #     ([(451000, 5332000), (452000, 5332000), (452500, 5333000), (451500, 5333500), (450500, 5332500)], 30),
    #     # Hexagon threat (cost: 90)
    #     ([(458000, 5326000), (459000, 5326500), (459000, 5327500), (458000, 5328000), (457000, 5327500), (457000, 5326500)], 90)
    # ]
    
    # Add all threat polygons to the map
    for vertices, cost in threat_polygons:
        map_grid.add_threat_polygon(vertices, cost)
    
    # Find a path from start to end point
    path = map_grid.find_shortest_path(start_point, end_point)
    
    # Visualize the map and path
    plt.figure(figsize=(12, 8))
    
    # Plot grid points
    pos = nx.get_node_attributes(map_grid.graph, 'pos')
    nx.draw_networkx_nodes(map_grid.graph, pos, node_size=20, node_color='blue', alpha=0.6)
    
    # Plot edges with different colors based on cost
    edges = map_grid.graph.edges()
    weights = [map_grid.graph[u][v]['weight'] for u, v in edges]
    nx.draw_networkx_edges(map_grid.graph, pos, edge_color=weights, 
                          edge_cmap=plt.cm.Reds, width=2)
    
    # Plot threat polygons
    for threat in map_grid.threat_polygons:
        x, y = threat.polygon.exterior.xy
        plt.fill(x, y, alpha=0.3, color='red')
        plt.plot(x, y, color='red')
    
    # Plot the path
    if path:
        path_x = [p[0] for p in path]
        path_y = [p[1] for p in path]
        plt.plot(path_x, path_y, 'g-', linewidth=3, label='Shortest Path')
    
    # Plot start and end points
    plt.plot(start_point[0], start_point[1], 'go', markersize=10, label='Start')
    plt.plot(end_point[0], end_point[1], 'ro', markersize=10, label='End')
    
    plt.title('Map Grid with Threat Polygons and Shortest Path\n(UTM Zone 32N coordinates)')
    plt.xlabel('UTM Easting (m)')
    plt.ylabel('UTM Northing (m)')
    plt.legend()
    plt.axis('equal')
    plt.show()

if __name__ == "__main__":
    main() 