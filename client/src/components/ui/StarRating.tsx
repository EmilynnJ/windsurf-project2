import { useState } from 'react';

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
}

function StarRating({
  value,
  max = 5,
  onChange,
  size = 'md',
  showValue = false,
  count,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number>(0);
  const interactive = !!onChange;
  const displayed = hovered || value;

  return (
    <div className="flex items-center gap-1">
      <div
        className={`stars stars--${size}`}
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={`Rating: ${value} out of ${max} stars`}
      >
        {Array.from({ length: max }, (_, i) => {
          const starNum = i + 1;
          const filled = starNum <= displayed;

          return interactive ? (
            <button
              key={i}
              className={`star-btn star ${filled ? 'star--filled' : ''}`}
              onClick={() => onChange(starNum)}
              onMouseEnter={() => setHovered(starNum)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
              type="button"
            >
              ★
            </button>
          ) : (
            <span
              key={i}
              className={`star ${filled ? 'star--filled' : ''}`}
              aria-hidden="true"
            >
              ★
            </span>
          );
        })}
      </div>
      {showValue && <span className="stars__value">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="stars__count">({count})</span>}
    </div>
  );
}

export { StarRating };
export type { StarRatingProps };
