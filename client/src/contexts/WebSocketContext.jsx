import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000); // Start with 1 second

  useEffect(() => {
    let newSocket = null;

    const connectSocket = () => {
      if (!user || !isAuthenticated) {
        console.log('WebSocket: User not authenticated, skipping connection');
        return;
      }

      try {
        console.log('WebSocket: Attempting to connect for user:', user.username);
        // Use import.meta.env for Vite or fallback to localhost
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        console.log('WebSocket: Connecting to:', apiUrl);
        
        newSocket = io(apiUrl, {
          auth: {
            userId: user.id,
            username: user.username,
            role: user.role
          },
          withCredentials: true, // Important for cookies
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true
        });

        newSocket.on('connect', () => {
          console.log('WebSocket connected');
          setConnected(true);
          setConnectionError(null);
          reconnectAttempts.current = 0;
          reconnectDelay.current = 1000;
        });

        newSocket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          setConnected(false);
          
          // Only show error for unexpected disconnects
          if (reason !== 'io client disconnect') {
            setConnectionError('Connection lost. Attempting to reconnect...');
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          setConnected(false);
          setConnectionError(`Connection error: ${error.message}`);
          
          // Implement exponential backoff for reconnection
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(() => {
              console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
              newSocket?.connect();
            }, reconnectDelay.current);
            
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000); // Max 30 seconds
          } else {
            setConnectionError('Failed to connect after multiple attempts. Please refresh the page.');
          }
        });

        newSocket.on('error', (error) => {
          console.error('WebSocket error:', error);
          setConnectionError(`Socket error: ${error.message || 'Unknown error'}`);
        });

        setSocket(newSocket);

      } catch (error) {
        console.error('Failed to create socket:', error);
        setConnectionError('Failed to initialize connection');
      }
    };

    connectSocket();

    return () => {
      if (newSocket) {
        console.log('WebSocket: Disconnecting socket');
        newSocket.disconnect();
        setSocket(null);
        setConnected(false);
        setConnectionError(null);
      }
    };
  }, [user, isAuthenticated]);

  // Method to manually reconnect
  const reconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    reconnectAttempts.current = 0;
    reconnectDelay.current = 1000;
    setConnectionError(null);
  };

  // Method to subscribe to events
  const subscribe = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {}; // Return empty cleanup function if no socket
  };

  // Method to emit events
  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const value = {
    socket,
    connected,
    connectionError,
    reconnect,
    subscribe,
    emit
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
