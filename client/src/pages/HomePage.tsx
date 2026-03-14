// ============================================================
// HomePage — Landing page with hero, online readers, newsletter
// ============================================================

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useReaders } from '../hooks/useReaders';
import { useToast } from '../components/ToastProvider';
import type { ReaderPublic, ReadingType } from '../types';

function formatCentsToPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ReaderCard({ reader }: { reader: ReaderPublic }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStartReading = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/readers/${reader.id}`);
  };

  const specialtiesArray = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const availableTypes: ReadingType[] = [];
  if (reader.pricingChat > 0) availableTypes.push('chat');
  if (reader.pricingVoice > 0) availableTypes.push('voice');
  if (reader.pricingVideo > 0) availableTypes.push('video');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {reader.profileImage ? (
          <img
            src={reader.profileImage}
            alt={reader.fullName || reader.username || 'Reader'}
            className="avatar-lg"
            style={{ flexShrink: 0 }}
          />
        ) : (
          <div
            className="avatar-lg"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-elevated)',
              color: 'var(--primary-pink)',
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
            }}
          >
            {(reader.fullName || reader.username || '?')[0]}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1.05rem', margin: 0 }}>
              {reader.fullName || reader.username || 'Reader'}
            </h4>
            <span className={reader.isOnline ? 'badge badge-online' : 'badge badge-offline'}>
              {reader.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {specialtiesArray.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
              {specialtiesArray.slice(0, 3).map((s) => (
                <span key={s} className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {reader.pricingChat > 0 && (
          <PriceTag type="Chat" price={reader.pricingChat} />
        )}
        {reader.pricingVoice > 0 && (
          <PriceTag type="Voice" price={reader.pricingVoice} />
        )}
        {reader.pricingVideo > 0 && (
          <PriceTag type="Video" price={reader.pricingVideo} />
        )}
      </div>

      {/* Reading types available */}
      {availableTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {availableTypes.map((type) => (
            <span
              key={type}
              className="badge badge-pink"
              style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
            >
              {type === 'chat' ? '💬' : type === 'voice' ? '🎤' : '📹'} {type}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleStartReading}
        className="btn btn-primary btn-sm"
        style={{ width: '100%', marginTop: 'auto' }}
      >
        {reader.isOnline ? 'Start Reading' : 'View Profile'}
      </button>
    </div>
  );
}

function PriceTag({ type, price }: { type: string; price: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{ color: 'var(--text-light-muted)' }}>{type}:</span>
      <span className="price">{formatCentsToPrice(price)}/min</span>
    </div>
  );
}

export function HomePage() {
  const { readers, isLoading, error } = useReaders({ onlineOnly: true, pollInterval: 30000 });
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { addToast } = useToast();

  const handleNewsletter = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      // In production this would call a newsletter API
      setSubscribed(true);
      addToast('success', 'Thanks for subscribing! ✨');
      setEmail('');
    },
    [email, addToast]
  );

  return (
    <div className="page-content page-enter">
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--primary-pink)',
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            marginBottom: '24px',
            textShadow: '0 0 40px rgba(255, 105, 180, 0.3)',
          }}
        >
          SoulSeer
        </h1>

        {/* Hero Image */}
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto 28px',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--border-gold)',
            boxShadow: '0 8px 40px rgba(212, 175, 55, 0.15)',
          }}
        >
          <img
            src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg"
            alt="SoulSeer — spiritual guidance and psychic readings"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            loading="eager"
          />
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            color: 'var(--text-light)',
            fontWeight: 500,
            fontStyle: 'italic',
            marginBottom: '8px',
          }}
        >
          A Community of Gifted Psychics
        </p>
      </section>

      {/* Online Readers Section */}
      <section className="section" style={{ paddingTop: '32px' }}>
        <div className="container">
          <h2
            style={{
              textAlign: 'center',
              marginBottom: '32px',
            }}
          >
            Readers Online Now
          </h2>

          {isLoading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Finding available readers...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>Unable to load readers right now.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>{error}</p>
            </div>
          ) : readers.length === 0 ? (
            <div className="empty-state">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
                No Readers Online
              </h3>
              <p style={{ marginTop: '8px' }}>
                Check back soon or{' '}
                <Link to="/readers" style={{ color: 'var(--primary-pink)' }}>
                  browse all readers
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-readers">
              {readers.slice(0, 6).map((reader) => (
                <ReaderCard key={reader.id} reader={reader} />
              ))}
            </div>
          )}

          {readers.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Link to="/readers" className="btn btn-secondary">
                View All Readers
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="divider container" />

      {/* Newsletter Section */}
      <section className="section" style={{ paddingTop: '16px' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Stay Connected</h2>
          <p style={{ textAlign: 'center', marginBottom: '24px' }}>
            Get spiritual insights and updates delivered to your inbox.
          </p>

          {subscribed ? (
            <div
              className="card-static"
              style={{ textAlign: 'center', padding: '24px', background: 'rgba(34, 197, 94, 0.08)' }}
            >
              <p style={{ color: '#86EFAC', fontWeight: 600 }}>
                ✨ You're subscribed! Watch your inbox for cosmic updates.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleNewsletter}
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ flex: 1 }}
                  aria-label="Email address for newsletter"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flexShrink: 0 }}
                >
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <div className="divider container" />

      {/* Community Links Section */}
      <section className="section" style={{ paddingTop: '16px' }}>
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '12px' }}>Join Our Community</h2>
          <p style={{ marginBottom: '24px' }}>
            Connect with fellow seekers and gifted readers in our growing community.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://www.facebook.com/groups/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Facebook Group
            </a>
            <a
              href="https://discord.gg/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Discord Server
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '32px 20px',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '40px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--primary-pink)',
            fontSize: '1.5rem',
            marginBottom: '8px',
          }}
        >
          SoulSeer
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)' }}>
          © {new Date().getFullYear()} SoulSeer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
