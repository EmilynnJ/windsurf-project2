import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../context/AuthContext';

export function Navigation() {
  const { isAuthenticated } = useAuth0();
  const { dbUser } = useAuth();

  return (
    <nav style={{ 
      backgroundColor: 'var(--dark-bg)', 
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>SoulSeer</h1>
        </Link>
        
        <ul style={{ 
          display: 'flex', 
          listStyle: 'none', 
          gap: '2rem',
          alignItems: 'center',
          margin: 0
        }}>
          <li><Link to="/" className="nav-link" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>Home</Link></li>
          <li><Link to="/readers" className="nav-link" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>Psychics</Link></li>
          <li><Link to="/community" className="nav-link" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>Community</Link></li>
          <li><Link to="/about" className="nav-link" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>About</Link></li>
          <li><Link to="/help" className="nav-link" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>Help</Link></li>
          {dbUser && (
            <li><Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Dashboard</Link></li>
          )}
          {!isAuthenticated && (
            <li><Link to="/login" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Sign In</Link></li>
          )}
        </ul>
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          nav .container {
            flex-direction: column;
            gap: 1rem;
          }
          
          nav ul {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
          }
        }
      `}</style>
    </nav>
  );
}