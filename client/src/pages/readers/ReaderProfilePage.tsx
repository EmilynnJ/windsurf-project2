import { useParams } from 'react-router-dom';

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
  bio: string;
  skills: string[];
  availability: string[];
  reviews: Review[];
}

interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// Mock data for a reader
const mockReader: Reader = {
  id: 1,
  name: 'Luna Starweaver',
  specialty: 'Tarot & Spirituality',
  rating: 4.9,
  online: true,
  avatar: '🌟',
  experience: '10 years',
  languages: ['English', 'Spanish'],
  price: '$2.99/min',
  bio: 'With over 10 years of experience in tarot and spiritual guidance, Luna helps her clients navigate life\'s challenges with clarity and insight. She specializes in love, career, and spiritual growth readings.',
  skills: ['Tarot Reading', 'Clairvoyance', 'Past Life Regression', 'Chakra Balancing', 'Aura Cleansing'],
  availability: ['Mon 10am-6pm EST', 'Tue 2pm-9pm EST', 'Wed 10am-6pm EST', 'Thu 12pm-8pm EST', 'Fri 10am-6pm EST'],
  reviews: [
    { id: 1, userName: 'Sarah M.', rating: 5, comment: 'Luna helped me see things clearly during a difficult time. Her insights were spot-on!', date: '2023-10-15' },
    { id: 2, userName: 'Michael T.', rating: 5, comment: 'Amazing reading! Luna was able to provide guidance that changed my perspective completely.', date: '2023-09-22' },
    { id: 3, userName: 'Jessica L.', rating: 4, comment: 'Very intuitive reader. She picked up on things I hadn\'t shared with anyone.', date: '2023-08-30' },
    { id: 4, userName: 'David K.', rating: 5, comment: 'Luna\'s energy was calming and her advice was practical and helpful.', date: '2023-07-18' },
  ]
};

export function ReaderProfilePage() {
  useParams();
  const reader = mockReader;

  return (
    <div className="reader-profile-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Profile Header */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>{reader.avatar}</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{reader.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '1rem' }}>{reader.specialty}</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ color: '#FBBF24', fontSize: '1.2rem' }}>★</span>
              <span style={{ fontSize: '1.1rem' }}>{reader.rating} ({reader.reviews.length} reviews)</span>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ 
                backgroundColor: 'rgba(107, 70, 193, 0.2)', 
                color: 'var(--primary-purple)',
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                {reader.experience} experience
              </span>
              <span style={{ 
                backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                color: 'var(--secondary-purple)',
                padding: '0.5rem 1rem', 
                borderRadius: 'var(--border-radius)',
                fontSize: '0.9rem'
              }}>
                {reader.price}
              </span>
              {reader.online ? (
                <span style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                  color: '#10B981',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', marginRight: '0.5rem', animation: 'pulse 1.5s infinite' }}></span>
                  Online Now
                </span>
              ) : (
                <span style={{ 
                  backgroundColor: 'rgba(156, 163, 175, 0.2)', 
                  color: '#9CA3AF',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem'
                }}>
                  Offline
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Start Reading Session
              </button>
              <button className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                Send Message
              </button>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>About {reader.name.split(' ')[0]}</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {reader.bio}
          </p>
        </div>

        {/* Skills Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Skills & Expertise</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {reader.skills.map((skill, index) => (
              <span 
                key={index}
                style={{ 
                  backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                  color: 'var(--secondary-purple)',
                  padding: '0.5rem 1rem', 
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.9rem'
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Availability Section */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Availability</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reader.availability.map((time, index) => (
              <li 
                key={index}
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)'
                }}
              >
                {time}
              </li>
            ))}
          </ul>
        </div>

        {/* Reviews Section */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Client Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {reader.reviews.map(review => (
              <div key={review.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{review.userName}</h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#FBBF24', marginRight: '0.25rem' }}>★</span>
                    <span>{review.rating}</span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{review.comment}</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{review.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}