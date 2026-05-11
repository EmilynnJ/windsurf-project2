// ============================================================
// PageTransition — Wraps page content with entrance animation
// ============================================================

import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps page content and applies the `page-enter` slide-up animation.
 * Use as the outermost wrapper inside each page component.
 *
 * @example
 * <PageTransition>
 *   <div className="container">…</div>
 * </PageTransition>
 */
function PageTransition({ children, className = '' }: PageTransitionProps) {
  const classes = ['page-wrapper', 'page-enter', className].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}

export { PageTransition };
export type { PageTransitionProps };
