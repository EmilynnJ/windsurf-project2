import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Run `fetcher` on an interval whenever the WebSocket is NOT connected,
 * so the UI stays fresh on Vercel-only deployments where the WS server
 * isn't reachable. Stops the timer the moment the WS comes back so we
 * don't double-fetch.
 *
 * Always fires once on mount/enable so the initial render has data even
 * if the WS connects a beat later.
 */
export function useWsPollingFallback(
  fetcher: () => void | Promise<void>,
  enabled: boolean,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void {
  const { connected } = useWebSocket();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled || connected) return;

    let cancelled = false;
    const fire = () => {
      if (cancelled) return;
      Promise.resolve(fetcherRef.current()).catch(() => {
        // swallow — caller surfaces errors via toasts in the fetcher
      });
    };

    fire();
    const id = setInterval(fire, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, connected, intervalMs]);
}
