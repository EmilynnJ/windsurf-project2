// ============================================================
// App — Root component with routing
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ToastProvider } from '../components/ToastProvider';
import { HomePage } from '../pages/HomePage';
import { ReadersPage } from '../pages/readers/ReadersPage';
import { ReaderProfilePage } from '../pages/readers/ReaderProfilePage';
import { AboutPage } from '../pages/AboutPage';
import { CommunityHubPage } from '../pages/CommunityHubPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ReadingSessionPage } from '../pages/ReadingSessionPage';
import { HelpPage } from '../pages/HelpPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Navigation />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/readers" element={<ReadersPage />} />
          <Route path="/readers/:id" element={<ReaderProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/community" element={<CommunityHubPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/help" element={<HelpPage />} />

          {/* Authenticated routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reading/:id"
            element={
              <ProtectedRoute>
                <ReadingSessionPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → Home */}
          <Route
            path="*"
            element={
              <div className="page-content page-enter">
                <div className="container empty-state" style={{ paddingTop: '80px' }}>
                  <h1 style={{ fontSize: '3rem', marginBottom: '12px' }}>404</h1>
                  <p style={{ fontSize: '1rem' }}>This page doesn't exist.</p>
                  <a href="/" className="btn btn-primary" style={{ marginTop: '20px' }}>
                    Go Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
