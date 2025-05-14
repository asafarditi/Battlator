import { WebSocketMessage, Position } from "../types";
import { useMapStore } from "../store/mapStore";

let websocket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * WebSocket service that connects to the backend position updates
 */
export const websocketService = {
  /**
   * Connects to the WebSocket endpoint and starts listening for updates
   */
  connect: () => {
    if (websocket) {
      console.log("WebSocket already connected");
      return;
    }

    console.log("Connecting to WebSocket...");

    // Connect to the actual backend WebSocket endpoint
    websocket = new WebSocket("ws://localhost:8000/ws/position");

    websocket.onopen = () => {
      console.log("WebSocket connection established");
      reconnectAttempts = 0;
    };

    websocket.onclose = (event) => {
      console.log("WebSocket connection closed", event);
      websocket = null;

      // Attempt to reconnect if the connection was closed unexpectedly
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => websocketService.connect(), 2000);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Check if this is a position update
        if (data) {
          const position: Position = {
            latitude: data.lat,
            longitude: data.lng,
            altitude: data.alt || 0,
          };

          const message: WebSocketMessage = {
            type: "position",
            data: position,
          };

          websocketService.handleMessage(message);
        }

        // You can add handling for other message types here
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    // Send a message every few seconds to keep the connection alive
    const keepAliveInterval = window.setInterval(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send("keepalive");
      } else if (!websocket) {
        window.clearInterval(keepAliveInterval);
      }
    }, 30000);
  },

  /**
   * Disconnects from the WebSocket
   */
  disconnect: () => {
    console.log("Disconnecting from WebSocket...");

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
      case "position":
        // Update position in store
        useMapStore.getState().setCurrentPosition(message.data);
        break;

      case "alert":
        // In a real app, you'd display this alert to the user
        console.log(`${message.data.level.toUpperCase()} ALERT: ${message.data.message}`);
        // You could use a toast notification library here
        break;

      default:
        console.warn("Unknown message type:", (message as any).type);
    }
  },

  /**
   * Checks if the WebSocket is connected
   */
  isConnected: () => {
    return websocket !== null && websocket.readyState === WebSocket.OPEN;
  },
};
