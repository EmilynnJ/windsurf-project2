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