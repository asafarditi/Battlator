from map_grid import MapGrid
import matplotlib.pyplot as plt
import networkx as nx

def main():
    # Create a map of 1000x1000 meters
    map_grid = MapGrid(width=1000, height=1000, grid_size=50.0)
    
    # Add some threat polygons with different costs
    threat_polygons = [
        # Triangle threat (cost: 50)
        ([(200, 200), (400, 200), (300, 400)], 50),
        # Rectangle threat (cost: 80)
        ([(600, 600), (800, 600), (800, 800), (600, 800)], 80),
        # Pentagon threat (cost: 30)
        ([(100, 700), (300, 700), (350, 850), (200, 900), (50, 800)], 30),
        # Hexagon threat (cost: 90)
        ([(700, 100), (900, 200), (900, 400), (700, 500), (500, 400), (500, 200)], 90)
    ]
    
    # Add all threat polygons to the map
    for vertices, cost in threat_polygons:
        map_grid.add_threat_polygon(vertices, cost)
    
    # Find a path from (100, 100) to (900, 900)
    start_point = (100, 100)
    end_point = (900, 900)
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
    
    plt.title('Map Grid with Threat Polygons and Shortest Path')
    plt.legend()
    plt.axis('equal')
    plt.show()

if __name__ == "__main__":
    main() 