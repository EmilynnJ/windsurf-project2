import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Modal, LoadingPage, EmptyState } from './ui';
import type { Reading } from '../types';

interface TranscriptMessage {
  senderId: number;
  content: string;
  timestamp: number;
}

interface ChatTranscriptModalProps {
  readingId: number | null;
  viewerUserId: number;
  readerName?: string;
  clientName?: string;
  onClose: () => void;
}

/**
 * Modal that loads and renders the chat transcript for a completed chat reading.
 * Participants (client + reader) and admins can view.
 */
export function ChatTranscriptModal({
  readingId,
  viewerUserId,
  readerName,
  clientName,
  onClose,
}: ChatTranscriptModalProps) {
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (readingId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReading(null);

    (async () => {
      try {
        const data = await apiService.get<Reading>(`/api/readings/${readingId}`);
        if (!cancelled) setReading(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transcript');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readingId]);

  const messages = ((reading?.chatTranscript as TranscriptMessage[] | undefined) ?? []).filter(
    (m): m is TranscriptMessage =>
      !!m && typeof m.senderId === 'number' && typeof m.content === 'string',
  );

  return (
    <Modal open={readingId != null} onClose={onClose} title="Reading Transcript">
      {loading && <LoadingPage message="Loading transcript..." />}
      {!loading && error && (
        <EmptyState icon="⚠️" title="Could not load transcript" description={error} />
      )}
      {!loading && !error && reading && reading.readingType !== 'chat' && (
        <EmptyState
          icon="🎙️"
          title="No transcript available"
          description="Transcripts are only recorded for chat readings."
        />
      )}
      {!loading && !error && reading && reading.readingType === 'chat' && messages.length === 0 && (
        <EmptyState
          icon="💬"
          title="No messages"
          description="This chat session ended without any messages."
        />
      )}
      {!loading && !error && reading && reading.readingType === 'chat' && messages.length > 0 && (
        <div
          className="transcript"
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            padding: 'var(--space-2)',
          }}
        >
          {messages.map((m, i) => {
            const mine = m.senderId === viewerUserId;
            const name = m.senderId === reading.readerId
              ? readerName ?? 'Reader'
              : m.senderId === reading.clientId
                ? clientName ?? 'Client'
                : 'Participant';
            return (
              <div
                key={`${m.timestamp}-${i}`}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: mine ? 'var(--color-pink-soft)' : 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-2) var(--space-3)',
                }}
              >
                <div className="caption" style={{ opacity: 0.7, marginBottom: 2 }}>
                  <strong>{name}</strong>{' '}
                  <span>
                    {new Date(m.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="body-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
