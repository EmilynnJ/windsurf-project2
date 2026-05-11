import { useMemo } from 'react';

/**
 * Renders subtle twinkling star dots as a fixed background layer.
 * Pure CSS animation — no JS overhead.
 */
function CosmicBackground() {
  const dots = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 5}s`,
      delay: `${Math.random() * 4}s`,
      brightness: 0.3 + Math.random() * 0.5,
      size: Math.random() > 0.85 ? 3 : Math.random() > 0.5 ? 2 : 1,
    }));
  }, []);

  return (
    <div className="cosmic-dots" aria-hidden="true">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="cosmic-dot"
          style={{
            left: dot.left,
            top: dot.top,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            ['--duration' as string]: dot.duration,
            ['--delay' as string]: dot.delay,
            ['--brightness' as string]: dot.brightness,
          }}
        />
      ))}
    </div>
  );
}

export { CosmicBackground };
