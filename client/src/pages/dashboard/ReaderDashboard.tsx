// ============================================================
// ReaderDashboard — Online toggle, pricing, earnings, sessions, reviews
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { readersApi, readingsApi, balanceApi } from '../../services/api';
import type { ReadingWithUsers, Transaction } from '../../types';

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

export function ReaderDashboard() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'earnings' | 'settings'>('overview');
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Pricing
  const [pricingChat, setPricingChat] = useState(0);
  const [pricingVoice, setPricingVoice] = useState(0);
  const [pricingVideo, setPricingVideo] = useState(0);
  const [savingPricing, setSavingPricing] = useState(false);

  const [sessions, setSessions] = useState<ReadingWithUsers[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Load current pricing from user profile
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const me = await readersApi.getReader(user?.id ?? 0);
        setPricingChat(me.pricingChat);
        setPricingVoice(me.pricingVoice);
        setPricingVideo(me.pricingVideo);
      } catch {
        // Use defaults if we can't fetch
      }
    };
    if (user?.id) loadPricing();
  }, [user?.id]);

  const handleToggleOnline = useCallback(async () => {
    setTogglingOnline(true);
    try {
      const newStatus = !isOnline;
      await readersApi.toggleOnline(newStatus);
      setIsOnline(newStatus);
      addToast('success', newStatus ? "You're now online!" : "You're now offline.");
      refreshUser();
    } catch {
      addToast('error', 'Failed to update status');
    } finally {
      setTogglingOnline(false);
    }
  }, [isOnline, addToast, refreshUser]);

  const handleSavePricing = useCallback(async () => {
    setSavingPricing(true);
    try {
      await readersApi.updatePricing({ pricingChat, pricingVoice, pricingVideo });
      addToast('success', 'Pricing updated!');
    } catch {
      addToast('error', 'Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  }, [pricingChat, pricingVoice, pricingVideo, addToast]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'earnings') fetchTransactions();
  }, [activeTab]);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const result = await readingsApi.getHistory({ limit: 30 });
      setSessions(result.readings);
    } catch {
      addToast('error', 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const result = await balanceApi.getTransactions({ limit: 30 });
      setTransactions(result.transactions);
    } catch {
      addToast('error', 'Failed to load earnings');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const totalEarnings = transactions
    .filter((t) => t.type === 'reading_charge' && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      {/* Online Toggle Banner */}
      <div
        className="card-static"
        style={{
          padding: '20px 28px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: isOnline
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), var(--surface-card))'
            : 'var(--surface-card)',
          border: isOnline ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className={isOnline ? 'badge badge-online' : 'badge badge-offline'}
              style={{ fontSize: '0.8rem' }}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginTop: '4px' }}>
            {isOnline ? 'Clients can see you and request readings.' : 'Toggle online to accept readings.'}
          </p>
        </div>
        <button
          onClick={handleToggleOnline}
          className={`btn btn-sm ${isOnline ? 'btn-secondary' : 'btn-primary'}`}
          disabled={togglingOnline}
        >
          {togglingOnline ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Balance */}
      <div
        className="card-static"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          border: '1px solid var(--border-gold)',
        }}
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '4px' }}>
          Current Balance
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'var(--font-body)' }}>
          {formatCents(user?.accountBalance ?? 0)}
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {(['overview', 'sessions', 'earnings', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatCard label="Status" value={isOnline ? '🟢 Online' : '⚫ Offline'} />
          <StatCard label="Chat Rate" value={pricingChat > 0 ? `${formatCents(pricingChat)}/min` : 'Not set'} />
          <StatCard label="Voice Rate" value={pricingVoice > 0 ? `${formatCents(pricingVoice)}/min` : 'Not set'} />
          <StatCard label="Video Rate" value={pricingVideo > 0 ? `${formatCents(pricingVideo)}/min` : 'Not set'} />
        </div>
      )}

      {/* Sessions */}
      {activeTab === 'sessions' && (
        isLoadingSessions ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>No Sessions Yet</h3>
            <p style={{ marginTop: '8px' }}>Go online to start receiving reading requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((session) => (
              <div key={session.id} className="card-static" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', margin: 0 }}>
                      {session.client?.fullName || session.client?.username || 'Client'}
                    </h4>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="badge badge-pink" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                        {session.type}
                      </span>
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="price">{formatCents(session.totalPrice)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                      {session.billedMinutes} min • {formatDate(session.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Earnings */}
      {activeTab === 'earnings' && (
        <>
          <div className="card-static" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '4px' }}>
              Total Earnings
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#86EFAC' }}>
              {formatCents(totalEarnings)}
            </p>
          </div>
          {isLoadingTransactions ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <p>No earnings yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.map((tx) => (
                <div key={tx.id} className="card-static" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '0.88rem', textTransform: 'capitalize', fontWeight: 500 }}>
                      {tx.type.replace('_', ' ')}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: tx.amount > 0 ? '#86EFAC' : '#FCA5A5' }}>
                        {tx.amount > 0 ? '+' : ''}{formatCents(tx.amount)}
                      </span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div className="card-static" style={{ padding: '28px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--primary-pink)',
              fontSize: '1.5rem',
              marginBottom: '20px',
            }}
          >
            Pricing Settings
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '20px' }}>
            Set your per-minute rates in cents (e.g., 500 = $5.00/min). Set to 0 to disable a reading type.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label>💬 Chat Rate (cents/min)</label>
              <input
                type="number"
                min={0}
                value={pricingChat}
                onChange={(e) => setPricingChat(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label>🎤 Voice Rate (cents/min)</label>
              <input
                type="number"
                min={0}
                value={pricingVoice}
                onChange={(e) => setPricingVoice(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label>📹 Video Rate (cents/min)</label>
              <input
                type="number"
                min={0}
                value={pricingVideo}
                onChange={(e) => setPricingVideo(parseInt(e.target.value) || 0)}
              />
            </div>
            <button
              onClick={handleSavePricing}
              className="btn btn-primary"
              disabled={savingPricing}
              style={{ alignSelf: 'flex-start' }}
            >
              {savingPricing ? 'Saving...' : 'Save Pricing'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-static" style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-light)' }}>{value}</p>
    </div>
  );
}
