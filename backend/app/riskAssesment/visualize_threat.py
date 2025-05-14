import folium
from folium import plugins
from calculateThreatArea import analyze_threat_areas, Enemy, Coordinates
import webbrowser
import os
import math

def plot_threat_areas_on_map(threat_areas):
    """Plot threat areas on an interactive map."""
    # Get the first enemy's location for centering
    first_enemy = threat_areas[0].enemies[0]
    first_location = first_enemy.location[0]
    
    # Create map centered on the first enemy
    m = folium.Map(location=[first_location.lat, first_location.lng], zoom_start=13)
    
    # Add mouse position control
    formatter = "function(num) {return L.Util.formatNum(num, 5);};"
    mouse_position = folium.plugins.MousePosition(
        position='topright',
        separator=' | ',
        empty_string='NaN',
        lng_first=False,
        num_digits=5,
        prefix='Coordinates:',
        lat_formatter=formatter,
        lng_formatter=formatter
    )
    m.add_child(mouse_position)
    
    # Color mapping for enemy types
    enemy_colors = {
        'infantry': 'blue',
        'sniper': 'purple',
        'artillery': 'orange'
    }
    
    # Plot each threat area
    for area in threat_areas:
        # Create polygon coordinates
        polygon_coords = [[point.lat, point.lng] for point in area.polygon]
        
        # Color based on risk level
        color = 'green' if area.riskLevel == 'low' else 'yellow' if area.riskLevel == 'medium' else 'red'
        
        # Add threat area polygon
        folium.Polygon(
            locations=polygon_coords,
            color=color,
            fill=True,
            fill_opacity=0.2,
            popup=area.description
        ).add_to(m)
        
        # Plot enemy positions with their effective ranges
        for enemy in area.enemies:
            for loc in enemy.location:
                # Get the maximum range from enemy capabilities
                effective_range = max(enemy.capability.values())
                
                # Create enemy marker
                enemy_color = enemy_colors.get(enemy.type, 'black')
                
                # Create popup content with enemy details
                popup_content = f"""
                    <b>{enemy.type.upper()}</b><br>
                    Capabilities:<br>
                    {'<br>'.join(f'- {weapon}: {range}m' for weapon, range in enemy.capability.items())}
                    <br>Risk Potential: {enemy.risk_potential}
                """
                
                # Add enemy effective range circle
                folium.Circle(
                    location=[loc.lat, loc.lng],
                    radius=effective_range,  # radius in meters
                    color=enemy_color,
                    fill=True,
                    fill_opacity=0.1,
                    popup=folium.Popup(popup_content, max_width=300),
                    tooltip=f"{enemy.type} unit - Range: {effective_range}m"
                ).add_to(m)
                
                # Add enemy position marker
                folium.CircleMarker(
                    location=[loc.lat, loc.lng],
                    radius=8,
                    color=enemy_color,
                    fill=True,
                    fill_opacity=0.7,
                    popup=folium.Popup(popup_content, max_width=300),
                    tooltip=f"{enemy.type} unit"
                ).add_to(m)
    
    # Save the map
    map_path = os.path.abspath('threat_map.html')
    m.save(map_path)
    
    # Open the map in default browser
    webbrowser.open('file://' + map_path)

if __name__ == "__main__":
    # Create enemy entities
    enemies = [
        Enemy(
            id="e1",
            type="infantry",
            location=[
                Coordinates(lat=34.5553, lng=135.5553)                
            ],
            capability={"Assault Rifles": 500.0, "Rocket-Propelled Grenades (RPGs)": 700.0},
            risk_potential=75.0
        ),
        Enemy(
            id="e2",
            type="sniper",
            location=[Coordinates(lat=34.5560, lng=135.5560)],
            capability={"Sniper Rifles": 1200.0},
            risk_potential=85.0
        ),
        Enemy(
            id="e3",
            type="artillery",
            location=[Coordinates(lat=34.5570, lng=135.5570)],
            capability={"Mortars - Medium (81mm)": 500.0},
            risk_potential=90.0
        )
    ]
    
    # Analyze threat areas
    threat_areas = analyze_threat_areas(enemies)
    
    # Plot the results on map
    plot_threat_areas_on_map(threat_areas)