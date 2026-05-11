import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import type { AuthStateWithError } from '../contexts/AuthContext';

const mockUseAuth = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../pages/dashboard/ClientDashboard', () => ({
  ClientDashboard: () => <div>Client Dashboard Mock</div>,
}));

vi.mock('../pages/dashboard/ReaderDashboard', () => ({
  ReaderDashboard: () => <div>Reader Dashboard Mock</div>,
}));

vi.mock('../pages/dashboard/AdminDashboard', () => ({
  AdminDashboard: () => <div>Admin Dashboard Mock</div>,
}));

function buildAuthState(
  overrides: Partial<AuthStateWithError> = {},
): AuthStateWithError {
  return {
    user: null,
    hasSession: false,
    isAuthenticated: false,
    isLoading: false,
    authError: null,
    login: vi.fn(async () => {}),
    logout: vi.fn(),
    refreshUser: vi.fn(async () => {}),
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<div>Login Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dashboard routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('redirects to login when there is no session', () => {
    mockUseAuth.mockReturnValue(buildAuthState());

    renderDashboard();

    expect(screen.getByText('Login Route')).toBeInTheDocument();
  });

  it('renders the client dashboard for client users', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        hasSession: true,
        isAuthenticated: true,
        user: {
          id: 1,
          email: 'client@example.com',
          role: 'client',
          isOnline: false,
          balance: 0,
          accountBalance: 0,
          pricingChat: 0,
          pricingVoice: 0,
          pricingVideo: 0,
          totalReadings: 0,
          createdAt: '',
          updatedAt: '',
        },
      }),
    );

    renderDashboard();

    expect(screen.getByText('Client Dashboard Mock')).toBeInTheDocument();
  });

  it('renders the reader dashboard for reader users', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        hasSession: true,
        isAuthenticated: true,
        user: {
          id: 2,
          email: 'reader@example.com',
          role: 'reader',
          isOnline: true,
          balance: 0,
          accountBalance: 0,
          pricingChat: 100,
          pricingVoice: 200,
          pricingVideo: 300,
          totalReadings: 0,
          createdAt: '',
          updatedAt: '',
        },
      }),
    );

    renderDashboard();

    expect(screen.getByText('Reader Dashboard Mock')).toBeInTheDocument();
  });

  it('renders the admin dashboard for admin users', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        hasSession: true,
        isAuthenticated: true,
        user: {
          id: 3,
          email: 'admin@example.com',
          role: 'admin',
          isOnline: false,
          balance: 0,
          accountBalance: 0,
          pricingChat: 0,
          pricingVoice: 0,
          pricingVideo: 0,
          totalReadings: 0,
          createdAt: '',
          updatedAt: '',
        },
      }),
    );

    renderDashboard();

    expect(screen.getByText('Admin Dashboard Mock')).toBeInTheDocument();
  });

  it('shows the recovery state when the profile fails to load', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        hasSession: true,
        authError: 'API unavailable',
      }),
    );

    renderDashboard();

    expect(screen.getByText("We couldn't load your profile")).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
