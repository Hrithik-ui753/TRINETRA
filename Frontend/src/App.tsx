import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const VoiceAssistant = lazy(() => import('@/pages/VoiceAssistant').then((m) => ({ default: m.VoiceAssistant })));
const Acoustic = lazy(() => import('@/pages/Acoustic').then((m) => ({ default: m.Acoustic })));
const StressLab = lazy(() => import('@/pages/StressLab').then((m) => ({ default: m.StressLab })));
const KWSPerformance = lazy(() => import('@/pages/KWSPerformance').then((m) => ({ default: m.KWSPerformance })));
const Device = lazy(() => import('@/pages/Device').then((m) => ({ default: m.Device })));
const ActivityLogs = lazy(() => import('@/pages/ActivityLogs').then((m) => ({ default: m.ActivityLogs })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500/30 border-t-accent-400" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              element={
                <Suspense fallback={<PageLoader />}>
                  <AppLayout />
                </Suspense>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assistant" element={<VoiceAssistant />} />
              <Route path="/acoustic" element={<Acoustic />} />
              <Route path="/stress-lab" element={<StressLab />} />
              <Route path="/kws-performance" element={<KWSPerformance />} />
              <Route path="/device" element={<Device />} />
              <Route path="/logs" element={<ActivityLogs />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
