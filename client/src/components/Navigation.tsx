// ============================================================
// Navigation — Fixed nav with glass morphism, mobile menu
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui';
import { dashboardPathForRole, formatCents } from '../lib/dashboardRoute';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/readers', label: 'Readers' },
  { to: '/community', label: 'Community' },
  { to: '/about', label: 'About' },
] as const;

function Navigation() {
  const {
    isAuthenticated,
    isAuth0Authenticated,
    user,
    auth0Role,
    login,
    logout,
    authError,
  } = useAuth();

  // Show signed-in UI the moment Auth0 confirms the session — don't wait
  // for the Neon DB sync. The dashboard URL is derived from whichever role
  // source has resolved first (DB → claim).
  const showSignedInUi = isAuth0Authenticated || isAuthenticated || !!user;
  const effectiveRole = user?.role ?? auth0Role ?? null;
  const dashboardHref = dashboardPathForRole(effectiveRole);
  const profileRoute = user?.id ? `/readers/${user.id}` : dashboardHref;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (
        mobileOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    },
    [mobileOpen],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav__link ${isActive ? 'nav__link--active' : ''}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav__mobile-link ${isActive ? 'nav__mobile-link--active' : ''}`;

  // Only show balance for clients — readers see earnings on their own
  // dashboard, admins don't have a personal balance to surface.
  const showBalance =
    showSignedInUi && (effectiveRole === 'client' || user?.role === 'client');
  const balanceLabel = formatCents(user?.balance);

  return (
    <nav
      className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {authError && (
        <div role="alert" className="nav__auth-error">
          Sign-in problem: {authError}{' '}
          <button
            type="button"
            onClick={() => logout()}
            className="nav__auth-error-btn"
          >
            Reset session
          </button>
        </div>
      )}
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="SoulSeer Home">
          SoulSeer
        </Link>

        <ul className="nav__links">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={linkClass} end={item.to === '/'}>
                {item.label}
              </NavLink>
            </li>
          ))}
          {showSignedInUi && (
            <li>
              <NavLink to={dashboardHref} className={linkClass}>
                Dashboard
              </NavLink>
            </li>
          )}
          {showSignedInUi && user?.role === 'reader' && (
            <li>
              <NavLink to={profileRoute} className={linkClass}>
                Profile
              </NavLink>
            </li>
          )}
          {showBalance && user && (
            <li>
              <span className="nav__balance" aria-label="Account balance">
                {balanceLabel}
              </span>
            </li>
          )}
          <li>
            {showSignedInUi ? (
              <div className="flex items-center gap-3">
                {user?.fullName && (
                  <span className="nav__user-name">{user.fullName}</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={() => login()}>
                Sign In
              </Button>
            )}
          </li>
        </ul>

        <button
          ref={toggleRef}
          className="nav__toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      <div
        ref={menuRef}
        id="mobile-nav-menu"
        className={`nav__mobile-menu ${mobileOpen ? 'nav__mobile-menu--open' : ''}`}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={mobileLinkClass}
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
        {showSignedInUi && (
          <NavLink to={dashboardHref} className={mobileLinkClass}>
            Dashboard
          </NavLink>
        )}
        {showSignedInUi && user?.role === 'reader' && (
          <NavLink to={profileRoute} className={mobileLinkClass}>
            Profile
          </NavLink>
        )}
        {showBalance && user && (
          <p className="nav__mobile-balance">Balance: {balanceLabel}</p>
        )}

        <div className="nav__mobile-auth">
          {showSignedInUi ? (
            <>
              {user?.fullName && (
                <p className="nav__mobile-user-name">
                  Signed in as {user.fullName}
                </p>
              )}
              <Button variant="ghost" fullWidth onClick={() => logout()}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="primary" fullWidth onClick={() => login()}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

export { Navigation };
