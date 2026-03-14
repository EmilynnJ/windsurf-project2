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
            </Link>
          </div>
        </div>
      </section>

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
          </div>
        </div>
      </section>
    </div>
  );
}
