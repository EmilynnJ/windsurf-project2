// ============================================================
// Navigation — Responsive top nav with mobile hamburger
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/readers', label: 'Readers' },
  { to: '/about', label: 'About' },
  { to: '/community', label: 'Community' },
  { to: '/help', label: 'Help' },
] as const;

export function Navigation() {
  const { isAuthenticated, isLoading, user, login, signup, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Detect scroll for background effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <nav
      ref={navRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 'var(--nav-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: scrolled
          ? 'rgba(10, 10, 15, 0.95)'
          : 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
        transition: 'all var(--transition-normal)',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
          color: 'var(--primary-pink)',
          textDecoration: 'none',
          lineHeight: 1,
        }}
      >
        SoulSeer
      </Link>

      {/* Desktop nav links */}
      <div
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '8px',
        }}
        className="nav-desktop-links"
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            style={({ isActive }) => ({
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive ? 'var(--primary-pink)' : 'var(--text-light-secondary)',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              background: isActive ? 'rgba(255, 105, 180, 0.1)' : 'transparent',
              transition: 'all var(--transition-fast)',
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* Desktop auth buttons */}
      <div
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '12px',
        }}
        className="nav-desktop-auth"
      >
        {isLoading ? null : isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 18px' }}
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '0.85rem' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={login}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '0.85rem' }}
            >
              Log In
            </button>
            <button
              onClick={signup}
              className="btn btn-sm btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="nav-hamburger"
        aria-label="Toggle menu"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          zIndex: 1002,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '24px',
            height: '2px',
            background: 'var(--text-light)',
            borderRadius: '2px',
            transition: 'all 0.3s',
            transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
          }}
        />
        <span
          style={{
            display: 'block',
            width: '24px',
            height: '2px',
            background: 'var(--text-light)',
            borderRadius: '2px',
            transition: 'all 0.3s',
            opacity: mobileOpen ? 0 : 1,
          }}
        />
        <span
          style={{
            display: 'block',
            width: '24px',
            height: '2px',
            background: 'var(--text-light)',
            borderRadius: '2px',
            transition: 'all 0.3s',
            transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
          }}
        />
      </button>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 'var(--nav-height)',
            background: 'rgba(10, 10, 15, 0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            padding: '32px 24px',
            gap: '8px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                fontFamily: 'var(--font-body)',
                fontSize: '1.1rem',
                fontWeight: 500,
                color: isActive ? 'var(--primary-pink)' : 'var(--text-light-secondary)',
                textDecoration: 'none',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(255, 105, 180, 0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--primary-pink)' : '3px solid transparent',
                transition: 'all var(--transition-fast)',
              })}
            >
              {link.label}
            </NavLink>
          ))}

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '16px 0' }} />

          {isLoading ? null : isAuthenticated ? (
            <>
              {user && (
                <div
                  style={{
                    padding: '12px 16px',
                    color: 'var(--text-light-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                  }}
                >
                  Signed in as {user.fullName || user.username || user.email}
                </div>
              )}
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--accent-gold)',
                  textDecoration: 'none',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: 'var(--text-light-muted)',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '12px', padding: '8px 16px' }}>
              <button
                onClick={() => { login(); setMobileOpen(false); }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Log In
              </button>
              <button
                onClick={() => { signup(); setMobileOpen(false); }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}

      {/* Styles for responsive desktop links */}
      <style>{`
        @media (min-width: 768px) {
          .nav-desktop-links { display: flex !important; }
          .nav-desktop-auth { display: flex !important; }
          .nav-hamburger { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
