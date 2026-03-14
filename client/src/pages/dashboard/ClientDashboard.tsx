import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button,
  Card,
  CardBody,
  Modal,
  Input,
  Stat,
  Table,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import type { Reading, Transaction } from '../../types';

/* ── Constants ──────────────────────────────────────────────── */
const PRESET_AMOUNTS = [10, 25, 50, 100];
const MIN_AMOUNT = 5;

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

/* ── Reading & Transaction Column Definitions ───────────────── */
const readingColumns: Column<Reading & Record<string, unknown>>[] = [
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
      return `${icons[row.type as string] || ''} ${(row.type as string).charAt(0).toUpperCase() + (row.type as string).slice(1)}`;
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <span className={`badge badge--${row.status === 'completed' ? 'gold' : row.status === 'in_progress' ? 'online' : 'info'}`}>
        {(row.status as string).replace('_', ' ')}
      </span>
    ),
  },
  {
    key: 'duration',
    header: 'Duration',
    render: (row) => formatDuration(row.duration as number),
  },
  {
    key: 'totalCost',
    header: 'Cost',
    sortable: true,
    render: (row) => <span className="price">${(row.totalCost as number).toFixed(2)}</span>,
  },
];

const transactionColumns: Column<Transaction & Record<string, unknown>>[] = [
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
      const labels: Record<string, string> = {
        top_up: '💰 Top Up',
        reading_charge: '🔮 Reading',
        refund: '↩️ Refund',
        admin_adjustment: '⚙️ Adjustment',
      };
      return labels[row.type as string] || row.type;
    },
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    render: (row) => {
      const amt = row.amount as number;
      const isPositive = amt >= 0;
      return (
        <span className={isPositive ? 'price price--positive' : 'price price--negative'}>
          {isPositive ? '+' : ''}${amt.toFixed(2)}
        </span>
      );
    },
  },
  {
    key: 'description',
    header: 'Description',
    render: (row) => (row.description as string) || '—',
  },
];

/* ── Client Dashboard ───────────────────────────────────────── */
export function ClientDashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Add Funds Modal
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      try {
        const [readingData, txData] = await Promise.all([
          apiService.get<Reading[]>('/api/readings/my'),
          apiService.get<Transaction[]>('/api/transactions/my'),
        ]);
        setReadings(readingData);
        setTransactions(txData);
      } catch {
        addToast('error', 'Failed to load dashboard data');
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [addToast]);

  /* ── Add Funds ── */
  const handleAddFunds = useCallback(async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount < MIN_AMOUNT) {
      addToast('error', `Minimum deposit is $${MIN_AMOUNT}.00`);
      return;
    }

    setAddingFunds(true);
    try {
      await apiService.post('/api/transactions/top-up', { amount });
      addToast('success', `$${amount.toFixed(2)} added to your balance! ✨`);
      setShowAddFunds(false);
      setSelectedAmount(25);
      setCustomAmount('');
      if (refreshUser) refreshUser();
      // Refresh transactions
      const txData = await apiService.get<Transaction[]>('/api/transactions/my');
      setTransactions(txData);
    } catch {
      addToast('error', 'Failed to add funds. Please try again.');
    } finally {
      setAddingFunds(false);
    }
  }, [selectedAmount, customAmount, addToast, refreshUser]);

  if (!user) return <LoadingPage message="Loading dashboard..." />;

  const activeReadings = readings.filter((r) => r.status === 'in_progress' || r.status === 'pending');
  const completedReadings = readings.filter((r) => r.status === 'completed');

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero">
          <h1 className="heading-2">Welcome back, {user.displayName || user.fullName || 'Seeker'}</h1>
          <div className="divider" />
        </section>

        {/* ── Balance + Stats ────────────────────────── */}
        <div className="grid grid--stats">
          <Card variant="glow-gold">
            <CardBody>
              <div className="balance-display">
                <span className="balance-display__label">Account Balance</span>
                <span className="balance-display__amount">
                  ${user.accountBalance.toFixed(2)}
                </span>
                <Button variant="gold" onClick={() => setShowAddFunds(true)}>
                  + Add Funds
                </Button>
              </div>
            </CardBody>
          </Card>
          <div className="flex flex-col gap-4">
            <Stat label="Total Readings" value={readings.length} />
            <Stat label="Active Sessions" value={activeReadings.length} />
          </div>
        </div>

        {/* ── Active Sessions ────────────────────────── */}
        {activeReadings.length > 0 && (
          <section className="section">
            <h2 className="heading-3">Active Sessions</h2>
            <div className="flex flex-col gap-3">
              {activeReadings.map((reading) => (
                <Card key={reading.id} variant="glow-pink" padding="sm">
                  <CardBody>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="badge badge--online">In Progress</span>
                        <p className="caption">
                          {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)} reading · ${reading.ratePerMinute.toFixed(2)}/min
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/reading/${reading.id}`)}
                      >
                        Rejoin
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Reading History ────────────────────────── */}
        <section className="section">
          <h2 className="heading-3">Reading History</h2>
          {loadingData ? (
            <LoadingPage message="Loading readings..." />
          ) : completedReadings.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="No Readings Yet"
              description="Start your first reading to see your history here."
              action={{ label: 'Browse Readers', onClick: () => navigate('/readers') }}
            />
          ) : (
            <Table
              columns={readingColumns}
              data={completedReadings as (Reading & Record<string, unknown>)[]}
              keyExtractor={(row) => (row as Reading).id}
            />
          )}
        </section>

        {/* ── Transaction History ────────────────────── */}
        <section className="section">
          <h2 className="heading-3">Transaction History</h2>
          {loadingData ? (
            <LoadingPage message="Loading transactions..." />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="💰"
              title="No Transactions"
              description="Your account activity will appear here."
            />
          ) : (
            <Table
              columns={transactionColumns}
              data={transactions as (Transaction & Record<string, unknown>)[]}
              keyExtractor={(row) => (row as Transaction).id}
            />
          )}
        </section>

        {/* ── Add Funds Modal ────────────────────────── */}
        <Modal
          open={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          title="Add Funds"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowAddFunds(false)}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleAddFunds}
                loading={addingFunds}
              >
                Add ${(selectedAmount || parseFloat(customAmount) || 0).toFixed(2)}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <p className="body-text">Select an amount or enter a custom value:</p>
            <div className="amount-presets">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  className={`amount-preset ${selectedAmount === amt ? 'amount-preset--selected' : ''}`}
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  aria-pressed={selectedAmount === amt}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <Input
              label="Custom Amount"
              type="number"
              placeholder="Enter amount..."
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              help={`Minimum $${MIN_AMOUNT}.00`}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}
