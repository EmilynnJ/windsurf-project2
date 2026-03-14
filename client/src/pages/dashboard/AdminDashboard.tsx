// ============================================================
// AdminDashboard — User management, readings, transactions, forum moderation
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import { adminApi, forumApi } from '../../services/api';
import type { User, ReadingWithUsers, Transaction, ForumPost, UserRole } from '../../types';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type AdminTab = 'users' | 'readings' | 'transactions' | 'forum' | 'balance';

export function AdminDashboard() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  // Readings
  const [readings, setReadings] = useState<ReadingWithUsers[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Forum
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Balance adjustment
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    loadTabData();
  }, [activeTab, roleFilter]);

  const loadTabData = useCallback(async () => {
    try {
      switch (activeTab) {
        case 'users': {
          setUsersLoading(true);
          const result = await adminApi.getUsers({ role: roleFilter || undefined, limit: 50 });
          setUsers(result.users);
          setUsersLoading(false);
          break;
        }
        case 'readings': {
          setReadingsLoading(true);
          const result = await adminApi.getReadings({ limit: 30 });
          setReadings(result.readings);
          setReadingsLoading(false);
          break;
        }
        case 'transactions': {
          setTxLoading(true);
          const result = await adminApi.getTransactions({ limit: 50 });
          setTransactions(result.transactions);
          setTxLoading(false);
          break;
        }
        case 'forum': {
          setPostsLoading(true);
          const result = await forumApi.getPosts({ limit: 30 });
          setPosts(result.posts);
          setPostsLoading(false);
          break;
        }
      }
    } catch {
      addToast('error', 'Failed to load data');
      setUsersLoading(false);
      setReadingsLoading(false);
      setTxLoading(false);
      setPostsLoading(false);
    }
  }, [activeTab, roleFilter, addToast]);

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      addToast('success', 'User role updated');
      loadTabData();
    } catch {
      addToast('error', 'Failed to update role');
    }
  };

  const handleBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = parseInt(adjustUserId);
    const amount = parseInt(adjustAmount);
    if (isNaN(userId) || isNaN(amount) || !adjustNote.trim()) {
      addToast('warning', 'Please fill all fields correctly');
      return;
    }
    setAdjusting(true);
    try {
      await adminApi.adjustBalance(userId, amount, adjustNote);
      addToast('success', 'Balance adjusted');
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustNote('');
    } catch {
      addToast('error', 'Failed to adjust balance');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await forumApi.deletePost(postId);
      addToast('success', 'Post deleted');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      addToast('error', 'Failed to delete post');
    }
  };

  const handlePayout = async (readerId: number) => {
    try {
      await adminApi.triggerPayout(readerId);
      addToast('success', 'Payout triggered');
    } catch {
      addToast('error', 'Failed to trigger payout');
    }
  };

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'readings', label: 'Readings' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'balance', label: 'Balance Adjust' },
    { key: 'forum', label: 'Forum' },
  ];

  return (
    <>
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== USERS TAB ========== */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['', 'client', 'reader', 'admin'].map((role) => (
              <button
                key={role}
                className={`btn btn-sm ${roleFilter === role ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRoleFilter(role)}
              >
                {role || 'All'}
              </button>
            ))}
          </div>
          {usersLoading ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['ID', 'Name', 'Email', 'Role', 'Balance', 'Online', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-light-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px' }}>{u.id}</td>
                      <td style={{ padding: '10px 12px' }}>{u.fullName || u.username || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-light-muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '80px' }}
                        >
                          <option value="client">Client</option>
                          <option value="reader">Reader</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }} className="price">{formatCents(u.accountBalance)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={u.isOnline ? 'badge badge-online' : 'badge badge-offline'} style={{ fontSize: '0.6rem' }}>
                          {u.isOnline ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.role === 'reader' && (
                          <button
                            onClick={() => handlePayout(u.id)}
                            className="btn btn-sm btn-gold"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Payout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========== READINGS TAB ========== */}
      {activeTab === 'readings' && (
        readingsLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : readings.length === 0 ? (
          <div className="empty-state"><p>No readings found.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {readings.map((r) => (
              <div key={r.id} className="card-static" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Reading #{r.id} — {r.type}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)' }}>
                      Reader: {r.reader?.fullName || r.readerId} → Client: {r.client?.fullName || r.clientId}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                      {r.status.replace('_', ' ')}
                    </span>
                    <p className="price" style={{ marginTop: '4px' }}>{formatCents(r.totalPrice)}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>{formatDate(r.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ========== TRANSACTIONS TAB ========== */}
      {activeTab === 'transactions' && (
        txLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state"><p>No transactions found.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['ID', 'User', 'Type', 'Amount', 'Balance After', 'Date'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-light-muted)', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px' }}>{tx.id}</td>
                    <td style={{ padding: '10px 12px' }}>{tx.userId}</td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{tx.type.replace('_', ' ')}</td>
                    <td style={{ padding: '10px 12px', color: tx.amount > 0 ? '#86EFAC' : '#FCA5A5', fontWeight: 600 }}>
                      {tx.amount > 0 ? '+' : ''}{formatCents(tx.amount)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{formatCents(tx.balanceAfter)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-light-muted)' }}>{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ========== BALANCE ADJUST TAB ========== */}
      {activeTab === 'balance' && (
        <div className="card-static" style={{ padding: '28px', maxWidth: '500px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-pink)', fontSize: '1.5rem', marginBottom: '20px' }}>
            Adjust User Balance
          </h3>
          <form onSubmit={handleBalanceAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label>User ID</label>
              <input
                type="number"
                placeholder="Enter user ID"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Amount (cents, negative to deduct)</label>
              <input
                type="number"
                placeholder="e.g. 1000 for $10, -500 for -$5"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Note / Reason</label>
              <input
                type="text"
                placeholder="Reason for adjustment"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-gold" disabled={adjusting} style={{ alignSelf: 'flex-start' }}>
              {adjusting ? 'Processing...' : 'Apply Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* ========== FORUM MODERATION TAB ========== */}
      {activeTab === 'forum' && (
        postsLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state"><p>No forum posts.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {posts.map((post) => (
              <div key={post.id} className="card-static" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>{post.category}</span>
                      {post.flagCount > 0 && (
                        <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                          🚩 {post.flagCount} flags
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{post.title}</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)', marginTop: '4px' }}>
                      by {post.author?.fullName || post.author?.username || 'Unknown'} • {formatDate(post.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="btn btn-sm"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.78rem', padding: '6px 12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
