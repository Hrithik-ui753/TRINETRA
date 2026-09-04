// TRINETRA Telemetry Data Model

export type KwsState =
  | 'LISTENING'
  | 'CANDIDATE'
  | 'VERIFYING'
  | 'WAKE_DETECTED'
  | 'STREAMING'
  | 'ASR'
  | 'RESPONSE';

export type ConnectionState = 'ONLINE' | 'OFFLINE' | 'CONNECTING';

export type LedColor = 'green' | 'yellow' | 'blue' | 'red';

export type NoiseEnvironment =
  | 'QUIET'
  | 'FAN'
  | 'MUSIC'
  | 'BACKGROUND_SPEECH'
  | 'MULTI_SPEAKER'
  | 'HIGH_NOISE';

export interface DeviceStatus {
  online: boolean;
  connectionState: ConnectionState;
  mcu: string;
  microphones: string;
  kwsModel: string;
  display: string;
  audio: string;
  network: string;
  power: string;
  firmwareVersion: string;
  kwsVersion: string;
  uptime: number; // seconds
  wifiStrength: number; // dBm
  lastSync: string; // ISO timestamp
}

export interface Telemetry {
  cpuUsage: number; // percentage
  cpuLimit: number;
  ramUsage: number; // KB
  ramLimit: number;
  kwsAccuracy: number; // percentage
  wakeToAsrLatency: number; // ms
}

export interface MicrophoneStatus {
  mic1: MicChannel;
  mic2: MicChannel;
  noiseLevel: number; // dB
  snr: number; // dB
  kwsConfidence: number; // percentage
  status: KwsState;
}

export interface MicChannel {
  level: number; // dB
  active: boolean;
  waveform: number[];
}

export interface KwsStatus {
  keyword: string;
  confidence: number;
  state: KwsState;
  detections: number;
  falseActivations: number;
}

export interface LatencyBreakdown {
  edgeDetection: number;
  verification: number;
  networkTransmission: number;
  asrReceived: number;
  total: number;
}

export interface StressTest {
  id: string;
  environment: NoiseEnvironment;
  noiseLevel: number; // dB
  snr: number; // dB
  confidence: number; // percentage
  detected: boolean;
  falseActivations: number;
  result: 'PASS' | 'FAIL';
  timestamp: string;
}

export interface AccuracyEvent {
  id: string;
  utterance: string;
  detected: boolean;
  confidence: number;
  timestamp: string;
}

export interface FalseActivation {
  id: string;
  category:
    | 'SIMILAR_WORD'
    | 'BACKGROUND_SPEECH'
    | 'MUSIC'
    | 'FAN'
    | 'RANDOM_NOISE'
    | 'INSUFFICIENT_CONFIDENCE';
  utterance: string;
  confidence: number;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  time: string;
  event: string;
  source: string;
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  latency?: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export interface ResourceBudget {
  flash: { model: number; firmware: number; other: number; total: number };
  ram: { modelArena: number; audioBuffer: number; stack: number; other: number; total: number };
}
