import folium
from folium import plugins
from typing import List
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.models import Enemy, Coordinates, ThreatArea
from app.riskAssesment.calculateThreatArea import (
    analyze_threat_areas,
    calculate_threat_radius,
    calculate_effective_range,
    WEIGHTS  # Add this import
)
import webbrowser
import os
import math

def plot_threat_areas_on_map(threat_areas: List[ThreatArea]):
    """Plot threat areas on an interactive map."""
    if not threat_areas or not threat_areas[0].enemies:
        raise ValueError("No threat areas or enemies to display")

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
    
    # Enhanced color mapping for enemy types
    enemy_colors = {
        'infantry': 'blue',
        'sniper': 'purple',
        'artillery': 'red',
        'unknown': 'gray'
    }
    
    # Risk level colors matching calculateThreatArea.py logic
    risk_colors = {
        'low': '#00ff00',     # Green for low risk
        'medium': '#ffff00',  # Yellow for medium risk
        'high': '#ff0000'     # Red for high/critical risk
    }
    
    # Plot each threat area
    for area in threat_areas:
        # Create polygon coordinates
        polygon_coords = [[point.lat, point.lng] for point in area.polygon]
        
        # Color based on risk level
        color = risk_colors.get(area.riskLevel, 'gray')
        
        # Calculate total risk potential and threat score for the area
        total_risk_potential = sum(enemy.risk_potential for enemy in area.enemies)
        enemy_count = len(area.enemies)
        max_range = max([calculate_threat_radius(enemy) for enemy in area.enemies])
        
        # Calculate threat score using the same formula as in calculateThreatArea.py
        threat_score = (
            enemy_count * WEIGHTS['enemy_count_weight'] +
            max_range * WEIGHTS['range_weight'] +
            total_risk_potential * WEIGHTS['risk_potential_weight']
        )
        
        # Create detailed area description with threat calculations
        area_description = f"""
            <h4>Threat Area</h4>
            <b>Risk Level:</b> {area.riskLevel.upper()}<br>
            <b>Enemy Types:</b> {', '.join(set(enemy.type for enemy in area.enemies))}<br>
            <b>Number of Enemies:</b> {len(area.enemies)}<br>
            <b>Total Risk Potential:</b> {total_risk_potential:.1f}<br>
            <b>Maximum Range:</b> {max_range:.1f}m<br>
            <b>Threat Score:</b> {threat_score:.1f}<br>
            <b>Score Components:</b><br>
            - Enemy Count Factor: {enemy_count * WEIGHTS['enemy_count_weight']:.1f}<br>
            - Range Factor: {max_range * WEIGHTS['range_weight']:.1f}<br>
            - Risk Potential Factor: {total_risk_potential * WEIGHTS['risk_potential_weight']:.1f}<br>
            <b>Description:</b> {area.description}
        """
        
        # Add threat area polygon
        folium.Polygon(
            locations=polygon_coords,
            color=color,
            fill=True,
            fill_opacity=0.2,
            popup=folium.Popup(area_description, max_width=300),
            tooltip=f"{area.riskLevel.upper()} Risk Area"
        ).add_to(m)
        
        # Plot enemy positions with their effective ranges
        for enemy in area.enemies:
            for loc in enemy.location:
                # Get enemy color
                enemy_color = enemy_colors.get(enemy.type.lower(), enemy_colors['unknown'])
                
                # Calculate threat radius using calculateThreatArea logic
                threat_radius = calculate_threat_radius(enemy)
                
                # Create detailed popup content
                capability_list = '<br>'.join([
                    f"- {weapon}: {range_value:.1f}m"
                    for weapon, range_value in enemy.capability.items()
                ])
                
                popup_content = f"""
                    <h4>{enemy.type.upper()}</h4>
                    <b>ID:</b> {enemy.id}<br>
                    <b>Risk Potential:</b> {enemy.risk_potential:.1f}<br>
                    <b>Effective Range:</b> {threat_radius:.1f}m<br>
                    <b>Capabilities:</b><br>
                    {capability_list}
                """
                
                # Add enemy threat radius circle
                folium.Circle(
                    location=[loc.lat, loc.lng],
                    radius=threat_radius,  # Using calculated threat radius
                    color=enemy_color,
                    fill=True,
                    fill_opacity=0.1,
                    weight=1,
                    popup=folium.Popup(f"Threat Radius: {threat_radius:.1f}m", max_width=200),
                    tooltip=f"{enemy.type} - Effective Range"
                ).add_to(m)
                
                # Add enemy position marker
                folium.CircleMarker(
                    location=[loc.lat, loc.lng],
                    radius=8,
                    color=enemy_color,
                    fill=True,
                    fill_opacity=0.7,
                    popup=folium.Popup(popup_content, max_width=300),
                    tooltip=f"{enemy.type} (Risk: {enemy.risk_potential:.1f})"
                ).add_to(m)
    
    # Add legend
    legend_html = """
        <div style="position: fixed; bottom: 50px; left: 50px; z-index: 1000; background-color: white; padding: 10px; border: 2px solid grey; border-radius: 5px;">
        <h4>Legend</h4>
        <p><b>Risk Levels:</b></p>
    """
    for risk_level, color in risk_colors.items():
        legend_html += f'<p><span style="color: {color};">■</span> {risk_level.upper()}</p>'
    
    legend_html += "<p><b>Enemy Types:</b></p>"
    for enemy_type, color in enemy_colors.items():
        legend_html += f'<p><span style="color: {color};">●</span> {enemy_type.upper()}</p>'
    
    legend_html += "</div>"
    m.get_root().html.add_child(folium.Element(legend_html))
    
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
                Coordinates(lat=34.5553, lng=135.5553, alt=0.0),
                Coordinates(lat=34.5554, lng=135.5554, alt=0.0)
            ],
            capability={"Assault Rifles": 500.0, "Rocket-Propelled Grenades (RPGs)": 700.0},
            # Calculation for high risk:
            # Base infantry risk: 50
            # Max range: 700m (RPG)
            # Capability factor: 700/1000 = 0.7
            # Risk potential: 50 * (1 + 0.7) = 85.0
            # Score = 1 * 1.0 + 700 * 0.9 + 85.0 * 1.0 = 716.0 (High risk > 700)
            risk_potential=85.0
        ),
        Enemy(
            id="e2",
            type="sniper",
            location=[Coordinates(lat=34.5660, lng=135.5660, alt=0.0)],
            capability={"Sniper Rifles": 1200.0},
            # Calculation for high risk:
            # Base sniper risk: 70
            # Max range: 1200m
            # Capability factor: 1200/1000 = 1.2
            # Risk potential: 70 * (1 + 1.2) = 154.0
            # Score = 1 * 1.0 + 1200 * 0.9 + 154.0 * 1.0 = 1234.0 (Critical risk > 1200)
            risk_potential=154.0
        ),
        Enemy(
            id="e3",
            type="artillery",
            location=[Coordinates(lat=34.6570, lng=135.6570, alt=0.0)],
            capability={"Mortars - Medium (81mm)": 5600.0},
            # Calculation for high risk:
            # Base artillery risk: 85
            # Max range: 5600m
            # Capability factor: 5600/1000 = 5.6
            # Risk potential: 85 * (1 + 5.6) = 561.0
            # Score = 1 * 1.0 + 5600 * 0.9 + 561.0 * 1.0 = 5602.0 (Critical risk > 1200)
            risk_potential=561.0
        ),
        Enemy(
            id="e5",
            type="infantry",
            location=[
                Coordinates(lat=34.8553, lng=135.3553, alt=0.0)
            ],
            # Capability range chosen to generate medium risk (300-699 score)
            # With infantry base risk (50) and range of 400m:
            # Score = 1 * 1.0 + 400 * 0.9 + (50 * (1 + 400/1000)) * 1.0 ≈ 471
            capability={"Assault Rifles": 400.0},
            risk_potential=70.0
        )
    ]
    
    # Analyze threat areas
    threat_areas = analyze_threat_areas(enemies)
    
    # Plot the results on map
    plot_threat_areas_on_map(threat_areas)