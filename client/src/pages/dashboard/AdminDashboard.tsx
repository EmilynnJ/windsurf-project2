import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button, Card, Stat, Tabs, TabPanel, Table, Badge,
  Modal, ConfirmDialog, SearchInput, LoadingPage, EmptyState,
  Input, Select, Textarea,
} from '../../components/ui';
import type { Column } from '../../components/ui/Table';

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

/* ─── Types ───────────────────────────────────────────────────── */

interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  role: 'client' | 'reader' | 'admin';
  isActive: boolean;
  balance: number;
  createdAt: string;
  [key: string]: unknown;
}

interface AdminReading {
  id: number;
  clientId: number;
  readerId: number;
  type: string;
  status: string;
  duration: number;
  totalCost: number;
  createdAt: string;
  [key: string]: unknown;
}

interface AdminTransaction {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  [key: string]: unknown;
}

interface FlaggedPost {
  id: number;
  postId: number;
  reporterId: number;
  reason: string;
  resolved: boolean;
  createdAt: string;
  [key: string]: unknown;
}

/* ─── Component ───────────────────────────────────────────────── */

const tabList = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'users', label: '👥 Users' },
  { id: 'readings', label: '📖 Readings' },
  { id: 'transactions', label: '💰 Transactions' },
  { id: 'moderation', label: '🛡️ Moderation' },
];

