// ============================================================
// Footer — Site-wide footer with celestial theme
// ============================================================

import { Link } from 'react-router-dom';

const footerLinks = [
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
  { to: '/community', label: 'Community' },
  { to: '/privacy', label: 'Privacy Policy' },
] as const;

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <Link to="/" className="footer__brand" aria-label="SoulSeer Home">
          SoulSeer
        </Link>

        <nav aria-label="Footer navigation">
          <ul className="footer__links">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="footer__tagline">
          ✦ Where the cosmos meets clarity ✦
        </p>

        <p className="footer__copy">
          &copy; {year} SoulSeer. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export { Footer };
