import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { AdminDashboard } from "../pages/admin/AdminDashboard";

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
          <Route path="/dashboard/client" element={<ClientDashboard />} />
          <Route path="/dashboard/reader" element={<ReaderDashboard />} />
          <Route path="/session/:sessionId" element={<ReadingSessionPage />} />
          <Route path="/messages" element={<MessagingPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </BrowserRouter>
  );
}
