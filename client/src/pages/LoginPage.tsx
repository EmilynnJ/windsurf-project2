// ============================================================
// LoginPage — Auth0 login/signup with celestial design
// ============================================================

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, isLoading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users away from login page
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  if (isLoading) {
    return (
      <div className="loading-container page-content">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-content page-enter">
      <div
        className="container"
        style={{
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - var(--nav-height) - 120px)',
          textAlign: 'center',
          padding: '40px 20px',
        }}
      >
        {/* Decorative moon icon */}
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.4))',
          }}
        >
          🌙
        </div>

        <h1 style={{ marginBottom: '8px' }}>Welcome</h1>

        <p
          style={{
            color: 'var(--text-light-secondary)',
            marginBottom: '36px',
            fontSize: '1rem',
          }}
        >
          Sign in to access your readings, connect with gifted psychics,
          and join our spiritual community.
        </p>

        <div
          className="card-static"
          style={{
            width: '100%',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <button
            onClick={login}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            Log In
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-light-muted)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <button
            onClick={signup}
            className="btn btn-secondary btn-lg"
            style={{ width: '100%' }}
          >
            Create Account
          </button>
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '0.8rem',
            color: 'var(--text-light-muted)',
            lineHeight: 1.5,
          }}
        >
          By continuing, you agree to SoulSeer's Terms of Service and
          Privacy Policy.
        </p>
      </div>
    </div>
  );
}
