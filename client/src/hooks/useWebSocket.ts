import { useContext, useEffect } from 'react';
import { WebSocketContext, type WebSocketContextValue } from '../contexts/WebSocketContext';

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return ctx;
}

/**
 * Subscribe to a specific server-pushed event (e.g. `reading:accepted`,
 * `reading:insufficient_balance`). The handler is re-registered whenever it
 * changes, so callers should wrap stateful closures in `useCallback`.
 */
export function useWebSocketEvent<T = unknown>(
  type: string,
  handler: (payload: T) => void,
): void {
  const { subscribe } = useWebSocket();
  useEffect(() => {
    const unsubscribe = subscribe(type, (payload) => handler(payload as T));
    return unsubscribe;
  }, [type, handler, subscribe]);
}
