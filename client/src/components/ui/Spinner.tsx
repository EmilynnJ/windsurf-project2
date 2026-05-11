interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner--sm' : size === 'lg' ? 'spinner--lg' : '';
  return (
    <div
      className={`spinner ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="loading-center">
      <Spinner size="lg" />
      {message && <p>{message}</p>}
    </div>
  );
}

/** Skeleton loader block */
function Skeleton({
  variant = 'text',
  className = '',
  width,
  height,
}: {
  variant?: 'text' | 'text-short' | 'title' | 'avatar' | 'card' | 'button';
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={width || height ? { width, height } : undefined}
      aria-hidden="true"
    />
  );
}

/** Card-shaped skeleton */
function SkeletonCard() {
  return (
    <div className="card card--static">
      <div className="skeleton-card-inner">
        <div className="skeleton-card-inner__row">
          <Skeleton variant="avatar" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton variant="text-short" />
            <Skeleton variant="text" />
          </div>
        </div>
        <Skeleton variant="text" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

export { Spinner, LoadingPage, Skeleton, SkeletonCard };
export type { SpinnerProps };
