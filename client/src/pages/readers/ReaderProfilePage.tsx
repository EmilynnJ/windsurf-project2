<<<<<<< HEAD
import { useParams } from 'react-router-dom';

interface Reader {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  online: boolean;
  avatar: string;
  experience: string;
  languages: string[];
  price: string;
  bio: string;
  skills: string[];
  availability: string[];
  reviews: Review[];
}

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// Mock data for a reader
const mockReader: Reader = {
  id: 1,
  name: 'Luna Starweaver',
  specialty: 'Tarot & Spirituality',
  rating: 4.9,
  online: true,
  avatar: '🌟',
  experience: '10 years',
  languages: ['English', 'Spanish'],
  price: '$2.99/min',
  bio: 'With over 10 years of experience in tarot and spiritual guidance, Luna helps her clients navigate life\'s challenges with clarity and insight. She specializes in love, career, and spiritual growth readings.',
  skills: ['Tarot Reading', 'Clairvoyance', 'Past Life Regression', 'Chakra Balancing', 'Aura Cleansing'],
  availability: ['Mon 10am-6pm EST', 'Tue 2pm-9pm EST', 'Wed 10am-6pm EST', 'Thu 12pm-8pm EST', 'Fri 10am-6pm EST'],
  reviews: [
    { id: 1, userName: 'Sarah M.', rating: 5, comment: 'Luna helped me see things clearly during a difficult time. Her insights were spot-on!', date: '2023-10-15' },
    { id: 2, userName: 'Michael T.', rating: 5, comment: 'Amazing reading! Luna was able to provide guidance that changed my perspective completely.', date: '2023-09-22' },
    { id: 3, userName: 'Jessica L.', rating: 4, comment: 'Very intuitive reader. She picked up on things I hadn\'t shared with anyone.', date: '2023-08-30' },
    { id: 4, userName: 'David K.', rating: 5, comment: 'Luna\'s energy was calming and her advice was practical and helpful.', date: '2023-07-18' },
  ]
};

