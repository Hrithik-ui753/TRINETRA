import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Floating Particles Field ─── */
function ParticleField({ count = 600, isActivated = false }: { count?: number; isActivated?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 25;
      temp.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        speed: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.06,
      });
    }
    return temp;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!mesh.current) return;
    particles.forEach((p, i) => {
      const pulse = isActivated ? Math.sin(t * 6 + p.phase) * 0.5 + 1.5 : 1;
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3,
        p.z + Math.sin(t * p.speed * 0.5) * 0.4,
      );
      dummy.scale.setScalar(p.scale * pulse);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={isActivated ? '#22d3ee' : '#38bdf8'} transparent opacity={0.7} />
    </instancedMesh>
  );
}

/* ─── Orbital Ring ─── */
function OrbitalRing({
  radius = 12,
  tube = 0.03,
  color = '#22d3ee',
  speed = 0.3,
  tilt = 0,
  isActivated = false,
}: {
  radius?: number;
  tube?: number;
  color?: string;
  speed?: number;
  tilt?: number;
  isActivated?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.z = tilt + Math.sin(t * 0.2) * 0.05;
      ref.current.rotation.y = t * speed;
      const pulse = isActivated ? 1.5 : 1;
      ref.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={isActivated ? 0.5 : 0.2} />
    </mesh>
  );
}

/* ─── Nebula Cloud ─── */
function NebulaCloud({
  position,
  color,
  scale = 3,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.z = t * 0.05;
      ref.current.rotation.x = Math.sin(t * 0.1) * 0.1;
      const breathe = 1 + Math.sin(t * 0.3) * 0.05;
      ref.current.scale.setScalar(scale * breathe);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.BackSide} />
    </mesh>
  );
}

/* ─── Central Core Orb ─── */
function CoreOrb({ isActivated = false }: { isActivated?: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.5;
      ref.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    if (glowRef.current) {
      const s = isActivated ? 3.2 + Math.sin(t * 4) * 0.5 : 2.8 + Math.sin(t * 1.5) * 0.2;
      glowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Core */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.6, 2]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.6} />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
      </mesh>
      {/* Outer glow aura */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

/* ─── Orbiting Satellites ─── */
function Satellites({ count = 6, isActivated = false }: { count?: number; isActivated?: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.2;
    }
  });

  const satPositions = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 4 + (i % 3) * 1.5;
      return { angle, radius, speed: 0.3 + (i % 3) * 0.15 };
    });
  }, [count]);

  return (
    <group ref={groupRef}>
      {satPositions.map((sat, i) => (
        <Float key={i} speed={sat.speed} rotationIntensity={0} floatIntensity={0.3}>
          <mesh position={[Math.cos(sat.angle) * sat.radius, Math.sin(i * 0.5) * 1.5, Math.sin(sat.angle) * sat.radius]}>
            <octahedronGeometry args={[isActivated ? 0.15 : 0.1, 0]} />
            <meshBasicMaterial color={isActivated ? '#22d3ee' : '#60a5fa'} transparent opacity={0.8} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/* ─── Mouse-Following Camera Rig ─── */
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useFrame(() => {
    mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.03;
    mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.03;
    camera.position.x = mouse.current.x * 2;
    camera.position.y = mouse.current.y * 1.5;
    camera.lookAt(0, 0, 0);
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouse.current.tx = (e.clientX / window.innerWidth - 0.5) * 4;
    mouse.current.ty = -(e.clientY / window.innerHeight - 0.5) * 3;
  }, []);

  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleMouseMove);
  }

  return null;
}

/* ─── Main Export ─── */
interface SpaceSceneProps {
  isActivated?: boolean;
  isOffline?: boolean;
  healthWarning?: boolean;
  className?: string;
}

export function SpaceScene({
  isActivated = false,
  isOffline = false,
  healthWarning = false,
  className = '',
}: SpaceSceneProps) {
  const primaryColor = healthWarning ? '#f59e0b' : isOffline ? '#fbbf24' : isActivated ? '#22d3ee' : '#38bdf8';
  const secondaryColor = healthWarning ? '#d97706' : isOffline ? '#d97706' : '#06b6d4';

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 18], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#05070d']} />
        <fog attach="fog" args={['#05070d', 20, 50]} />

        <CameraRig />

        {/* Starfield from drei */}
        <Stars radius={50} depth={60} count={3000} factor={3} saturation={0.2} fade speed={isActivated ? 1.5 : 0.5} />

        {/* Custom particle field */}
        <ParticleField count={500} isActivated={isActivated} />

        {/* Central core */}
        <CoreOrb isActivated={isActivated} />

        {/* Orbital rings with dynamic color response */}
        <OrbitalRing radius={6} tube={0.02} color={primaryColor} speed={isActivated ? 0.8 : 0.4} tilt={0.3} isActivated={isActivated} />
        <OrbitalRing radius={8} tube={0.015} color={secondaryColor} speed={isActivated ? -0.5 : -0.25} tilt={-0.5} isActivated={isActivated} />
        <OrbitalRing radius={11} tube={0.01} color={primaryColor} speed={0.15} tilt={0.8} isActivated={isActivated} />
        <OrbitalRing radius={14} tube={0.008} color={secondaryColor} speed={-0.1} tilt={-1.2} isActivated={isActivated} />

        {/* Nebula clouds */}
        <NebulaCloud position={[-10, 5, -15]} color={secondaryColor} scale={5} />
        <NebulaCloud position={[12, -8, -20]} color={primaryColor} scale={7} />
        <NebulaCloud position={[0, 10, -25]} color={secondaryColor} scale={8} />

        {/* Satellites */}
        <Satellites count={8} isActivated={isActivated} />
      </Canvas>
    </div>
  );
}

