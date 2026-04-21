import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import { AddFundsForm } from '../../components/AddFundsForm';
import { ChatTranscriptModal } from '../../components/ChatTranscriptModal';
import {
  Button,
  Card,
  CardBody,
  Modal,
  Stat,
  StarRating,
  Table,
  Textarea,
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
function buildReadingColumns(
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
      render: (row) => (
        <span className="price">{centsToDisplay(row.totalCharged as number)}</span>
      ),
    },
    {
      key: 'transcript',
      header: '',
      render: (row) => {
        const type = row.readingType as string;
        if (type !== 'chat') return null;
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
  const { user, refreshUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Add Funds Modal
  const [showAddFunds, setShowAddFunds] = useState(false);

  // Delete Account Modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Chat transcript viewer
  const [transcriptReadingId, setTranscriptReadingId] = useState<number | null>(null);
  const readingColumns = buildReadingColumns((id) => setTranscriptReadingId(id));

  // Rating reminder modal
  const [ratingReading, setRatingReading] = useState<Reading | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const openRatingModal = useCallback((reading: Reading) => {
    setRatingReading(reading);
    setRatingValue(0);
    setRatingReview('');
  }, []);

  const handleSubmitRating = useCallback(async () => {
    if (!ratingReading || ratingValue === 0) {
      addToast('warning', 'Please select a star rating');
      return;
    }
    setRatingSubmitting(true);
    try {
      await apiService.post(`/api/readings/${ratingReading.id}/rate`, {
        rating: ratingValue,
        review: ratingReview.trim() || undefined,
      });
      setReadings((prev) =>
        prev.map((r) =>
          r.id === ratingReading.id
            ? ({ ...r, rating: ratingValue, review: ratingReview.trim() || undefined } as Reading)
            : r,
        ),
      );
      addToast('success', 'Thanks for sharing your feedback ✨');
      setRatingReading(null);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  }, [ratingReading, ratingValue, ratingReview, addToast]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await apiService.delete('/api/me');
      addToast('success', 'Your account has been deleted.');
      logout();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Account deletion failed';
      addToast('error', msg);
      setDeleting(false);
    }
  }, [deleteConfirm, addToast, logout]);

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      try {
        const [readingData, txData] = await Promise.all([
          apiService.get<Reading[]>('/api/readings/client'),
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
  const unratedReadings = completedReadings
    .filter((r) => !r.rating && (r.durationSeconds ?? 0) > 0)
    .slice(0, 5);

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

        {/* ── Rating Reminders ───────────────────────── */}
        {unratedReadings.length > 0 && (
          <section className="section">
            <h2 className="heading-3">Rate Your Recent Readings ✨</h2>
            <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>
              Leave a review to help other seekers find their perfect reader.
            </p>
            <div className="flex flex-col gap-3">
              {unratedReadings.map((reading) => (
                <Card key={reading.id} variant="glow-gold" padding="sm">
                  <CardBody>
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="body-text">
                          <strong>
                            {reading.readingType.charAt(0).toUpperCase() +
                              reading.readingType.slice(1)}
                          </strong>{' '}
                          reading · {formatDate(reading.createdAt)}
                        </p>
                        <p className="caption">
                          {formatDuration(reading.durationSeconds ?? 0)} ·{' '}
                          {centsToDisplay(reading.totalCharged ?? 0)}
                        </p>
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => openRatingModal(reading)}
                      >
                        Leave a review
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        )}

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

        {/* ── Danger Zone ────────────────────────────── */}
        <section className="section">
          <h2 className="heading-3">Account</h2>
          <Card padding="md">
            <CardBody>
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="heading-4">Delete Account</h3>
                  <p className="caption">
                    Permanently remove your SoulSeer account and Auth0 login. Your
                    reading history is retained anonymised for accounting. This
                    cannot be undone.
                  </p>
                </div>
                <div>
                  <Button variant="secondary" onClick={() => setShowDelete(true)}>
                    Delete my account
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
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

        {/* ── Delete Account Modal ───────────────────── */}
        <Modal
          open={showDelete}
          onClose={() => {
            if (!deleting) {
              setShowDelete(false);
              setDeleteConfirm('');
            }
          }}
          title="Delete Account"
        >
          <div className="flex flex-col gap-3">
            <p className="body-text">
              This will permanently delete your SoulSeer account and Auth0 login.
              Your email, name, and profile data will be scrubbed from our
              database. Historical readings and transactions are retained
              anonymised for accounting.
            </p>
            <p className="body-text">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="input"
              aria-label="Type DELETE to confirm account deletion"
              disabled={deleting}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm('');
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete account'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── Chat Transcript Modal ──────────────────── */}
        <ChatTranscriptModal
          readingId={transcriptReadingId}
          viewerUserId={user.id}
          clientName={user.fullName || user.username || 'You'}
          onClose={() => setTranscriptReadingId(null)}
        />

        {/* ── Rating Modal ───────────────────────────── */}
        <Modal
          open={!!ratingReading}
          onClose={() => (ratingSubmitting ? undefined : setRatingReading(null))}
          title="Rate Your Reading"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setRatingReading(null)}
                disabled={ratingSubmitting}
              >
                Skip for now
              </Button>
              <Button
                variant="gold"
                onClick={handleSubmitRating}
                loading={ratingSubmitting}
                disabled={ratingValue === 0}
              >
                Submit review
              </Button>
            </>
          }
        >
          {ratingReading && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="body-text">
                  <strong>
                    {ratingReading.readingType.charAt(0).toUpperCase() +
                      ratingReading.readingType.slice(1)}
                  </strong>{' '}
                  reading · {formatDate(ratingReading.createdAt)}
                </p>
                <p className="caption">
                  {formatDuration(ratingReading.durationSeconds ?? 0)} ·{' '}
                  {centsToDisplay(ratingReading.totalCharged ?? 0)}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="body-text" htmlFor="rating-stars">
                  Your rating
                </label>
                <StarRating value={ratingValue} onChange={setRatingValue} size="lg" />
              </div>
              <Textarea
                label="Review (optional)"
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                maxLength={1000}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
