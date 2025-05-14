import React, { useState, useEffect } from 'react';
import AlertBanner from './AlertBanner';
import { WebSocketMessage } from '../../../types';

interface Alert {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'danger';
}

const NotificationManager: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Listen for WebSocket messages and create alerts
  useEffect(() => {
    // This is a mock implementation
    // In a real app, you would listen to actual WebSocket messages
    
    // Mock function to simulate receiving a WebSocket message
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (message.type === 'alert') {
        const newAlert: Alert = {
          id: `alert-${Date.now()}`,
          message: message.data.message,
          level: message.data.level
        };
        
        setAlerts(prev => [...prev, newAlert]);
      }
    };
    
    // Mock test alerts for UI testing
    const testAlerts = [
      { type: 'alert', data: { message: 'Mission started successfully', level: 'info' } },
      { type: 'alert', data: { message: 'Unknown contact detected to the north', level: 'warning' } },
      { type: 'alert', data: { message: 'Hostile forces approaching from south', level: 'danger' } }
    ] as WebSocketMessage[];
    
    // Show test alerts with delays
    let timeout: number;
    if (process.env.NODE_ENV === 'development') {
      testAlerts.forEach((alert, index) => {
        timeout = window.setTimeout(() => {
          handleWebSocketMessage(alert);
        }, 2000 * (index + 1));
      });
    }
    
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);
  
  // Remove an alert by ID
  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <>
      {alerts.map(alert => (
        <AlertBanner
          key={alert.id}
          message={alert.message}
          level={alert.level}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
    </>
  );
};

export default NotificationManager;