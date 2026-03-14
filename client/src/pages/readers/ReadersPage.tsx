import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReaders } from '../../hooks/useReaders';
import {
  Button,
  Avatar,
  Badge,
  StatusBadge,
  Select,
  Pagination,
  SkeletonCard,
  EmptyState,
} from '../../components/ui';
import type { ReaderPublic } from '../../types';

/* ── Constants ──────────────────────────────────────────────── */
const PER_PAGE = 12;

const SPECIALTY_OPTIONS = [
  { value: '', label: 'All Specialties' },
  { value: 'tarot', label: 'Tarot' },
  { value: 'clairvoyant', label: 'Clairvoyant' },
  { value: 'medium', label: 'Medium' },
  { value: 'astrology', label: 'Astrology' },
  { value: 'love', label: 'Love & Relationships' },
  { value: 'career', label: 'Career' },
  { value: 'spiritual', label: 'Spiritual Guidance' },
  { value: 'energy', label: 'Energy Healing' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'chat', label: 'Chat' },
  { value: 'voice', label: 'Voice' },
  { value: 'video', label: 'Video' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

/* ── Reader Card (grid version) ─────────────────────────────── */
function ReaderGridCard({ reader }: { reader: ReaderPublic }) {
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

      {reader.bio && (
        <p className="reader-card__bio">{reader.bio}</p>
      )}

      {reader.avgRating !== undefined && reader.avgRating > 0 && (
        <div className="flex items-center gap-2">
          <span className="star star--filled" aria-hidden="true">★</span>
          <span className="body-text">{reader.avgRating.toFixed(1)}</span>
          {reader.reviewCount !== undefined && (
            <span className="caption">({reader.reviewCount})</span>
          )}
        </div>
      )}

      {specialties.length > 0 && (
        <div className="reader-card__specialties">
          {specialties.slice(0, 3).map((s) => (
            <Badge key={s} variant="gold" size="sm">{s}</Badge>
          ))}
          {specialties.length > 3 && (
            <Badge variant="gold" size="sm">+{specialties.length - 3}</Badge>
          )}
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

      <Button
        variant="primary"
        size="sm"
        className="btn--glow"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/readers/${reader.id}`);
        }}
      >
        View Profile
      </Button>
    </div>
  );
}

/* ── Readers Page ───────────────────────────────────────────── */
export function ReadersPage() {
  const { readers, isLoading } = useReaders({ pollInterval: 30000 });
  const [specialty, setSpecialty] = useState('');
  const [readingType, setReadingType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Filter & sort: online first
  const filtered = useMemo(() => {
    let list = [...readers];

    // Online first
    list.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

    if (specialty) {
      list = list.filter((r) =>
        r.specialties?.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (readingType) {
      list = list.filter((r) => {
        if (readingType === 'chat') return r.pricingChat > 0;
        if (readingType === 'voice') return r.pricingVoice > 0;
        if (readingType === 'video') return r.pricingVideo > 0;
        return true;
      });
    }

    if (status === 'online') list = list.filter((r) => r.isOnline);
    if (status === 'offline') list = list.filter((r) => !r.isOnline);

    return list;
  }, [readers, specialty, readingType, status]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="page-enter">
      <div className="container">
        {/* ── Title ──────────────────────────────────── */}
        <section className="section section--hero section--cosmic">
          <h1 className="heading-1">Our Readers</h1>
          <p className="hero__tagline">
            Discover the psychic who speaks to your soul
          </p>
          <div className="divider" />
        </section>

        {/* ── Filters ───────────────────────────────── */}
        <div className="filter-bar">
          <Select
            label="Specialty"
            options={SPECIALTY_OPTIONS}
            value={specialty}
            onChange={(e) => handleFilterChange(setSpecialty)(e.target.value)}
          />
          <Select
            label="Reading Type"
            options={TYPE_OPTIONS}
            value={readingType}
            onChange={(e) => handleFilterChange(setReadingType)(e.target.value)}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => handleFilterChange(setStatus)(e.target.value)}
          />
        </div>

        {/* ── Results ───────────────────────────────── */}
        <section className="section">
          {isLoading ? (
            <div className="grid grid--readers">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="No Readers Found"
              description="Try adjusting your filters to discover more readers."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSpecialty('');
                  setReadingType('');
                  setStatus('');
                  setPage(1);
                },
                variant: 'secondary',
              }}
            />
          ) : (
            <>
              <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
                Showing {paged.length} of {filtered.length} reader{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid--readers">
                {paged.map((reader) => (
                  <ReaderGridCard key={reader.id} reader={reader} />
                ))}
              </div>
            </>
          )}

          {/* ── Pagination ──────────────────────────── */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      </div>
    </div>
  );
}
