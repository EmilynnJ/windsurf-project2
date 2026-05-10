import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import { type ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastProvider } from './components/ToastProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CosmicBackground } from './components/CosmicBackground';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { LoadingPage } from './components/ui';
import { dashboardPathForRole } from './lib/dashboardRoute';

// Pages
import { HomePage } from './pages/HomePage';
import { ReadersPage } from './pages/readers/ReadersPage';
import { ReaderProfilePage } from './pages/readers/ReaderProfilePage';
import { CommunityHubPage } from './pages/community/CommunityHubPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ClientDashboard } from './pages/dashboard/ClientDashboard';
import { ReaderDashboard } from './pages/dashboard/ReaderDashboard';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { ReadingSessionPage } from './pages/reading/ReadingSessionPage';
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { LoginPage } from './pages/LoginPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Gate a role-specific dashboard route. While the user is loading, render a
 * cosmic loading screen. If authenticated but the role doesn't match, redirect
 * to the user's actual dashboard. If unauthenticated, send to /login.
 */
function RoleRoute({
  role,
  children,
}: {
  role: 'admin' | 'reader' | 'client';
  children: ReactNode;
}) {
  const { user, hasSession, isAuthenticated, auth0Role, isLoading } = useAuth();

  // Unauthenticated → login.
  if (!hasSession && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // Effective role for routing decisions: prefer the DB role (authoritative)
  // when /me has resolved, otherwise fall back to the Auth0 ID-token claim
  // so the user lands on the correct dashboard immediately while sync is
  // still in flight.
  const effectiveRole = user?.role ?? auth0Role ?? null;

  if (effectiveRole && effectiveRole !== role) {
    return <Navigate to={dashboardPathForRole(effectiveRole)} replace />;
  }

  // Role matches, but the financial data hasn't loaded yet — show the
  // celestial loading screen so the dashboard isn't interactive without it.
  if (!user) {
    return <LoadingPage message="Loading your dashboard..." />;
  }

  void isAuthenticated;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <CosmicBackground />
      <Navigation />
      <main id="main-content" className="page-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/readers" element={<ReadersPage />} />
          <Route path="/readers/:id" element={<ReaderProfilePage />} />
          <Route path="/community" element={<CommunityHubPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/dashboard/admin"
            element={
              <RoleRoute role="admin">
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/reader"
            element={
              <RoleRoute role="reader">
                <ReaderDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/dashboard/client"
            element={
              <RoleRoute role="client">
                <ClientDashboard />
              </RoleRoute>
            }
          />
          <Route path="/reading/:id" element={<ReadingSessionPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/legal/terms" element={<TermsOfServicePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </ErrorBoundary>
  );
}

/**
 * Auth0 provider that navigates via React Router after the login callback.
 *
 * Must be rendered INSIDE <BrowserRouter> so useNavigate() is available.
 * Previous versions used window.history.replaceState in onRedirectCallback,
 * which did not trigger a React Router re-render — the URL updated but the
 * page stayed on HomePage, making it look like /dashboard didn't exist.
 */
function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!auth0Domain || !clientId || !audience) {
    throw new Error('Missing Auth0 configuration variables in environment.');
  }

  const redirectUri = (
    import.meta.env.VITE_AUTH0_REDIRECT_URI ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '');

  const onRedirectCallback = (appState?: AppState) => {
    const target = appState?.returnTo || '/dashboard';
    navigate(target, { replace: true });
  };

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={clientId}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience,
        scope: 'openid profile email offline_access',
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <ToastProvider>
          <AuthProvider>
            <WebSocketProvider>
              <AppRoutes />
              <Analytics />
            </WebSocketProvider>
          </AuthProvider>
        </ToastProvider>
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  );
}
