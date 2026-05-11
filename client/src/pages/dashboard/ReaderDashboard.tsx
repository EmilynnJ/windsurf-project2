import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { useWebSocketEvent } from '../../hooks/useWebSocket';
import { useWsPollingFallback } from '../../hooks/useWsPollingFallback';
import { apiService } from '../../services/api';
import { ChatTranscriptModal } from '../../components/ChatTranscriptModal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Stat,
  Table,
  Tabs,
  TabPanel,
  Textarea,
  StarRating,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import type { Reading, Review } from '../../types';

interface PendingRequest {
  id: number;
  clientId: number;
  readingType: 'chat' | 'voice' | 'video';
  ratePerMinute: number;
  status: string;
  createdAt: string;
  clientName: string | null;
  clientUsername: string | null;
  clientAvatar: string | null;
}

interface ReaderProfileFormState {
  fullName: string;
  username: string;
  bio: string;
  specialties: string;
}

const READER_TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'profile', label: 'Profile' },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildSessionColumns(
  onViewTranscript: (readingId: number) => void,
): Column<Reading & Record<string, unknown>>[] {
  return [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.createdAt as string),
    },
    {
      key: 'readingType',
      header: 'Type',
      render: (row) => {
        const labels: Record<string, string> = {
          chat: 'Chat',
          voice: 'Voice',
          video: 'Video',
        };
        return labels[row.readingType as string] || String(row.readingType);
      },
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (row) => (row.clientName as string) || `Client #${row.clientId}`,
    },
    {
      key: 'durationSeconds',
      header: 'Duration',
      render: (row) => formatDuration(row.durationSeconds as number),
    },
    {
      key: 'readerEarned',
      header: 'Earned',
      sortable: true,
      render: (row) => (
        <span className="price price--positive">
          +{centsToDisplay(row.readerEarned as number)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`badge badge--${row.status === 'completed' ? 'gold' : 'info'}`}>
          {(row.status as string).charAt(0).toUpperCase() + (row.status as string).slice(1)}
        </span>
      ),
    },
    {
      key: 'transcript',
      header: '',
      render: (row) => {
        if (row.readingType !== 'chat') return null;
        const id = row.id as number;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewTranscript(id);
            }}
          >
            View transcript
          </Button>
        );
      },
    },
  ];
}

function buildProfileForm(user: {
  fullName?: string;
  username?: string;
  bio?: string;
  specialties?: string;
} | null): ReaderProfileFormState {
  return {
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    specialties: user?.specialties || '',
  };
}

