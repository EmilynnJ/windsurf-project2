import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button, Card, Stat, Tabs, TabPanel, Table, Badge,
  StarRating, LoadingPage, EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui/Table';

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

interface SessionRecord {
  id: number;
  clientId: number;
  type: string;
  status: string;
  duration: number;
  readerEarnings: number;
  rating: number | null;
  review: string | null;
  createdAt: string;
  [key: string]: unknown;
}

const tabList = [
  { id: 'overview', label: '✨ Overview' },
  { id: 'sessions', label: '📖 Sessions' },
  { id: 'reviews', label: '⭐ Reviews' },
  { id: 'settings', label: '⚙️ Settings' },
];

export function ReaderDashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  // Pricing state
  const [chatRate, setChatRate] = useState(String((user?.pricingChat ?? 0) / 100));
  const [voiceRate, setVoiceRate] = useState(String((user?.pricingVoice ?? 0) / 100));
  const [videoRate, setVideoRate] = useState(String((user?.pricingVideo ?? 0) / 100));

  const fetchData = useCallback(async () => {
    try {
      const data = await apiService.get('/api/readings/reader').catch(() => []);
      setSessions(data as SessionRecord[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOnline = async () => {
    setToggling(true);
    try {
      await apiService.patch('/api/readers/me/status', { isOnline: !isOnline });
      setIsOnline(!isOnline);
      addToast('success', `You are now ${!isOnline ? 'online' : 'offline'}`);
    } catch {
      addToast('error', 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const savePricing = async () => {
    setSavingPricing(true);
    try {
      await apiService.patch('/api/readers/me/pricing', {
        pricingChat: Math.round(parseFloat(chatRate || '0') * 100),
        pricingVoice: Math.round(parseFloat(voiceRate || '0') * 100),
        pricingVideo: Math.round(parseFloat(videoRate || '0') * 100),
      });
      addToast('success', 'Pricing updated!');
      refreshUser?.();
    } catch {
      addToast('error', 'Failed to update pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalEarnings = completedSessions.reduce((sum, s) => sum + (s.readerEarnings || 0), 0);
  const reviewedSessions = completedSessions.filter((s) => s.rating !== null);
  const avgRating = reviewedSessions.length > 0
    ? reviewedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / reviewedSessions.length
    : 0;

  const sessionColumns: Column<SessionRecord>[] = [
    { key: 'id', header: 'ID', width: '60px', sortable: true },
    {
      key: 'clientId', header: 'Client',
      render: (s) => `Client #${s.clientId}`,
    },
    {
      key: 'type', header: 'Type',
      render: (s) => <Badge variant="pink">{s.type}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: (s) => (
        <Badge variant={s.status === 'completed' ? 'online' : s.status === 'in_progress' ? 'info' : 'gold'}>
          {s.status}
        </Badge>
      ),
    },
    { key: 'duration', header: 'Duration', render: (s) => s.duration > 0 ? `${s.duration} min` : '—' },
    {
      key: 'readerEarnings', header: 'Earned', sortable: true,
      render: (s) => <span className="price price--sm price--positive">{centsToPrice(s.readerEarnings)}</span>,
    },
    {
      key: 'rating', header: 'Rating',
      render: (s) => s.rating ? <StarRating value={s.rating} size="sm" /> : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'createdAt', header: 'Date', sortable: true,
      render: (s) => new Date(s.createdAt).toLocaleDateString(),
    },
  ];

  if (loading) return <LoadingPage message="Loading your reader dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      {/* Online/Offline toggle banner */}
      <Card variant={isOnline ? 'glow-pink' : 'static'} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: isOnline ? 'var(--success)' : 'var(--text-muted)',
                boxShadow: isOnline ? '0 0 12px rgba(34,197,94,0.5)' : 'none',
              }}
            />
            <strong style={{ fontSize: '1.05rem' }}>
              {isOnline ? 'You are Online' : 'You are Offline'}
            </strong>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isOnline
              ? 'Clients can see you and request readings.'
              : 'Go online to start receiving reading requests.'}
          </p>
        </div>
        <Button
          variant={isOnline ? 'danger' : 'primary'}
          onClick={toggleOnline}
          loading={toggling}
        >
          {isOnline ? 'Go Offline' : 'Go Online'}
        </Button>
      </Card>

      {/* Stats */}
      <div className="grid grid--4">
        <Stat label="Balance" value={centsToPrice(user?.accountBalance ?? 0)} icon="💰" />
        <Stat label="Total Earned" value={centsToPrice(totalEarnings)} icon="📈" />
        <Stat label="Sessions" value={completedSessions.length} icon="📖" />
        <Stat label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} icon="⭐" />
      </div>

      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Overview */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="flex flex-col gap-4">
          <h3>Recent Sessions</h3>
          {sessions.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="No Sessions Yet"
              description="Go online to start receiving reading requests from clients."
            />
          ) : (
            <Table
              columns={sessionColumns}
              data={sessions.slice(0, 5)}
              keyExtractor={(s) => s.id}
            />
          )}
        </div>
      </TabPanel>

      {/* All sessions */}
      <TabPanel id="sessions" activeTab={activeTab}>
        <Table
          columns={sessionColumns}
          data={sessions}
          keyExtractor={(s) => s.id}
          emptyMessage="No sessions yet"
        />
      </TabPanel>

      {/* Reviews */}
      <TabPanel id="reviews" activeTab={activeTab}>
        {reviewedSessions.length === 0 ? (
          <EmptyState
            icon="⭐"
            title="No Reviews Yet"
            description="Reviews will appear here after clients rate your readings."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-4)' }}>
              <StarRating value={avgRating} size="lg" showValue />
              <span style={{ color: 'var(--text-muted)' }}>
                {reviewedSessions.length} review{reviewedSessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            {reviewedSessions.map((s) => (
              <Card key={s.id} variant="static">
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                  <StarRating value={s.rating!} size="sm" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {s.review && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    "{s.review}"
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </TabPanel>

      {/* Settings */}
      <TabPanel id="settings" activeTab={activeTab}>
        <Card variant="static" style={{ maxWidth: '500px' }}>
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Per-Minute Pricing</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Set your rate for each reading type. Set to $0 to disable a type.
          </p>

          <div className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="form-group">
              <label className="form-label">💬 Chat Rate ($/min)</label>
              <input
                type="number"
                className="form-input"
                value={chatRate}
                onChange={(e) => setChatRate(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">🎤 Voice Rate ($/min)</label>
              <input
                type="number"
                className="form-input"
                value={voiceRate}
                onChange={(e) => setVoiceRate(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">📹 Video Rate ($/min)</label>
              <input
                type="number"
                className="form-input"
                value={videoRate}
                onChange={(e) => setVideoRate(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <Button variant="primary" onClick={savePricing} loading={savingPricing}>
            Save Pricing
          </Button>
        </Card>
      </TabPanel>
    </div>
  );
}