export function ReaderProfilePage() {
  useParams();
  const reader = mockReader;

  return (
    <div className="reader-profile-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Profile Header */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>{reader.avatar}</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{reader.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '1rem' }}>{reader.specialty}</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ color: '#FBBF24', fontSize: '1.2rem' }}>★</span>
              <span style={{ fontSize: '1.1rem' }}>{reader.rating} ({reader.reviews.length} reviews)</span>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ 
                backgroundColor: 'rgba(107, 70, 193, 0.2)', 
                color: 'var(--primary-purple)',
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                {reader.experience} experience
              </span>
              <span style={{ 
                backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                color: 'var(--secondary-purple)',
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                {reader.price}
              </span>
              {reader.online ? (
                <span style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                  color: '#10B981',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '0.5rem', animation: 'pulse 1.5s infinite' }}></span>
                  Online Now
                </span>
              ) : (
                <span style={{ 
                  backgroundColor: 'rgba(156, 163, 175, 0.2)', 
                  color: '#9CA3AF',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem'
                }}>
                  Offline
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Start Reading Session
              </button>
              <button className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>About {reader.name.split(' ')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {reader.bio}
          </p>
        </div>

        {/* Skills Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Skills & Expertise</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {reader.skills.map((skill, index) => (
              <span 
                key={index}
                style={{ 
                  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                  color: 'var(--secondary-purple)',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem'
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Availability Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Availability</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reader.availability.map((time, index) => (
              <li 
                key={index}
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)'
                }}
              >
                {time}
              </li>
            ))}
          </ul>
        </div>

        {/* Reviews Section */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Client Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reader.reviews.map(review => (
              <div key={review.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{review.userName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#FBBF24', marginRight: '0.25rem' }}>★</span>
                    <span>{review.rating}</span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{review.comment}</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{review.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
=======
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button,
  Badge,
  StatusBadge,
  StarRating,
  LoadingPage,
  EmptyState,
} from '../../components/ui';
import type { ReaderPublic, Review, ReadingType } from '../../types';

/* ── Helpers ────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── Reader Profile Page ────────────────────────────────────── */
export function ReaderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const { addToast } = useToast();

  const [reader, setReader] = useState<ReaderPublic | null>(null);
  const [reviews, setReviews] = useState<(Review & { clientName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingType, setStartingType] = useState<ReadingType | null>(null);

  /* ── Fetch reader data ── */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const readerData = await apiService.get<ReaderPublic & { reviews?: (Review & { clientName?: string })[] }>(`/api/readers/${id}`);
        if (!cancelled) {
          const { reviews: reviewData, ...readerOnly } = readerData;
          setReader(readerOnly as ReaderPublic);
          setReviews(reviewData || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reader');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  /* ── Start reading handler ── */
  const handleStartReading = useCallback(
    async (type: ReadingType) => {
      if (!isAuthenticated) {
        login();
        return;
      }

      if (!user) return;

      // Minimum $5 balance check
      if (user.balance < 500) {
        addToast('warning', 'You need at least $5.00 in your account to start a reading.');
        navigate('/dashboard');
        return;
      }

      setStartingType(type);
      try {
        const reading = await apiService.post<{ id: number }>('/api/readings/on-demand', {
          readerId: reader?.id,
          readingType: type,
        });
        navigate(`/reading/${reading.id}`);
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Failed to start reading');
      } finally {
        setStartingType(null);
      }
    },
    [isAuthenticated, user, login, reader, navigate, addToast]
  );

  /* ── Loading / Error ── */
  if (isLoading) return <LoadingPage message="Loading reader profile..." />;

  if (error || !reader) {
    return (
      <div className="page-enter">
        <div className="container">
          <EmptyState
            icon="🔮"
            title="Reader Not Found"
            description={error || 'This reader profile could not be loaded.'}
            action={{ label: 'Browse Readers', onClick: () => navigate('/readers') }}
          />
        </div>
      </div>
    );
  }

  const name = reader.fullName || reader.username || 'Reader';
  const specialties = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="page-enter">
      <div className="container container--narrow">
        {/* ── Back Link ──────────────────────────────── */}
        <div className="section" style={{ paddingBottom: 0 }}>
          <Link to="/readers" className="btn btn--ghost btn--sm">
            ← Back to Readers
          </Link>
        </div>

        {/* ── Profile Hero ───────────────────────────── */}
        <section className="section">
          <div className="card card--glow-gold card--pad-lg">
            <div className="profile-hero">
              <img
                src={reader.profileImage || ''}
                alt={`${name}'s profile photo`}
                className="profile-hero__image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex flex-col gap-3">
                <h1 className="profile-hero__name">{name}</h1>
                <StatusBadge online={reader.isOnline} />
                {reader.avgRating !== undefined && reader.avgRating > 0 && (
                  <StarRating
                    value={reader.avgRating}
                    size="lg"
                    showValue
                    count={reader.reviewCount}
                  />
                )}
              </div>
            </div>

            {/* ── Bio ── */}
            {reader.bio && (
              <div className="flex flex-col gap-3" style={{ marginTop: 'var(--space-6)' }}>
                <h2 className="heading-4">About</h2>
                <p className="body-text">{reader.bio}</p>
              </div>
            )}

            {/* ── Specialties ── */}
            {specialties.length > 0 && (
              <div className="flex flex-col gap-3" style={{ marginTop: 'var(--space-5)' }}>
                <h2 className="heading-4">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <Badge key={s} variant="gold" size="lg">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Rates & Start Reading ──────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">Reading Rates</h2>
            <div className="section-title__divider" />
          </div>
          <div className="profile-rates">
            {reader.pricingChat > 0 && (
              <div className="card card--interactive" onClick={() => handleStartReading('chat')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleStartReading('chat'); }}>
                <div className="profile-rate">
                  <span className="profile-rate__type">💬 Chat</span>
                  <span className="profile-rate__price">${(reader.pricingChat / 100).toFixed(2)}/min</span>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={startingType === 'chat'}
                    disabled={!reader.isOnline || startingType !== null}
                    className="btn--glow"
                    aria-label="Start chat reading"
                  >
                    {reader.isOnline ? 'Start Chat' : 'Offline'}
                  </Button>
                </div>
              </div>
            )}
            {reader.pricingVoice > 0 && (
              <div className="card card--interactive" onClick={() => handleStartReading('voice')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleStartReading('voice'); }}>
                <div className="profile-rate">
                  <span className="profile-rate__type">🎙️ Voice</span>
                  <span className="profile-rate__price">${(reader.pricingVoice / 100).toFixed(2)}/min</span>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={startingType === 'voice'}
                    disabled={!reader.isOnline || startingType !== null}
                    className="btn--glow"
                    aria-label="Start voice reading"
                  >
                    {reader.isOnline ? 'Start Voice' : 'Offline'}
                  </Button>
                </div>
              </div>
            )}
            {reader.pricingVideo > 0 && (
              <div className="card card--interactive" onClick={() => handleStartReading('video')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleStartReading('video'); }}>
                <div className="profile-rate">
                  <span className="profile-rate__type">📹 Video</span>
                  <span className="profile-rate__price">${(reader.pricingVideo / 100).toFixed(2)}/min</span>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={startingType === 'video'}
                    disabled={!reader.isOnline || startingType !== null}
                    className="btn--glow"
                    aria-label="Start video reading"
                  >
                    {reader.isOnline ? 'Start Video' : 'Offline'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Reviews ────────────────────────────────── */}
        <section className="section">
          <div className="section-title">
            <h2 className="section-title__text">Client Reviews</h2>
            {reader.reviewCount !== undefined && reader.reviewCount > 0 && (
              <p className="section-title__sub">
                {reader.reviewCount} review{reader.reviewCount !== 1 ? 's' : ''}
              </p>
            )}
            <div className="section-title__divider" />
          </div>

          {reviews.length === 0 ? (
            <div className="card card--static text-center">
              <p className="body-text">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="card card--static">
              {reviews.map((review) => (
                <div key={review.id} className="review">
                  <div className="review__header">
                    <div className="flex flex-col gap-1">
                      <span className="review__author">
                        {review.clientName || `Client #${review.clientId}`}
                      </span>
                      <span className="review__date">{formatDate(review.createdAt)}</span>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.review && (
                    <p className="review__text">&ldquo;{review.review}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