export function ReaderDashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<(typeof READER_TABS)[number]['id']>('overview');
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? false);
  const [toggling, setToggling] = useState(false);
  const [chatRate, setChatRate] = useState(String((user?.pricingChat ?? 0) / 100));
  const [voiceRate, setVoiceRate] = useState(String((user?.pricingVoice ?? 0) / 100));
  const [videoRate, setVideoRate] = useState(String((user?.pricingVideo ?? 0) / 100));
  const [savingRates, setSavingRates] = useState(false);
  const [profileForm, setProfileForm] = useState<ReaderProfileFormState>(() => buildProfileForm(user));
  const [savingProfile, setSavingProfile] = useState(false);

  const [sessions, setSessions] = useState<Reading[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actingOnId, setActingOnId] = useState<number | null>(null);
  const [transcriptReadingId, setTranscriptReadingId] = useState<number | null>(null);
  const sessionColumns = buildSessionColumns((id) => setTranscriptReadingId(id));

  useEffect(() => {
    setIsOnline(user?.isOnline ?? false);
    setChatRate(String((user?.pricingChat ?? 0) / 100));
    setVoiceRate(String((user?.pricingVoice ?? 0) / 100));
    setVideoRate(String((user?.pricingVideo ?? 0) / 100));
    setProfileForm(buildProfileForm(user));
  }, [user]);

  const loadPending = useCallback(async () => {
    try {
      const data = await apiService.get<PendingRequest[]>('/api/readings/reader/pending');
      setPendingRequests(data);
    } catch {
      // Best effort; this panel can recover on the next refresh.
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [sessionData, readerData] = await Promise.all([
          apiService.get<Reading[]>('/api/readings/reader'),
          apiService
            .get<{ reviews?: Review[] }>(`/api/readers/${user?.id}`)
            .catch(() => ({ reviews: [] })),
        ]);
        setSessions(sessionData);
        setReviews(readerData.reviews || []);
        await loadPending();
      } catch {
        addToast('error', 'Failed to load dashboard data');
      } finally {
        setLoadingData(false);
      }
    }

    if (user) {
      void load();
    }
  }, [user, addToast, loadPending]);

  useWebSocketEvent<{ readingId: number; clientName?: string }>(
    'reading:request',
    useCallback(
      (payload) => {
        addToast('info', `New reading request from ${payload.clientName ?? 'a client'}`);
        void loadPending();
      },
      [addToast, loadPending],
    ),
  );

  // Polling fallback: when the WS isn't connected (e.g. Vercel-only deploy),
  // poll the inbox every 30 s so new requests still appear without refresh.
  useWsPollingFallback(loadPending, !!user, 30_000);

  const handleAccept = useCallback(
    async (readingId: number) => {
      setActingOnId(readingId);
      try {
        await apiService.post(`/api/readings/${readingId}/accept`);
        setPendingRequests((prev) => prev.filter((request) => request.id !== readingId));
        navigate(`/reading/${readingId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept request';
        addToast('error', message);
      } finally {
        setActingOnId(null);
      }
    },
    [addToast, navigate],
  );

  const handleDecline = useCallback(
    async (readingId: number) => {
      setActingOnId(readingId);
      try {
        await apiService.post(`/api/readings/${readingId}/decline`);
        setPendingRequests((prev) => prev.filter((request) => request.id !== readingId));
        addToast('info', 'Request declined');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to decline request';
        addToast('error', message);
      } finally {
        setActingOnId(null);
      }
    },
    [addToast],
  );

  const handleToggle = useCallback(async () => {
    setToggling(true);
    try {
      const nextStatus = !isOnline;
      await apiService.patch('/api/readers/status', { isOnline: nextStatus });
      setIsOnline(nextStatus);
      addToast('success', nextStatus ? 'You are now online.' : 'You are now offline.');
      await refreshUser?.();
    } catch {
      addToast('error', 'Failed to update status');
    } finally {
      setToggling(false);
    }
  }, [isOnline, addToast, refreshUser]);

  const handleSaveRates = useCallback(async () => {
    setSavingRates(true);
    try {
      await apiService.patch('/api/readers/pricing', {
        pricingChat: Math.round((parseFloat(chatRate) || 0) * 100),
        pricingVoice: Math.round((parseFloat(voiceRate) || 0) * 100),
        pricingVideo: Math.round((parseFloat(videoRate) || 0) * 100),
      });
      addToast('success', 'Rates updated successfully');
      await refreshUser?.();
    } catch {
      addToast('error', 'Failed to update rates');
    } finally {
      setSavingRates(false);
    }
  }, [chatRate, voiceRate, videoRate, addToast, refreshUser]);

  const handleSaveProfile = useCallback(async () => {
    const fullName = profileForm.fullName.trim();
    const username = profileForm.username.trim();

    if (!fullName) {
      addToast('error', 'Full name is required');
      return;
    }

    if (username && username.length < 3) {
      addToast('error', 'Username must be at least 3 characters');
      return;
    }

    setSavingProfile(true);
    try {
      await Promise.all([
        apiService.patch('/api/me', {
          fullName,
          ...(username ? { username } : {}),
        }),
        apiService.patch('/api/readers/profile', {
          bio: profileForm.bio.trim(),
          specialties: profileForm.specialties.trim(),
        }),
      ]);
      await refreshUser?.();
      addToast('success', 'Profile updated successfully');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }, [profileForm, addToast, refreshUser]);

  if (!user) {
    return <LoadingPage message="Loading dashboard..." />;
  }

  const completedSessions = sessions.filter((session) => session.status === 'completed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEarnings = completedSessions
    .filter((session) => session.createdAt.startsWith(todayStr))
    .reduce((sum, session) => sum + session.readerEarned, 0);
  const totalEarnings = completedSessions.reduce(
    (sum, session) => sum + session.readerEarned,
    0,
  );
  const pendingPayoutBalance = user.balance;
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero">
          <h1 className="heading-2">Reader Dashboard</h1>
          <p className="hero__tagline">{user.fullName || user.username || 'Reader'}</p>
          <div className="divider" />
        </section>

        <section className="section">
          <Tabs tabs={[...READER_TABS]} activeTab={activeTab} onChange={(tabId) => setActiveTab(tabId as typeof activeTab)} />

          <TabPanel id="overview" activeTab={activeTab}>
            <section className="section">
              <Card variant={isOnline ? 'glow-pink' : 'elevated'}>
                <CardBody>
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="heading-4">Availability</h2>
                      <p className="caption">
                        {isOnline
                          ? 'You are visible to clients and can receive reading requests.'
                          : 'You are hidden from clients. Toggle on to start accepting readings.'}
                      </p>
                    </div>
                    <button
                      className="toggle"
                      onClick={handleToggle}
                      disabled={toggling}
                      role="switch"
                      aria-checked={isOnline}
                      aria-label={`Toggle availability, currently ${isOnline ? 'online' : 'offline'}`}
                    >
                      <div className={`toggle__track ${isOnline ? 'toggle__track--active' : ''}`}>
                        <div className="toggle__thumb" />
                      </div>
                      <span
                        className={`toggle__label ${
                          isOnline ? 'toggle__label--online' : 'toggle__label--offline'
                        }`}
                      >
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </button>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section className="section">
              <h2 className="heading-3">
                Incoming Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="pink" size="sm" style={{ marginLeft: 'var(--space-2)' }}>
                    {pendingRequests.length}
                  </Badge>
                )}
              </h2>
              {pendingRequests.length === 0 ? (
                <EmptyState
                  icon="Inbox"
                  title="No pending requests"
                  description={
                    isOnline
                      ? 'You will be notified here when a client requests a reading.'
                      : 'Go online to start receiving reading requests.'
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingRequests.map((request) => {
                    const typeLabel =
                      request.readingType.charAt(0).toUpperCase() + request.readingType.slice(1);
                    const displayName =
                      request.clientName ||
                      request.clientUsername ||
                      `Client #${request.clientId}`;

                    return (
                      <Card key={request.id} variant="glow-pink" padding="sm">
                        <CardBody>
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={request.clientAvatar || undefined}
                                name={displayName}
                                size="md"
                              />
                              <div>
                                <h4 className="heading-5">{displayName}</h4>
                                <p className="caption">
                                  {typeLabel} {String.fromCharCode(183)}{' '}
                                  {centsToDisplay(request.ratePerMinute)}/min {String.fromCharCode(183)}{' '}
                                  {new Date(request.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDecline(request.id)}
                                disabled={actingOnId === request.id}
                              >
                                Decline
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAccept(request.id)}
                                disabled={actingOnId === request.id}
                              >
                                {actingOnId === request.id ? 'Accepting...' : 'Accept'}
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid grid--stats">
              <Stat label="Today's Earnings" value={centsToDisplay(todayEarnings)} />
              <Stat label="Pending Payout Balance" value={centsToDisplay(pendingPayoutBalance)} />
              <Stat label="Historical Earnings" value={centsToDisplay(totalEarnings)} />
              <Stat label="Average Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '-'} />
            </div>

            <section className="section">
              <Card variant="static">
                <CardBody>
                  <h2 className="heading-4">Per-Minute Rates</h2>
                  <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
                    Set your rates for each reading type. Changes take effect immediately.
                  </p>
                  <div className="grid grid--3">
                    <Input
                      label="Chat ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={chatRate}
                      onChange={(e) => setChatRate(e.target.value)}
                      placeholder="0.00"
                    />
                    <Input
                      label="Voice ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(e.target.value)}
                      placeholder="0.00"
                    />
                    <Input
                      label="Video ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={videoRate}
                      onChange={(e) => setVideoRate(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-end" style={{ marginTop: 'var(--space-4)' }}>
                    <Button variant="gold" onClick={handleSaveRates} loading={savingRates}>
                      Save Rates
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section className="section">
              <h2 className="heading-3">Session History</h2>
              {loadingData ? (
                <LoadingPage message="Loading sessions..." />
              ) : completedSessions.length === 0 ? (
                <EmptyState
                  icon="Readings"
                  title="No Sessions Yet"
                  description="Your completed reading sessions will appear here."
                />
              ) : (
                <Table
                  columns={sessionColumns}
                  data={completedSessions as (Reading & Record<string, unknown>)[]}
                  keyExtractor={(row) => (row as Reading).id}
                />
              )}
            </section>

            <section className="section">
              <h2 className="heading-3">Reviews Received</h2>
              {reviews.length === 0 ? (
                <EmptyState
                  icon="Reviews"
                  title="No Reviews Yet"
                  description="Reviews from your clients will appear here after readings."
                />
              ) : (
                <div className="card card--static">
                  {reviews.map((review) => (
                    <div key={review.id} className="review">
                      <div className="review__header">
                        <div className="flex flex-col gap-1">
                          <span className="review__author">
                            {review.clientName || `Client #${review.clientId}`}
                          </span>
                          <span className="review__date">{formatDate(review.completedAt)}</span>
                        </div>
                        <StarRating value={review.rating} size="sm" />
                      </div>
                      {review.review && (
                        <p className="review__text">&ldquo;{review.review}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabPanel>

          <TabPanel id="profile" activeTab={activeTab}>
            <section className="section">
              <Card variant="static">
                <CardBody>
                  <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-5)' }}>
                    <Avatar
                      src={user.profileImage}
                      name={user.fullName || user.username || user.email}
                      size="lg"
                    />
                    <div>
                      <h2 className="heading-4">Public Reader Profile</h2>
                      <p className="caption">
                        Update the details clients see on your public reader page.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid--2">
                    <Input
                      label="Full Name"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="Your display name"
                      required
                    />
                    <Input
                      label="Username"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="readername"
                      help="Minimum 3 characters"
                    />
                  </div>

                  <Textarea
                    label="Bio"
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={5}
                    placeholder="Share your reading style, experience, and what clients can expect."
                    style={{ marginTop: 'var(--space-4)' }}
                  />

                  <Textarea
                    label="Specialties"
                    value={profileForm.specialties}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, specialties: e.target.value }))
                    }
                    rows={3}
                    placeholder="Tarot, mediumship, love readings, spiritual coaching"
                    help="Use a comma-separated list so specialties display cleanly on your profile."
                    style={{ marginTop: 'var(--space-4)' }}
                  />

                  <p className="caption" style={{ marginTop: 'var(--space-4)' }}>
                    Profile image uploads remain admin-managed in the initial launch build.
                  </p>

                  <div className="flex justify-end" style={{ marginTop: 'var(--space-4)' }}>
                    <Button
                      variant="primary"
                      onClick={handleSaveProfile}
                      loading={savingProfile}
                    >
                      Save Profile
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </section>
          </TabPanel>
        </section>

        <ChatTranscriptModal
          readingId={transcriptReadingId}
          viewerUserId={user.id}
          readerName={user.fullName || user.username || 'You'}
          onClose={() => setTranscriptReadingId(null)}
        />
      </div>
    </div>
  );
}
