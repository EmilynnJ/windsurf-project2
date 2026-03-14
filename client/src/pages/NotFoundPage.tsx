import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="page-enter">
      <div className="container">
        <div className="empty-state">
          <div className="empty-state__icon">🔮</div>
          <h1 className="heading-1">404</h1>
          <h2 className="heading-3">Lost in the Cosmos</h2>
          <p className="empty-state__text">
            The page you're seeking has drifted beyond the stars.
            Let us guide you back.
          </p>
          <div className="flex gap-4">
            <Link to="/">
              <Button variant="primary" size="lg">
                Return Home
              </Button>
            </Link>
            <Link to="/readers">
              <Button variant="secondary" size="lg">
                Browse Readers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
