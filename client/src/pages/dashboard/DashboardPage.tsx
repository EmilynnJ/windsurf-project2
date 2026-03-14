import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingPage } from '../../components/ui';
import { ClientDashboard } from './ClientDashboard';
import { ReaderDashboard } from './ReaderDashboard';
import { AdminDashboard } from './AdminDashboard';

export function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingPage message="Loading..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role ?? 'client';

  return (
    <div className="page-wrapper page-enter">
      <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-1)' }}>
              {role === 'admin' ? 'Admin Dashboard' : role === 'reader' ? 'Reader Dashboard' : 'My Dashboard'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
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
