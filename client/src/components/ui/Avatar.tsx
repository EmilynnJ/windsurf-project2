import { useState, type HTMLAttributes } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
}

function getInitial(name?: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function Avatar({
  src,
  alt,
  name,
  size = 'md',
  online,
  className = '',
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const classes = [`avatar avatar--${size}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="avatar__fallback">{getInitial(name)}</span>
      )}
      {online !== undefined && (
        <span
          className={`avatar__status avatar__status--${online ? 'online' : 'offline'}`}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

export { Avatar };
export type { AvatarProps, AvatarSize };
