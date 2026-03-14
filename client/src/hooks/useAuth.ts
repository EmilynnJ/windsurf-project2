import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthState } from '../types';

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
