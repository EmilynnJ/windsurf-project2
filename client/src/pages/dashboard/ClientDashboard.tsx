import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button, Card, Stat, Tabs, TabPanel, Table, Badge,
  LoadingPage, EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui/Table';

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

interface Reading {
  id: number;
  readerName?: string;
  type: string;
  status: string;
  duration: number;
  totalCost: number;
  rating: number | null;
  createdAt: string;
  [key: string]: unknown;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  [key: string]: unknown;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000]; // $10, $25, $50, $100

const tabList = [
  { id: 'overview', label: '✨ Overview' },
  { id: 'readings', label: '📖 Readings' },
  { id: 'transactions', label: '💰 Transactions' },
  { id: 'funds', label: '💳 Add Funds' },
];

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState(user?.accountBalance ?? 0);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Add funds state
  const [selectedAmount, setSelectedAmount] = useState(2500);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [balData, readData, txData] = await Promise.all([
        apiService.get('/api/payments/balance') as Promise<{ balance: number }>,
        apiService.get('/api/readings/client').catch(() => []),
        apiService.get('/api/transactions/me').catch(() => []),
      ]);
      setBalance(balData.balance);
      setReadings(readData as Reading[]);
      setTransactions(txData as Transaction[]);
    } catch {
      // Silently handle — individual endpoints may not be ready
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddFunds = async () => {
    const amount = customAmount ? Math.round(parseFloat(customAmount) * 100) : selectedAmount;
    if (amount < 500) {
      addToast('error', 'Minimum top-up is $5.00');
      return;
    }
    setProcessing(true);
    try {
      const data = await apiService.post<{ clientSecret: string }>('/api/payments/create-intent', { amount });
      // The Stripe PaymentElement is mounted with data.clientSecret
      // After successful payment, the webhook credits the balance
      addToast('info', `Stripe checkout ready (secret: ${data.clientSecret.slice(0, 8)}…)`);
      // TODO: Mount Stripe Elements PaymentElement with clientSecret
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      addToast('error', msg);
    } finally {
      setProcessing(false);
    }
  };

  const readingColumns: Column<Reading>[] = [
    { key: 'id', header: 'ID', width: '60px', sortable: true },
    {
      key: 'readerName', header: 'Reader', sortable: true,
      render: (r) => <strong>{r.readerName || 'Reader'}</strong>,
    },
    {
      key: 'type', header: 'Type',
      render: (r) => <Badge variant="pink">{r.type === 'chat' ? '💬' : r.type === 'voice' ? '🎤' : '📹'} {r.type}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'completed' ? 'online' : r.status === 'in_progress' ? 'info' : 'gold'}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'duration', header: 'Duration', render: (r) => r.duration > 0 ? `${r.duration} min` : '—' },
    { key: 'totalCost', header: 'Cost', sortable: true, render: (r) => <span className="price price--sm">{centsToPrice(r.totalCost)}</span> },
    {
      key: 'createdAt', header: 'Date', sortable: true,
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  const txColumns: Column<Transaction>[] = [
    {
      key: 'type', header: 'Type',
      render: (t) => (
        <Badge variant={t.type === 'top_up' ? 'online' : t.type === 'reading_charge' ? 'pink' : 'gold'}>
          {t.type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (t) => (
        <span className={`price price--sm ${t.amount >= 0 ? 'price--positive' : 'price--negative'}`}>
          {t.amount >= 0 ? '+' : ''}{centsToPrice(Math.abs(t.amount))}
        </span>
      ),
    },
    { key: 'description', header: 'Description', render: (t) => t.description || '—' },
    {
      key: 'createdAt', header: 'Date', sortable: true,
      render: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  if (loading) return <LoadingPage message="Loading your dashboard..." />;

  const totalSpent = readings.reduce((s, r) => s + (r.totalCost || 0), 0);
  const completedCount = readings.filter((r) => r.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid--4">
        <Stat label="Balance" value={centsToPrice(balance)} icon="💰" />
        <Stat label="Total Spent" value={centsToPrice(totalSpent)} icon="📊" />
        <Stat label="Readings" value={completedCount} icon="📖" />
        <Stat
          label="Active"
          value={readings.filter((r) => r.status === 'in_progress').length}
          icon="⚡"
        />
      </div>

      {/* Quick action */}
      {balance < 500 && (
        <Card variant="glow-gold" className="flex items-center justify-between">
          <div>
            <strong style={{ color: 'var(--accent-gold)' }}>Low Balance</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Add funds to start a reading (minimum $5.00 required)
            </p>
          </div>
          <Button variant="gold" onClick={() => setActiveTab('funds')}>
            Add Funds
          </Button>
        </Card>
      )}

      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Overview */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="flex flex-col gap-4">
          <h3>Recent Readings</h3>
          {readings.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="No Readings Yet"
              description="Browse our readers to start your spiritual journey."
              action={{ label: 'Find a Reader', onClick: () => navigate('/readers') }}
            />
          ) : (
            <Table
              columns={readingColumns}
              data={readings.slice(0, 5)}
              keyExtractor={(r) => r.id}
              emptyMessage="No readings yet"
            />
          )}
        </div>
      </TabPanel>

      {/* Readings history */}
      <TabPanel id="readings" activeTab={activeTab}>
        <Table
          columns={readingColumns}
          data={readings}
          keyExtractor={(r) => r.id}
          emptyMessage="No readings yet — browse our readers to get started"
        />
      </TabPanel>

      {/* Transactions */}
      <TabPanel id="transactions" activeTab={activeTab}>
        <Table
          columns={txColumns}
          data={transactions}
          keyExtractor={(t) => t.id}
          emptyMessage="No transactions yet"
        />
      </TabPanel>

      {/* Add Funds */}
      <TabPanel id="funds" activeTab={activeTab}>
        <Card variant="static" style={{ maxWidth: '500px' }}>
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Add Funds to Your Account</h3>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Current balance: <strong className="price">{centsToPrice(balance)}</strong>
          </p>

          {/* Preset amounts */}
          <div className="grid grid--4" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                className={`btn ${selectedAmount === amount && !customAmount ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
              >
                {centsToPrice(amount)}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Custom Amount</label>
            <div className="flex gap-2 items-center">
              <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>$</span>
              <input
                type="number"
                className="form-input"
                placeholder="Enter amount"
                min="5"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
            <span className="form-help">Minimum $5.00</span>
          </div>

          <Button
            variant="gold"
            fullWidth
            size="lg"
            onClick={handleAddFunds}
            loading={processing}
          >
            Add {centsToPrice(customAmount ? Math.round(parseFloat(customAmount || '0') * 100) : selectedAmount)} to Balance
          </Button>
        </Card>
      </TabPanel>
    </div>
  );
}
