// ============================================================
// ClientDashboard — Balance, add funds, reading & transaction history
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { balanceApi, readingsApi } from '../../services/api';
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

const ADD_AMOUNTS = [500, 1000, 2500, 5000]; // cents

export function ClientDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'transactions'>('overview');
  const [readings, setReadings] = useState<ReadingWithUsers[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);

  useEffect(() => {
    if (activeTab === 'readings') {
      fetchReadings();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchReadings = async () => {
    setIsLoadingReadings(true);
    try {
      const result = await readingsApi.getHistory({ limit: 20 });
      setReadings(result.readings);
    } catch {
      addToast('error', 'Failed to load reading history');
    } finally {
      setIsLoadingReadings(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const result = await balanceApi.getTransactions({ limit: 30 });
      setTransactions(result.transactions);
    } catch {
      addToast('error', 'Failed to load transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleAddFunds = async (amount: number) => {
    setAddingFunds(true);
    try {
      const result = await balanceApi.createCheckout(amount);
      window.location.href = result.url;
    } catch {
      addToast('error', 'Failed to start checkout. Please try again.');
    } finally {
      setAddingFunds(false);
    }
  };

  return (
    <>
      {/* Balance Card */}
      <div
        className="card-static"
        style={{
          padding: '28px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, var(--surface-card), var(--surface-elevated))',
          border: '1px solid var(--border-gold)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '4px' }}>
              Account Balance
            </p>
            <p
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--accent-gold)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {formatCents(user?.accountBalance ?? 0)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ADD_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAddFunds(amount)}
                className="btn btn-sm btn-secondary"
                disabled={addingFunds}
              >
                + {formatCents(amount)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'readings' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('readings')}
        >
          Reading History
        </button>
        <button
          className={`tab ${activeTab === 'transactions' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="card-static" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '6px' }}>
              Quick Actions
            </p>
            <Link to="/readers" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Find a Reader
            </Link>
          </div>
          <div className="card-static" style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '6px' }}>
              Community
            </p>
            <Link to="/community" className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }}>
              Visit Community Hub
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'readings' && (
        <div>
          {isLoadingReadings ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : readings.length === 0 ? (
            <div className="empty-state">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>No Readings Yet</h3>
              <p style={{ marginTop: '8px' }}>
                <Link to="/readers" style={{ color: 'var(--primary-pink)' }}>Browse readers</Link> to start your first reading.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {readings.map((reading) => (
                <div key={reading.id} className="card-static" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', margin: 0 }}>
                        {reading.reader?.fullName || reading.reader?.username || 'Reader'}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span className="badge badge-pink" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                          {reading.type}
                        </span>
                        <span className="badge badge-gold" style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                          {reading.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="price" style={{ fontSize: '0.95rem' }}>
                        {formatCents(reading.totalPrice)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                        {reading.billedMinutes} min • {formatDate(reading.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          {isLoadingTransactions ? (
            <div className="loading-container"><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>No Transactions</h3>
              <p style={{ marginTop: '8px' }}>Your transaction history will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {transactions.map((tx) => (
                <div key={tx.id} className="card-static" style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          color: tx.amount > 0 ? '#86EFAC' : '#FCA5A5',
                        }}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                      {tx.note && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginTop: '2px' }}>
                          {tx.note}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-body)',
                          color: tx.amount > 0 ? '#86EFAC' : '#FCA5A5',
                        }}
                      >
                        {tx.amount > 0 ? '+' : ''}{formatCents(tx.amount)}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                        Balance: {formatCents(tx.balanceAfter)} • {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
