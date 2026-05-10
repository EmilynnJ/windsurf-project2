import { useAuth } from '../../hooks/useAuth';
import { LoadingPage, Button } from '../../components/ui';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const {
    user,
    isAuthenticated,
    isAuth0Authenticated,
    isLoading,
    authError,
    refreshUser,
    logout,
  } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Preparing your dashboard..." />;
  }

  // Auth0 session exists but the backend couldn't load the internal user
  // record. Show a recoverable error screen instead of redirecting back to
  // /login — that would re-trigger Auth0 and cause an infinite loop.
  if (authError) {
    return (
      <div className="page-enter">
        <div className="container" style={{ maxWidth: 560, paddingTop: '4rem' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 className="heading-2">We couldn't load your profile</h1>
            <p className="login-cosmic__text" style={{ marginBottom: '1rem' }}>
              You are signed in with Auth0, but the SoulSeer API returned an
              error while syncing your account.
            </p>
            <p className="caption" style={{ marginBottom: '1.5rem' }}>
              {authError}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => refreshUser?.()}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => logout()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If Auth0 says the user is signed in but backend sync is still settling,
  // keep them on a loading state instead of kicking them back to /login.
  if (isAuth0Authenticated && !user) {
    return <LoadingPage message="Finalizing your account and dashboard..." />;
  }

  if (!user && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to the role-specific dashboard URL so deep-links and shared URLs
  // resolve cleanly. RoleRoute on the destination handles guarding.
  const target =
    user.role === 'admin'
      ? '/dashboard/admin'
      : user.role === 'reader'
        ? '/dashboard/reader'
        : '/dashboard/client';
  return <Navigate to={target} replace />;
}
