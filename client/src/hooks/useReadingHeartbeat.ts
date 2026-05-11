import { useEffect, useRef } from 'react';
import { apiService } from '../services/api';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * While a reading session is active, ping `POST /api/readings/:id/heartbeat`
 * every 30 seconds so the server's grace-period sweeper knows we're still
 * here. Stops automatically when `active` becomes false or `readingId`
 * changes/unmounts.
 *
 * Always logs failures to the console (production included) so a
 * misconfigured backend can't silently let the 120-second sweeper kill
 * sessions with no signal.
 */
export function useReadingHeartbeat(readingId: number | null, active: boolean): void {
  const stoppedRef = useRef(false);
  const failuresRef = useRef(0);

  useEffect(() => {
    if (!readingId || !active) return;
    stoppedRef.current = false;
    failuresRef.current = 0;

    const send = async () => {
      if (stoppedRef.current) return;
      try {
        await apiService.post(`/api/readings/${readingId}/heartbeat`);
        if (failuresRef.current > 0) {
          console.info(
            `[heartbeat] reading ${readingId}: recovered after ${failuresRef.current} failure(s)`,
          );
        }
        failuresRef.current = 0;
      } catch (err) {
        failuresRef.current += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[heartbeat] reading ${readingId} failed (#${failuresRef.current}): ${message}`,
        );
      }
    };

    void send();
    const interval = setInterval(() => void send(), HEARTBEAT_INTERVAL_MS);

    return () => {
      stoppedRef.current = true;
      clearInterval(interval);
    };
  }, [readingId, active]);
}
