import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isLoading, isAuthenticated, login, navigate]);

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
