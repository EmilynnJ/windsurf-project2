import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingPage } from '../../components/ui';
import { ClientDashboard } from './ClientDashboard';
import { ReaderDashboard } from './ReaderDashboard';
import { AdminDashboard } from './AdminDashboard';

export function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingPage message="Loading your dashboard…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role ?? 'client';

  return (
    <div className="page-enter">
      <div className="container section">
        <div className="flex items-center justify-between">
          <div>
            <h1>
              {role === 'admin'
                ? 'Admin Dashboard'
                : role === 'reader'
                  ? 'Reader Dashboard'
                  : 'My Dashboard'}
            </h1>
            <p className="body-text">
              Welcome back, {user?.fullName || user?.displayName || 'Seeker'} ✨
            </p>
          </div>
        </div>

        {role === 'admin' ? (
          <AdminDashboard />
        ) : role === 'reader' ? (
          <ReaderDashboard />
        ) : (
          <ClientDashboard />
        )}
      </div>
    </div>
  );
}
