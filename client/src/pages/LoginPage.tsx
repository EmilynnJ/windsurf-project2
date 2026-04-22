import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Spinner } from '../components/ui';

/**
 * LoginPage
 *
 * Safe login entrypoint.
 *
 *  - If the user is already fully authenticated (Auth0 ok AND internal user
 *    record loaded), redirect straight to /dashboard.
 *  - Otherwise show a manual "Sign in" button instead of auto-calling
 *    loginWithRedirect(). This prevents an infinite redirect loop when the
 *    backend user sync is failing (e.g. API 500s, network issues, Auth0
 *    audience mismatch): the user would otherwise be bounced back to Auth0
 *    forever because isAuthenticated stays false.
 */
export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

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
                console.error('[LoginPage] loginWithRedirect failed:', err);
                setClicked(false);
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
