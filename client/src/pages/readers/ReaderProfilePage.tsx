// ============================================================
// ReaderProfilePage — Full reader profile with reviews & start reading
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { readersApi, readingsApi, reviewsApi } from '../../services/api';
import type { ReaderPublic, ReviewWithAuthor, ReadingType } from '../../types';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="star-rating" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ opacity: star <= Math.round(rating) ? 1 : 0.3 }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ReaderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const { addToast } = useToast();

  const [reader, setReader] = useState<ReaderPublic | null>(null);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingReading, setStartingReading] = useState<ReadingType | null>(null);

  useEffect(() => {
    if (!id) return;
    const readerId = parseInt(id);
    if (isNaN(readerId)) {
      setError('Invalid reader ID');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [readerData, reviewsData] = await Promise.all([
          readersApi.getReader(readerId),
          reviewsApi.getReaderReviews(readerId, { limit: 10 }).catch(() => ({
            reviews: [] as ReviewWithAuthor[],
            count: 0,
            averageRating: 0,
          })),
        ]);
        setReader(readerData);
        setReviews(reviewsData.reviews);
        setAverageRating(reviewsData.averageRating);
        setReviewCount(reviewsData.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reader');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStartReading = useCallback(
    async (type: ReadingType) => {
      if (!isAuthenticated) {
        login();
        return;
      }

      if (!reader) return;

      // Check balance
      const pricePerMinute =
        type === 'chat'
          ? reader.pricingChat
          : type === 'voice'
            ? reader.pricingVoice
            : reader.pricingVideo;

      if (user && user.accountBalance < pricePerMinute) {
        addToast('warning', 'Insufficient balance. Please add funds from your dashboard.');
        navigate('/dashboard');
        return;
      }

      setStartingReading(type);
      try {
        const reading = await readingsApi.create({ readerId: reader.id, type });
        navigate(`/reading/${reading.id}`);
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Failed to start reading');
      } finally {
        setStartingReading(null);
      }
    },
    [reader, isAuthenticated, user, login, navigate, addToast]
  );

  if (isLoading) {
    return (
      <div className="loading-container page-content">
        <div className="spinner" />
        <p>Loading reader profile...</p>
      </div>
    );
  }

  if (error || !reader) {
    return (
      <div className="page-content page-enter">
        <div className="container empty-state">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
            Reader Not Found
          </h3>
          <p style={{ marginTop: '8px' }}>{error || 'This reader profile does not exist.'}</p>
          <button onClick={() => navigate('/readers')} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            Browse Readers
          </button>
        </div>
      </div>
    );
  }

  const specialtiesArray = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="page-content page-enter">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Profile Header */}
        <section
          className="card-static"
          style={{
            marginTop: '32px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          {reader.profileImage ? (
            <img
              src={reader.profileImage}
              alt={reader.fullName || reader.username || 'Reader'}
              className="avatar-xl"
            />
          ) : (
            <div
              className="avatar-xl"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-elevated)',
                color: 'var(--primary-pink)',
                fontFamily: 'var(--font-heading)',
                fontSize: '3rem',
              }}
            >
              {(reader.fullName || reader.username || '?')[0]}
            </div>
          )}

          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '4px' }}>
              {reader.fullName || reader.username || 'Reader'}
            </h1>
            <span className={reader.isOnline ? 'badge badge-online' : 'badge badge-offline'}>
              {reader.isOnline ? 'Online Now' : 'Offline'}
            </span>
          </div>

          {/* Rating */}
          {reviewCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StarDisplay rating={averageRating} />
              <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                {averageRating.toFixed(1)}
              </span>
              <span style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>
                ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Specialties */}
          {specialtiesArray.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {specialtiesArray.map((s) => (
                <span key={s} className="badge badge-gold">
                  {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Bio */}
        {reader.bio && (
          <section className="card-static" style={{ marginTop: '16px', padding: '28px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1.5rem' }}>About</h3>
            <p style={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>{reader.bio}</p>
          </section>
        )}

        {/* Pricing & Start Reading */}
        <section className="card-static" style={{ marginTop: '16px', padding: '28px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Reading Options</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {reader.pricingChat > 0 && (
              <ReadingOption
                type="chat"
                icon="💬"
                label="Chat Reading"
                price={reader.pricingChat}
                isOnline={reader.isOnline}
                isStarting={startingReading === 'chat'}
                onStart={() => handleStartReading('chat')}
              />
            )}
            {reader.pricingVoice > 0 && (
              <ReadingOption
                type="voice"
                icon="🎤"
                label="Voice Reading"
                price={reader.pricingVoice}
                isOnline={reader.isOnline}
                isStarting={startingReading === 'voice'}
                onStart={() => handleStartReading('voice')}
              />
            )}
            {reader.pricingVideo > 0 && (
              <ReadingOption
                type="video"
                icon="📹"
                label="Video Reading"
                price={reader.pricingVideo}
                isOnline={reader.isOnline}
                isStarting={startingReading === 'video'}
                onStart={() => handleStartReading('video')}
              />
            )}
          </div>

          {reader.pricingChat === 0 && reader.pricingVoice === 0 && reader.pricingVideo === 0 && (
            <p style={{ color: 'var(--text-light-muted)', textAlign: 'center', padding: '20px 0' }}>
              This reader hasn't set up pricing yet.
            </p>
          )}
        </section>

        {/* Reviews */}
        <section style={{ marginTop: '16px', paddingBottom: '60px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--primary-pink)',
              fontSize: '1.5rem',
              marginBottom: '16px',
            }}
          >
            Reviews
          </h3>

          {reviews.length === 0 ? (
            <div className="card-static" style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: 'var(--text-light-muted)' }}>
                No reviews yet. Be the first to leave one!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((review) => (
                <div key={review.id} className="card-static" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    {review.author?.profileImage ? (
                      <img
                        src={review.author.profileImage}
                        alt=""
                        className="avatar"
                        style={{ width: '36px', height: '36px' }}
                      />
                    ) : (
                      <div
                        className="avatar"
                        style={{
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--surface-elevated)',
                          color: 'var(--primary-pink)',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-heading)',
                        }}
                      >
                        {(review.author?.fullName || review.author?.username || '?')[0]}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {review.author?.fullName || review.author?.username || 'Anonymous'}
                        </span>
                        <StarDisplay rating={review.rating} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {review.review && (
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{review.review}</p>
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

function ReadingOption({
  icon,
  label,
  price,
  isOnline,
  isStarting,
  onStart,
}: {
  type: ReadingType;
  icon: string;
  label: string;
  price: number;
  isOnline: boolean;
  isStarting: boolean;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '2rem' }}>{icon}</span>
      <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{label}</h4>
      <span className="price price-lg">{formatCents(price)}/min</span>
      <button
        onClick={onStart}
        className="btn btn-primary btn-sm"
        disabled={!isOnline || isStarting}
        style={{ width: '100%', marginTop: '4px' }}
      >
        {isStarting ? 'Starting...' : isOnline ? 'Start Now' : 'Offline'}
      </button>
    </div>
  );
}
