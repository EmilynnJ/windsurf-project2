import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export interface DbUser {
  id: number;
  auth0Id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'client' | 'reader' | 'admin';
  accountBalance: number;
  isOnline: boolean;
}

interface AuthContextType {
  dbUser: DbUser | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently, user: auth0User } = useAuth0();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const syncAndFetchUser = useCallback(async () => {
    if (!isAuthenticated || !auth0User) {
      setDbUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = await getAccessTokenSilently();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Step 1: Sync user with backend
      const syncResponse = await fetch(`${apiUrl}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: auth0User.email,
          username: auth0User.nickname || auth0User.name || auth0User.email?.split('@')[0] || 'user',
          fullName: auth0User.name || auth0User.nickname || 'Anonymous',
        }),
      });

      if (!syncResponse.ok) {
        throw new Error(`Sync failed: ${syncResponse.statusText}`);
      }

      // Step 2: Fetch full user profile
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error(`Failed to fetch user: ${meResponse.statusText}`);
      }

      const userData = await meResponse.json();
      setDbUser(userData);
    } catch (err) {
      console.error('Auth sync error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently, auth0User]);

  useEffect(() => {
    syncAndFetchUser();
  }, [syncAndFetchUser]);

  const refreshUser = useCallback(async () => {
    await syncAndFetchUser();
  }, [syncAndFetchUser]);

  return (
    <AuthContext.Provider value={{ dbUser, isLoading, error, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
