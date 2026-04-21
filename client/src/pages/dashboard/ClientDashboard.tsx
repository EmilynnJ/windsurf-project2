import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import { AddFundsForm } from '../../components/AddFundsForm';
import {
  Button,
  Card,
  CardBody,
  Modal,
  Stat,
  Table,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import type { Reading, Transaction } from '../../types';

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

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
    key: 'readingType',
    header: 'Type',
    render: (row) => {
      const icons: Record<string, string> = { chat: '💬', voice: '🎙️', video: '📹' };
      const t = row.readingType as string;
      return `${icons[t] || ''} ${t.charAt(0).toUpperCase() + t.slice(1)}`;
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => {
      const s = row.status as string;
      const variant = s === 'completed' ? 'gold' : s === 'active' ? 'online' : 'info';
      return (
        <span className={`badge badge--${variant}`}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </span>
      );
    },
  },
  {
    key: 'durationSeconds',
    header: 'Duration',
    render: (row) => formatDuration(row.durationSeconds as number),
  },
  {
    key: 'totalCharged',
    header: 'Cost',
    sortable: true,
    render: (row) => <span className="price">{centsToDisplay(row.totalCharged as number)}</span>,
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
        topup: '💰 Top Up',
        reading_charge: '🔮 Reading',
        refund: '↩️ Refund',
        admin_adjustment: '⚙️ Adjustment',
        reader_payout: '💸 Payout',
      };
      return labels[row.type as string] || row.type;
    },
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    render: (row) => {
      const amt = (row.amount as number) / 100;
      const isPositive = amt >= 0;
      return (
        <span className={isPositive ? 'price price--positive' : 'price price--negative'}>
          {isPositive ? '+' : ''}${Math.abs(amt).toFixed(2)}
        </span>
      );
    },
  },
  {
    key: 'note',
    header: 'Description',
    render: (row) => (row.note as string) || '—',
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

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      try {
        const [readingData, txData] = await Promise.all([
          apiService.get<Reading[]>('/api/readings/my'),
          apiService.get<Transaction[]>('/api/payments/transactions'),
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

  /* ── Add Funds success ── */
  const handleAddFundsSuccess = useCallback(
    async (amountCents: number) => {
      addToast(
        'success',
        `$${(amountCents / 100).toFixed(2)} top-up received! Your balance will update momentarily. ✨`,
      );
      setShowAddFunds(false);
      // Give the Stripe webhook a moment to credit the balance, then refresh.
      setTimeout(async () => {
        if (refreshUser) refreshUser();
        try {
          const txData = await apiService.get<Transaction[]>('/api/payments/transactions');
          setTransactions(txData);
        } catch {
          /* ignore -- transactions are best-effort here */
        }
      }, 1_500);
    },
    [addToast, refreshUser],
  );

  if (!user) return <LoadingPage message="Loading dashboard..." />;

  const activeReadings = readings.filter((r) => r.status === 'active' || r.status === 'pending');
  const completedReadings = readings.filter((r) => r.status === 'completed');

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero">
          <h1 className="heading-2">Welcome back, {user.fullName || user.username || 'Seeker'}</h1>
          <div className="divider" />
        </section>

        {/* ── Balance + Stats ────────────────────────── */}
        <div className="grid grid--stats">
          <Card variant="glow-gold">
            <CardBody>
              <div className="balance-display">
                <span className="balance-display__label">Account Balance</span>
                <span className="balance-display__amount">
                  {centsToDisplay(user.balance)}
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
                          {reading.readingType.charAt(0).toUpperCase() + reading.readingType.slice(1)} reading · {centsToDisplay(reading.ratePerMinute)}/min
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
        >
          {showAddFunds && (
            <AddFundsForm
              onSuccess={handleAddFundsSuccess}
              onCancel={() => setShowAddFunds(false)}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}
