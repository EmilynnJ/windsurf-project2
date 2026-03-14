// ============================================================
// useAuth — wrapper around Auth0 with app-specific user data
// ============================================================

import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect, useCallback } from 'react';
import { authApi, setTokenGetter } from '../services/api';
import type { AuthUser, UserRole } from '../types';

interface UseAuthReturn {
  /** Whether Auth0 is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated via Auth0 */
  isAuthenticated: boolean;
  /** Our app user (from DB, not Auth0) */
  user: AuthUser | null;
  /** Auth0 user profile (email, name, picture from identity provider) */
  auth0User: ReturnType<typeof useAuth0>['user'];
  /** Trigger login redirect */
  login: () => void;
  /** Trigger signup redirect */
  signup: () => void;
  /** Log out */
  logout: () => void;
  /** Check if user has given role */
  hasRole: (role: UserRole) => boolean;
  /** Check if user is admin */
  isAdmin: boolean;
  /** Check if user is reader */
  isReader: boolean;
  /** Check if user is client */
  isClient: boolean;
  /** Refresh user data from API */
  refreshUser: () => Promise<void>;
  /** Error message if sync failed */
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const {
    isLoading: auth0Loading,
    isAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inject token getter into API service once
  useEffect(() => {
    setTokenGetter(getAccessTokenSilently);
  }, [getAccessTokenSilently]);

  // Sync user to our DB on first auth
  const syncUser = useCallback(async () => {
    if (!isAuthenticated || !auth0User) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      // Try to get existing user first
      const dbUser = await authApi.getMe();
      setUser({
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        username: dbUser.username,
        fullName: dbUser.fullName,
        profileImage: dbUser.profileImage,
        accountBalance: dbUser.accountBalance,
        isOnline: dbUser.isOnline,
      });
    } catch {
      // User doesn't exist in our DB yet — sync from Auth0
      try {
        const result = await authApi.syncUser({
          email: auth0User.email || '',
          username: auth0User.nickname || auth0User.email?.split('@')[0] || 'user',
          fullName: auth0User.name || '',
        });
        setUser({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          username: result.user.username ?? null,
          fullName: result.user.fullName ?? null,
          profileImage: result.user.profileImage ?? null,
          accountBalance: result.user.accountBalance ?? 0,
          isOnline: result.user.isOnline ?? false,
        });
      } catch (syncErr) {
        console.error('Failed to sync user:', syncErr);
        setError('Failed to sync your account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, auth0User]);

  useEffect(() => {
    if (!auth0Loading) {
      syncUser();
    }
  }, [auth0Loading, syncUser]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const dbUser = await authApi.getMe();
      setUser({
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        username: dbUser.username,
        fullName: dbUser.fullName,
        profileImage: dbUser.profileImage,
        accountBalance: dbUser.accountBalance,
        isOnline: dbUser.isOnline,
      });
    } catch {
      // Ignore refresh errors
    }
  }, [isAuthenticated]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    setUser(null);
  }, [auth0Logout]);

  const hasRole = useCallback(
    (role: UserRole) => user?.role === role,
    [user]
  );

  return {
    isLoading: auth0Loading || isLoading,
    isAuthenticated,
    user,
    auth0User,
    login,
    signup,
    logout,
    hasRole,
    isAdmin: user?.role === 'admin',
    isReader: user?.role === 'reader',
    isClient: user?.role === 'client',
    refreshUser,
    error,
  };
}
