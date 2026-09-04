import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Infinite Grid Floor ─── */
function GridFloor() {
  const ref = useRef<THREE.Mesh>(null!);

  const gridShader = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#22d3ee') },
        uColor2: { value: new THREE.Color('#0891b2') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        void main() {
          vec2 grid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
          float line = min(grid.x, grid.y);
          float gridLine = 1.0 - smoothstep(0.0, 0.03, line);
          
          float dist = length(vWorldPos.xz) * 0.04;
          float fade = 1.0 - smoothstep(0.0, 1.0, dist);
          
          float pulse = sin(uTime * 0.8 + vWorldPos.x * 0.3 + vWorldPos.z * 0.2) * 0.5 + 0.5;
          
          vec3 color = mix(uColor1, uColor2, pulse) * 0.4;
          float alpha = gridLine * fade * (0.15 + pulse * 0.1);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -6, 0]}>
      <planeGeometry args={[120, 120, 1, 1]} />
      <shaderMaterial
        {...gridShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ─── Scan Line Sweeping ─── */
function ScanLine() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const z = ((t * 2) % 40) - 20;
      ref.current.position.z = z;
      const pulse = Math.sin(t * 3) * 0.3 + 0.7;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.08 * pulse;
    }
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -5.9, 0]}>
      <planeGeometry args={[60, 0.5]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} />
    </mesh>
  );
}

/* ─── Vertical Light Pillar ─── */
function LightPillar({
  position,
  height = 12,
  color = '#22d3ee',
  delay = 0,
}: {
  position: [number, number, number];
  height?: number;
  color?: string;
  delay?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const y = Math.sin(t * 0.5 + delay) * 2;
      ref.current.position.y = height / 2 - 6 + y;
      const scale = 0.8 + Math.sin(t * 0.8 + delay) * 0.2;
      ref.current.scale.y = scale;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.02, 0.02, height, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} />
    </mesh>
  );
}

/* ─── Main Export ─── */
interface CosmicGridProps {
  className?: string;
}

export function CosmicGrid({ className = '' }: CosmicGridProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 4, 16], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 15, 40]} />

        <GridFloor />
        <ScanLine />

        {/* Vertical light pillars */}
        <LightPillar position={[-8, 0, -5]} height={14} color="#22d3ee" delay={0} />
        <LightPillar position={[6, 0, -8]} height={10} color="#06b6d4" delay={1.5} />
        <LightPillar position={[-3, 0, -12]} height={16} color="#3b82f6" delay={3} />
        <LightPillar position={[10, 0, -3]} height={12} color="#0891b2" delay={4.5} />
        <LightPillar position={[-12, 0, -7]} height={8} color="#22d3ee" delay={2} />
      </Canvas>
    </div>
  );
}
