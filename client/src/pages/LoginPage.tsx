<<<<<<< HEAD
export function LoginPage() {
  return (
    <div className="login-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}>
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: '400px', 
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔮</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Sign in to your SoulSeer account
            </p>
            
            <form style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(30, 30, 46, 0.5)',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(30, 30, 46, 0.5)',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>Remember me</span>
                </label>
                <a href="#" style={{ color: 'var(--secondary-purple)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  Forgot password?
                </a>
              </div>
              
              <button 
                className="btn btn-primary" 
                type="submit"
                style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }}
              >
                Sign In
              </button>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Don't have an account?{' '}
                <a href="#" style={{ color: 'var(--secondary-purple)', textDecoration: 'none' }}>
                  Sign up
                </a>
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                <span style={{ padding: '0 1rem', color: 'var(--text-muted)' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
              </div>
              
              <button 
                className="btn btn-outline" 
                type="button"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              >
                Continue with Google
              </button>
              <button 
                className="btn btn-outline" 
                type="button"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Continue with Facebook
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Spinner } from '../components/ui';

/**
 * LoginPage
 *
 * Safe login entrypoint.
 *
 *  - If the user already has an Auth0 session, redirect straight to
 *    /dashboard and let that page finish loading the internal profile.
 *  - Otherwise show a manual "Sign in" button instead of auto-calling
 *    loginWithRedirect(). This prevents an infinite redirect loop when the
 *    backend user sync is failing (e.g. API 500s, network issues, Auth0
 *    audience mismatch): the user would otherwise be bounced back to Auth0
 *    forever because the internal profile might still be unavailable.
 */
export function LoginPage() {
  const { hasSession, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!isLoading && hasSession) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasSession, isLoading, navigate]);

  // Show the auto-connecting spinner while Auth0 is processing a callback.
  if (isLoading || clicked) {
    return (
      <div className="page-enter">
        <div className="container">
          <div className="login-cosmic">
            <div className="login-cosmic__orb" aria-hidden="true" />
            <h1 className="heading-2">Connecting to the Cosmos</h1>
            <p className="login-cosmic__text">
              Aligning the stars for your journey...
            </p>
            <Spinner size="lg" />
            <p className="caption">
              You will be redirected to sign in momentarily.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="container">
        <div className="login-cosmic">
          <div className="login-cosmic__orb" aria-hidden="true" />
          <h1 className="heading-2">Welcome to SoulSeer</h1>
          <p className="login-cosmic__text">
            Sign in with your email or a social provider to continue your journey.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={async () => {
              setClicked(true);
              try {
                await login();
              } catch (err) {
                // If Auth0 redirect fails (blocked popup, bad config, offline),
                // drop the spinner so the user can retry instead of being
                // stuck forever.
                setClicked(false);
                console.warn('[LoginPage] login redirect failed:', err);
              }
            }}
          >
            Sign in
          </Button>
          <p className="caption">
            New here? The same button creates your account.
          </p>
        </div>
      </div>
    </div>
  );
}
>>>>>>> b0ebfcb9039e92c09e9e94e90785289e0a1daeb8
