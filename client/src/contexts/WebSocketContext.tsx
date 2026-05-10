import {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';

/**
 * Real-time push channel. The server uses this to deliver events like
 * `reading:accepted`, `reading:insufficient_balance`, `reading:partner_disconnected`,
 * `reading:ended`, `reading:request`, etc.
 *
 * All components subscribe via `useWebSocketEvent(type, handler)`.
 */

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

type Listener = (payload: unknown) => void;

export interface WebSocketContextValue {
  connected: boolean;
  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  subscribe: (type: string, listener: Listener) => () => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const APP_PING_INTERVAL_MS = 25_000;

function resolveWsUrl(): string | null {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');

  const api = import.meta.env.VITE_API_URL as string | undefined;
  if (api) {
    try {
      const u = new URL(api);
      const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}`;
  }
  return null;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently } = useAuth0();
  const { isAuthenticated, user } = useAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Map<string, Set<Listener>>());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldConnectRef = useRef(false);

  const [connected, setConnected] = useState(false);

  const subscribe = useCallback<WebSocketContextValue['subscribe']>(
    (type, listener) => {
      let set = listenersRef.current.get(type);
      if (!set) {
        set = new Set();
        listenersRef.current.set(type, set);
      }
      set.add(listener);
      return () => {
        const s = listenersRef.current.get(type);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) listenersRef.current.delete(type);
      };
    },
    [],
  );

  const dispatch = useCallback((type: string, payload: unknown) => {
    const set = listenersRef.current.get(type);
    if (!set) return;
    for (const l of set) {
      try {
        l(payload);
      } catch (err) {
        console.error(`[ws] listener error for "${type}":`, err);
      }
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!shouldConnectRef.current) return;
    const base = resolveWsUrl();
    if (!base) {
      console.warn(
        '[ws] no WebSocket URL resolved — set VITE_WS_URL to your Fly.io (or other long-running) server, e.g. wss://<app>.fly.dev',
      );
      return;
    }

    let token: string;
    try {
      token = await getAccessTokenSilently();
    } catch (err) {
      console.warn('[ws] could not get access token; will retry later', err);
      scheduleReconnect();
      return;
    }

    const url = `${base}/ws`;
    console.info(`[ws] connecting to ${url}`);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url, ['access_token', token]);
    } catch (err) {
      console.warn(`[ws] failed to construct WebSocket for ${url}`, err);
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      reconnectAttemptsRef.current = 0;
      setConnected(true);
      console.info(`[ws] connected to ${url}`);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', payload: {} }));
        }
      }, APP_PING_INTERVAL_MS);
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WebSocketMessage;
        if (!msg?.type) return;
        if (msg.type === 'pong') return;
        dispatch(msg.type, msg.payload);
      } catch (err) {
        console.debug('[ws] failed to parse message', err);
      }
    });

    const handleClose = (event: CloseEvent) => {
      setConnected(false);
      console.warn(
        `[ws] closed (code=${event.code}, reason=${event.reason || 'n/a'}); will reconnect`,
      );
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      wsRef.current = null;
      if (shouldConnectRef.current) scheduleReconnect();
    };
    ws.addEventListener('close', handleClose);
    ws.addEventListener('error', (ev) => {
      console.warn('[ws] error event', ev);
      try {
        ws.close();
      } catch (err) {
        console.debug('[ws] error during close on error', err);
      }
    });
  }, [getAccessTokenSilently, dispatch]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    if (reconnectTimerRef.current) return;
    const attempt = Math.min(reconnectAttemptsRef.current, 6);
    const delay = Math.min(
      RECONNECT_INITIAL_MS * Math.pow(2, attempt),
      RECONNECT_MAX_MS,
    );
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      void connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    if (isAuthenticated && user) {
      shouldConnectRef.current = true;
      void connect();
    } else {
      shouldConnectRef.current = false;
      clearTimers();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (err) {
          console.debug('[ws] error during unmount close', err);
        }
        wsRef.current = null;
      }
      setConnected(false);
    }

    return () => {
      shouldConnectRef.current = false;
      clearTimers();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (err) {
          console.debug('[ws] error during unmount close', err);
        }
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user, connect, clearTimers]);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
