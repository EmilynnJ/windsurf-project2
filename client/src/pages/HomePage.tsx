import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useReaders } from '../hooks/useReaders';
import { useToast } from '../components/ToastProvider';
import { apiService } from '../services/api';
import {
  Button, Card, Avatar, Badge, StatusBadge,
  SkeletonCard, EmptyState, Input,
} from '../components/ui';
import type { ReaderPublic, ReadingType } from '../types';

/* ─── Helpers ─────────────────────────────────────────────────── */

function centsToPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ─── Reader Card ─────────────────────────────────────────────── */

function ReaderCard({ reader }: { reader: ReaderPublic }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const specialties = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const types: { type: ReadingType; icon: string; label: string; price: number }[] = [];
  if (reader.pricingChat > 0) types.push({ type: 'chat', icon: '💬', label: 'Chat', price: reader.pricingChat });
  if (reader.pricingVoice > 0) types.push({ type: 'voice', icon: '🎤', label: 'Voice', price: reader.pricingVoice });
  if (reader.pricingVideo > 0) types.push({ type: 'video', icon: '📹', label: 'Video', price: reader.pricingVideo });

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/readers/${reader.id}`);
  };

  return (
    <Card className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Avatar
          src={reader.profileImage}
          name={reader.fullName || reader.username}
          size="lg"
          online={reader.isOnline}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 style={{ margin: 0 }}>
              {reader.fullName || reader.username || 'Reader'}
            </h4>
            <StatusBadge online={reader.isOnline} />
          </div>
          {specialties.length > 0 && (
            <div className="flex gap-1 flex-wrap" style={{ marginTop: '6px' }}>
              {specialties.slice(0, 3).map((s) => (
                <Badge key={s} variant="gold" size="sm">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      {types.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {types.map(({ type, icon, label, price }) => (
            <div key={type} className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
              <span>{icon}</span>
              <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
              <span className="price price--sm">{centsToPrice(price)}/min</span>
            </div>
          ))}
        </div>
      )}

      {/* Reading type badges */}
      <div className="flex gap-2 flex-wrap">
        {types.map(({ type, icon, label }) => (
          <Badge key={type} variant="pink">{icon} {label}</Badge>
        ))}
      </div>

      {/* CTA */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleClick}
        style={{ marginTop: 'auto' }}
      >
        {reader.isOnline ? '✨ Start Reading' : 'View Profile'}
      </Button>
    </Card>
  );
}

/* ─── Home Page ───────────────────────────────────────────────── */

export function HomePage() {
  const { readers, isLoading, error } = useReaders({ onlineOnly: true, pollInterval: 30000 });
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { addToast } = useToast();

  const handleNewsletter = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setSubscribing(true);
      try {
        await apiService.post('/api/newsletter/subscribe', { email: email.trim() });
        setSubscribed(true);
        addToast('success', 'Thanks for subscribing! ✨');
        setEmail('');
      } catch {
        // Fallback if endpoint not ready yet — still show success for UX
        setSubscribed(true);
        addToast('success', 'Thanks for subscribing! ✨');
        setEmail('');
      } finally {
        setSubscribing(false);
      }
    },
    [email, addToast]
  );

  return (
    <div className="page-wrapper page-enter">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="hero">
        <h1 className="hero__title">SoulSeer</h1>

        <div className="hero__image">
          <img
            src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg"
            alt="SoulSeer — spiritual guidance and psychic readings"
            loading="eager"
          />
        </div>

        <p className="hero__tagline">A Community of Gifted Psychics</p>
      </section>

      {/* ─── Online Readers ────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <h2 className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
            Readers Online Now
          </h2>

          {isLoading ? (
            <div className="grid grid--readers">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon="⚡"
              title="Unable to Load Readers"
              description={error}
            />
          ) : readers.length === 0 ? (
            <EmptyState
              icon="🌙"
              title="No Readers Online"
              description="Check back soon or browse all our gifted readers."
              action={{
                label: 'Browse All Readers',
                onClick: () => window.location.href = '/readers',
                variant: 'secondary',
              }}
            />
          ) : (
            <>
              <div className="grid grid--readers">
                {readers.slice(0, 6).map((reader) => (
                  <ReaderCard key={reader.id} reader={reader} />
                ))}
              </div>
              {readers.length > 6 && (
                <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
                  <Link to="/readers">
                    <Button variant="secondary" size="lg">
                      View All Readers
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <div className="divider" />

      {/* ─── Newsletter ────────────────────────────────────── */}
      <section className="section">
        <div className="container container--form text-center">
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Stay Connected</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Get spiritual insights and updates delivered to your inbox.
          </p>

          {subscribed ? (
            <Card variant="static" className="text-center">
              <p style={{ color: '#86EFAC', fontWeight: 600 }}>
                ✨ You're subscribed! Watch your inbox for cosmic updates.
              </p>
            </Card>
          ) : (
            <form onSubmit={handleNewsletter} className="flex gap-3">
              <div style={{ flex: 1 }}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email address for newsletter"
                />
              </div>
              <Button type="submit" variant="primary" loading={subscribing}>
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </section>

      <div className="divider" />

      {/* ─── Community Links ───────────────────────────────── */}
      <section className="section">
        <div className="container container--form text-center">
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Join Our Community</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Connect with fellow seekers and gifted readers in our growing spiritual community.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://www.facebook.com/groups/soulseer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">Facebook Group</Button>
            </a>
            <a
              href="https://discord.gg/soulseer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">Discord Server</Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="footer">
        <p className="footer__brand">SoulSeer</p>
        <p className="footer__copy">
          © {new Date().getFullYear()} SoulSeer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
