import { useEffect, useRef, useState } from 'react';

interface MouseGlowProps {
  color?: string;
  size?: number;
  opacity?: number;
  className?: string;
  followSpeed?: number;
  trailLength?: number;
}

export function MouseGlow({
  color = 'rgba(34, 211, 238, 0.08)',
  size = 400,
  opacity = 1,
  className = '',
  followSpeed = 0.08,
  trailLength = 5,
}: MouseGlowProps) {
  const [position, setPosition] = useState({ x: -500, y: -500 });
  const targetRef = useRef({ x: -500, y: -500 });
  const posRef = useRef({ x: -500, y: -500 });
  const trailsRef = useRef<{ x: number; y: number }[]>(
    Array.from({ length: trailLength }, () => ({ x: -500, y: -500 })),
  );
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMove);

    const animate = () => {
      const p = posRef.current;
      const t = targetRef.current;
      p.x += (t.x - p.x) * followSpeed;
      p.y += (t.y - p.y) * followSpeed;
      setPosition({ x: p.x, y: p.y });

      // Update trails
      const trails = trailsRef.current;
      for (let i = trails.length - 1; i > 0; i--) {
        trails[i].x = trails[i - 1].x;
        trails[i].y = trails[i - 1].y;
      }
      trails[0] = { x: p.x, y: p.y };

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [followSpeed, trailLength]);

  return (
    <div className={`pointer-events-none fixed inset-0 z-[9998] overflow-hidden ${className}`} style={{ opacity }}>
      {/* Main glow */}
      <div
        className="absolute rounded-full"
        style={{
          left: position.x - size / 2,
          top: position.y - size / 2,
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transition: 'left 0.05s linear, top 0.05s linear',
        }}
      />
      {/* Trail particles */}
      {trailsRef.current.map((trail, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: trail.x - size * 0.15,
            top: trail.y - size * 0.15,
            width: size * 0.3,
            height: size * 0.3,
            background: `radial-gradient(circle, rgba(34, 211, 238, ${0.03 * (trailLength - i)}) 0%, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
