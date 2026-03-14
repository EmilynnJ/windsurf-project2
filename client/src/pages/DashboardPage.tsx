// ============================================================
// DashboardPage — Role-based dashboard (client / reader / admin)
// ============================================================

import { useAuth } from '../hooks/useAuth';
import { ClientDashboard } from './dashboard/ClientDashboard';
import { ReaderDashboard } from './dashboard/ReaderDashboard';
import { AdminDashboard } from './dashboard/AdminDashboard';

export function DashboardPage() {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container page-content">
        <div className="spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-content page-enter">
        <div className="container empty-state">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
            Unable to Load Dashboard
          </h3>
          <p style={{ marginTop: '8px' }}>{error || 'Please try logging in again.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content page-enter">
      <div className="container">
        <section style={{ padding: '32px 0 24px' }}>
          <h1>
            {user.role === 'admin'
              ? 'Admin Dashboard'
              : user.role === 'reader'
                ? 'Reader Dashboard'
                : 'My Dashboard'}
          </h1>
          <p style={{ marginTop: '4px', color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Welcome back, {user.fullName || user.username || user.email}
          </p>
        </section>

        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'reader' && <ReaderDashboard />}
        {user.role === 'client' && <ClientDashboard />}
      </div>
    </div>
  );
}
