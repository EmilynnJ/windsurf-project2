import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/api';
import type { AuthState, User } from '../types';

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated: auth0IsAuth,
    isLoading: auth0Loading,
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!auth0IsAuth || !auth0User) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      apiService.setAccessToken(token);

      // First try /me — works for existing users
      try {
        const userData = await apiService.get<User>('/api/auth/me');
        setUser(userData);
        return;
      } catch {
        // User not found — need to sync/create
      }

      // Sync user with backend (creates or updates the user record)
      const userData = await apiService.post<User>('/api/auth/callback', {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        fullName: auth0User.name,
        profileImage: auth0User.picture,
      });
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch/sync user profile:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth0IsAuth, auth0User, getAccessTokenSilently]);

  useEffect(() => {
    if (!auth0Loading) {
      refreshUser();
    }
  }, [auth0Loading, refreshUser]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    apiService.setAccessToken(null);
    setUser(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: auth0IsAuth && !!user,
        isLoading: auth0Loading || isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
