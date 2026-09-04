import { createContext, useContext, type ReactNode } from 'react';
import { useTelemetry, type TelemetryHook } from '@/hooks/useTelemetry';

const TelemetryContext = createContext<TelemetryHook | undefined>(undefined);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const telemetry = useTelemetry();
  return (
    <TelemetryContext.Provider value={telemetry}>
      {children}
    </TelemetryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTelemetryContext(): TelemetryHook {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetryContext must be used within TelemetryProvider');
  return ctx;
}
