import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import { apiService } from '../../services/api';
import {
  Button, Card, Avatar, Badge, StatusBadge, StarRating,
  LoadingPage, EmptyState,
} from '../../components/ui';
import type { ReaderPublic, ReadingType } from '../../types';

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

interface Review {
  id: number;
  rating: number;
  review: string | null;
  clientName?: string;
  createdAt: string;
}

export function ReaderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [reader, setReader] = useState<ReaderPublic | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<ReadingType | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiService.get(`/api/readers/${id}`),
      apiService.get(`/api/readers/${id}/reviews`).catch(() => ({ reviews: [] })),
    ])
      .then(([readerData, reviewData]) => {
        setReader(readerData as ReaderPublic);
        setReviews((reviewData as { reviews: Review[] }).reviews || []);
      })
      .catch(() => setReader(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStartReading = async (type: ReadingType) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setStarting(type);
    try {
      const result = await apiService.post('/api/readings', {
        readerId: reader!.id,
        type,
      }) as { id: number };
      navigate(`/reading/${result.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to start reading';
      addToast('error', message);
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <LoadingPage message="Loading reader profile..." />;
  if (!reader) {
    return (
      <div className="page-wrapper">
        <div className="container">
          <EmptyState
            icon="🔮"
            title="Reader Not Found"
            description="This reader profile doesn't exist or has been removed."
            action={{ label: 'Browse Readers', onClick: () => navigate('/readers') }}
          />
        </div>
      </div>
    );
  }

  const specialties = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const readingTypes: { type: ReadingType; icon: string; label: string; price: number }[] = [];
  if (reader.pricingChat > 0) readingTypes.push({ type: 'chat', icon: '💬', label: 'Chat Reading', price: reader.pricingChat });
  if (reader.pricingVoice > 0) readingTypes.push({ type: 'voice', icon: '🎤', label: 'Voice Reading', price: reader.pricingVoice });
  if (reader.pricingVideo > 0) readingTypes.push({ type: 'video', icon: '📹', label: 'Video Reading', price: reader.pricingVideo });

  return (
    <div className="page-wrapper page-enter">
      <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/readers')} style={{ marginBottom: 'var(--space-6)' }}>
          ← Back to Readers
        </Button>

        <div className="grid grid--2" style={{ gap: 'var(--space-8)' }}>
          {/* ─── Left Column: Profile ──────────────────────── */}
          <div className="flex flex-col gap-6">
            <Card variant="static">
              <div className="flex items-center gap-5" style={{ marginBottom: 'var(--space-5)' }}>
                <Avatar
                  src={reader.profileImage}
                  name={reader.fullName || reader.username}
                  size="xl"
                  online={reader.isOnline}
                />
                <div>
                  <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>
                    {reader.fullName || reader.username || 'Reader'}
                  </h1>
                  <div className="flex items-center gap-3">
                    <StatusBadge online={reader.isOnline} />
                    {reviews.length > 0 && (
                      <StarRating value={avgRating} showValue count={reviews.length} />
                    )}
                  </div>
                </div>
              </div>

              {/* Specialties */}
              {specialties.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)' }}>Specialties</h4>
                  <div className="flex gap-2 flex-wrap">
                    {specialties.map((s) => (
                      <Badge key={s} variant="gold" size="lg">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {reader.bio && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)' }}>About</h4>
                  <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}>{reader.bio}</p>
                </div>
              )}
            </Card>

            {/* Reviews */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>
                Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <Card variant="static" className="text-center">
                  <p style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
                    No reviews yet — be the first to share your experience!
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <Card key={review.id} variant="static">
                      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                        <StarRating value={review.rating} size="sm" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.review && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          "{review.review}"
                        </p>
                      )}
                      {review.clientName && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                          — {review.clientName}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right Column: Pricing & Start ────────────── */}
          <div className="flex flex-col gap-4">
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Book a Reading</h3>

            {readingTypes.length === 0 ? (
              <Card variant="static">
                <p style={{ color: 'var(--text-muted)' }}>
                  This reader hasn't set up pricing yet.
                </p>
              </Card>
            ) : (
              readingTypes.map(({ type, icon, label, price }) => (
                <Card key={type} variant="glow-pink" className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
                      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                      <strong style={{ fontSize: '1rem' }}>{label}</strong>
                    </div>
                    <span className="price">{centsToPrice(price)}/min</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleStartReading(type)}
                    loading={starting === type}
                    disabled={!reader.isOnline || starting !== null}
                  >
                    {reader.isOnline ? 'Start' : 'Offline'}
                  </Button>
                </Card>
              ))
            )}

            {!reader.isOnline && readingTypes.length > 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                This reader is currently offline. Check back when they're available.
              </p>
            )}

            <Card variant="static" style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>How It Works</h4>
              <ol style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <li>Choose your preferred reading type</li>
                <li>Ensure you have a minimum $5.00 balance</li>
                <li>Your reader will accept the request</li>
                <li>Billing starts per minute once connected</li>
                <li>End the session at any time</li>
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
