import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Telemetry,
  MicrophoneStatus,
  KwsState,
  DeviceStatus,
  ActivityLog,
} from '@/types';

const DEFAULT_TELEMETRY: Telemetry = {
  cpuUsage: 6.7,
  cpuLimit: 10,
  ramUsage: 148,
  ramLimit: 256,
  kwsAccuracy: 96.4,
  wakeToAsrLatency: 82,
};

const DEFAULT_DEVICE: DeviceStatus = {
  online: true,
  connectionState: 'ONLINE',
  mcu: 'ESP32-S3-DevKitC-1-N8',
  microphones: '2 × INMP441',
  kwsModel: 'TRINETRA / INT8',
  display: 'SSD1306',
  audio: 'MAX98357A',
  network: 'Wi-Fi',
  power: 'USB-C',
  firmwareVersion: '1.4.2',
  kwsVersion: 'TRINETRA-v3.1',
  uptime: 86400 * 3 + 14_500,
  wifiStrength: -52,
  lastSync: new Date().toISOString(),
};

function generateWaveform(active: boolean, intensity = 0.3): number[] {
  return Array.from({ length: 64 }, (_, i) => {
    if (!active) return 0.05 + Math.random() * 0.05;
    const base = Math.sin(i * 0.3) * intensity;
    const noise = (Math.random() - 0.5) * 0.15;
    return Math.max(0.02, Math.min(1, Math.abs(base + noise) + 0.1));
  });
}

export interface TelemetryHook {
  telemetry: Telemetry;
  micStatus: MicrophoneStatus;
  deviceStatus: DeviceStatus;
  kwsState: KwsState;
  isDemoMode: boolean;
  triggerWakeWord: () => void;
  logs: ActivityLog[];
  addLog: (log: Omit<ActivityLog, 'id'>) => void;
  setDemoMode: (v: boolean) => void;
}

export function useTelemetry(): TelemetryHook {
  const [isDemoMode, setDemoMode] = useState(true);
  const [telemetry, setTelemetry] = useState<Telemetry>(DEFAULT_TELEMETRY);
  const [kwsState, setKwsState] = useState<KwsState>('LISTENING');
  const [logs, setLogs] = useState<ActivityLog[]>([
    {
      id: '1',
      time: new Date(Date.now() - 30000).toISOString(),
      event: 'DEVICE BOOT',
      source: 'SYSTEM',
      status: 'INFO',
    },
    {
      id: '2',
      time: new Date(Date.now() - 28000).toISOString(),
      event: 'KWS INITIALIZED',
      source: 'KWS',
      status: 'SUCCESS',
    },
    {
      id: '3',
      time: new Date(Date.now() - 26000).toISOString(),
      event: 'MIC 1 ACTIVE',
      source: 'I2S',
      status: 'INFO',
    },
    {
      id: '4',
      time: new Date(Date.now() - 24000).toISOString(),
      event: 'MIC 2 ACTIVE',
      source: 'I2S',
      status: 'INFO',
    },
  ]);
  const [micStatus, setMicStatus] = useState<MicrophoneStatus>(() => ({
    mic1: { level: -42, active: true, waveform: generateWaveform(true) },
    mic2: { level: -44, active: true, waveform: generateWaveform(true) },
    noiseLevel: 42,
    snr: 18,
    kwsConfidence: 4,
    status: 'LISTENING',
  }));
  const [deviceStatus] = useState<DeviceStatus>(DEFAULT_DEVICE);
  const wakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logIdRef = useRef(100);

  const addLog = useCallback((log: Omit<ActivityLog, 'id'>) => {
    setLogs((prev) => [...prev.slice(-99), { ...log, id: String(logIdRef.current++) }]);
  }, []);

  // Slowly drift telemetry values
  useEffect(() => {
    if (!isDemoMode) return;
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: Math.max(4, Math.min(9.5, prev.cpuUsage + (Math.random() - 0.5) * 0.4)),
        ramUsage: Math.max(140, Math.min(160, prev.ramUsage + (Math.random() - 0.5) * 2)),
        kwsAccuracy: Math.max(94, Math.min(98, prev.kwsAccuracy + (Math.random() - 0.5) * 0.2)),
      }));
      setMicStatus((prev) => ({
        ...prev,
        mic1: {
          ...prev.mic1,
          level: -42 + (Math.random() - 0.5) * 4,
          waveform: generateWaveform(true, kwsState === 'LISTENING' ? 0.3 : 0.7),
        },
        mic2: {
          ...prev.mic2,
          level: -44 + (Math.random() - 0.5) * 4,
          waveform: generateWaveform(true, kwsState === 'LISTENING' ? 0.28 : 0.68),
        },
        noiseLevel: Math.max(35, Math.min(55, prev.noiseLevel + (Math.random() - 0.5) * 2)),
        snr: Math.max(12, Math.min(25, prev.snr + (Math.random() - 0.5) * 1)),
        kwsConfidence:
          kwsState === 'LISTENING'
            ? Math.max(2, Math.min(12, prev.kwsConfidence + (Math.random() - 0.5) * 3))
            : prev.kwsConfidence,
        status: kwsState,
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [isDemoMode, kwsState]);

  const triggerWakeWord = useCallback(() => {
    if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    const now = () => new Date().toISOString();

    setKwsState('CANDIDATE');
    setMicStatus((p) => ({ ...p, kwsConfidence: 45 }));
    addLog({ time: now(), event: 'WAKE CANDIDATE', source: 'KWS', status: 'WARNING' });

    setTimeout(() => {
      setKwsState('VERIFYING');
      setMicStatus((p) => ({ ...p, kwsConfidence: 72 }));
    }, 300);

    setTimeout(() => {
      setKwsState('WAKE_DETECTED');
      setMicStatus((p) => ({ ...p, kwsConfidence: 96 }));
      addLog({ time: now(), event: 'WAKE CONFIRMED', source: 'KWS', status: 'SUCCESS', latency: 82 });
    }, 600);

    setTimeout(() => {
      setKwsState('STREAMING');
      addLog({ time: now(), event: 'AUDIO STREAM START', source: 'NETWORK', status: 'INFO' });
    }, 1000);

    setTimeout(() => {
      setKwsState('ASR');
      addLog({ time: now(), event: 'ASR RECEIVED', source: 'ASR', status: 'INFO', latency: 145 });
    }, 1500);

    setTimeout(() => {
      setKwsState('RESPONSE');
      addLog({ time: now(), event: 'RESPONSE READY', source: 'LLM', status: 'SUCCESS' });
    }, 2000);

    wakeTimeoutRef.current = setTimeout(() => {
      setKwsState('LISTENING');
      setMicStatus((p) => ({ ...p, kwsConfidence: 4 }));
    }, 4000);
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    };
  }, []);

  return {
    telemetry,
    micStatus,
    deviceStatus,
    kwsState,
    isDemoMode,
    triggerWakeWord,
    logs,
    addLog,
    setDemoMode,
  };
}
