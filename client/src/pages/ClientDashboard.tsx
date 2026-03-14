export function ClientDashboard() {
  // Mock data for the dashboard
  const upcomingSessions = [
    { id: 1, reader: 'Luna Starweaver', specialty: 'Tarot Reading', date: 'Today, 2:00 PM', duration: '30 min', price: '$89.97' },
    { id: 2, reader: 'Phoenix Mystique', specialty: 'Psychic Reading', date: 'Mar 16, 4:30 PM', duration: '45 min', price: '$157.46' },
    { id: 3, reader: 'Oracle Moonchild', specialty: 'Clairvoyance', date: 'Mar 18, 11:00 AM', duration: '20 min', price: '$49.98' }
  ];

  const recentReadings = [
    { id: 1, reader: 'Cosmic Sage', specialty: 'Astrology', date: 'Mar 12, 2023', duration: '40 min', rating: 5 },
    { id: 2, reader: 'Seraphina Lightbringer', specialty: 'Angel Cards', date: 'Mar 8, 2023', duration: '25 min', rating: 4 },
    { id: 3, reader: 'Mystic Willow', specialty: 'Palm Reading', date: 'Mar 5, 2023', duration: '35 min', rating: 5 }
  ];

  const accountBalance = 45.75;
  const totalSpent = 342.67;
  const sessionsCompleted = 12;

  return (
    <div className="client-dashboard" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Client Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Welcome back! Here's your personalized psychic reading dashboard
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Account Balance</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>${accountBalance.toFixed(2)}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Upcoming Sessions</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-purple)' }}>{upcomingSessions.length}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Total Spent</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>${totalSpent.toFixed(2)}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Sessions Completed</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-purple)' }}>{sessionsCompleted}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Left Column - Upcoming Sessions and Recent Readings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Upcoming Sessions */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Upcoming Sessions</h2>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  Schedule New
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingSessions.map(session => (
                  <div key={session.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{session.reader}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{session.specialty}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{session.date} • {session.duration}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{session.price}</p>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Readings */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Recent Readings</h2>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  View All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentReadings.map(reading => (
                  <div key={reading.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{reading.reader}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{reading.specialty}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{reading.date} • {reading.duration}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < reading.rating ? '#FBBF24' : '#4B5563' }}>★</span>
                        ))}
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div>
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔍</span>
                  <span>Browse Psychics</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💬</span>
                  <span>Send Message</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💳</span>
                  <span>Add Funds</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Recommended Psychics</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2].map(id => (
                  <div key={id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '2rem' }}>🌟</div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Reader {id}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Specialty • 4.8★</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}