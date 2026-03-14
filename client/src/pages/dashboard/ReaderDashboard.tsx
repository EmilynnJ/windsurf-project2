import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button,
  Card,
  CardBody,
  Input,
  Stat,
  Table,
  StarRating,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import type { Reading, Review } from '../../types';

/* ── Helpers ────────────────────────────────────────────────── */
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

/* ── Column Defs ────────────────────────────────────────────── */
const sessionColumns: Column<Reading & Record<string, unknown>>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    sortable: true,
    render: (row) => formatDate(row.createdAt as string),
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => {
      const icons: Record<string, string> = { chat: '💬', voice: '🎙️', video: '📹' };
      const t = row.type as string;
      return `${icons[t] || ''} ${t.charAt(0).toUpperCase() + t.slice(1)}`;
    },
  },
  {
    key: 'clientId',
    header: 'Client',
    render: (row) => `#${row.clientId}`,
  },
  {
    key: 'duration',
    header: 'Duration',
    render: (row) => formatDuration(row.duration as number),
  },
  {
    key: 'readerEarnings',
    header: 'Earned',
    sortable: true,
    render: (row) => (
      <span className="price price--positive">
        +${(row.readerEarnings as number).toFixed(2)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <span className={`badge badge--${row.status === 'completed' ? 'gold' : 'info'}`}>
        {(row.status as string).replace('_', ' ')}
      </span>
    ),
  },
];

/* ── Reader Dashboard ───────────────────────────────────────── */
export function ReaderDashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [isOnline, setIsOnline] = useState(user?.isOnline ?? false);
  const [toggling, setToggling] = useState(false);

  // Rates
  const [chatRate, setChatRate] = useState(String(user?.pricingChat ?? ''));
  const [voiceRate, setVoiceRate] = useState(String(user?.pricingVoice ?? ''));
  const [videoRate, setVideoRate] = useState(String(user?.pricingVideo ?? ''));
  const [savingRates, setSavingRates] = useState(false);

  // Data
  const [sessions, setSessions] = useState<Reading[]>([]);
  const [reviews, setReviews] = useState<(Review & { clientName?: string })[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      try {
        const [sessionData, reviewData] = await Promise.all([
          apiService.get<Reading[]>('/api/readings/my'),
          apiService.get<(Review & { clientName?: string })[]>(`/api/readers/${user?.id}/reviews`).catch(() => []),
        ]);
        setSessions(sessionData);
        setReviews(reviewData);
      } catch {
        addToast('error', 'Failed to load dashboard data');
      } finally {
        setLoadingData(false);
      }
    }
    if (user) load();
  }, [user, addToast]);

  /* ── Toggle online/offline ── */
  const handleToggle = useCallback(async () => {
    setToggling(true);
    try {
      const newStatus = !isOnline;
      await apiService.patch('/api/readers/me/status', { isOnline: newStatus });
      setIsOnline(newStatus);
      addToast('success', newStatus ? 'You are now Online! ✨' : 'You are now Offline');
      if (refreshUser) refreshUser();
    } catch {
      addToast('error', 'Failed to update status');
    } finally {
      setToggling(false);
    }
  }, [isOnline, addToast, refreshUser]);

  /* ── Save rates ── */
  const handleSaveRates = useCallback(async () => {
    setSavingRates(true);
    try {
      await apiService.patch('/api/readers/me/rates', {
        pricingChat: parseFloat(chatRate) || 0,
        pricingVoice: parseFloat(voiceRate) || 0,
        pricingVideo: parseFloat(videoRate) || 0,
      });
      addToast('success', 'Rates updated successfully');
      if (refreshUser) refreshUser();
    } catch {
      addToast('error', 'Failed to update rates');
    } finally {
      setSavingRates(false);
    }
  }, [chatRate, voiceRate, videoRate, addToast, refreshUser]);

  if (!user) return <LoadingPage message="Loading dashboard..." />;

  // Earnings calculations
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEarnings = completedSessions
    .filter((s) => s.createdAt.startsWith(todayStr))
    .reduce((sum, s) => sum + s.readerEarnings, 0);
  const totalEarnings = completedSessions.reduce((sum, s) => sum + s.readerEarnings, 0);
  const pendingBalance = user.accountBalance;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero">
          <h1 className="heading-2">Reader Dashboard</h1>
          <p className="hero__tagline">{user.fullName || user.displayName || 'Reader'}</p>
          <div className="divider" />
        </section>

        {/* ── Online Toggle ──────────────────────────── */}
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
                  aria-label={`Toggle availability — currently ${isOnline ? 'online' : 'offline'}`}
                >
                  <div className={`toggle__track ${isOnline ? 'toggle__track--active' : ''}`}>
                    <div className="toggle__thumb" />
                  </div>
                  <span className={`toggle__label ${isOnline ? 'toggle__label--online' : 'toggle__label--offline'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* ── Stats ──────────────────────────────────── */}
        <div className="grid grid--stats">
          <Stat label="Today's Earnings" value={`$${todayEarnings.toFixed(2)}`} icon="💰" />
          <Stat label="Pending Balance" value={`$${pendingBalance.toFixed(2)}`} icon="⏳" />
          <Stat label="Total Earned" value={`$${totalEarnings.toFixed(2)}`} icon="📊" />
          <Stat label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} icon="⭐" />
        </div>

        {/* ── Rate Settings ──────────────────────────── */}
        <section className="section">
          <Card variant="static">
            <CardBody>
              <h2 className="heading-4">Per-Minute Rates</h2>
              <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
                Set your rates for each reading type. Changes take effect immediately.
              </p>
              <div className="grid grid--3">
                <Input
                  label="💬 Chat ($/min)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={chatRate}
                  onChange={(e) => setChatRate(e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  label="🎙️ Voice ($/min)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  label="📹 Video ($/min)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={videoRate}
                  onChange={(e) => setVideoRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end" style={{ marginTop: 'var(--space-4)' }}>
                <Button
                  variant="gold"
                  onClick={handleSaveRates}
                  loading={savingRates}
                >
                  Save Rates
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* ── Session History ────────────────────────── */}
        <section className="section">
          <h2 className="heading-3">Session History</h2>
          {loadingData ? (
            <LoadingPage message="Loading sessions..." />
          ) : completedSessions.length === 0 ? (
            <EmptyState
              icon="🔮"
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

        {/* ── Reviews Received ───────────────────────── */}
        <section className="section">
          <h2 className="heading-3">Reviews Received</h2>
          {reviews.length === 0 ? (
            <EmptyState
              icon="⭐"
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
                      <span className="review__date">{formatDate(review.createdAt)}</span>
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
      </div>
    </div>
  );
}
