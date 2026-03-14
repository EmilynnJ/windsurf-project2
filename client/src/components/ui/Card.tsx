import type { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'static' | 'elevated' | 'glow-pink' | 'glow-gold';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const paddingMap = { none: '', sm: 'card--pad-sm', md: '', lg: 'card--pad-lg' };
  const classes = [
    variant === 'static' ? 'card card--static' :
    variant === 'elevated' ? 'card card--elevated' :
    variant === 'glow-pink' ? 'card card--glow-pink' :
    variant === 'glow-gold' ? 'card card--glow-gold' : 'card',
    paddingMap[padding],
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props}>{children}</div>;
}

function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card__header ${className}`} {...props}>{children}</div>;
}

function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card__body ${className}`} {...props}>{children}</div>;
}

function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card__footer ${className}`} {...props}>{children}</div>;
}

export { Card, CardHeader, CardBody, CardFooter };
export type { CardProps, CardVariant };