export function AdminDashboard() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [readings, setReadings] = useState<AdminReading[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [flags, setFlags] = useState<FlaggedPost[]>([]);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Modals
  const [createReaderOpen, setCreateReaderOpen] = useState(false);
  const [adjustBalanceUser, setAdjustBalanceUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  // Create reader form
  const [newReader, setNewReader] = useState({ email: '', displayName: '', password: '' });
  const [creatingReader, setCreatingReader] = useState(false);

  // Balance adjust form
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [u, r, t, f] = await Promise.all([
        apiService.get('/api/admin/users').catch(() => []) as Promise<AdminUser[]>,
        apiService.get('/api/admin/readings').catch(() => []) as Promise<AdminReading[]>,
        apiService.get('/api/admin/transactions').catch(() => []) as Promise<AdminTransaction[]>,
        apiService.get('/api/admin/flags').catch(() => []) as Promise<FlaggedPost[]>,
      ]);
      setUsers(u);
      setReadings(r);
      setTransactions(t);
      setFlags(f);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Handlers ──────────────────────────────────────────── */

  const handleCreateReader = async () => {
    if (!newReader.email || !newReader.displayName) {
      addToast('error', 'Email and display name are required');
      return;
    }
    setCreatingReader(true);
    try {
      await apiService.post('/api/admin/users/create-reader', newReader);
      addToast('success', `Reader "${newReader.displayName}" created!`);
      setCreateReaderOpen(false);
      setNewReader({ email: '', displayName: '', password: '' });
      fetchAll();
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create reader');
    } finally {
      setCreatingReader(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setConfirmAction({
      title: user.isActive ? 'Deactivate User' : 'Activate User',
      message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.email}?`,
      onConfirm: async () => {
        try {
          await apiService.patch(`/api/admin/users/${user.id}/status`, { isActive: !user.isActive });
          addToast('success', `User ${user.isActive ? 'deactivated' : 'activated'}`);
          fetchAll();
        } catch {
          addToast('error', 'Failed to update user status');
        }
        setConfirmAction(null);
      },
    });
  };

  const handleAdjustBalance = async () => {
    if (!adjustBalanceUser || !adjustAmount) return;
    setAdjusting(true);
    try {
      const amount = Math.round(parseFloat(adjustAmount) * 100);
      await apiService.post(`/api/admin/users/${adjustBalanceUser.id}/adjust-balance`, {
        amount,
        reason: adjustReason || 'Admin adjustment',
      });
      addToast('success', `Balance adjusted by ${centsToPrice(amount)} for ${adjustBalanceUser.email}`);
      setAdjustBalanceUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchAll();
    } catch {
      addToast('error', 'Failed to adjust balance');
    } finally {
      setAdjusting(false);
    }
  };

  const handleResolveFlag = async (flagId: number) => {
    try {
      await apiService.patch(`/api/admin/flags/${flagId}/resolve`, {});
      addToast('success', 'Flag resolved');
      fetchAll();
    } catch {
      addToast('error', 'Failed to resolve flag');
    }
  };

  /* ─── Filtered users ────────────────────────────────────── */

  const filteredUsers = users.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (
        !(u.email ?? '').toLowerCase().includes(q) &&
        !(u.displayName ?? '').toLowerCase().includes(q)
      ) return false;
    }
    if (userRoleFilter && u.role !== userRoleFilter) return false;
    return true;
  });

  /* ─── Columns ───────────────────────────────────────────── */

  const userColumns: Column<AdminUser>[] = [
    { key: 'id', header: 'ID', width: '50px', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'displayName', header: 'Name',
      render: (u) => <strong>{u.displayName || '—'}</strong>,
    },
    {
      key: 'role', header: 'Role',
      render: (u) => (
        <Badge variant={u.role === 'admin' ? 'gold' : u.role === 'reader' ? 'pink' : 'info'}>
          {u.role}
        </Badge>
      ),
    },
    {
      key: 'isActive', header: 'Status',
      render: (u) => <Badge variant={u.isActive ? 'online' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'balance', header: 'Balance', sortable: true,
      render: (u) => <span className="price price--sm">{centsToPrice(u.balance)}</span>,
    },
    {
      key: 'actions', header: 'Actions', width: '180px',
      render: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAdjustBalanceUser(u)}>
            Adjust $
          </Button>
          <Button size="sm" variant={u.isActive ? 'danger' : 'primary'} onClick={() => handleToggleActive(u)}>
            {u.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  const readingColumns: Column<AdminReading>[] = [
    { key: 'id', header: 'ID', width: '50px', sortable: true },
    { key: 'clientId', header: 'Client', render: (r) => `#${r.clientId}` },
    { key: 'readerId', header: 'Reader', render: (r) => `#${r.readerId}` },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="pink">{r.type}</Badge> },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'completed' ? 'online' : r.status === 'in_progress' ? 'info' : 'gold'}>
          {r.status}
        </Badge>
      ),
    },
    { key: 'duration', header: 'Duration', render: (r) => r.duration > 0 ? `${r.duration} min` : '—' },
    { key: 'totalCost', header: 'Revenue', sortable: true, render: (r) => <span className="price price--sm">{centsToPrice(r.totalCost)}</span> },
    { key: 'createdAt', header: 'Date', sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const txColumns: Column<AdminTransaction>[] = [
    { key: 'id', header: 'ID', width: '50px', sortable: true },
    { key: 'userId', header: 'User', render: (t) => `#${t.userId}` },
    {
      key: 'type', header: 'Type',
      render: (t) => <Badge variant={t.type === 'top_up' ? 'online' : t.type === 'reading_charge' ? 'pink' : 'gold'}>{t.type.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (t) => <span className={`price price--sm ${t.amount >= 0 ? 'price--positive' : 'price--negative'}`}>{t.amount >= 0 ? '+' : ''}{centsToPrice(Math.abs(t.amount))}</span>,
    },
    { key: 'description', header: 'Description', render: (t) => t.description || '—' },
    { key: 'createdAt', header: 'Date', sortable: true, render: (t) => new Date(t.createdAt).toLocaleDateString() },
  ];

  if (loading) return <LoadingPage message="Loading admin dashboard..." />;

  const totalRevenue = readings.reduce((s, r) => s + (r.totalCost || 0), 0);
  const onlineReaders = users.filter((u) => u.role === 'reader' && u.isActive).length;
  const unresolvedFlags = flags.filter((f) => !f.resolved).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid--4">
        <Stat label="Total Users" value={users.length} icon="👥" />
        <Stat label="Active Readers" value={onlineReaders} icon="🔮" />
        <Stat label="Total Revenue" value={centsToPrice(totalRevenue)} icon="💰" />
        <Stat
          label="Flagged"
          value={unresolvedFlags}
          icon="🛡️"
        />
      </div>

      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Overview */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="grid grid--2" style={{ gap: 'var(--space-6)' }}>
          <Card variant="static">
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Recent Readings</h4>
            <Table
              columns={readingColumns.slice(0, 5)}
              data={readings.slice(0, 5)}
              keyExtractor={(r) => r.id}
              emptyMessage="No readings yet"
            />
          </Card>
          <Card variant="static">
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Flagged Content ({unresolvedFlags})</h4>
            {unresolvedFlags === 0 ? (
              <EmptyState icon="✅" title="No Flagged Content" description="All clear!" />
            ) : (
              <div className="flex flex-col gap-2">
                {flags.filter((f) => !f.resolved).slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between" style={{ padding: 'var(--space-3)', background: 'var(--surface-card)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem' }}>Post #{f.postId}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.reason}</p>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => handleResolveFlag(f.id)}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </TabPanel>

      {/* Users */}
      <TabPanel id="users" activeTab={activeTab}>
        <div className="flex gap-4 items-center flex-wrap" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search users..." />
          </div>
          <Select
            options={[
              { value: '', label: 'All Roles' },
              { value: 'client', label: 'Clients' },
              { value: 'reader', label: 'Readers' },
              { value: 'admin', label: 'Admins' },
            ]}
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
          />
          <Button variant="primary" onClick={() => setCreateReaderOpen(true)}>
            + Create Reader
          </Button>
        </div>
        <Table
          columns={userColumns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          emptyMessage="No users found"
        />
      </TabPanel>

      {/* Readings */}
      <TabPanel id="readings" activeTab={activeTab}>
        <Table
          columns={readingColumns}
          data={readings}
          keyExtractor={(r) => r.id}
          emptyMessage="No readings yet"
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

      {/* Moderation */}
      <TabPanel id="moderation" activeTab={activeTab}>
        {flags.length === 0 ? (
          <EmptyState icon="✅" title="No Flagged Content" description="Community is behaving well." />
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map((f) => (
              <Card key={f.id} variant={f.resolved ? 'static' : 'glow-pink'}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={f.resolved ? 'online' : 'danger'}>
                        {f.resolved ? 'Resolved' : 'Pending'}
                      </Badge>
                      <span>Post #{f.postId}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                      Reported by #{f.reporterId}: {f.reason}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(f.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!f.resolved && (
                    <Button size="sm" variant="primary" onClick={() => handleResolveFlag(f.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabPanel>

      {/* ─── Create Reader Modal ──────────────────────────── */}
      <Modal
        open={createReaderOpen}
        onClose={() => setCreateReaderOpen(false)}
        title="Create Reader Account"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateReaderOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateReader} loading={creatingReader}>
              Create Reader
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={newReader.email}
            onChange={(e) => setNewReader((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <Input
            label="Display Name"
            value={newReader.displayName}
            onChange={(e) => setNewReader((p) => ({ ...p, displayName: e.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            value={newReader.password}
            onChange={(e) => setNewReader((p) => ({ ...p, password: e.target.value }))}
            help="Leave blank for Auth0 invite"
          />
        </div>
      </Modal>

      {/* ─── Adjust Balance Modal ─────────────────────────── */}
      <Modal
        open={!!adjustBalanceUser}
        onClose={() => setAdjustBalanceUser(null)}
        title={`Adjust Balance — ${adjustBalanceUser?.email}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustBalanceUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdjustBalance} loading={adjusting}>
              Adjust Balance
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Current: <strong className="price">{centsToPrice(adjustBalanceUser?.balance ?? 0)}</strong>
          </p>
          <Input
            label="Amount ($)"
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            help="Positive to add, negative to deduct"
            step="0.01"
          />
          <Textarea
            label="Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Reason for adjustment..."
          />
        </div>
      </Modal>

      {/* ─── Confirm Dialog ───────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.onConfirm()}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        variant="danger"
      />
    </div>
  );
}
