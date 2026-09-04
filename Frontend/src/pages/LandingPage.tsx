import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Lock, Volume2 } from 'lucide-react';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { Waveform } from '@/components/ui/Waveform';
import { AuthModal } from '@/components/auth/AuthModal';
import { SpaceScene } from '@/components/visuals/SpaceScene';
import { CosmicGrid } from '@/components/visuals/CosmicGrid';
import { MouseGlow } from '@/components/ui/MouseGlow';
import { NeuralAudioCanvas } from '@/components/visuals/NeuralAudioCanvas';
import { useAuth } from '@/context/AuthContext';

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientY - rect.top) / rect.height - 0.5) * -10, y: ((e.clientX - rect.left) / rect.width - 0.5) * 10 });
  };
  return (
    <div ref={ref} onMouseMove={handleMouseMove} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }} className={className} style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
      <motion.div animate={{ rotateX: tilt.x, rotateY: tilt.y, scale: hovered ? 1.015 : 1 }} transition={{ type: 'spring', stiffness: 350, damping: 22 }} style={{ transformStyle: 'preserve-3d' }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}

const pipelineSteps = [
  { step: '01', label: 'Dual Mic Sampling', sub: '16kHz I2S', gradient: 'from-cyan-500/20 to-sky-500/10' },
  { step: '02', label: 'MFCC Extraction', sub: '2.6ms', gradient: 'from-sky-500/20 to-blue-500/10' },
  { step: '03', label: 'INT8 KWS', sub: '0.14ms', gradient: 'from-blue-500/20 to-purple-500/10' },
  { step: '04', label: 'Privacy Gating', sub: 'Zero Cloud', gradient: 'from-purple-500/20 to-cyan-500/10' },
];

