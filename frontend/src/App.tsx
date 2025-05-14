import React, { useEffect } from 'react';
import MapContainer from './components/map/MapContainer';
import ControlPanel from './components/ui/controlPanel/ControlPanel';
import StatusBar from './components/ui/statusBar/StatusBar';
import NotificationManager from './components/ui/notifications/NotificationManager';
import { useMapStore } from './store/mapStore';
import { useNotificationStore } from './store/notificationStore';

function App() {
  const { setCurrentPosition } = useMapStore();
  const { addNotification } = useNotificationStore();
  
  // Set initial position using Geolocation API when available
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let message = "Unable to get your location. Using default position.";
          
          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            message = "Location access was denied. Please enable location permissions to use your current position.";
          } else if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            message = "Location information is unavailable at this time.";
          } else if (error.code === GeolocationPositionError.TIMEOUT) {
            message = "Location request timed out. Using default position.";
          }
          
          addNotification({
            type: 'warning',
            message,
            duration: 10000 // Show for 10 seconds
          });
          
          // Default position is already set in the store
        }
      );
    } else {
      addNotification({
        type: 'info',
        message: 'Geolocation is not supported by your browser. Using default position.',
        duration: 5000
      });
    }
  }, [setCurrentPosition, addNotification]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Main map container */}
      <MapContainer />
      
      {/* Control panel */}
      <ControlPanel />
      
      {/* Status bar */}
      <StatusBar />
      
      {/* Notification manager */}
      <NotificationManager />
    </div>
  );
}

export default App;