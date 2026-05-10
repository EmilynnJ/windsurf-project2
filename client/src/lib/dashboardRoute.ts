import type { UserRole } from '../types';

/**
 * Single source of truth for the role-specific dashboard URL. Used by
 * Navigation, Footer, DashboardPage, and RoleRoute so a future rename only
 * touches one place.
 */
export function dashboardPathForRole(role: UserRole | null | undefined): string {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'reader') return '/dashboard/reader';
  if (role === 'client') return '/dashboard/client';
  return '/dashboard';
}

/**
 * Format a balance stored as integer cents into a USD string for display.
 * All financial values stay as integers in transit per the build guide.
 */
export function formatCents(cents: number | null | undefined): string {
  const value = typeof cents === 'number' ? cents : 0;
  return `$${(value / 100).toFixed(2)}`;
}
