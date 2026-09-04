import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { KwsState } from '@/types';
import { OLEDDisplay } from './OLEDDisplay';
import { LEDIndicator, getLedStates } from './LEDIndicator';

interface TRINETRADeviceProps {
  state?: KwsState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  showLabels?: boolean;
  onSelectComponent?: (component: string | null) => void;
  selectedComponent?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { w: 160, h: 100, mic: 7, led: 2, speaker: 22 },
  md: { w: 220, h: 140, mic: 9, led: 2.5, speaker: 30 },
  lg: { w: 320, h: 200, mic: 13, led: 3.5, speaker: 44 },
  xl: { w: 420, h: 260, mic: 17, led: 4.5, speaker: 58 },
};

export function TRINETRADevice({
  state = 'LISTENING',
  size = 'md',
  interactive = false,
  showLabels = false,
  onSelectComponent,
  selectedComponent,
  className,
}: TRINETRADeviceProps) {
  const s = sizeMap[size];
  const leds = getLedStates(state);
  const [rotation, setRotation] = useState({ x: -8, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, rotX: 0, rotY: 0 });
  const [componentInfo, setComponentInfo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse-following 3D tilt (always active)
  useEffect(() => {
    if (isDragging || interactive) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      setRotation({ x: -8 + dy * -10, y: dx * 12 });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [isDragging, interactive]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, rotX: rotation.x, rotY: rotation.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) * 0.3;
      const dy = (e.clientY - dragStart.current.y) * 0.3;
      setRotation({ x: dragStart.current.rotX + dy, y: dragStart.current.rotY + dx });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const isWake = state === 'WAKE_DETECTED';
  const isStreaming = state === 'STREAMING' || state === 'ASR';

  const components: Record<string, { label: string; info: string } | null> = {
    mic1: { label: 'INMP441', info: 'I²S · 16 kHz · ACTIVE' },
    mic2: { label: 'INMP441', info: 'I²S · 16 kHz · ACTIVE' },
    mcu: { label: 'ESP32-S3', info: 'KWS RUNTIME · RESOURCE MONITOR' },
    oled: { label: 'SSD1306', info: 'OLED DISPLAY · 128×64' },
    speaker: { label: 'MAX98357A', info: 'I²S AMPLIFIER · 3W' },
  };

  const handleClick = (comp: string) => {
    if (!interactive) return;
    const next = selectedComponent === comp ? null : comp;
    onSelectComponent?.(next);
    setComponentInfo(next);
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div
        className="relative"
        style={{
          width: s.w,
          height: s.h,
          perspective: '800px',
        }}
      >
        {/* Acoustic wave rings from mics */}
        {(state === 'LISTENING' || isWake || isStreaming) && (
          <>
            <div
              className="absolute rounded-full border border-accent-500/20 animate-ring-expand"
              style={{
                left: s.w * 0.18,
                top: s.h * 0.15,
                width: s.mic * 3,
                height: s.mic * 3,
              }}
            />
            <div
              className="absolute rounded-full border border-accent-500/20 animate-ring-expand"
              style={{
                left: s.w * 0.18,
                top: s.h * 0.15,
                width: s.mic * 3,
                height: s.mic * 3,
                animationDelay: '0.7s',
              }}
            />
            <div
              className="absolute rounded-full border border-accent-500/20 animate-ring-expand"
              style={{
                right: s.w * 0.18,
                top: s.h * 0.15,
                width: s.mic * 3,
                height: s.mic * 3,
              }}
            />
            <div
              className="absolute rounded-full border border-accent-500/20 animate-ring-expand"
              style={{
                right: s.w * 0.18,
                top: s.h * 0.15,
                width: s.mic * 3,
                height: s.mic * 3,
                animationDelay: '0.7s',
              }}
            />
          </>
        )}

        {/* Signal beam on wake/stream */}
        {(isWake || isStreaming) && (
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{ width: 2, height: s.h * 0.3 }}
          >
            <div className="h-full w-full bg-gradient-to-t from-accent-500/0 via-accent-400/60 to-accent-500/0 animate-pulse" />
          </div>
        )}

        {/* Device body with 3D transform */}
        <div
          className={cn(
            'absolute inset-0 transition-transform duration-100',
            interactive && 'cursor-grab',
            isDragging && 'cursor-grabbing',
          )}
          ref={containerRef}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            className={cn(
              'relative h-full w-full rounded-xl border',
              'bg-gradient-to-b from-graphite-700 via-graphite-800 to-base-900',
              isWake
                ? 'border-accent-500/40 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                : isStreaming
                  ? 'border-accent-500/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                  : 'border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
            )}
          >
            {/* Top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Mic 1 - top left */}
            <button
              type="button"
              onClick={() => handleClick('mic1')}
              disabled={!interactive}
              className={cn(
                'group absolute rounded-full border border-white/10 bg-base-950/80',
                interactive && 'hover:border-accent-500/50 cursor-pointer',
                selectedComponent === 'mic1' && 'border-accent-500/60',
              )}
              style={{
                left: s.w * 0.12,
                top: s.h * 0.12,
                width: s.mic * 1.5,
                height: s.mic * 1.5,
              }}
            >
              <div
                className={cn(
                  'absolute inset-1 rounded-full',
                  state === 'LISTENING' || isWake ? 'bg-accent-500/20' : 'bg-gray-700/40',
                )}
              />
              <div
                className={cn(
                  'absolute inset-0 rounded-full',
                  (state === 'LISTENING' || isWake) && 'animate-pulse border border-accent-500/30',
                )}
              />
            </button>

            {/* Mic 2 - top right */}
            <button
              type="button"
              onClick={() => handleClick('mic2')}
              disabled={!interactive}
              className={cn(
                'group absolute rounded-full border border-white/10 bg-base-950/80',
                interactive && 'hover:border-accent-500/50 cursor-pointer',
                selectedComponent === 'mic2' && 'border-accent-500/60',
              )}
              style={{
                right: s.w * 0.12,
                top: s.h * 0.12,
                width: s.mic * 1.5,
                height: s.mic * 1.5,
              }}
            >
              <div
                className={cn(
                  'absolute inset-1 rounded-full',
                  state === 'LISTENING' || isWake ? 'bg-accent-500/20' : 'bg-gray-700/40',
                )}
              />
              <div
                className={cn(
                  'absolute inset-0 rounded-full',
                  (state === 'LISTENING' || isWake) && 'animate-pulse border border-accent-500/30',
                )}
              />
            </button>

            {/* OLED Display - center */}
            <button
              type="button"
              onClick={() => handleClick('oled')}
              disabled={!interactive}
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                interactive && 'hover:scale-105 cursor-pointer transition-transform',
                selectedComponent === 'oled' && 'ring-2 ring-accent-500/40 rounded',
              )}
            >
              <OLEDDisplay state={state} size={size === 'xl' ? 'lg' : size === 'sm' ? 'sm' : 'md'} />
            </button>

            {/* Status LEDs - bottom row */}
            <div
              className="absolute left-1/2 flex -translate-x-1/2 gap-2"
              style={{ bottom: s.h * 0.08 }}
            >
              <LEDIndicator color="green" active={leds.green} size={size === 'xl' ? 'md' : 'sm'} />
              <LEDIndicator color="yellow" active={leds.yellow} size={size === 'xl' ? 'md' : 'sm'} />
              <LEDIndicator color="blue" active={leds.blue} size={size === 'xl' ? 'md' : 'sm'} />
              <LEDIndicator color="red" active={leds.red} size={size === 'xl' ? 'md' : 'sm'} />
            </div>

            {/* Speaker grille - bottom right */}
            <button
              type="button"
              onClick={() => handleClick('speaker')}
              disabled={!interactive}
              className={cn(
                'absolute grid grid-cols-3 gap-0.5',
                interactive && 'hover:border-accent-500/50 cursor-pointer',
                selectedComponent === 'speaker' && 'ring-2 ring-accent-500/40 rounded',
              )}
              style={{
                right: s.w * 0.08,
                bottom: s.h * 0.12,
                width: s.speaker,
                height: s.speaker,
              }}
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-full bg-graphite-500/60" style={{ width: 2, height: 2 }} />
              ))}
            </button>

            {/* MCU indicator - bottom left */}
            <button
              type="button"
              onClick={() => handleClick('mcu')}
              disabled={!interactive}
              className={cn(
                'absolute rounded border border-white/10 bg-base-950/60',
                interactive && 'hover:border-accent-500/50 cursor-pointer',
                selectedComponent === 'mcu' && 'border-accent-500/60',
              )}
              style={{
                left: s.w * 0.08,
                bottom: s.h * 0.12,
                width: s.speaker,
                height: s.speaker * 0.6,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <span className="font-mono text-[7px] text-gray-600">ESP32</span>
              </div>
            </button>
          </div>
        </div>

        {/* Component labels */}
        {showLabels && (
          <>
            <div className="absolute -left-2 text-[9px] font-mono text-gray-500" style={{ top: s.h * 0.12 }}>
              MIC 1
            </div>
            <div className="absolute -right-2 text-[9px] font-mono text-gray-500" style={{ top: s.h * 0.12 }}>
              MIC 2
            </div>
          </>
        )}
      </div>

      {/* Component info popup */}
      {interactive && componentInfo && components[componentInfo] && (
        <div className="mt-3 animate-fade-in rounded-lg border border-accent-500/30 bg-graphite-800/90 px-4 py-2 backdrop-blur-md">
          <div className="font-mono text-sm font-bold text-accent-400">{components[componentInfo]!.label}</div>
          <div className="font-mono text-xs text-gray-400">{components[componentInfo]!.info}</div>
        </div>
      )}
    </div>
  );
}
