import { useContext } from 'react';
import { AuthContext, type AuthStateWithError } from '../contexts/AuthContext';

export function useAuth(): AuthStateWithError {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
