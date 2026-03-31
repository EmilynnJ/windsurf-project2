import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button,
  Card,
  CardBody,
  Modal,
  Input,
  Textarea,
  Tabs,
  TabPanel,
  Table,
  SearchInput,
  Stat,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import type { User, Reading, Transaction, ForumPost } from '../../types';

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

/* ── Tabs definition ────────────────────────────────────────── */
const ADMIN_TABS = [
  { id: 'users', label: '👥 Users' },
  { id: 'create-reader', label: '➕ Create Reader' },
  { id: 'readings', label: '🔮 Readings' },
  { id: 'transactions', label: '💰 Transactions' },
  { id: 'moderation', label: '🛡️ Moderation' },
  { id: 'payouts', label: '💸 Payouts' },
];

/* ── Admin Dashboard ────────────────────────────────────────── */
export function AdminDashboard() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('users');

  // ── Data state ──
  const [users, setUsers] = useState<User[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Search state ──
  const [userSearch, setUserSearch] = useState('');
  const [readingSearch, setReadingSearch] = useState('');

  // ── Create Reader Form ──
  const [crForm, setCrForm] = useState({
    fullName: '', email: '', username: '', bio: '',
    specialties: '', pricingChat: '', pricingVoice: '', pricingVideo: '',
  });
  const [crSubmitting, setCrSubmitting] = useState(false);

  // ── Edit Reader Modal ──
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', bio: '', specialties: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Balance Adjustment Modal ──
  const [adjUser, setAdjUser] = useState<User | null>(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  /* ── Load all data ── */
  useEffect(() => {
    async function loadAll() {
      try {
        const [u, r, t, p] = await Promise.all([
          apiService.get<User[]>('/api/admin/users'),
          apiService.get<Reading[]>('/api/admin/readings'),
          apiService.get<Transaction[]>('/api/admin/transactions'),
          apiService.get<ForumPost[]>('/api/admin/forum/posts').catch(() => []),
        ]);
        setUsers(u);
        setReadings(r);
        setTransactions(t);
        setForumPosts(p);
      } catch {
        addToast('error', 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [addToast]);

  /* ── Create Reader ── */
  const handleCreateReader = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crForm.fullName || !crForm.email) {
      addToast('error', 'Name and email are required');
      return;
    }
    setCrSubmitting(true);
    try {
      const newUser = await apiService.post<User>('/api/admin/readers', {
        ...crForm,
        pricingChat: Math.round((parseFloat(crForm.pricingChat) || 0) * 100),
        pricingVoice: Math.round((parseFloat(crForm.pricingVoice) || 0) * 100),
        pricingVideo: Math.round((parseFloat(crForm.pricingVideo) || 0) * 100),
      });
      setUsers((prev) => [...prev, newUser]);
      addToast('success', `Reader "${crForm.fullName}" created!`);
      setCrForm({ fullName: '', email: '', username: '', bio: '', specialties: '', pricingChat: '', pricingVoice: '', pricingVideo: '' });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create reader');
    } finally {
      setCrSubmitting(false);
    }
  }, [crForm, addToast]);

  /* ── Edit Reader ── */
  const openEditModal = (u: User) => {
    setEditUser(u);
    setEditForm({ fullName: u.fullName || '', bio: u.bio || '', specialties: u.specialties || '' });
  };

  const handleEditReader = useCallback(async () => {
    if (!editUser) return;
    setEditSubmitting(true);
    try {
      await apiService.patch(`/api/admin/readers/${editUser.id}`, editForm);
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...editForm } : u));
      addToast('success', 'Reader updated');
      setEditUser(null);
    } catch {
      addToast('error', 'Failed to update reader');
    } finally {
      setEditSubmitting(false);
    }
  }, [editUser, editForm, addToast]);

  /* ── Balance Adjustment ── */
  const openAdjModal = (u: User) => {
    setAdjUser(u);
    setAdjAmount('');
    setAdjReason('');
  };

  const handleAdjustBalance = useCallback(async () => {
    if (!adjUser || !adjAmount) return;
    setAdjSubmitting(true);
    try {
      const amtCents = Math.round(parseFloat(adjAmount) * 100);
      await apiService.post('/api/admin/balance-adjust', {
        userId: adjUser.id,
        amount: amtCents,
        note: adjReason,
      });
      setUsers((prev) => prev.map((u) =>
        u.id === adjUser.id ? { ...u, balance: u.balance + amtCents, accountBalance: u.balance + amtCents } : u
      ));
      addToast('success', `Balance adjusted by $${parseFloat(adjAmount).toFixed(2)} for ${adjUser.fullName || adjUser.email}`);
      setAdjUser(null);
    } catch {
      addToast('error', 'Failed to adjust balance');
    } finally {
      setAdjSubmitting(false);
    }
  }, [adjUser, adjAmount, adjReason, addToast]);

  /* ── Forum Moderation ── */
  const handleDeletePost = useCallback(async (postId: number) => {
    try {
      await apiService.delete(`/api/admin/posts/${postId}`);
      setForumPosts((prev) => prev.filter((p) => p.id !== postId));
      addToast('success', 'Post deleted');
    } catch {
      addToast('error', 'Failed to delete post');
    }
  }, [addToast]);

  /* ── Payout ── */
  const handlePayout = useCallback(async (userId: number) => {
    try {
      await apiService.post(`/api/admin/payouts/${userId}`);
      addToast('success', 'Payout initiated');
      // Refresh user data
      const u = await apiService.get<User[]>('/api/admin/users');
      setUsers(u);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to initiate payout');
    }
  }, [addToast]);

  /* ── Column Defs ── */
  const userColumns: Column<User & Record<string, unknown>>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'fullName',
      header: 'Name',
      sortable: true,
      render: (row) => (row.fullName as string) || (row.email as string),
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className={`badge badge--${row.role === 'admin' ? 'pink' : row.role === 'reader' ? 'gold' : 'info'}`}>
          {(row.role as string).charAt(0).toUpperCase() + (row.role as string).slice(1)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      render: (row) => <span className="price">${((row.balance as number) / 100).toFixed(2)}</span>,
    },
    {
      key: 'isOnline',
      header: 'Status',
      render: (row) => (
        <span className={`badge badge--${row.isOnline ? 'online' : 'offline'}`}>
          {row.isOnline ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.role === 'reader' && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEditModal(row as unknown as User); }}>
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openAdjModal(row as unknown as User); }}>
            Adjust $
          </Button>
        </div>
      ),
    },
  ];

  const readingColumns: Column<Reading & Record<string, unknown>>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.createdAt as string),
    },
    {
      key: 'readingType',
      header: 'Type',
      render: (row) => (row.readingType as string).charAt(0).toUpperCase() + (row.readingType as string).slice(1),
    },
    { key: 'clientId', header: 'Client', render: (row) => `#${row.clientId}` },
    { key: 'readerId', header: 'Reader', render: (row) => `#${row.readerId}` },
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
      key: 'durationSeconds',
      header: 'Duration',
      render: (row) => formatDuration(row.durationSeconds as number),
    },
    {
      key: 'totalCharged',
      header: 'Revenue',
      sortable: true,
      render: (row) => <span className="price">${((row.totalCharged as number) / 100).toFixed(2)}</span>,
    },
  ];

  const transactionColumns: Column<Transaction & Record<string, unknown>>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.createdAt as string),
    },
    { key: 'userId', header: 'User', render: (row) => `#${row.userId}` },
    {
      key: 'type',
      header: 'Type',
      render: (row) => {
        const labels: Record<string, string> = {
          topup: 'Top Up', reading_charge: 'Reading Charge',
          reader_payout: 'Payout', refund: 'Refund', admin_adjustment: 'Adjustment',
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
        return (
          <span className={amt >= 0 ? 'price price--positive' : 'price price--negative'}>
            {amt >= 0 ? '+' : '-'}${(Math.abs(amt) / 100).toFixed(2)}
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

  if (loading) return <LoadingPage message="Loading admin dashboard..." />;

  // ── Computed stats ──
  const totalRevenue = readings.filter((r) => r.status === 'completed').reduce((s, r) => s + r.totalCharged, 0);
  const totalUsers = users.length;
  const readerCount = users.filter((u) => u.role === 'reader').length;
  const onlineReaders = users.filter((u) => u.role === 'reader' && u.isOnline).length;

  // ── Filtered data ──
  const filteredUsers = userSearch
    ? users.filter((u) =>
        (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const filteredReadings = readingSearch
    ? readings.filter((r) =>
        String(r.id).includes(readingSearch) ||
        String(r.clientId).includes(readingSearch) ||
        String(r.readerId).includes(readingSearch)
      )
    : readings;

  // ── Readers eligible for payout ($15 min) ──
  const payoutReaders = users.filter((u) => u.role === 'reader' && u.balance >= 1500);

  return (
    <div className="page-enter">
      <div className="container">
        <section className="section section--hero">
          <h1 className="heading-2">Admin Dashboard</h1>
          <div className="divider" />
        </section>

        {/* ── Stats ──────────────────────────────────── */}
        <div className="grid grid--stats">
          <Stat label="Total Users" value={totalUsers} icon="👥" />
          <Stat label="Readers" value={`${onlineReaders}/${readerCount}`} icon="🔮" />
          <Stat label="Total Revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} icon="💰" />
          <Stat label="Total Readings" value={readings.length} icon="📊" />
        </div>

        {/* ── Tabs ───────────────────────────────────── */}
        <section className="section">
          <Tabs tabs={ADMIN_TABS} activeTab={activeTab} onChange={setActiveTab} />

          {/* ── Users Tab ── */}
          <TabPanel id="users" activeTab={activeTab}>
            <div className="flex flex-col gap-5" style={{ paddingTop: 'var(--space-5)' }}>
              <SearchInput
                value={userSearch}
                onChange={setUserSearch}
                placeholder="Search users by name or email..."
              />
              <Table
                columns={userColumns}
                data={filteredUsers as (User & Record<string, unknown>)[]}
                keyExtractor={(row) => (row as User).id}
                emptyMessage="No users found"
              />
            </div>
          </TabPanel>

          {/* ── Create Reader Tab ── */}
          <TabPanel id="create-reader" activeTab={activeTab}>
            <form
              className="flex flex-col gap-5"
              style={{ paddingTop: 'var(--space-5)' }}
              onSubmit={handleCreateReader}
            >
              <Card variant="static">
                <CardBody>
                  <h3 className="heading-4">Create New Reader</h3>
                  <div className="admin-form-grid" style={{ marginTop: 'var(--space-4)' }}>
                    <Input
                      label="Full Name"
                      required
                      value={crForm.fullName}
                      onChange={(e) => setCrForm((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Jane Doe"
                    />
                    <Input
                      label="Email"
                      required
                      type="email"
                      value={crForm.email}
                      onChange={(e) => setCrForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="reader@soulseer.app"
                    />
                    <Input
                      label="Username"
                      value={crForm.username}
                      onChange={(e) => setCrForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="janedoe"
                    />
                    <Input
                      label="Specialties"
                      value={crForm.specialties}
                      onChange={(e) => setCrForm((p) => ({ ...p, specialties: e.target.value }))}
                      placeholder="Tarot, Medium, Clairvoyant"
                      help="Comma-separated"
                    />
                    <div className="form-group form-group--full">
                      <Textarea
                        label="Bio"
                        value={crForm.bio}
                        onChange={(e) => setCrForm((p) => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell clients about this reader's gifts and experience..."
                      />
                    </div>
                    <Input
                      label="Chat Rate ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={crForm.pricingChat}
                      onChange={(e) => setCrForm((p) => ({ ...p, pricingChat: e.target.value }))}
                      placeholder="3.99"
                    />
                    <Input
                      label="Voice Rate ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={crForm.pricingVoice}
                      onChange={(e) => setCrForm((p) => ({ ...p, pricingVoice: e.target.value }))}
                      placeholder="4.99"
                    />
                    <Input
                      label="Video Rate ($/min)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={crForm.pricingVideo}
                      onChange={(e) => setCrForm((p) => ({ ...p, pricingVideo: e.target.value }))}
                      placeholder="5.99"
                    />
                  </div>
                  <div className="flex justify-end" style={{ marginTop: 'var(--space-5)' }}>
                    <Button type="submit" variant="primary" loading={crSubmitting}>
                      Create Reader Account
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </form>
          </TabPanel>

          {/* ── Readings Tab ── */}
          <TabPanel id="readings" activeTab={activeTab}>
            <div className="flex flex-col gap-5" style={{ paddingTop: 'var(--space-5)' }}>
              <SearchInput
                value={readingSearch}
                onChange={setReadingSearch}
                placeholder="Search by reading ID, client ID, or reader ID..."
              />
              <Table
                columns={readingColumns}
                data={filteredReadings as (Reading & Record<string, unknown>)[]}
                keyExtractor={(row) => (row as Reading).id}
                emptyMessage="No readings found"
              />
            </div>
          </TabPanel>

          {/* ── Transactions Tab ── */}
          <TabPanel id="transactions" activeTab={activeTab}>
            <div style={{ paddingTop: 'var(--space-5)' }}>
              <Table
                columns={transactionColumns}
                data={transactions as (Transaction & Record<string, unknown>)[]}
                keyExtractor={(row) => (row as Transaction).id}
                emptyMessage="No transactions found"
              />
            </div>
          </TabPanel>

          {/* ── Moderation Tab ── */}
          <TabPanel id="moderation" activeTab={activeTab}>
            <div className="flex flex-col gap-4" style={{ paddingTop: 'var(--space-5)' }}>
              <h3 className="heading-4">Forum Posts</h3>
              {forumPosts.length === 0 ? (
                <EmptyState
                  icon="🛡️"
                  title="No Posts to Moderate"
                  description="Forum posts will appear here for moderation."
                />
              ) : (
                forumPosts.map((post) => (
                  <Card key={post.id} variant="static" padding="sm">
                    <CardBody>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="badge badge--gold">{post.category}</span>
                            <span className="caption">{formatDate(post.createdAt)}</span>
                          </div>
                          <h4 className="forum-post__title">{post.title}</h4>
                          <p className="forum-post__body">{post.content.slice(0, 200)}…</p>
                          <p className="caption">By {post.userName || `User #${post.userId}`} · {post.commentCount} comments</p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </TabPanel>

          {/* ── Payouts Tab ── */}
          <TabPanel id="payouts" activeTab={activeTab}>
            <div className="flex flex-col gap-5" style={{ paddingTop: 'var(--space-5)' }}>
              <Card variant="static">
                <CardBody>
                  <h3 className="heading-4">Reader Payouts</h3>
                  <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
                    Readers with a balance of $15.00 or more are eligible for payout.
                  </p>
                  {payoutReaders.length === 0 ? (
                    <EmptyState
                      icon="💸"
                      title="No Eligible Readers"
                      description="No readers currently meet the $15 minimum payout threshold."
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {payoutReaders.map((reader) => (
                        <div key={reader.id} className="flex justify-between items-center gap-4" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div>
                            <p className="body-text"><strong>{reader.fullName || reader.email}</strong></p>
                            <p className="caption">Balance: <span className="price">${(reader.balance / 100).toFixed(2)}</span></p>
                          </div>
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => handlePayout(reader.id)}
                          >
                            Initiate Payout
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>
        </section>

        {/* ── Edit Reader Modal ──────────────────────── */}
        <Modal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Edit Reader: ${editUser?.fullName || ''}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditReader} loading={editSubmitting}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Full Name"
              value={editForm.fullName}
              onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
            />
            <Textarea
              label="Bio"
              value={editForm.bio}
              onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
            />
            <Input
              label="Specialties"
              value={editForm.specialties}
              onChange={(e) => setEditForm((p) => ({ ...p, specialties: e.target.value }))}
              help="Comma-separated"
            />
          </div>
        </Modal>

        {/* ── Balance Adjustment Modal ───────────────── */}
        <Modal
          open={!!adjUser}
          onClose={() => setAdjUser(null)}
          title={`Adjust Balance: ${adjUser?.fullName || adjUser?.email || ''}`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setAdjUser(null)}>Cancel</Button>
              <Button variant="gold" onClick={handleAdjustBalance} loading={adjSubmitting}>
                Apply Adjustment
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="body-text">
              Current balance: <span className="price">${((adjUser?.balance ?? 0) / 100).toFixed(2)}</span>
            </p>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              help="Use negative numbers to deduct"
              placeholder="10.00 or -5.00"
            />
            <Input
              label="Reason"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Reason for adjustment..."
              required
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}
