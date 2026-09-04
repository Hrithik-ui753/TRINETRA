import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { TelemetryProvider } from '@/context/TelemetryContext';
import { IntelligenceProvider } from '@/context/IntelligenceContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const VoiceAssistant = lazy(() => import('@/pages/VoiceAssistant').then((m) => ({ default: m.VoiceAssistant })));
const OfflineSLM = lazy(() => import('@/pages/OfflineSLM').then((m) => ({ default: m.OfflineSLM })));
const Analytics = lazy(() => import('@/pages/Analytics').then((m) => ({ default: m.Analytics })));
const Architecture = lazy(() => import('@/pages/Architecture').then((m) => ({ default: m.Architecture })));
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
        <TelemetryProvider>
          <IntelligenceProvider>
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
                  <Route path="/offline-slm" element={<OfflineSLM />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/kws-performance" element={<Analytics />} />
                  <Route path="/acoustic" element={<Analytics />} />
                  <Route path="/architecture" element={<Architecture />} />
                  <Route path="/device" element={<Architecture />} />
                  <Route path="/logs" element={<ActivityLogs />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<LandingPage />} />
              </Routes>
            </BrowserRouter>
          </IntelligenceProvider>
        </TelemetryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
