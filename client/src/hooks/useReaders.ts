import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import type { ReaderPublic } from '../types';

interface UseReadersOptions {
  onlineOnly?: boolean;
  pollInterval?: number; // ms
}

export function useReaders(options: UseReadersOptions = {}) {
  const { onlineOnly = false, pollInterval = 0 } = options;
  const [readers, setReaders] = useState<ReaderPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchReaders = useCallback(async () => {
    try {
      const query = onlineOnly ? '?online=true' : '';
      const data = await apiService.get(`/api/readers${query}`);
      if (mountedRef.current) {
        setReaders(data as ReaderPublic[]);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load readers');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onlineOnly]);

  useEffect(() => {
    mountedRef.current = true;
    fetchReaders();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (pollInterval > 0) {
      interval = setInterval(fetchReaders, pollInterval);
    }

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchReaders, pollInterval]);

  return { readers, isLoading, error, refresh: fetchReaders };
}
