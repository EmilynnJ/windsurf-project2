import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/api';
import type { AuthState, User, UserRole } from '../types';

const ROLE_CLAIM = 'https://soulseer.app/role';

export interface AuthStateWithError extends AuthState {
  authError: string | null;
  isAuth0Authenticated: boolean;
  /**
   * Role read from the Auth0 ID token's custom claim. Available the moment
   * Auth0 finishes loading, before the Neon DB sync completes — used to drive
   * instant role-based routing without waiting on the API round-trip.
   */
  auth0Role: UserRole | null;
}

export const AuthContext = createContext<AuthStateWithError | null>(null);

function readAuth0Role(auth0User: Record<string, unknown> | null | undefined): UserRole | null {
  if (!auth0User) return null;
  const raw = auth0User[ROLE_CLAIM];
  if (raw === 'admin' || raw === 'reader' || raw === 'client') return raw;
  return null;
}

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
  const [authError, setAuthError] = useState<string | null>(null);

  const auth0Role = readAuth0Role(auth0User as Record<string, unknown> | undefined);

  const refreshUser = useCallback(async () => {
    if (!auth0IsAuth || !auth0User) {
      apiService.setAccessToken(null);
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      apiService.setAccessToken(token);

      // 1) Sync first: ensure the Neon `users` row exists / matches the
      // current Auth0 identity + role. Sync is idempotent server-side, so
      // calling it on every auth transition is safe and keeps the DB role
      // in step with the Auth0 custom claim.
      const synced = await apiService.post<User>('/api/auth/sync', {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        fullName: auth0User.name,
        profileImage: auth0User.picture,
        // Optional hint — server still authoritatively decides the role
        // based on adminEmails + DB state, but we forward what Auth0 told us
        // so the server can promote when the custom claim is set.
        auth0Role,
      });

      // 2) Then fetch /me for the canonical profile + financial fields
      // (balance, transaction history surface). /me is the source of truth
      // for everything stored in Neon; the Auth0 user object only carries
      // identity + role claim.
      try {
        const me = await apiService.get<User>('/api/auth/me');
        setUser(me);
      } catch {
        // /me failed but sync succeeded — fall back to the sync response so
        // the UI still renders the dashboard.
        setUser(synced);
      }
      setAuthError(null);
    } catch (err) {
      // Do NOT clear the Auth0 session here — that would kick the user back
      // to /authorize and cause a redirect loop when the API is temporarily
      // failing. Surface the error so Navigation can render the banner.
      const message =
        err instanceof Error ? err.message : 'Unable to load your account profile.';
      console.error('[AuthContext] Failed to sync/fetch user profile:', err);
      setUser(null);
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  }, [auth0IsAuth, auth0User, auth0Role, getAccessTokenSilently]);

  useEffect(() => {
    if (!auth0Loading) {
      void refreshUser();
    }
  }, [auth0Loading, refreshUser]);

  const login = useCallback(
    () => loginWithRedirect({ appState: { returnTo: '/dashboard' } }),
    [loginWithRedirect],
  );

  const logout = useCallback(() => {
    apiService.setAccessToken(null);
    setUser(null);
    setAuthError(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        hasSession: auth0IsAuth,
        // Authenticated for navigation purposes the moment Auth0 confirms a
        // session — dashboard routing works off the Auth0 role claim
        // immediately, while the DB sync continues in the background.
        isAuthenticated: auth0IsAuth,
        isAuth0Authenticated: auth0IsAuth,
        auth0Role,
        isLoading: auth0Loading || isLoading,
        authError,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
