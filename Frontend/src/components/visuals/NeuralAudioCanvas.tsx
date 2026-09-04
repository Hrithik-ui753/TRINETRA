import { useEffect, useRef } from 'react';

interface NeuralAudioCanvasProps {
  className?: string;
  isActivated?: boolean;
}

export function NeuralAudioCanvas({ className = '', isActivated = false }: NeuralAudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / width - 0.5;
      const y = (e.clientY - rect.top) / height - 0.5;
      mouseRef.current.targetX = x * 1.5;
      mouseRef.current.targetY = y * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Particle nodes for 3D sphere / acoustic lattice
    const NUM_POINTS = 90;
    const points: { phi: number; theta: number; radius: number; speed: number; phase: number }[] = [];

    for (let i = 0; i < NUM_POINTS; i++) {
      points.push({
        phi: Math.acos(-1 + (2 * i) / NUM_POINTS),
        theta: Math.sqrt(NUM_POINTS * Math.PI) * i,
        radius: 140 + Math.random() * 20,
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const rotY = time * 0.4 + mouseRef.current.x * 2;
      const rotX = Math.sin(time * 0.3) * 0.2 + mouseRef.current.y * 2;

      // Draw concentric acoustic shockwaves
      const numRings = 4;
      for (let r = 0; r < numRings; r++) {
        const ringTime = (time * 0.8 + (r * Math.PI) / numRings) % Math.PI;
        const ringRadius = 80 + ringTime * 120;
        const alpha = Math.max(0, 1 - ringRadius / 220) * (isActivated ? 0.4 : 0.15);

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isActivated
          ? `rgba(34, 211, 238, ${alpha})`
          : `rgba(56, 189, 248, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Project 3D sphere points to 2D screen coordinates
      const projected = points.map((p) => {
        const curRadius = isActivated
          ? p.radius + Math.sin(time * 6 + p.phase) * 35
          : p.radius + Math.sin(time * 2 + p.phase) * 10;

        // Spherical to Cartesian
        let x = curRadius * Math.sin(p.phi) * Math.cos(p.theta + time * p.speed);
        let y = curRadius * Math.sin(p.phi) * Math.sin(p.theta + time * p.speed);
        let z = curRadius * Math.cos(p.phi);

        // Rotate Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        // Rotate X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        // Perspective projection
        const fov = 350;
        const scale = fov / (fov + z2);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        return { px, py, z: z2, scale };
      });

      // Connect nearest neighboring points with luminous filaments
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 55) {
            const alpha = (1 - dist / 55) * 0.25 * (p1.scale > 1 ? 1 : 0.5);
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = isActivated
              ? `rgba(34, 211, 238, ${alpha * 1.5})`
              : `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw projected nodes with depth-based glow
      projected.sort((a, b) => a.z - b.z);
      projected.forEach((p) => {
        const size = Math.max(1, p.scale * (isActivated ? 3 : 2));
        const alpha = Math.min(1, Math.max(0.15, (p.z + 180) / 360));

        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fillStyle = isActivated
          ? `rgba(34, 211, 238, ${alpha})`
          : `rgba(96, 165, 250, ${alpha * 0.8})`;
        ctx.fill();

        if (p.scale > 1.1) {
          ctx.beginPath();
          ctx.arc(p.px, p.py, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.15})`;
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isActivated]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
