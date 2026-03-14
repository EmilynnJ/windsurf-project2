// Component testing file to verify all frontend components are working
import React from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { ReadersPage } from './pages/readers/ReadersPage';
import { ReaderProfilePage } from './pages/readers/ReaderProfilePage';
import { CommunityHubPage } from './pages/CommunityHubPage';
import { ReadingSessionPage } from './pages/ReadingSessionPage';
import { MessagingPage } from './pages/MessagingPage';
import { AboutPage } from './pages/AboutPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { ReaderDashboard } from './pages/ReaderDashboard';
import { LoginPage } from './pages/LoginPage';
import { HelpPage } from './pages/HelpPage';

// Simple test component to verify all imports work
export function TestComponents() {
  return (
    <div>
      <h1>Component Test Page</h1>
      <p>All components imported successfully!</p>
    </div>
  );
}