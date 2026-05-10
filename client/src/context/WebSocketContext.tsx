import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

type WebSocketMessage = {
  type: string;
  data: any;
};

type Callback = (data: any) => void;

interface WebSocketContextType {
  subscribe: (type: string, callback: Callback) => void;
  unsubscribe: (type: string, callback: Callback) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<Callback>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 5;
  const baseDelay = 1000; // 1 second

  const getWebSocketUrl = useCallback(async (): Promise<string> => {
    const token = await getAccessTokenSilently();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Convert http/https to ws/wss
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${wsHost}/ws?token=${token}`;
  }, [getAccessTokenSilently]);

  const subscribe = useCallback((type: string, callback: Callback) => {
    if (!subscribersRef.current.has(type)) {
      subscribersRef.current.set(type, new Set());
    }
    subscribersRef.current.get(type)!.add(callback);
  }, []);

  const unsubscribe = useCallback((type: string, callback: Callback) => {
    const callbacks = subscribersRef.current.get(type);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscribersRef.current.delete(type);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isAuthenticated || reconnectAttemptsRef.current >= maxRetries) {
      return;
    }

    try {
      const wsUrl = await getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const { type, data } = message;

          // Notify subscribers for this message type
          const callbacks = subscribersRef.current.get(type);
          if (callbacks) {
            callbacks.forEach((callback) => {
              try {
                callback(data);
              } catch (err) {
                console.error(`Error in subscriber callback for type ${type}:`, err);
              }
            });
          }

          // Handle specific message types
          if (type === 'reading:insufficient_balance') {
            // This will be handled by the reading session page subscriber
          } else if (type === 'reader:new_request') {
            // This will be handled by the reader dashboard subscriber
          } else if (type === 'reading:accepted') {
            // This will be handled by the client subscriber to navigate to reading
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Attempting WebSocket reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxRetries})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      
      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [isAuthenticated, getWebSocketUrl]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
