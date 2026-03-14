// ============================================================
// useReaders — fetch readers with optional polling
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { readersApi } from '../services/api';
import type { ReaderPublic } from '../types';

interface UseReadersOptions {
  /** Only fetch online readers */
  onlineOnly?: boolean;
  /** Poll interval in ms (default: 30000). Set 0 to disable. */
  pollInterval?: number;
  /** Search query */
  query?: string;
  /** Specialty filter */
  specialty?: string;
  /** Max results */
  limit?: number;
}

interface UseReadersReturn {
  readers: ReaderPublic[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReaders(options: UseReadersOptions = {}): UseReadersReturn {
  const {
    onlineOnly = false,
    pollInterval = 30000,
    query,
    specialty,
    limit = 50,
  } = options;

  const [readers, setReaders] = useState<ReaderPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchReaders = useCallback(async () => {
    try {
      const result = await readersApi.getReaders({
        isOnline: onlineOnly || undefined,
        q: query || undefined,
        specialties: specialty || undefined,
        limit,
      });

      if (!mountedRef.current) return;

      // Sort online readers first
      const sorted = [...result.readers].sort((a, b) => {
        if (a.isOnline === b.isOnline) return 0;
        return a.isOnline ? -1 : 1;
      });

      setReaders(sorted);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load readers';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onlineOnly, query, specialty, limit]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    fetchReaders();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchReaders]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(fetchReaders, pollInterval);
    return () => clearInterval(interval);
  }, [fetchReaders, pollInterval]);

  return { readers, isLoading, error, refetch: fetchReaders };
}
