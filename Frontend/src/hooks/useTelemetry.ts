import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Telemetry,
  MicrophoneStatus,
  KwsState,
  DeviceStatus,
  ActivityLog,
  ConnectionState,
} from '@/types';
import { DEVICE_TELEMETRY_REGISTRY, type DeviceTelemetryProfile } from '@/lib/slmEngine';

function generateWaveform(active: boolean, intensity = 0.3): number[] {
  return Array.from({ length: 64 }, (_, i) => {
    if (!active) return 0.05 + Math.random() * 0.05;
    const base = Math.sin(i * 0.3) * intensity;
    const noise = (Math.random() - 0.5) * 0.15;
    return Math.max(0.02, Math.min(1, Math.abs(base + noise) + 0.1));
  });
}

export interface TelemetryHook {
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  toggleConnection: () => void;
  deviceProfile: DeviceTelemetryProfile;
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
  const [selectedDevice, setSelectedDeviceState] = useState<string>('TRINETRA-001');
  const [connectionState, setConnectionState] = useState<ConnectionState>('ONLINE');
  const [kwsState, setKwsState] = useState<KwsState>('LISTENING');

  const [logs, setLogs] = useState<ActivityLog[]>([
    {
      id: '1',
      time: new Date(Date.now() - 30000).toISOString(),
      event: 'DEVICE BOOT [SOFTWARE DEMO]',
      source: 'SYSTEM',
      status: 'INFO',
    },
    {
      id: '2',
      time: new Date(Date.now() - 28000).toISOString(),
      event: 'KWS INT8 INITIALIZED (<256KB BUDGET)',
      source: 'KWS',
      status: 'SUCCESS',
    },
    {
      id: '3',
      time: new Date(Date.now() - 26000).toISOString(),
      event: 'MIC 1 ACTIVE (16 kHz)',
      source: 'I2S',
      status: 'INFO',
    },
    {
      id: '4',
      time: new Date(Date.now() - 24000).toISOString(),
      event: 'MIC 2 ACTIVE (16 kHz)',
      source: 'I2S',
      status: 'INFO',
    },
  ]);

  const wakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logIdRef = useRef(100);

  const addLog = useCallback((log: Omit<ActivityLog, 'id'>) => {
    setLogs((prev) => [...prev.slice(-99), { ...log, id: String(logIdRef.current++) }]);
  }, []);

  const setSelectedDevice = useCallback((_deviceId: string) => {
    // Single physical system: always TRINETRA-001
    setSelectedDeviceState('TRINETRA-001');
  }, []);

  const toggleConnection = useCallback(() => {
    setConnectionState((prev) => {
      const next = prev === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      addLog({
        time: new Date().toISOString(),
        event: `NETWORK LINK: ${next}`,
        source: 'NETWORK',
        status: next === 'ONLINE' ? 'SUCCESS' : 'WARNING',
      });
      return next;
    });
  }, [addLog]);

  const profile = DEVICE_TELEMETRY_REGISTRY['TRINETRA-001'];
  const isOnline = connectionState === 'ONLINE';

  // Compute telemetry metrics reflecting TRINETRA-001
  const freeHeapKb = profile.system.free_heap / 1024;
  const ramUsageKb = Math.max(80, Math.min(250, 512 - freeHeapKb));
  const cpuUsage = 28.5;

  const [telemetry, setTelemetry] = useState<Telemetry>({
    cpuUsage,
    cpuLimit: 100,
    ramUsage: ramUsageKb,
    ramLimit: 256,
    kwsAccuracy: 96.4,
    wakeToAsrLatency: 82,
  });

  const mic1Active = profile.audio.mic_1 === 'active';
  const mic2Active = profile.audio.mic_2 === 'active' && !profile.faults.includes('MIC_02 low signal');

  const [micStatus, setMicStatus] = useState<MicrophoneStatus>(() => ({
    mic1: { level: -42, active: mic1Active, waveform: generateWaveform(mic1Active) },
    mic2: { level: mic2Active ? -44 : -78, active: mic2Active, waveform: generateWaveform(mic2Active, 0.1) },
    noiseLevel: 42,
    snr: mic2Active ? 18 : 8,
    kwsConfidence: 4,
    status: 'LISTENING',
  }));

  const deviceStatus: DeviceStatus = {
    online: isOnline,
    connectionState: isOnline ? 'ONLINE' : 'OFFLINE',
    mcu: 'ESP32-S3-DevKitC-1-N8 (Simulated)',
    microphones: '2 × INMP441',
    kwsModel: 'DS-CNN INT8 (13.1 KB)',
    display: 'SSD1306 (128×64)',
    audio: 'MAX98357A I2S',
    network: isOnline ? 'Wi-Fi (Connected)' : 'Disconnected',
    power: 'USB-C 5.0V',
    firmwareVersion: profile.system.firmware_version || '1.0.0',
    kwsVersion: 'TRINETRA-v3.1-INT8',
    uptime: profile.system.uptime,
    wifiStrength: profile.communication.signal_strength,
    lastSync: profile.timestamp,
  };

