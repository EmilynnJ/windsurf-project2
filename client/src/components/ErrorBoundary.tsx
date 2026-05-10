// ============================================================
// ErrorBoundary — Production error boundary with cosmic theme
// ============================================================

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production this would log to an error-reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="page-wrapper">
          <div className="container">
            <div className="empty-state">
              <div className="empty-state__icon" aria-hidden="true">✨</div>
              <h2 className="empty-state__title">Something Went Wrong</h2>
              <p className="empty-state__text">
                The stars seem temporarily misaligned. Please try again.
              </p>

              {this.state.error && (
                <pre className="card card--static caption" aria-label="Error details">
                  {this.state.error.message}
                </pre>
              )}

              <div className="flex gap-3">
                <Button variant="primary" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { window.location.href = '/'; }}
                >
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
