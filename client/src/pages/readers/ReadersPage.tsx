// ============================================================
// ReadersPage — Browse all readers with filters
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReaders } from '../../hooks/useReaders';
import type { ReaderPublic, ReadingType } from '../../types';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const SPECIALTIES = [
  'Tarot',
  'Mediumship',
  'Clairvoyance',
  'Astrology',
  'Energy Healing',
  'Love & Relationships',
  'Career',
  'Spiritual Coaching',
];

type FilterType = ReadingType | 'all';
type OnlineFilter = 'all' | 'online' | 'offline';

function ReaderListCard({ reader }: { reader: ReaderPublic }) {
  const specialtiesArray = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const bioExcerpt = reader.bio
    ? reader.bio.length > 120
      ? reader.bio.substring(0, 120) + '...'
      : reader.bio
    : null;

  return (
    <Link to={`/readers/${reader.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
        {/* Top: avatar + name */}
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
              <h4 style={{ fontSize: '1rem', margin: 0 }}>
                {reader.fullName || reader.username || 'Reader'}
              </h4>
              <span className={reader.isOnline ? 'badge badge-online' : 'badge badge-offline'}>
                {reader.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Bio excerpt */}
        {bioExcerpt && (
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0, color: 'var(--text-light-muted)' }}>
            {bioExcerpt}
          </p>
        )}

        {/* Specialties */}
        {specialtiesArray.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {specialtiesArray.slice(0, 4).map((s) => (
              <span key={s} className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                {s}
              </span>
            ))}
            {specialtiesArray.length > 4 && (
              <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                +{specialtiesArray.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Pricing */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            marginTop: 'auto',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {reader.pricingChat > 0 && (
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-light-muted)' }}>💬 Chat </span>
              <span className="price">{formatCents(reader.pricingChat)}/min</span>
            </div>
          )}
          {reader.pricingVoice > 0 && (
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-light-muted)' }}>🎤 Voice </span>
              <span className="price">{formatCents(reader.pricingVoice)}/min</span>
            </div>
          )}
          {reader.pricingVideo > 0 && (
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-light-muted)' }}>📹 Video </span>
              <span className="price">{formatCents(reader.pricingVideo)}/min</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ReadersPage() {
  const { readers, isLoading, error } = useReaders({ pollInterval: 30000 });
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReaders = useMemo(() => {
    let result = [...readers];

    // Online filter
    if (onlineFilter === 'online') result = result.filter((r) => r.isOnline);
    if (onlineFilter === 'offline') result = result.filter((r) => !r.isOnline);

    // Specialty filter
    if (specialtyFilter) {
      result = result.filter(
        (r) => r.specialties?.toLowerCase().includes(specialtyFilter.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((r) => {
        if (typeFilter === 'chat') return r.pricingChat > 0;
        if (typeFilter === 'voice') return r.pricingVoice > 0;
        if (typeFilter === 'video') return r.pricingVideo > 0;
        return true;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.fullName || '').toLowerCase().includes(q) ||
          (r.username || '').toLowerCase().includes(q) ||
          (r.bio || '').toLowerCase().includes(q) ||
          (r.specialties || '').toLowerCase().includes(q)
      );
    }

    // Sort: online first
    result.sort((a, b) => {
      if (a.isOnline === b.isOnline) return 0;
      return a.isOnline ? -1 : 1;
    });

    return result;
  }, [readers, specialtyFilter, typeFilter, onlineFilter, searchQuery]);

  return (
    <div className="page-content page-enter">
      <div className="container">
        <section style={{ textAlign: 'center', padding: '40px 0 24px' }}>
          <h1>Our Readers</h1>
          <p style={{ marginTop: '8px' }}>
            Find a gifted psychic who resonates with your soul.
          </p>
        </section>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '28px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Search readers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: '200px' }}
            aria-label="Search readers"
          />

          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            style={{ flex: '0 1 180px' }}
            aria-label="Filter by specialty"
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            style={{ flex: '0 1 150px' }}
            aria-label="Filter by reading type"
          >
            <option value="all">All Types</option>
            <option value="chat">💬 Chat</option>
            <option value="voice">🎤 Voice</option>
            <option value="video">📹 Video</option>
          </select>

          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value as OnlineFilter)}
            style={{ flex: '0 1 140px' }}
            aria-label="Filter by availability"
          >
            <option value="all">All Status</option>
            <option value="online">🟢 Online</option>
            <option value="offline">⚫ Offline</option>
          </select>
        </div>

        {/* Reader count */}
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-light-muted)',
            marginBottom: '16px',
          }}
        >
          {filteredReaders.length} reader{filteredReaders.length !== 1 ? 's' : ''} found
          {onlineFilter === 'online' && ' online'}
        </p>

        {/* Results */}
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading readers...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>Unable to load readers. Please try again.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px', color: 'var(--text-light-muted)' }}>
              {error}
            </p>
          </div>
        ) : filteredReaders.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>No Readers Found</h3>
            <p style={{ marginTop: '8px' }}>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-readers">
            {filteredReaders.map((reader) => (
              <ReaderListCard key={reader.id} reader={reader} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
