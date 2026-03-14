export function CommunityHubPage() {
  return (
    <div className="community-hub-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 'bold', marginBottom: '1rem' }}>Spiritual Community Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            Connect with like-minded souls and grow spiritually together
          </p>
        </div>

        {/* Community Features Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Community Forums</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Discuss spiritual topics, share experiences, and learn from others on their journey
            </p>
            <button className="btn btn-outline">Join Discussion</button>
          </div>
          
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Events & Workshops</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Participate in guided meditations, workshops, and spiritual gatherings
            </p>
            <button className="btn btn-outline">View Events</button>
          </div>
          
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Resources</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Access articles, guides, and tools for spiritual growth and development
            </p>
            <button className="btn btn-outline">Explore Resources</button>
          </div>
        </div>

        {/* Active Discussions */}
        <div className="card" style={{ padding: '2rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Active Discussions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(id => (
              <div key={id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Topic Title Goes Here</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Started by User {id} • {Math.floor(Math.random() * 50) + 10} replies</p>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{Math.floor(Math.random() * 7) + 1} days ago</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card" style={{ padding: '2rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Upcoming Events</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2].map(id => (
              <div key={id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                <div style={{ 
                  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                  color: 'var(--secondary-purple)',
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{Math.floor(Math.random() * 28) + 1}</div>
                  <div style={{ fontSize: '0.8rem' }}>Mar</div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Event Title Goes Here</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Hosted by Expert {id}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>7:00 PM - 8:30 PM EST</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Members */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Active Community Members</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map(id => (
              <div key={id} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  margin: '0 auto 0.5rem',
                  fontSize: '2rem'
                }}>
                  👤
                </div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Member {id}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Online</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}