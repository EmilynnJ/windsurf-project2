import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReaders } from '../hooks/useReaders';
import { useToast } from '../components/ToastProvider';
import {
  Button,
  Avatar,
  Badge,
  StatusBadge,
  SkeletonCard,
} from '../components/ui';
import type { ReaderPublic } from '../types';

/* ── Reader Card ────────────────────────────────────────────── */
function ReaderCard({ reader }: { reader: ReaderPublic }) {
  const navigate = useNavigate();
  const name = reader.fullName || reader.username || 'Reader';
  const specialties = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="card card--interactive reader-card"
      onClick={() => navigate(`/readers/${reader.id}`)}
      role="link"
      tabIndex={0}
      aria-label={`View ${name}'s profile`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/readers/${reader.id}`);
        }
      }}
    >
      <Avatar
        src={reader.profileImage || reader.avatar}
        name={name}
        size="xl"
        online={reader.isOnline}
      />
      <h3 className="reader-card__name">{name}</h3>
      <StatusBadge online={reader.isOnline} />
      {specialties.length > 0 && (
        <div className="reader-card__specialties">
          {specialties.slice(0, 3).map((s) => (
            <Badge key={s} variant="gold" size="sm">{s}</Badge>
          ))}
        </div>
      )}
      <div className="reader-card__rates">
        {reader.pricingChat > 0 && (
          <span className="reader-card__rate">
            💬 <span className="reader-card__rate-value">${reader.pricingChat.toFixed(2)}</span>/min
          </span>
        )}
        {reader.pricingVoice > 0 && (
          <span className="reader-card__rate">
            🎙️ <span className="reader-card__rate-value">${reader.pricingVoice.toFixed(2)}</span>/min
          </span>
        )}
        {reader.pricingVideo > 0 && (
          <span className="reader-card__rate">
            📹 <span className="reader-card__rate-value">${reader.pricingVideo.toFixed(2)}</span>/min
          </span>
        )}
      </div>
      <Link
        to={`/readers/${reader.id}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Start reading with ${name}`}
      >
        <Button variant="primary" size="sm" className="btn--glow">
          Start Reading
        </Button>
      </Link>
    </div>
  );
}

/* ── Home Page ──────────────────────────────────────────────── */
export function HomePage() {
  const { readers, isLoading } = useReaders({ onlineOnly: true, pollInterval: 30000 });
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletter = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || !email.includes('@')) {
        addToast('error', 'Please enter a valid email address.');
        return;
      }
      setSubmitting(true);
      try {
        // Simulated newsletter signup
        await new Promise((r) => setTimeout(r, 800));
        addToast('success', 'Welcome to the SoulSeer community! ✨');
        setEmail('');
      } catch {
        addToast('error', 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, addToast]
  );

  return (
    <div className="page-enter">
      {/* ── Hero Section ─────────────────────────────── */}
      <section className="section section--hero section--cosmic">
        <div className="container">
          <h1 className="heading-1 hero__title">SoulSeer</h1>
          <div className="hero__image">
            <img
              src="https://i.postimg.cc/tRLSgCPb/HERO-IMAGE-1.jpg"
              alt="SoulSeer — mystical cosmic imagery representing spiritual connection"
              loading="eager"
            />
          </div>
          <p className="hero__tagline">A Community of Gifted Psychics</p>
          <div className="divider" />
        </div>
      </section>

      {/* ── Online Readers ───────────────────────────── */}
      <section className="section section--cosmic">
        <div className="container">
          <div className="section-title">
            <h2 className="section-title__text">Readers Online Now</h2>
            <p className="section-title__sub">
              Connect instantly with a gifted psychic
            </p>
            <div className="section-title__divider" />
          </div>

          {isLoading ? (
            <div className="grid grid--readers">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : readers.length === 0 ? (
            <div className="card card--static text-center">
              <div className="flex flex-col gap-4 items-center">
                <span className="empty-state__icon" aria-hidden="true">🌙</span>
                <p className="body-text">
                  No readers are online right now. Check back soon or browse all
                  our readers to find someone who resonates with you.
                </p>
                <Link to="/readers">
                  <Button variant="secondary">Browse All Readers</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid--readers">
              {readers.map((reader) => (
                <ReaderCard key={reader.id} reader={reader} />
              ))}
            </div>
          )}

          <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
            <Link to="/readers">
              <Button variant="secondary" size="lg">
                View All Readers →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Newsletter Signup ────────────────────────── */}
      <section className="section">
        <div className="container container--narrow text-center">
          <div className="section-title">
            <h2 className="section-title__text">Stay Connected</h2>
            <p className="section-title__sub">
              Receive spiritual insights and community updates
            </p>
            <div className="section-title__divider" />
          </div>
          <form className="newsletter" onSubmit={handleNewsletter}>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address for newsletter"
              required
            />
            <Button
              type="submit"
              variant="gold"
              loading={submitting}
              disabled={submitting}
            >
              Subscribe
            </Button>
          </form>
        </div>
      </section>

      {/* ── Community Links ──────────────────────────── */}
      <section className="section section--cosmic">
        <div className="container container--narrow">
          <div className="section-title">
            <h2 className="section-title__text">Join Our Community</h2>
            <p className="section-title__sub">
              Connect with fellow seekers beyond the app
            </p>
            <div className="section-title__divider" />
          </div>
          <div className="grid grid--2">
            <a
              href="https://www.facebook.com/groups/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="card card--interactive community-link"
              aria-label="Join SoulSeer Facebook Group (opens in new tab)"
            >
              <span className="community-link__icon" aria-hidden="true">📘</span>
              <div>
                <p className="community-link__title">Facebook Group</p>
                <p className="community-link__desc">
                  Share experiences, ask questions, and connect with our
                  spiritual community on Facebook.
                </p>
              </div>
            </a>
            <a
              href="https://discord.gg/soulseer"
              target="_blank"
              rel="noopener noreferrer"
              className="card card--interactive community-link"
              aria-label="Join SoulSeer Discord Server (opens in new tab)"
            >
              <span className="community-link__icon" aria-hidden="true">💜</span>
              <div>
                <p className="community-link__title">Discord Server</p>
                <p className="community-link__desc">
                  Real-time conversations, events, and community chats
                  in our Discord server.
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
