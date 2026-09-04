import { cn } from '@/lib/utils';
import type { KwsState } from '@/types';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { useIntelligenceContext } from '@/context/IntelligenceContext';

interface OLEDDisplayProps {
  state: KwsState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OLEDDisplay({ state, size = 'sm', className }: OLEDDisplayProps) {
  const { selectedDevice, deviceProfile, connectionState } = useTelemetryContext();
  const { oledDisplayLines, isProcessingQuery, isSyncingQueue } = useIntelligenceContext();

  const sizes = {
    sm: { w: 90, h: 48, title: 7, text: 5.5, lineGap: 1 },
    md: { w: 130, h: 68, title: 9, text: 6.5, lineGap: 1.5 },
    lg: { w: 170, h: 88, title: 11, text: 8, lineGap: 2 },
  };
  const s = sizes[size];

  const isWake = state === 'WAKE_DETECTED';
  const isCandidate = state === 'CANDIDATE';
  const isVerifying = state === 'VERIFYING';
  const isOnline = connectionState === 'ONLINE' && deviceProfile.communication.wifi === 'connected';

  const heapKb = Math.round(deviceProfile.system.free_heap / 1024);
  const tempStr = deviceProfile.sensors.temperature !== null ? `${deviceProfile.sensors.temperature}C` : '--';
  const micOk = deviceProfile.audio.mic_1 === 'active' && !deviceProfile.faults.includes('MIC_02 low signal');

  return (
    <div
      className={cn('relative overflow-hidden rounded-sm bg-[#050a05] border border-[#1a381a] shadow-inner', className)}
      style={{ width: s.w, height: s.h }}
    >
      <div className="absolute inset-0 noise-overlay opacity-25" />
      <div className="flex h-full flex-col justify-between p-1.5 font-mono">
        {isWake ? (
          /* Prominent Wake Alert Banner */
          <div className="flex h-full flex-col items-center justify-center text-center animate-pulse">
            <div
              className="font-bold tracking-wider text-[#7fff7f]"
              style={{ fontSize: s.title, textShadow: '0 0 6px rgba(127,255,127,0.8)' }}
            >
              ★ TRINETRA ★
            </div>
            <div
              className="mt-0.5 font-semibold text-[#5fd35f]"
              style={{ fontSize: s.text, textShadow: '0 0 4px rgba(127,255,127,0.5)' }}
            >
              CONF: 96.2%
            </div>
            <div
              className="text-[#3fb33f]"
              style={{ fontSize: s.text - 0.5 }}
            >
              VALID: 2/3 (ACWE)
            </div>
          </div>
        ) : isCandidate || isVerifying ? (
          /* Verification Stage */
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div
              className="font-bold text-[#7fff7f]"
              style={{ fontSize: s.title - 1 }}
            >
              {isCandidate ? 'CANDIDATE...' : 'VERIFYING 2/3...'}
            </div>
            <div
              className="mt-1 text-[#5fd35f]"
              style={{ fontSize: s.text }}
            >
              INT8 SOFTMAX &gt; 0.85
            </div>
          </div>
        ) : oledDisplayLines && oledDisplayLines.length > 0 ? (
          /* Hybrid OLED Spoken Response / Flash Queue / Telemetry Output */
          <div className="flex h-full flex-col justify-between text-[6px] sm:text-[7px] text-[#5fd35f] leading-tight">
            <div className="flex items-center justify-between border-b border-[#1a381a] pb-0.5">
              <span className="font-bold text-[#7fff7f]" style={{ fontSize: s.title - 1 }}>
                {oledDisplayLines[0] || 'TRINETRA-001'}
              </span>
              <span className="text-[5.5px] text-[#3fb33f] uppercase">SSD1306</span>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 py-0.5 text-center">
              <div
                className="font-bold tracking-wide text-[#a3ffa3]"
                style={{ fontSize: s.text + 0.5, textShadow: '0 0 4px rgba(127,255,127,0.4)' }}
              >
                {oledDisplayLines[1] || `TEMP: ${tempStr}`}
              </div>
              {oledDisplayLines[2] && (
                <div
                  className="mt-0.5 text-[#5fd35f] uppercase"
                  style={{ fontSize: s.text - 1 }}
                >
                  {oledDisplayLines[2]}
                </div>
              )}
            </div>

            <div className="border-t border-[#1a381a] pt-0.5 flex justify-between text-[5px] text-[#3fb33f]">
              <span>LINK: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              <span>{isSyncingQueue ? 'SYNCING...' : isProcessingQuery ? 'COMPUTING' : 'READY'}</span>
            </div>
          </div>
        ) : (
          /* Concise Live Telemetry Screen */
          <div className="flex h-full flex-col justify-between text-[6px] sm:text-[7px] text-[#5fd35f] leading-tight">
            <div className="flex items-center justify-between border-b border-[#1a381a] pb-0.5">
              <span className="font-bold text-[#7fff7f]" style={{ fontSize: s.title - 1 }}>
                TRINETRA
              </span>
              <span className="text-[5.5px] text-[#3fb33f] uppercase">U-001</span>
            </div>

            <div className="space-y-0.5" style={{ fontSize: s.text - 1 }}>
              <div className="flex justify-between">
                <span className="text-gray-500">STAT:</span>
                <span className={deviceProfile.system.status === 'warning' ? 'text-amber-400 font-bold' : 'text-[#7fff7f]'}>
                  {deviceProfile.system.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TEMP:</span>
                <span>{tempStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">HEAP:</span>
                <span>{heapKb}K</span>
              </div>
            </div>

            <div className="border-t border-[#1a381a] pt-0.5 flex justify-between text-[5px] text-[#3fb33f]">
              <span>MIC: {micOk ? 'OK' : 'ERR'}</span>
              <span>KWS: READY</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

