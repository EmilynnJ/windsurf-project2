// ============================================================
// useApi — Generic API call hook with loading/error states
// ============================================================

import { useState, useCallback } from 'react';

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for making API calls with loading/error state management.
 *
 * @example
 * const { data, isLoading, execute } = useApi(readersApi.getReaders);
 * useEffect(() => { execute({ limit: 10 }); }, []);
 */
export function useApi<T>(
  apiFunction: (...args: never[]) => Promise<T>
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await (apiFunction as (...a: unknown[]) => Promise<T>)(...args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return { data, isLoading, error, execute, reset };
}
