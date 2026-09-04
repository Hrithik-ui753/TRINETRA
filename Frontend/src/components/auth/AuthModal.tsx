import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  UserPlus,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
  onSuccess?: () => void;
}

const cardVariants = {
  enter: { scale: 0.95, opacity: 0, y: 10 },
  center: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: -10 },
};

export function AuthModal({ open, onClose, defaultMode = 'signin', onSuccess }: AuthModalProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setResetSent(false);
      setShowPassword(false);
    }
  }, [open, defaultMode]);

  const reset = useCallback(() => {
    setMode('signin');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setResetSent(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

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
      if (error) {
        setError(error);
      } else {
        setResetSent(true);
      }
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, name);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        handleClose();
        if (onSuccess) onSuccess();
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        handleClose();
        if (onSuccess) onSuccess();
      }
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop with frosted dark glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-base-950/85 backdrop-blur-xl"
            onClick={handleClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090d16]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            {/* Ambient cyan glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-7 sm:p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>JWT Authenticated Session</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {mode === 'forgot'
                    ? 'Security Recovery'
                    : mode === 'signup'
                    ? 'Create Operator Account'
                    : 'Sign In to TRINETRA'}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                  {mode === 'forgot'
                    ? "Enter your email to receive recovery instructions."
                    : mode === 'signup'
                    ? 'Register your operator identity to access real-time edge telemetry.'
                    : 'Access your Xtensa LX7 edge diagnostics and acoustic console.'}
                </p>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                      <div>
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          Full Name / Call-Sign
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full rounded-xl border border-white/[0.08] bg-[#0e1320] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-[#131a2b]"
                            placeholder="Operator Name"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">
                        Operator Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full rounded-xl border border-white/[0.08] bg-[#0e1320] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-[#131a2b]"
                          placeholder="operator@trinetra.edge"
                        />
                      </div>
                    </div>

                    {mode !== 'forgot' && (
                      <div>
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">
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
                            className="w-full rounded-xl border border-white/[0.08] bg-[#0e1320] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-[#131a2b]"
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
                        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-gray-400">
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
                            className={`w-full rounded-xl border bg-[#0e1320] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all ${
                              confirmPassword && password !== confirmPassword
                                ? 'border-red-500/50'
                                : 'border-white/[0.08] focus:border-cyan-500/50'
                            }`}
                            placeholder="••••••••"
                          />
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                          <p className="mt-1 font-mono text-[10px] text-red-400">Passwords do not match</p>
                        )}
                      </div>
                    )}

                    {resetSent && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
                      >
                        <KeyRound className="h-4 w-4 shrink-0 text-emerald-400" />
                        Reset instructions transmitted. Check your inbox.
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                        {error}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || (mode === 'signup' && !!confirmPassword && password !== confirmPassword)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-3 text-sm font-bold text-base-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all hover:from-cyan-400 hover:to-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.4)] disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>
                            {mode === 'forgot'
                              ? 'Transmit Reset Link'
                              : mode === 'signup'
                              ? 'Issue Clearance & Sign Up'
                              : 'Authorize & Sign In'}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.04] pt-4 text-xs">
                {mode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    ← Return to sign in
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    >
                      {mode === 'signin' ? 'Create new account' : 'Already registered? Sign in'}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
