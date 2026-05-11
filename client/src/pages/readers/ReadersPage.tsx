<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
}

// Mock data for all readers
const mockAllReaders: Reader[] = [
  { id: 1, name: 'Luna Starweaver', specialty: 'Tarot & Spirituality', rating: 4.9, online: true, avatar: '🌟', experience: '10 years', languages: ['English', 'Spanish'], price: '$2.99/min' },
  { id: 2, name: 'Phoenix Mystique', specialty: 'Psychic Readings', rating: 4.8, online: true, avatar: '🔮', experience: '8 years', languages: ['English'], price: '$3.49/min' },
  { id: 3, name: 'Oracle Moonchild', specialty: 'Clairvoyance', rating: 4.7, online: true, avatar: '🌙', experience: '12 years', languages: ['English', 'French'], price: '$2.49/min' },
  { id: 4, name: 'Cosmic Sage', specialty: 'Astrology', rating: 4.9, online: false, avatar: '⭐', experience: '15 years', languages: ['English', 'German'], price: '$3.99/min' },
  { id: 5, name: 'Seraphina Lightbringer', specialty: 'Angel Cards', rating: 4.6, online: true, avatar: '👼', experience: '7 years', languages: ['English'], price: '$2.79/min' },
  { id: 6, name: 'Mystic Willow', specialty: 'Palm Reading', rating: 4.8, online: false, avatar: '🍃', experience: '9 years', languages: ['English', 'Italian'], price: '$3.29/min' },
  { id: 7, name: 'Aurora Seeress', specialty: 'Mediumship', rating: 4.9, online: true, avatar: '🌈', experience: '11 years', languages: ['English', 'Portuguese'], price: '$4.49/min' },
  { id: 8, name: 'Stellar Prophet', specialty: 'Numerology', rating: 4.5, online: false, avatar: '✨', experience: '6 years', languages: ['English'], price: '$2.29/min' },
  { id: 9, name: 'Celestial Guide', specialty: 'Energy Healing', rating: 4.7, online: true, avatar: '💫', experience: '13 years', languages: ['English', 'Spanish'], price: '$3.79/min' },
];

export function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>(mockAllReaders);
  const [filteredReaders, setFilteredReaders] = useState<Reader[]>(mockAllReaders);
  const [specialties] = useState<string[]>(['All', 'Tarot', 'Psychic', 'Clairvoyance', 'Astrology', 'Angel Cards', 'Palm Reading', 'Mediumship', 'Numerology', 'Energy Healing']);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showOnlineOnly, setShowOnlineOnly] = useState<boolean>(false);

  useEffect(() => {
    let result = [...readers];
    
    // Filter by specialty
    if (selectedSpecialty !== 'All') {
      result = result.filter(reader => 
        reader.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(reader => 
        reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reader.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by online status
    if (showOnlineOnly) {
      result = result.filter(reader => reader.online);
    }
    
    setFilteredReaders(result);
  }, [readers, selectedSpecialty, searchTerm, showOnlineOnly]);

  return (
    <div className="readers-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Find Your Psychic Reader</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Connect with our talented community of spiritual advisors
          </p>
        </div>

        {/* Filters Section */}
        <div className="filters-section card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search readers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(30, 30, 46, 0.5)',
                  color: 'white',
                  minWidth: '200px'
                }}
              />
              
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(30, 30, 46, 0.5)',
                  color: 'white'
                }}
              >
                {specialties.map((specialty: string) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="online-only"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                style={{ width: '1rem', height: '1rem' }}
              />
              <label htmlFor="online-only" style={{ color: 'var(--text-muted)' }}>
                Show online readers only
              </label>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Showing <strong>{filteredReaders.length}</strong> of <strong>{readers.length}</strong> readers
          </p>
          <div style={{ color: 'var(--text-muted)' }}>
            {showOnlineOnly && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '0.5rem' }}></span>
                Online Only
              </span>
            )}
          </div>
        </div>

        {/* Readers Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredReaders.map((reader: Reader) => (
            <div key={reader.id} className="card" style={{ 
              padding: '1.5rem', 
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem', marginRight: '1rem' }}>{reader.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>{reader.name}</h3>
                    {reader.online ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        fontSize: '0.875rem',
                        color: '#10B981'
                      }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '0.5rem', animation: 'pulse 1.5s infinite' }}></span>
                        Online
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Offline</span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{reader.specialty}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ color: '#FBBF24' }}>★</span>
                    <span style={{ fontSize: '0.875rem' }}>{reader.rating} ({Math.floor(Math.random() * 100) + 50} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <div>{reader.experience} experience</div>
                  <div>Price: {reader.price}</div>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem' }}>
                  {reader.languages.map((lang: string, idx: number) => (
                    <span 
                      key={idx} 
                      style={{ 
                        backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                        color: 'var(--secondary-purple)',
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem' 
                      }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link 
                    to={`/readers/${reader.id}`} 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.875rem' }}
                  >
                    View Profile
                  </Link>
                  <button 
                    className={`btn ${reader.online ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.875rem' }}
                    disabled={!reader.online}
                  >
                    {reader.online ? 'Chat Now' : 'Unavailable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReaders.length === 0 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>No readers found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Try adjusting your filters or search terms
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
=======
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
        src={reader.profileImage}
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
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
