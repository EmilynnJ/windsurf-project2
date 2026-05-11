<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Mock data for online readers
const mockOnlineReaders = [
  { id: 1, name: 'Luna Starweaver', specialty: 'Tarot & Spirituality', rating: 4.9, online: true, avatar: '🌟' },
  { id: 2, name: 'Phoenix Mystique', specialty: 'Psychic Readings', rating: 4.8, online: true, avatar: '🔮' },
  { id: 3, name: 'Oracle Moonchild', specialty: 'Clairvoyance', rating: 4.7, online: true, avatar: '🌙' },
  { id: 4, name: 'Cosmic Sage', specialty: 'Astrology', rating: 4.9, online: true, avatar: '⭐' },
  { id: 5, name: 'Seraphina Lightbringer', specialty: 'Angel Cards', rating: 4.6, online: true, avatar: '👼' },
  { id: 6, name: 'Mystic Willow', specialty: 'Palm Reading', rating: 4.8, online: true, avatar: '🍃' },
];

export function HomePage() {
  const [onlineReaders, setOnlineReaders] = useState(mockOnlineReaders);
  const [featuredReaders, setFeaturedReaders] = useState([]);

  useEffect(() => {
    // In a real app, this would fetch from an API
    setFeaturedReaders(mockOnlineReaders.slice(0, 3));
  }, []);

  return (
    <div className="home-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif'
    }}>
      {/* Hero Section */}
      <section className="hero-section" style={{
        padding: '4rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '70vh',
        flexDirection: 'column'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h1 className="gradient-text" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 'bold', marginBottom: '1.5rem' }}>SoulSeer</h1>
          <p style={{ 
            fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', 
            color: 'var(--text-muted)', 
            marginBottom: '2rem', 
            maxWidth: '600px', 
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            Connect with gifted psychics and spiritual guides for transformative readings
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Link to="/readers" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              Find a Psychic
            </Link>
            <Link to="/community" className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              Join Community
            </Link>
          </div>
        </div>
      </section>

      {/* Online Readers Section */}
      <section className="online-readers-section" style={{ padding: '3rem 0', backgroundColor: 'rgba(15, 15, 31, 0.2)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold' }}>Available Psychics</h2>
            <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '0.5rem', animation: 'pulse 1.5s infinite' }}></span>
              {onlineReaders.length} Online Now
            </span>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {onlineReaders.map(reader => (
              <div key={reader.id} className="card" style={{ 
                padding: '1.5rem', 
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }} onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
              }} onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>{reader.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>{reader.name}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{reader.specialty}</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#FBBF24', marginRight: '0.25rem' }}>★</span>
                    <span>{reader.rating}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1, marginRight: '0.75rem' }}>
                    View Profile
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#10B981', border: 'none' }}>
                    Chat Now
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/readers" className="btn btn-outline">
              Browse All Psychics ({mockOnlineReaders.length})
=======
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReaders } from '../hooks/useReaders';
import { useToast } from '../components/ToastProvider';
import { apiService } from '../services/api';
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
            💬 <span className="reader-card__rate-value">${(reader.pricingChat / 100).toFixed(2)}</span>/min
          </span>
        )}
        {reader.pricingVoice > 0 && (
          <span className="reader-card__rate">
            🎙️ <span className="reader-card__rate-value">${(reader.pricingVoice / 100).toFixed(2)}</span>/min
          </span>
        )}
        {reader.pricingVideo > 0 && (
          <span className="reader-card__rate">
            📹 <span className="reader-card__rate-value">${(reader.pricingVideo / 100).toFixed(2)}</span>/min
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
        await apiService.post('/api/newsletter/subscribe', { email: email.trim() });
        addToast('success', 'Welcome to the SoulSeer community! ✨');
        setEmail('');
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong. Please try again.';
        addToast('error', message);
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
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
            </Link>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      {/* Featured Readers */}
      <section className="featured-readers-section" style={{ padding: '3rem 0' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>Featured Psychics</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {featuredReaders.map(reader => (
              <div key={reader.id} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', margin: '0 auto 1rem' }}>{reader.avatar}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{reader.name}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{reader.specialty}</p>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: '#FBBF24', marginRight: '0.25rem' }}>★</span>
                  <span>{reader.rating} Rating</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Book Reading
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Hub Preview */}
      <section className="community-section" style={{ padding: '3rem 0', backgroundColor: 'rgba(15, 15, 31, 0.2)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>Spiritual Community</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem' 
          }}>
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Community Forums</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Connect with like-minded souls and share experiences</p>
              <Link to="/community" className="btn btn-outline">
                Join Discussion
              </Link>
            </div>
            
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎓</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Workshops & Events</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Participate in spiritual growth events</p>
              <Link to="/events" className="btn btn-outline">
                View Events
              </Link>
            </div>
            
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Resources</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Guides and articles for spiritual development</p>
              <Link to="/resources" className="btn btn-outline">
                Explore
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{ padding: '4rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 'bold', marginBottom: '1.5rem' }}>Begin Your Spiritual Journey</h2>
          <p style={{ 
            fontSize: 'clamp(1.125rem, 2vw, 1.25rem)', 
            color: 'var(--text-muted)', 
            marginBottom: '2rem', 
            maxWidth: '600px', 
            margin: '0 auto 2rem',
            lineHeight: '1.6'
          }}>
            Connect with our community of gifted psychics and discover insights that will illuminate your path
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Link to="/signup" className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              Create Account
            </Link>
            <Link to="/readers" className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
              Browse Psychics
            </Link>
=======
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
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
          </div>
        </div>
      </section>
    </div>
  );
}
