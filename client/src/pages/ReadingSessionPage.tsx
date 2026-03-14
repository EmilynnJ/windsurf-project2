// ============================================================
// ReadingSessionPage — Live reading with timer, cost, chat/voice/video
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useReadingSession } from '../hooks/useReadingSession';
import { useToast } from '../components/ToastProvider';
import { readingsApi } from '../services/api';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ReadingSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const readingId = parseInt(id || '0');
  const session = useReadingSession(readingId, user?.accountBalance ?? 0);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio/video state (for Agora integration)
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [agoraToken, setAgoraToken] = useState<string | null>(null);

  // Fetch Agora token for voice/video
  useEffect(() => {
    if (session.reading && (session.reading.type === 'voice' || session.reading.type === 'video')) {
      readingsApi.getAgoraToken(readingId)
        .then((result) => setAgoraToken(result.token))
        .catch(() => addToast('warning', 'Failed to connect to voice/video service'));
    }
  }, [session.reading, readingId, addToast]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.chatMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    try {
      await session.sendMessage(messageInput.trim());
      setMessageInput('');
    } catch {
      addToast('error', 'Failed to send message');
    }
  }, [messageInput, session, addToast]);

  const handleEndSession = useCallback(async () => {
    try {
      await session.endSession();
      addToast('success', 'Reading session ended');
      setShowEndConfirm(false);
    } catch {
      addToast('error', 'Failed to end session');
    }
  }, [session, addToast]);

  if (session.isLoading) {
    return (
      <div className="loading-container page-content">
        <div className="spinner" />
        <p>Connecting to your reading...</p>
      </div>
    );
  }

  if (session.error || !session.reading) {
    return (
      <div className="page-content page-enter">
        <div className="container empty-state">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>Session Not Found</h3>
          <p style={{ marginTop: '8px' }}>{session.error || 'This reading session does not exist.'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const reading = session.reading;
  const isCompleted = reading.status === 'completed' || reading.status === 'cancelled';
  const isPending = reading.status === 'pending' || reading.status === 'accepted';

  return (
    <div className="page-content page-enter">
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Session Header / Status Bar */}
        <div
          className="card-static"
          style={{
            marginTop: '24px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            border: session.showLowBalanceWarning
              ? '1px solid rgba(239, 68, 68, 0.5)'
              : '1px solid var(--border-gold)',
            background: session.showLowBalanceWarning
              ? 'rgba(239, 68, 68, 0.05)'
              : 'var(--surface-card)',
          }}
        >
          {/* Left: Timer & Cost */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', marginBottom: '2px' }}>
                Elapsed
              </p>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-light)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTime(session.elapsedSeconds)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', marginBottom: '2px' }}>
                Running Cost
              </p>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--accent-gold)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCents(session.runningCost)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', marginBottom: '2px' }}>
                Balance Left
              </p>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  color: session.remainingBalance < 0 ? '#FCA5A5' : '#86EFAC',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCents(Math.max(0, session.remainingBalance))}
              </p>
            </div>
          </div>

          {/* Right: Status & End button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              className={`badge ${reading.status === 'in_progress' ? 'badge-online' : 'badge-gold'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {reading.status.replace('_', ' ')}
            </span>
            {session.isActive && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="btn btn-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#FCA5A5',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                End Session
              </button>
            )}
          </div>
        </div>

        {/* Low Balance Warning */}
        {session.showLowBalanceWarning && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#FCA5A5',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            ⚠ Low Balance — Less than {session.minutesRemaining} minute{session.minutesRemaining !== 1 ? 's' : ''} remaining!
          </div>
        )}

        {/* Session Content Area */}
        <div style={{ marginTop: '16px', marginBottom: '40px' }}>
          {/* Pending state — waiting for reader to accept */}
          {isPending && (
            <div
              className="card-static"
              style={{
                padding: '60px 24px',
                textAlign: 'center',
              }}
            >
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Waiting for Reader</h3>
              <p style={{ color: 'var(--text-light-muted)' }}>
                Your reading request has been sent. The reader will accept shortly...
              </p>
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
                {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)} Reading •{' '}
                {formatCents(reading.pricePerMinute)}/min
              </p>
            </div>
          )}

          {/* Completed state */}
          {isCompleted && (
            <div className="card-static" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                {reading.status === 'completed' ? 'Reading Complete' : 'Reading Cancelled'}
              </h3>
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)' }}>Duration</p>
                  <p style={{ fontWeight: 600 }}>{reading.billedMinutes} minutes</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)' }}>Total</p>
                  <p className="price price-lg">{formatCents(reading.totalPrice)}</p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                Back to Dashboard
              </button>
            </div>
          )}

          {/* Chat Reading UI */}
          {session.isActive && reading.type === 'chat' && (
            <ChatInterface
              messages={session.chatMessages}
              userId={user?.id ?? 0}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onSend={handleSendMessage}
              chatEndRef={chatEndRef}
            />
          )}

          {/* Voice Reading UI */}
          {session.isActive && reading.type === 'voice' && (
            <VoiceInterface
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onEnd={() => setShowEndConfirm(true)}
              agoraConnected={!!agoraToken}
            />
          )}

          {/* Video Reading UI */}
          {session.isActive && reading.type === 'video' && (
            <VideoInterface
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              onToggleMute={() => setIsMuted(!isMuted)}
              onToggleCamera={() => setIsCameraOff(!isCameraOff)}
              onEnd={() => setShowEndConfirm(true)}
              agoraConnected={!!agoraToken}
            />
          )}
        </div>

        {/* End Session Confirmation Modal */}
        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-pink)', fontSize: '1.5rem', marginBottom: '12px' }}>
                End Reading?
              </h3>
              <p style={{ marginBottom: '8px' }}>
                This will end your current reading session.
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light-muted)', marginBottom: '20px' }}>
                Duration: {formatTime(session.elapsedSeconds)} • Cost: {formatCents(session.runningCost)}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowEndConfirm(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={handleEndSession}
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Chat Interface
// ============================================================

function ChatInterface({
  messages,
  userId,
  messageInput,
  setMessageInput,
  onSend,
  chatEndRef,
}: {
  messages: { senderId: number; senderName: string; message: string; timestamp: string }[];
  userId: number;
  messageInput: string;
  setMessageInput: (val: string) => void;
  onSend: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      className="card-static"
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 340px)',
        minHeight: '400px',
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-light-muted)', padding: '40px 0' }}>
            Start the conversation...
          </p>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === userId || msg.senderName === 'You';
          return (
            <div
              key={idx}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
              }}
            >
              <div
                style={{
                  background: isMine
                    ? 'linear-gradient(135deg, var(--primary-pink), var(--primary-pink-dark))'
                    : 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 14px',
                  color: isMine ? '#fff' : 'var(--text-light)',
                }}
              >
                {!isMine && (
                  <p
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--accent-gold)',
                      marginBottom: '2px',
                    }}
                  >
                    {msg.senderName}
                  </p>
                )}
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{msg.message}</p>
              </div>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-light-muted)',
                  marginTop: '2px',
                  textAlign: isMine ? 'right' : 'left',
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Message input */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          onClick={onSend}
          className="btn btn-primary btn-sm"
          disabled={!messageInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Voice Interface
// ============================================================

function VoiceInterface({
  isMuted,
  onToggleMute,
  onEnd,
  agoraConnected,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
  agoraConnected: boolean;
}) {
  return (
    <div
      className="card-static"
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      {/* Audio visualization placeholder */}
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,105,180,0.2), rgba(212,175,55,0.2))',
          border: '2px solid var(--border-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          animation: isMuted ? 'none' : 'pulse-dot 2s ease-in-out infinite',
        }}
      >
        🎤
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className={`badge ${agoraConnected ? 'badge-online' : 'badge-offline'}`}>
          {agoraConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      <p style={{ color: 'var(--text-light-secondary)', fontSize: '0.9rem' }}>
        Voice reading in progress
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onToggleMute}
          className={`btn btn-sm ${isMuted ? 'btn-secondary' : 'btn-primary'}`}
        >
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
        <button
          onClick={onEnd}
          className="btn btn-sm"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#FCA5A5',
            border: '1px solid rgba(239,68,68,0.4)',
          }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Video Interface
// ============================================================

function VideoInterface({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEnd,
  agoraConnected,
}: {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
  agoraConnected: boolean;
}) {
  return (
    <div className="card-static" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Video area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          background: 'var(--border-subtle)',
          minHeight: '400px',
        }}
      >
        {/* Remote video */}
        <div
          id="remote-video"
          style={{
            background: 'var(--bg-deep-black)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👤</p>
            <p style={{ fontSize: '0.85rem' }}>
              {agoraConnected ? 'Remote participant' : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Local video */}
        <div
          id="local-video"
          style={{
            background: 'var(--surface-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
              {isCameraOff ? '📷' : '🎥'}
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              {isCameraOff ? 'Camera off' : 'Your camera'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onToggleMute}
          className={`btn btn-sm ${isMuted ? 'btn-secondary' : 'btn-primary'}`}
        >
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
        <button
          onClick={onToggleCamera}
          className={`btn btn-sm ${isCameraOff ? 'btn-secondary' : 'btn-primary'}`}
        >
          {isCameraOff ? '📷 Camera On' : '📹 Camera Off'}
        </button>
        <button
          onClick={onEnd}
          className="btn btn-sm"
          style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#FCA5A5',
            border: '1px solid rgba(239,68,68,0.4)',
          }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}
