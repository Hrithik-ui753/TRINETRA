import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
  Cpu,
  Radio,
} from 'lucide-react';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { useAuth } from '@/context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) setError(error);
      else setResetSent(true);
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, name);
      setLoading(false);
      if (error) setError(error);
      else navigate('/dashboard');
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) setError(error);
      else navigate('/dashboard');
    }
  };

  const switchMode = (next: AuthMode) => {
    setError(null);
    setResetSent(false);
    setPassword('');
    setConfirmPassword('');
    setMode(next);
  };

  const passwordType = showPassword ? 'text' : 'password';

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-base-950 text-white selection:bg-cyan-500 selection:text-base-950 font-sans">
      {/* Left: Cinematic Luxury Brand Presentation (7 cols) */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-gradient-to-br from-[#06080d] via-[#090e17] to-[#04060a] p-16">
        {/* Background glow and subtle mesh */}
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute right-10 bottom-10 h-72 w-72 rounded-full bg-blue-600/[0.05] blur-[100px]" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-[0.2em] text-white">TRINETRA</span>
              <span className="block font-mono text-[9px] uppercase tracking-widest text-cyan-400/80">Edge Intelligence</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] tracking-wider text-gray-300">ESP32-S3 PROTOCOL ACTIVE</span>
          </div>
        </div>

        {/* Central 3D Device & Cinematic Quote */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Ambient circular radar rings */}
            <div className="pointer-events-none absolute -inset-16 rounded-full border border-cyan-500/[0.08] animate-[spin_40s_linear_infinite]" />
            <div className="pointer-events-none absolute -inset-28 rounded-full border border-dashed border-cyan-500/[0.04] animate-[spin_60s_linear_infinite_reverse]" />
            
            <TRINETRADevice state="LISTENING" size="lg" showLabels />
          </motion.div>

          <div className="mt-12 text-center max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Autonomous Edge Acoustic Intelligence
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
              Dual-aperture I2S beamforming and INT8 quantized keyword spotting with zero latency transmission.
            </p>

            <div className="mt-8 flex items-center justify-center gap-6 font-mono text-xs text-gray-400 border-t border-white/[0.06] pt-6">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>Xtensa LX7 240MHz</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-cyan-400" />
                <span>INMP441 I2S Dual-Mic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Zero-Cloud Privacy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] pt-6 font-mono text-[11px] text-gray-400">
          <span>SIH26172 · HIGH-PRECISION TINYML</span>
          <span className="text-cyan-400/70">JWT SECURED SESSION</span>
        </div>
      </div>

      {/* Right: Ultra-Sleek JWT Authentication Console (5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-center bg-[#05070c] px-8 py-14 sm:px-12 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="mb-10 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-widest text-white">TRINETRA</span>
                <span className="block font-mono text-[9px] uppercase tracking-wider text-cyan-400">Edge Console</span>
              </div>
            </Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 mb-4">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                {mode === 'signup' ? 'Operator Registration' : mode === 'forgot' ? 'Security Recovery' : 'Console Authorization'}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {mode === 'forgot' ? 'Reset Clearance' : mode === 'signup' ? 'Create Account' : 'Operator Sign In'}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {mode === 'forgot'
                ? 'Enter your registered operator email to receive authentication reset instructions.'
                : mode === 'signup'
                ? 'Register your operator profile for telemetry monitoring and edge intelligence.'
                : 'Enter your credentials to access the TRINETRA real-time edge telemetry console.'}
            </p>
          </div>

          {/* Quick Pre-Seeded Clearance Helper Box */}
          {mode === 'signin' && (
            <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold uppercase tracking-wider text-cyan-300">Default Operator Clearance</span>
                <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-400">PRE-SEEDED</span>
              </div>
              <div className="mt-2.5 space-y-1 font-mono text-[11px] text-gray-300">
                <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded border border-white/[0.04]">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-cyan-200 font-medium">operator@trinetra.edge</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded border border-white/[0.04]">
                  <span className="text-gray-400">Password:</span>
                  <span className="text-cyan-200 font-medium">Trinetra@2026</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('operator@trinetra.edge');
                  setPassword('Trinetra@2026');
                }}
                className="mt-2.5 w-full text-center text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors underline"
              >
                Auto-fill operator credentials
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-gray-400">
                  Full Name / Operator Handle
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0c101a] py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:border-cyan-500/50 focus:bg-[#101524] focus:shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                    placeholder="Dr. Rajesh Vance"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c101a] py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:border-cyan-500/50 focus:bg-[#101524] focus:shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                  placeholder="operator@trinetra.edge"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-gray-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type={passwordType}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0c101a] py-3 pl-11 pr-11 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:border-cyan-500/50 focus:bg-[#101524] focus:shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-gray-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type={passwordType}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={`w-full rounded-xl border bg-[#0c101a] py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:bg-[#101524] ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-500/50'
                        : 'border-white/[0.08] focus:border-cyan-500/50'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1.5 text-[11px] text-red-400 font-mono">Passwords do not match.</p>
                )}
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {resetSent && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300"
              >
                <KeyRound className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Clearance reset link transmitted. Check your email.</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !!confirmPassword && password !== confirmPassword)}
              className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 py-3.5 text-sm font-bold text-base-950 shadow-[0_0_24px_rgba(34,211,238,0.25)] transition-all duration-200 hover:from-cyan-400 hover:to-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.45)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-base-950" />
              ) : (
                <>
                  <span>
                    {mode === 'forgot'
                      ? 'Send Recovery Link'
                      : mode === 'signup'
                      ? 'Issue JWT Clearance & Register'
                      : 'Authorize & Enter Console'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch Modes */}
          <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-6 text-xs">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                ← Return to Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  {mode === 'signin' ? "Don't have clearance? Sign up" : 'Already registered? Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="font-mono text-xs text-gray-400 hover:text-gray-300 transition-colors inline-flex items-center gap-1.5"
            >
              ← Return to TRINETRA Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
