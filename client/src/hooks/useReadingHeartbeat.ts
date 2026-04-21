import { useEffect, useRef } from 'react';
import { apiService } from '../services/api';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * While a reading session is active, ping `POST /api/readings/:id/heartbeat`
 * every 30 seconds so the server's grace-period sweeper knows we're still
 * here. Stops automatically when `active` becomes false or `readingId`
 * changes/unmounts.
 */
export function useReadingHeartbeat(readingId: number | null, active: boolean): void {
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!readingId || !active) return;
    stoppedRef.current = false;

    const send = async () => {
      if (stoppedRef.current) return;
      try {
        await apiService.post(`/api/readings/${readingId}/heartbeat`);
      } catch (err) {
        // Non-fatal — the grace-period sweeper will handle prolonged silence.
        if (import.meta.env.DEV) {
          console.warn('[heartbeat] failed:', err);
        }
      }
    };

    // Fire once immediately so the server knows we've arrived, then tick.
    void send();
    const interval = setInterval(() => void send(), HEARTBEAT_INTERVAL_MS);

    return () => {
      stoppedRef.current = true;
      clearInterval(interval);
    };
  }, [readingId, active]);
}
