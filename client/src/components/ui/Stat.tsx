import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: string | number;
  change?: { value: string; direction: 'up' | 'down' };
  icon?: ReactNode;
}

function Stat({ label, value, change, icon }: StatProps) {
  return (
    <div className="stat">
      <div className="flex items-center justify-between">
        <span className="stat__label">{label}</span>
        {icon && <span className="stat__icon" aria-hidden="true">{icon}</span>}
      </div>
      <span className="stat__value">{value}</span>
      {change && (
        <span className={`stat__change stat__change--${change.direction}`}>
          {change.direction === 'up' ? '↑' : '↓'} {change.value}
        </span>
      )}
    </div>
  );
}

export { Stat };
export type { StatProps };
