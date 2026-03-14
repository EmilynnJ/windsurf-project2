import { useAuth } from '../../hooks/useAuth';
import { LoadingPage } from '../../components/ui';
import { ClientDashboard } from './ClientDashboard';
import { ReaderDashboard } from './ReaderDashboard';
import { AdminDashboard } from './AdminDashboard';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage message="Preparing your dashboard..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'reader':
      return <ReaderDashboard />;
    case 'client':
    default:
      return <ClientDashboard />;
  }
}
