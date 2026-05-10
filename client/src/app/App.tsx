import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigation } from "../components/Navigation";
import { HomePage } from "../pages/HomePage";
import { ReadersPage } from "../pages/readers/ReadersPage";
import { ReaderProfilePage } from "../pages/readers/ReaderProfilePage";
import { CommunityHubPage } from "../pages/CommunityHubPage";
import { ReadingSessionPage } from "../pages/ReadingSessionPage";
import { MessagingPage } from "../pages/MessagingPage";
import { AboutPage } from "../pages/AboutPage";
import { ClientDashboard } from "../pages/ClientDashboard";
import { ReaderDashboard } from "../pages/ReaderDashboard";
import { LoginPage } from "../pages/LoginPage";
import { HelpPage } from "../pages/HelpPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { useAuth } from "../context/AuthContext";

// Dashboard redirect component based on user role
function DashboardRedirect() {
  const { isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const { dbUser, isLoading: dbUserLoading } = useAuth();

  // Show spinner while loading
  if (auth0Loading || dbUserLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0A0A0F'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(255, 105, 180, 0.3)',
          borderTop: '3px solid #FF69B4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated → redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // dbUser is null but authenticated → still loading
  if (!dbUser) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0A0A0F'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(255, 105, 180, 0.3)',
          borderTop: '3px solid #FF69B4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Role-based redirect
  switch (dbUser.role) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'reader':
      return <Navigate to="/dashboard/reader" replace />;
    case 'client':
      return <Navigate to="/dashboard/client" replace />;
    default:
      return <Navigate to="/dashboard/client" replace />;
  }
}

export function App() {
  return (
    <BrowserRouter>
      <>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/readers" element={<ReadersPage />} />
          <Route path="/readers/:id" element={<ReaderProfilePage />} />
          <Route path="/community" element={<CommunityHubPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/dashboard/client" element={<ClientDashboard />} />
          <Route path="/dashboard/reader" element={<ReaderDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/reading/:id" element={<ReadingSessionPage />} />
          <Route path="/session/:sessionId" element={<ReadingSessionPage />} />
          <Route path="/messages" element={<MessagingPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </BrowserRouter>
  );
}
