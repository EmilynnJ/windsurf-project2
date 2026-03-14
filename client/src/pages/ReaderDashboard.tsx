export function ReaderDashboard() {
  // Mock data for the reader dashboard
  const earnings = 1245.67;
  const sessionsCompleted = 24;
  const upcomingBookings = 8;
  const avgRating = 4.8;

  const todaySchedule = [
    { id: 1, client: 'Sarah M.', time: '10:00 AM', duration: '30 min', service: 'Tarot Reading', status: 'confirmed' },
    { id: 2, client: 'Michael T.', time: '11:30 AM', duration: '45 min', service: 'Psychic Reading', status: 'confirmed' },
    { id: 3, client: 'Jessica L.', time: '2:00 PM', duration: '20 min', service: 'Clairvoyance', status: 'pending' },
    { id: 4, client: 'David K.', time: '4:00 PM', duration: '30 min', service: 'Angel Cards', status: 'confirmed' }
  ];

  const recentReviews = [
    { id: 1, client: 'Alex R.', rating: 5, comment: 'Amazing insights! Really helped me see my situation clearly.', date: 'Today' },
    { id: 2, client: 'Taylor S.', rating: 5, comment: 'So accurate and compassionate. Will definitely book again.', date: 'Yesterday' },
    { id: 3, client: 'Jordan P.', rating: 4, comment: 'Had a wonderful session. Very intuitive reader.', date: 'Mar 12' }
  ];

  return (
    <div className="reader-dashboard" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reader Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Welcome back! Here's your psychic reading business overview
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Earnings This Month</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>${earnings.toFixed(2)}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Sessions Completed</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-purple)' }}>{sessionsCompleted}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Upcoming Bookings</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary-purple)' }}>{upcomingBookings}</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Average Rating</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{avgRating} ★</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Left Column - Today's Schedule and Recent Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Today's Schedule */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Today's Schedule</h2>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  Add Booking
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {todaySchedule.map(item => (
                  <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{item.client}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.time} • {item.duration}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.service}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        backgroundColor: item.status === 'confirmed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: item.status === 'confirmed' ? '#10B981' : '#EAB308'
                      }}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', marginRight: '0.5rem' }}>
                          Start
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Recent Reviews</h2>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  View All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentReviews.map(review => (
                  <div key={review.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{review.client}</h3>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < review.rating ? '#FBBF24' : '#4B5563' }}>★</span>
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{review.comment}</p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{review.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions and Earnings */}
          <div>
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔔</span>
                  <span>Notifications</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💬</span>
                  <span>Messages</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📊</span>
                  <span>Analytics</span>
                </button>
                <button className="btn btn-outline" style={{ padding: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Earnings Summary</h2>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Today</span>
                  <span>$124.50</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>This Week</span>
                  <span>$423.75</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>This Month</span>
                  <span>${earnings.toFixed(2)}</span>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Withdraw Earnings
              </button>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Availability Settings</h2>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Status</span>
                  <span style={{ color: '#10B981', fontWeight: '600' }}>Available</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Response Time</span>
                  <span>Within 15 min</span>
                </div>
              </div>
              <button className="btn btn-outline" style={{ width: '100%' }}>
                Edit Availability
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}