  // Sync state with selected device profile
  useEffect(() => {
    setTelemetry({
      cpuUsage,
      cpuLimit: 100,
      ramUsage: ramUsageKb,
      ramLimit: 256,
      kwsAccuracy: 96.4,
      wakeToAsrLatency: 82,
    });

    setMicStatus((prev) => ({
      ...prev,
      mic1: { level: -42, active: mic1Active, waveform: generateWaveform(mic1Active) },
      mic2: { level: mic2Active ? -44 : -78, active: mic2Active, waveform: generateWaveform(mic2Active, mic2Active ? 0.28 : 0.05) },
      snr: mic2Active ? 18 : 8,
    }));
  }, [selectedDevice, cpuUsage, ramUsageKb, mic1Active, mic2Active]);

  // Periodic subtle drift for live feel
  useEffect(() => {
    if (!isDemoMode) return;
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: Math.max(10, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 0.4)),
        ramUsage: Math.max(100, Math.min(220, prev.ramUsage + (Math.random() - 0.5) * 0.5)),
      }));

      setMicStatus((prev) => ({
        ...prev,
        mic1: {
          ...prev.mic1,
          level: -42 + (Math.random() - 0.5) * 3,
          waveform: generateWaveform(mic1Active, kwsState === 'LISTENING' ? 0.3 : 0.7),
        },
        mic2: {
          ...prev.mic2,
          level: mic2Active ? -44 + (Math.random() - 0.5) * 3 : -78,
          waveform: generateWaveform(mic2Active, mic2Active ? (kwsState === 'LISTENING' ? 0.28 : 0.68) : 0.05),
        },
        noiseLevel: Math.max(35, Math.min(55, prev.noiseLevel + (Math.random() - 0.5) * 2)),
        kwsConfidence:
          kwsState === 'LISTENING'
            ? Math.max(2, Math.min(12, prev.kwsConfidence + (Math.random() - 0.5) * 2))
            : prev.kwsConfidence,
        status: kwsState,
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [isDemoMode, kwsState, mic1Active, mic2Active]);

  // Voice Demo Pipeline Simulation: IDLE -> LISTENING -> CANDIDATE -> VERIFYING (2/3) -> WAKE_DETECTED -> STREAMING -> ASR -> RESPONSE -> LISTENING
  const triggerWakeWord = useCallback(() => {
    if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    const now = () => new Date().toISOString();

    setKwsState('CANDIDATE');
    setMicStatus((p) => ({ ...p, kwsConfidence: 45 }));
    addLog({ time: now(), event: 'WAKE CANDIDATE [INT8 SOFTMAX > 0.40]', source: 'KWS', status: 'WARNING' });

    setTimeout(() => {
      setKwsState('VERIFYING');
      setMicStatus((p) => ({ ...p, kwsConfidence: 78 }));
      addLog({ time: now(), event: 'ACWE VERIFYING: 2/3 WINDOWS CONFIRMED', source: 'KWS', status: 'INFO' });
    }, 350);

    setTimeout(() => {
      setKwsState('WAKE_DETECTED');
      setMicStatus((p) => ({ ...p, kwsConfidence: 96 }));
      addLog({
        time: now(),
        event: `TRINETRA WAKE DETECTED [CONF: 96.2% | ${selectedDevice}]`,
        source: 'KWS',
        status: 'SUCCESS',
        latency: 82,
      });
    }, 700);

    setTimeout(() => {
      setKwsState('STREAMING');
      addLog({ time: now(), event: 'AUDIO CAPTURE & RING BUFFER READ', source: 'I2S', status: 'INFO' });
    }, 1100);

    setTimeout(() => {
      setKwsState('ASR');
      addLog({ time: now(), event: 'QUERY PARSING & INTENT EXTRACTION', source: 'SLM', status: 'INFO', latency: 145 });
    }, 1600);

    setTimeout(() => {
      setKwsState('RESPONSE');
      addLog({
        time: now(),
        event: `TELEMETRY GROUNDED RESPONSE DISPATCHED [${selectedDevice}]`,
        source: 'SLM',
        status: 'SUCCESS',
      });
    }, 2200);

    wakeTimeoutRef.current = setTimeout(() => {
      setKwsState('LISTENING');
      setMicStatus((p) => ({ ...p, kwsConfidence: 4 }));
    }, 4500);
  }, [addLog, selectedDevice]);

  useEffect(() => {
    return () => {
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    };
  }, []);

  return {
    selectedDevice,
    setSelectedDevice,
    connectionState,
    setConnectionState,
    toggleConnection,
    deviceProfile: profile,
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
