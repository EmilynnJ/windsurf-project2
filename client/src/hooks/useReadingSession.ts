// ============================================================
// useReadingSession — manage active reading session state
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { readingsApi } from '../services/api';
import type { Reading, ChatMessage } from '../types';

interface ReadingSessionState {
  /** The reading object from DB */
  reading: Reading | null;
  /** Elapsed seconds since session started */
  elapsedSeconds: number;
  /** Running cost in cents */
  runningCost: number;
  /** Whether session is actively running */
  isActive: boolean;
  /** Chat messages for chat readings */
  chatMessages: ChatMessage[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Remaining balance in cents */
  remainingBalance: number;
  /** Minutes remaining before balance runs out */
  minutesRemaining: number;
  /** Whether low balance warning should show (< 2 min remaining) */
  showLowBalanceWarning: boolean;
}

interface UseReadingSessionReturn extends ReadingSessionState {
  /** Start the reading session */
  startSession: () => Promise<void>;
  /** End the reading session */
  endSession: () => Promise<void>;
  /** Send a chat message */
  sendMessage: (content: string) => Promise<void>;
  /** Fetch latest reading data */
  refresh: () => Promise<void>;
}

export function useReadingSession(
  readingId: number,
  userBalance: number
): UseReadingSessionReturn {
  const [reading, setReading] = useState<Reading | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const isActive = reading?.status === 'in_progress';
  const pricePerMinute = reading?.pricePerMinute ?? 0;
  const runningCost = Math.ceil(elapsedSeconds / 60) * pricePerMinute;
  const remainingBalance = userBalance - runningCost;
  const minutesRemaining = pricePerMinute > 0 ? Math.floor(remainingBalance / pricePerMinute) : Infinity;
  const showLowBalanceWarning = isActive && minutesRemaining < 2 && minutesRemaining >= 0;

  // Fetch reading data
  const fetchReading = useCallback(async () => {
    try {
      const data = await readingsApi.getById(readingId);
      setReading(data);
      if (data.chatTranscript) {
        setChatMessages(data.chatTranscript);
      }
      if (data.startedAt && data.status === 'in_progress') {
        startTimeRef.current = new Date(data.startedAt);
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reading';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [readingId]);

  // Initial fetch
  useEffect(() => {
    fetchReading();
  }, [fetchReading]);

  // Timer for active sessions
  useEffect(() => {
    if (isActive && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const diff = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
          setElapsedSeconds(diff);
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Auto-end session if balance depleted
  useEffect(() => {
    if (isActive && remainingBalance <= 0 && pricePerMinute > 0) {
      endSession();
    }
  }, [remainingBalance, isActive, pricePerMinute]);

  const startSession = useCallback(async () => {
    try {
      setError(null);
      const updated = await readingsApi.start(readingId);
      setReading(updated);
      if (updated.startedAt) {
        startTimeRef.current = new Date(updated.startedAt);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      throw err;
    }
  }, [readingId]);

  const endSession = useCallback(async () => {
    try {
      setError(null);
      if (timerRef.current) clearInterval(timerRef.current);
      const updated = await readingsApi.end(readingId);
      setReading(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      setError(message);
      throw err;
    }
  }, [readingId]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        await readingsApi.sendMessage(readingId, content);
        // Optimistically add message
        const newMsg: ChatMessage = {
          senderId: 0, // Will be updated on next fetch
          senderName: 'You',
          message: content,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, newMsg]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        throw err;
      }
    },
    [readingId]
  );

  return {
    reading,
    elapsedSeconds,
    runningCost,
    isActive,
    chatMessages,
    isLoading,
    error,
    remainingBalance,
    minutesRemaining,
    showLowBalanceWarning,
    startSession,
    endSession,
    sendMessage,
    refresh: fetchReading,
  };
}
