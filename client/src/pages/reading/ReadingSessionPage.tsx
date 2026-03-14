import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import AgoraRTC, {
  type IAgoraRTCClient,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
  Button, Avatar, Badge, ConfirmDialog,
  LoadingPage, EmptyState,
} from '../../components/ui';

/* ─── Types ───────────────────────────────────────────────────── */

interface ReadingSession {
  id: number;
  readerId: number;
  clientId: number;
  type: 'chat' | 'voice' | 'video';
  status: string;
  ratePerMinute: number;
  readerName?: string;
  clientName?: string;
  agoraToken?: string;
  agoraChannel?: string;
}

interface ChatMessage {
  id?: number;
  senderId: number;
  content: string;
  createdAt: string;
}

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

/* ─── Timer Hook ──────────────────────────────────────────────── */

function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return { seconds, minutes, display };
}

/* ─── Chat Panel ──────────────────────────────────────────────── */

function ChatPanel({
  messages,
  onSend,
  userId,
}: {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  userId: number;
}) {
  const [msg, setMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSend(msg.trim());
    setMsg('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__messages">
        {messages.length === 0 && (
          <p className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
            ✨ Your reading session has begun. Say hello!
          </p>
        )}
        {messages.map((m, i) => {
          const isMe = m.senderId === userId;
          return (
            <div key={m.id || i} className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--them'}`}>
              <p>{m.content}</p>
              <span className="chat-bubble__time">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="chat-panel__input">
        <input
          type="text"
          className="form-input"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your message..."
          autoFocus
        />
        <Button type="submit" variant="primary" disabled={!msg.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */

export function ReadingSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Agora
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const [localAudio, setLocalAudio] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideo, setLocalVideo] = useState<ICameraVideoTrack | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [connected, setConnected] = useState(false);

  const isActive = session?.status === 'in_progress';
  const timer = useTimer(isActive && connected);
  const currentCost = useMemo(
    () => (timer.minutes + (timer.seconds % 60 > 0 ? 1 : 0)) * (session?.ratePerMinute ?? 0),
    [timer.minutes, timer.seconds, session?.ratePerMinute]
  );

  // Fetch session data
  useEffect(() => {
    if (!id) return;
    apiService
      .get(`/api/readings/${id}`)
      .then((data) => {
        setSession(data as ReadingSession);
        // Load existing messages for chat sessions
        return apiService.get(`/api/readings/${id}/messages`).catch(() => []);
      })
      .then((msgs) => setMessages(msgs as ChatMessage[]))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Initialize Agora for voice/video
  useEffect(() => {
    if (!session || session.type === 'chat' || !session.agoraToken || !session.agoraChannel) return;
    if (!user) return;

    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = agoraClient;

    const init = async () => {
      try {
        await agoraClient.join(
          import.meta.env.VITE_AGORA_APP_ID || '4a2f5242853447a09e1435f41fedbaf0',
          session.agoraChannel!,
          session.agoraToken!,
          user.id
        );

        // Create local tracks
        if (session.type === 'video') {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          setLocalAudio(audioTrack);
          setLocalVideo(videoTrack);
          await agoraClient.publish([audioTrack, videoTrack]);
          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current);
          }
        } else {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          setLocalAudio(audioTrack);
          await agoraClient.publish([audioTrack]);
        }

        setConnected(true);

        // Handle remote user
        agoraClient.on('user-published', async (remoteUser, mediaType) => {
          await agoraClient.subscribe(remoteUser, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            remoteUser.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }
        });

        agoraClient.on('user-left', () => {
          addToast('info', 'The other participant has left the session.');
        });
      } catch (err) {
        console.error('Agora join error:', err);
        addToast('error', 'Failed to connect to the session');
      }
    };

    init();

    return () => {
      localAudio?.close();
      localVideo?.close();
      agoraClient.leave();
    };
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new messages in chat mode
  useEffect(() => {
    if (!session || session.type !== 'chat' || !isActive) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await apiService.get(`/api/readings/${session.id}/messages`);
        setMessages(msgs as ChatMessage[]);
      } catch {
        // silently handle
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.id, session?.type, isActive]);

  const handleSendMessage = async (content: string) => {
    if (!session || !user) return;
    // Optimistic update
    const optimistic: ChatMessage = {
      senderId: user.id,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await apiService.post(`/api/readings/${session.id}/messages`, { content });
    } catch {
      addToast('error', 'Failed to send message');
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await apiService.post(`/api/readings/${session.id}/end`, {});
      addToast('success', 'Reading session ended');
      // Cleanup Agora
      localAudio?.close();
      localVideo?.close();
      clientRef.current?.leave();
      navigate('/dashboard');
    } catch {
      addToast('error', 'Failed to end session');
    } finally {
      setEnding(false);
      setConfirmEnd(false);
    }
  };

  const toggleMute = () => {
    if (localAudio) {
      localAudio.setMuted(!muted);
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    if (localVideo) {
      localVideo.setEnabled(videoOff);
      setVideoOff(!videoOff);
    }
  };

  /* ─── Render ────────────────────────────────────────────── */

  if (loading) return <LoadingPage message="Connecting to your reading..." />;

  if (!session) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <EmptyState
            icon="🔮"
            title="Session Not Found"
            description="This reading session doesn't exist or has ended."
            action={{ label: 'Go to Dashboard', onClick: () => navigate('/dashboard') }}
          />
        </div>
      </div>
    );
  }

  const isReader = user?.id === session.readerId;
  const otherName = isReader ? session.clientName : session.readerName;

  return (
    <div className="page-wrapper page-enter" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ─── Session Header ───────────────────────────────── */}
      <div className="session-header">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={otherName} size="sm" />
            <div>
              <strong>{otherName || 'Reading Session'}</strong>
              <div className="flex items-center gap-2">
                <Badge variant={isActive ? 'online' : 'gold'}>
                  {session.type === 'chat' ? '💬' : session.type === 'voice' ? '🎤' : '📹'} {session.type}
                </Badge>
                <Badge variant="info">{session.status}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="session-timer">
              <span className="session-timer__time">{timer.display}</span>
              <span className="session-timer__cost">{centsToPrice(currentCost)}</span>
            </div>

            {/* Rate */}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {centsToPrice(session.ratePerMinute)}/min
            </span>

            {/* End button */}
            {isActive && (
              <Button variant="danger" size="sm" onClick={() => setConfirmEnd(true)}>
                End Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Session Body ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {session.type === 'chat' ? (
          <div className="container" style={{ height: '100%' }}>
            <ChatPanel
              messages={messages}
              onSend={handleSendMessage}
              userId={user?.id ?? 0}
            />
          </div>
        ) : (
          <div className="session-av">
            {/* Remote video (large) */}
            <div className="session-av__remote" ref={remoteVideoRef}>
              {!connected && (
                <div className="loading-center">
                  <div className="spinner" />
                  <p>Connecting...</p>
                </div>
              )}
            </div>

            {/* Local video (small PIP) */}
            {session.type === 'video' && (
              <div className="session-av__local" ref={localVideoRef} />
            )}

            {/* Controls */}
            <div className="session-av__controls">
              <button
                className={`session-av__btn ${muted ? 'session-av__btn--active' : ''}`}
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? '🔇' : '🎤'}
              </button>
              {session.type === 'video' && (
                <button
                  className={`session-av__btn ${videoOff ? 'session-av__btn--active' : ''}`}
                  onClick={toggleVideo}
                  aria-label={videoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {videoOff ? '📷' : '📹'}
                </button>
              )}
              <button
                className="session-av__btn session-av__btn--end"
                onClick={() => setConfirmEnd(true)}
                aria-label="End session"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Confirm End Dialog ───────────────────────────── */}
      <ConfirmDialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={handleEndSession}
        title="End Reading Session"
        message={`End this ${session.type} reading? Duration: ${timer.display}, Cost: ${centsToPrice(currentCost)}`}
        confirmLabel="End Session"
        variant="danger"
        loading={ending}
      />
    </div>
  );
}
