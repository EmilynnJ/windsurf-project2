import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'online' | 'offline' | 'gold' | 'pink' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

function Badge({
  variant = 'gold',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const classes = [
    'badge',
    `badge--${variant}`,
    size === 'lg' ? 'badge--lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/** Convenience: Online/Offline status badge */
function StatusBadge({ online }: { online: boolean }) {
  return (
    <Badge variant={online ? 'online' : 'offline'}>
      {online ? 'Online' : 'Offline'}
    </Badge>
  );
}

export { Badge, StatusBadge };
export type { BadgeProps, BadgeVariant };