const features = [
  { icon: '🔒', title: 'Zero Ambient Leakage', desc: 'Audio discarded unless wake confirmed' },
  { icon: '⚡', title: '82ms End-to-End', desc: 'Wake detection to ASR response' },
  { icon: '🧠', title: 'On-Device TinyML', desc: 'INT8 DS-CNN · 148KB SRAM' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wakeActive, setWakeActive] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isSimulatingAudio, setIsSimulatingAudio] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 25 });
  const heroY = useTransform(smoothProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const interval = setInterval(() => { setWakeActive(true); setTimeout(() => setWakeActive(false), 2400); }, 9000);
    return () => clearInterval(interval);
  }, []);

  const openAuth = (mode: 'signin' | 'signup') => {
    if (user) { navigate('/dashboard'); return; }
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleTriggerSimulatedWake = () => {
    setIsSimulatingAudio(true);
    setWakeActive(true);
    setTimeout(() => { setIsSimulatingAudio(false); setTimeout(() => setWakeActive(false), 2000); }, 1500);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05070d] text-white selection:bg-cyan-500 selection:text-base-950 font-sans aurora-bg">
      <SpaceScene isActivated={wakeActive} className="opacity-70" />
      <CosmicGrid className="opacity-40" />
      <NeuralAudioCanvas isActivated={wakeActive} className="opacity-40 mix-blend-screen" />
      <MouseGlow color="rgba(34, 211, 238, 0.06)" size={500} opacity={0.8} followSpeed={0.06} trailLength={6} />
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-10" />
      <div className="pointer-events-none fixed inset-0 cinematic-vignette" />
      <div className="pointer-events-none fixed inset-0 gradient-mesh" />

      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#05070d]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all group-hover:border-cyan-400 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.4)]">
              <span className="text-cyan-400 font-bold text-sm">T</span>
            </div>
            <div>
              <span className="font-extrabold tracking-[0.2em] text-white text-base">TRINETRA</span>
              <span className="block font-mono text-[9px] uppercase tracking-widest text-cyan-400/80">Edge Voice AI</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 text-xs font-bold text-base-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:from-cyan-400 hover:to-cyan-300 cursor-pointer">
                OPEN CONSOLE <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button onClick={() => openAuth('signin')} className="rounded-xl border border-white/[0.08] bg-[#0c101a]/80 px-4 py-2 text-xs font-semibold text-gray-300 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:text-white cursor-pointer">Sign In</button>
                <button onClick={() => openAuth('signup')} className="hidden sm:inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-base-950 shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-all hover:bg-cyan-400 cursor-pointer">Get Access</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <motion.section ref={heroRef} style={{ y: heroY, opacity: heroOpacity }} className="relative flex min-h-screen items-center justify-center px-6 pt-28 pb-16 z-10">
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-cyan-500/[0.03] blur-[120px] animate-pulse" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-blue-500/[0.03] blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-12">
          {/* Left */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-7 z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-300 uppercase">ESP32-S3 · Zero-Cloud KWS</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05] text-3d">
              Sovereign Edge<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-200 drop-shadow-lg">Voice Intelligence</span>
            </h1>
            <p className="mt-6 text-xl font-light text-gray-200 sm:text-2xl">Wake locally. Understand intelligently. Respond instantly.</p>
            <p className="mt-4 max-w-xl text-sm text-gray-400">
              <span className="font-mono font-bold text-cyan-300">"TRINETRA"</span> wakes on-chip with INT8 TinyML. Audio streams only after verified intent. Zero ambient leakage.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button onClick={() => openAuth('signin')} className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-7 py-4 text-sm font-bold text-base-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-all duration-300 hover:from-cyan-400 hover:to-cyan-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.55)] active:scale-95 cursor-pointer holo-shimmer">
                <Lock className="h-4 w-4" /> AUTHORIZE CONSOLE <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={handleTriggerSimulatedWake} disabled={isSimulatingAudio} className="flex items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#0c101a]/80 px-6 py-4 text-sm font-semibold text-gray-200 backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#111726] hover:text-white cursor-pointer active:scale-95 electric-border">
                <Volume2 className={`h-4 w-4 text-cyan-400 ${isSimulatingAudio ? 'animate-bounce' : ''}`} />
                {isSimulatingAudio ? 'Firing...' : 'Simulate Wake'}
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-white/[0.06] pt-6 font-mono text-xs text-gray-400">
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><strong className="text-white">82ms</strong> Latency</div>
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><strong className="text-white">148KB</strong> SRAM</div>
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><strong className="text-white">96.4%</strong> Accuracy</div>
            </div>
          </motion.div>

          {/* Right: 3D Device Card */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-cyan-500/[0.08] blur-3xl animate-pulse" />
              <TiltCard className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0e1322]/90 to-[#070a12]/90 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl card-3d-glow holo-shimmer">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2 font-mono text-xs text-gray-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ESP32-S3</span>
                  </div>
                  <span className="rounded bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300 uppercase">{wakeActive ? 'WAKE' : 'STANDBY'}</span>
                </div>
                <div className="my-8 flex justify-center">
                  <TRINETRADevice state={wakeActive ? 'WAKE_DETECTED' : 'LISTENING'} size="xl" showLabels />
                </div>
                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <div>
                    <div className="mb-1 flex justify-between font-mono text-[10px] text-gray-400"><span>CH1: INMP441</span><span className="text-cyan-400">16 kHz</span></div>
                    <Waveform data={Array.from({ length: 36 }, (_, i) => wakeActive ? 0.4 + Math.sin(i * 0.7) * 0.5 : 0.15 + Math.sin(i * 0.3) * 0.15)} color="#22d3ee" height={28} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-mono text-[10px] text-gray-400"><span>CH2: INMP441</span><span className="text-cyan-600">PHASE-INVERTED</span></div>
                    <Waveform data={Array.from({ length: 36 }, (_, i) => wakeActive ? 0.3 + Math.cos(i * 0.6) * 0.4 : 0.1 + Math.cos(i * 0.25) * 0.1)} color="#0891b2" height={28} />
                  </div>
                </div>
              </TiltCard>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* PIPELINE FLOW */}
      <section className="relative z-10 px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400">How It Works</span>
            <h2 className="mt-2 text-2xl font-extrabold text-white">4-Stage Acoustic Pipeline</h2>
          </div>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
            {pipelineSteps.map((p, i) => (
              <div key={p.step} className="flex items-center gap-2">
                <TiltCard className="shrink-0">
                  <div className={`w-36 rounded-xl border border-white/[0.08] bg-gradient-to-br ${p.gradient} p-5 text-center backdrop-blur-xl`}>
                    <span className="font-mono text-lg font-black text-cyan-400/60">{p.step}</span>
                    <div className="mt-2 text-xs font-bold text-white leading-tight">{p.label}</div>
                    <div className="mt-1.5 font-mono text-[10px] text-cyan-400">{p.sub}</div>
                  </div>
                </TiltCard>
                {i < 3 && <span className="text-cyan-500/40 text-lg font-bold shrink-0">&rarr;</span>}
              </div>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {features.map((f) => (
              <div key={f.title} className="glass-panel rounded-xl p-4 text-center card-3d-glow">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-2 text-xs font-bold text-white">{f.title}</div>
                <div className="mt-1 text-[10px] text-gray-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#030508] px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="text-xs font-mono text-gray-500">TRINETRA · Edge Voice AI</div>
          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <button onClick={() => openAuth('signin')} className="hover:text-cyan-400 transition-colors">Sign In</button>
            <span>·</span>
            <button onClick={() => openAuth('signup')} className="hover:text-cyan-400 transition-colors">Register</button>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} onSuccess={() => navigate('/dashboard')} />
    </div>
  );
}
