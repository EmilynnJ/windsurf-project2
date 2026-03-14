import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, LoadingPage, Card } from '../components/ui';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) return <LoadingPage message="Checking authentication..." />;

  return (
    <div className="page-wrapper page-enter">
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="empty-state" style={{ minHeight: '60vh' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🔮</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>Welcome</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
            Sign in to access your dashboard, connect with readers, and explore your spiritual journey.
          </p>

          <Card variant="glow-pink" style={{ width: '100%', textAlign: 'center' }}>
            <Button variant="primary" size="lg" fullWidth onClick={() => login()}>
              Sign In with Auth0
            </Button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              New here? An account will be created automatically.
            </p>
          </Card>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 'var(--space-6)' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
