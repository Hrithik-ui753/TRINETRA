import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  LayoutDashboard,
  Mic,
  BrainCircuit,
  BarChart3,
  Cpu,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'SPACECRAFT COCKPIT',
    items: [
      { to: '/dashboard', label: 'Mission', icon: LayoutDashboard },
      { to: '/assistant', label: 'Voice Assistant', icon: Mic },
      { to: '/offline-slm', label: 'Edge AI / Offline', icon: BrainCircuit },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/architecture', label: 'Architecture', icon: Cpu },
    ],
  },
  {
    title: 'MISSION SYSTEM',
    items: [
      { to: '/logs', label: 'Activity Logs', icon: ScrollText },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Operator';
  const email = user?.email || 'operator@trinetra.edge';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-white">TRINETRA</span>
            <span className="block font-mono text-[9px] uppercase tracking-widest text-cyan-400/80">Edge Console</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-gray-500 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                        : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('h-4 w-4 transition-colors', isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300')} />
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User operator identity card */}
      <div className="border-t border-white/[0.04] p-4">
        <div className="rounded-xl border border-white/[0.06] bg-[#0c101a] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                ACTIVE OPERATOR
              </span>
            </div>
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-[11px] font-bold text-cyan-400 border border-cyan-500/30">
              {displayName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{displayName}</div>
              <div className="font-mono text-[10px] text-gray-400 truncate">{email}</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-gray-400 transition-all hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out / Disconnect</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-white/[0.08] bg-graphite-800/90 p-2 text-gray-300 backdrop-blur-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.04] bg-[#06080e] backdrop-blur-xl lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-64 border-r border-white/[0.06] bg-[#06080e] backdrop-blur-xl lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
