import { WebSocketMessage, Position } from '../types';
import { useMapStore } from '../store/mapStore';

let websocket: WebSocket | null = null;
let mockUpdateInterval: number | null = null;

/**
 * Mock WebSocket service that simulates position updates
 * TODO: Replace with actual WebSocket connection when backend is available
 */
export const websocketService = {
  /**
   * Connects to the WebSocket endpoint and starts listening for updates
   */
  connect: () => {
    if (websocket) {
      console.log('WebSocket already connected');
      return;
    }
    
    console.log('Connecting to WebSocket...');
    
    // In a real app, you would connect to a real WebSocket endpoint
    // For now, we'll simulate it with a timer
    
    // Start the mock update interval
    mockUpdateInterval = window.setInterval(() => {
      // Get current position from store
      const currentPosition = useMapStore.getState().currentPosition;
      
      // Simulate small position changes (random movement)
      const newPosition: Position = {
        latitude: currentPosition.latitude + (Math.random() - 0.5) * 0.001,
        longitude: currentPosition.longitude + (Math.random() - 0.5) * 0.001
      };
      
      // Simulate a WebSocket message
      const message: WebSocketMessage = {
        type: 'position',
        data: newPosition
      };
      
      // Handle the message as if it came from a real WebSocket
      websocketService.handleMessage(message);
    }, 2000); // Update every 2 seconds
    
    // Occasionally send an alert message
    window.setInterval(() => {
      // 10% chance of sending an alert
      if (Math.random() < 0.1) {
        const alertTypes = ['info', 'warning', 'danger'] as const;
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        
        const alertMessages = {
          info: ['Friendly forces nearby', 'Supply drop inbound', 'Weather conditions stable'],
          warning: ['Unknown contact detected', 'Communication interference', 'Weather alert'],
          danger: ['Hostile forces detected', 'Immediate extraction required', 'Critical system failure']
        };
        
        const messages = alertMessages[alertType];
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        const alertMessage: WebSocketMessage = {
          type: 'alert',
          data: {
            message,
            level: alertType
          }
        };
        
        websocketService.handleMessage(alertMessage);
      }
    }, 10000); // Check every 10 seconds
  },
  
  /**
   * Disconnects from the WebSocket
   */
  disconnect: () => {
    console.log('Disconnecting from WebSocket...');
    
    if (mockUpdateInterval) {
      window.clearInterval(mockUpdateInterval);
      mockUpdateInterval = null;
    }
    
    if (websocket) {
      websocket.close();
      websocket = null;
    }
  },
  
  /**
   * Handles incoming WebSocket messages
   */
  handleMessage: (message: WebSocketMessage) => {
    switch (message.type) {
      case 'position':
        // Update position in store
        useMapStore.getState().setCurrentPosition(message.data);
        break;
        
      case 'alert':
        // In a real app, you'd display this alert to the user
        console.log(`${message.data.level.toUpperCase()} ALERT: ${message.data.message}`);
        // You could use a toast notification library here
        break;
        
      default:
        console.warn('Unknown message type:', (message as any).type);
    }
  },
  
  /**
   * Checks if the WebSocket is connected
   */
  isConnected: () => {
    return mockUpdateInterval !== null;
  }
};