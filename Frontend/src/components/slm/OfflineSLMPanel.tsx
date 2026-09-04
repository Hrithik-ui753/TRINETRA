import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Cpu,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Thermometer,
  Zap,
  Mic,
  BrainCircuit,
  Database,
  ArrowRight,
  ArrowDown,
  Clock,
  RefreshCw,
  HardDrive,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useIntelligenceContext } from '@/context/IntelligenceContext';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { DEVICE_TELEMETRY_REGISTRY, type SLMResponseResult } from '@/lib/slmEngine';

const SPOKEN_PROMPTS_LOCAL = [
  'What is the current system temperature?',
  'What is the current CPU temperature?',
  'What is the free heap?',
  'Are both microphones active?',
  'Is the communication link connected?',
];

const SPOKEN_PROMPTS_GROUND = [
  'Explain the communication protocol.',
  'Show me the maintenance history from last month.',
  'Predict thermal dissipation for next orbital cycle.',
];

export function OfflineSLMPanel() {
  const { kwsState, triggerWakeWord, deviceProfile } = useTelemetryContext();

  const {
    effectiveMode,
    simulatedNetwork,
    goOnline,
    goOffline,
    restoreConnection,
    lastResponseResult,
    isProcessingQuery,
    offlineQueue,
    nextSyncSeconds,
    isSyncingQueue,
    conversationHistory,
    processInteraction,
    syncOfflineQueue,
    clearOfflineQueue,
    clearHistory,
    activePipelineStage,
  } = useIntelligenceContext();

  const [isRecording, setIsRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const isOnline = simulatedNetwork === 'ONLINE';
  const profile = DEVICE_TELEMETRY_REGISTRY['TRINETRA-001'];
  const hasQueue = offlineQueue.filter((q) => q.status !== 'COMPLETED').length > 0;
  const currentPendingItem = offlineQueue.find((q) => q.status !== 'COMPLETED');

  // Text-to-speech feedback
  const speakResponse = useCallback(
    (text: string) => {
      if (speakerOn && 'speechSynthesis' in window && text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    },
    [speakerOn]
  );

  // Spoken voice query executor
  const handleVoiceQuery = useCallback(
    async (queryText: string) => {
      if (isProcessingQuery || !queryText.trim()) return;
      setLiveTranscript(queryText);
      triggerWakeWord();

      const result = await processInteraction(queryText, 'TRINETRA-001');
      if (result.response_text) {
        speakResponse(result.response_text);
      }
    },
    [isProcessingQuery, processInteraction, speakResponse, triggerWakeWord]
  );

  // Real Microphone Capture via Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
        if (event.results[0].isFinal) {
          handleVoiceQuery(transcript);
        }
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [handleVoiceQuery]);

  const toggleMicrophone = () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          handleVoiceQuery('What is the current system temperature?');
        }
      } else {
        handleVoiceQuery('What is the current system temperature?');
      }
    }
  };

  // Determine active branch of decision flow
  const isLocalAnswerActive =
    lastResponseResult?.source === 'LOCAL SLM' && !isProcessingQuery;
  const isGroundFallbackActive =
    (lastResponseResult?.source === 'GROUND LLM' || activePipelineStage === 'FLASH_QUEUE_STORE') &&
    !isProcessingQuery;

  return (
    <div className="space-y-6">
      {/* ═══ 1. PAGE HEADER ═══ */}
      <GlassPanel className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
                EDGE AI
              </span>
              <span className="text-gray-500 font-mono text-xs">/</span>
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-bold">
                OFFLINE INTELLIGENCE
              </span>
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                SIMULATED TELEMETRY
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Local intelligence first. Ground intelligence when needed.
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              TRINETRA evaluates spoken queries locally on companion compute. Telemetry questions resolve with low-latency local answers. Unanswered queries queue to persistent flash memory with 5-second ground synchronization retry.
            </p>
          </div>

          {/* Audio & Online / Offline Control */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-semibold transition-all cursor-pointer ${
                speakerOn
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                  : 'border-white/[0.08] bg-graphite-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              {speakerOn ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{speakerOn ? 'AUDIO ON' : 'MUTED'}</span>
            </button>

            <button
              onClick={goOnline}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-graphite-900 text-gray-400 border border-white/[0.06] hover:text-gray-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>ONLINE</span>
            </button>

            <button
              onClick={goOffline}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                !isOnline
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-graphite-900 text-gray-400 border border-white/[0.06] hover:text-gray-200'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>GO OFFLINE</span>
            </button>

            <button
              onClick={() => {
                restoreConnection();
                syncOfflineQueue();
              }}
              className="rounded-xl px-3.5 py-2 font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              RESTORE CONNECTION
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ 2. SYSTEM STATUS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono">
        <GlassPanel className="p-3.5">
          <div className="text-[10px] text-gray-400 uppercase">DEVICE</div>
          <div className="text-sm font-bold text-white mt-1">TRINETRA-001</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">● SYSTEM READY</div>
        </GlassPanel>

        <GlassPanel className="p-3.5">
          <div className="text-[10px] text-gray-400 uppercase">GROUND LINK</div>
          <div className={`text-sm font-bold mt-1 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOnline ? 'CONNECTED' : 'OFFLINE'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{isOnline ? '-61 dBm Signal' : 'Isolated Mode'}</div>
        </GlassPanel>

        <GlassPanel className="p-3.5">
          <div className="text-[10px] text-gray-400 uppercase">LOCAL SLM</div>
          <div className="text-sm font-bold text-cyan-300 mt-1">READY</div>
          <div className="text-[10px] text-gray-500 mt-0.5">First Decision Layer</div>
        </GlassPanel>

        <GlassPanel className="p-3.5">
          <div className="text-[10px] text-gray-400 uppercase">TELEMETRY</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">AVAILABLE</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Live Local Buffer</div>
        </GlassPanel>

        <GlassPanel className="p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-gray-400 uppercase">FLASH QUEUE</div>
          <div className={`text-sm font-bold mt-1 ${hasQueue ? 'text-amber-300' : 'text-emerald-400'}`}>
            {hasQueue ? `${currentPendingItem?.queryId} WAITING` : 'EMPTY'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {hasQueue ? `Next Sync: ${nextSyncSeconds}s` : '0 Queued'}
          </div>
        </GlassPanel>
      </div>

      {/* ═══ 3. MAIN VISUAL — LOCAL SLM FIRST DECISION ═══ */}
      <GlassPanel className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold block">
              PRIMARY INTELLIGENCE PIPELINE
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide mt-0.5">
              LOCAL SLM FIRST DECISION
            </h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-400">Interaction Mode:</span>
            <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 text-cyan-300 font-bold flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 text-cyan-400" />
              <span>VOICE-ONLY (MIC DMA)</span>
            </span>
          </div>
        </div>

        {/* Top Decision Path: USER VOICE -> TRINETRA DETECTED -> ASR -> LOCAL SLM -> CAN LOCAL SLM ANSWER? */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
          {[
            { step: '1', title: 'USER VOICE', desc: 'Dual INMP441 DMA' },
            { step: '2', title: 'TRINETRA DETECTED', desc: 'TinyML KWS INT8 > 0.85' },
            { step: '3', title: 'ASR', desc: 'Spoken Intent Capture' },
            { step: '4', title: 'LOCAL SLM', desc: 'First Decision Layer' },
            { step: '5', title: 'CAN LOCAL SLM ANSWER?', desc: 'Telemetry Grounding Check' },
          ].map((item, idx) => {
            const isProcessing =
              isProcessingQuery &&
              ((idx === 0 && activePipelineStage === 'LISTENING') ||
                (idx === 1 && activePipelineStage === 'WAKE_WORD') ||
                (idx === 2 && activePipelineStage === 'QUERY_PARSER') ||
                (idx >= 3 && activePipelineStage === 'LOCAL_SLM_EVALUATION'));

            return (
              <div key={item.title} className="flex items-center">
                <div
                  className={`flex-1 rounded-xl p-3 border transition-all space-y-1 ${
                    isProcessing
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)] text-white'
                      : 'border-white/[0.06] bg-black/40 text-gray-300'
                  }`}
                >
                  <div className="text-[9px] text-cyan-400 font-bold">STEP 0{item.step}</div>
                  <div className="font-bold text-white text-[11px]">{item.title}</div>
                  <div className="text-[9px] text-gray-400">{item.desc}</div>
                </div>
                {idx < 4 && (
                  <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-cyan-400/40 mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Central Spoken Microphone Interactive Action & Spoken Prompts */}
        <div className="rounded-2xl border border-cyan-500/20 bg-black/50 p-6 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center justify-center relative">
            {(isRecording || isProcessingQuery) && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
                  className="absolute h-24 w-24 rounded-full border-2 border-cyan-400/60"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: 0.5, ease: 'easeOut' }}
                  className="absolute h-24 w-24 rounded-full border-2 border-indigo-400/60"
                />
              </>
            )}

            <button
              onClick={toggleMicrophone}
              className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all shadow-2xl cursor-pointer ${
                isRecording
                  ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-pulse'
                  : isProcessingQuery
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                  : 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_25px_rgba(34,211,238,0.35)]'
              }`}
            >
              <Mic className={`h-8 w-8 ${isRecording ? 'animate-bounce' : ''}`} />
            </button>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-sm font-bold text-white tracking-wide">
              {isRecording
                ? 'LISTENING TO MICROPHONE...'
                : isProcessingQuery
                ? 'EVALUATING ON LOCAL SLM...'
                : 'Click Mic or Trigger Voice Demo Prompts Below'}
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Pure voice interface · No text input typing required
            </p>
          </div>

          {/* Clickable Spoken Demo Triggers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl pt-2 text-left">
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                TEST PATH 1: LOCAL TELEMETRY QUESTIONS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPOKEN_PROMPTS_LOCAL.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleVoiceQuery(p)}
                    disabled={isProcessingQuery}
                    className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Mic className="h-2.5 w-2.5 text-cyan-400" />
                    <span>"{p}"</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                TEST PATH 2: COMPLEX / ARCHIVE QUESTIONS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPOKEN_PROMPTS_GROUND.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleVoiceQuery(p)}
                    disabled={isProcessingQuery}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Mic className="h-2.5 w-2.5 text-amber-400" />
                    <span>"{p}"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ 4 & 5. TWO PATHS: LOCAL RESPONSE vs GROUND FALLBACK ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ 4. LOCAL RESPONSE PATH ═══ */}
        <GlassPanel
          className={`p-6 space-y-4 transition-all ${
            isLocalAnswerActive
              ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-950/30 to-[#070b14] shadow-[0_0_25px_rgba(34,211,238,0.2)]'
              : 'border-white/[0.08] bg-black/40'
          }`}
        >
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-300">
                LOCAL RESPONSE
              </h3>
            </div>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
              LOW-LATENCY LOCAL RESPONSE
            </span>
          </div>

          {/* Sequential Step Diagram */}
          <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs space-y-1.5 text-gray-300">
            <div className="flex items-center justify-between">
              <span>VOICE QUERY</span>
              <span className="text-gray-500">↓</span>
              <span>ASR</span>
              <span className="text-gray-500">↓</span>
              <span className="text-cyan-400 font-bold">LOCAL SLM</span>
              <span className="text-gray-500">↓</span>
              <span className="text-emerald-400 font-bold">ANSWER FOUND</span>
              <span className="text-gray-500">↓</span>
              <span className="text-white font-bold">OLED + WEB</span>
            </div>
          </div>

          {/* Concrete Example Showcase */}
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-1">
              <div className="text-[10px] text-gray-400 uppercase">USER QUERY</div>
              <div className="text-white font-semibold">"What is the current system temperature?"</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>✓ LOCAL ANSWER FOUND</span>
              </div>
              <div className="text-base font-bold text-white">
                "Current temperature is 28.4°C."
              </div>
            </div>
          </div>

          {/* Metadata Badges & OLED Hardware Mirror */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs text-center">
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">SOURCE</div>
              <div className="font-bold text-cyan-300">LOCAL SLM</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">DEVICE</div>
              <div className="font-bold text-white">TRINETRA-001</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">DELIVERY</div>
              <div className="font-bold text-emerald-400">OLED + WEB</div>
            </div>
            <div className="p-2 rounded-lg bg-[#050a05] border border-[#1a381a] shadow-inner text-[#7fff7f] flex flex-col justify-center">
              <div className="text-[7px] text-gray-500">OLED MIRROR</div>
              <div className="text-[10px] font-bold">TEMP: 28.4 C</div>
            </div>
          </div>
        </GlassPanel>

        {/* ═══ 5. GROUND FALLBACK PATH ═══ */}
        <GlassPanel
          className={`p-6 space-y-4 transition-all ${
            isGroundFallbackActive
              ? 'border-amber-400/60 bg-gradient-to-br from-amber-950/30 to-[#070b14] shadow-[0_0_25px_rgba(245,158,11,0.2)]'
              : 'border-white/[0.08] bg-black/40'
          }`}
        >
          <div className="flex items-center justify-between border-amber-500/20 pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-amber-300">
                GROUND FALLBACK
              </h3>
            </div>
            <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 font-mono text-[9px] font-bold text-amber-300">
              ZERO HALLUCINATION GUARD
            </span>
          </div>

          {/* Sequential Step Diagram */}
          <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs space-y-1.5 text-gray-300">
            <div className="flex items-center justify-between text-[11px]">
              <span>VOICE QUERY</span>
              <span className="text-gray-500">↓</span>
              <span>ASR</span>
              <span className="text-gray-500">↓</span>
              <span>LOCAL SLM</span>
              <span className="text-gray-500">↓</span>
              <span className="text-amber-400 font-bold">UNANSWERED</span>
              <span className="text-gray-500">↓</span>
              <span className="text-amber-300 font-bold">FLASH QUEUE</span>
              <span className="text-gray-500">↓</span>
              <span className="text-cyan-300 font-bold">GROUND LLM</span>
            </div>
          </div>

          {/* Concrete Example Showcase */}
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/60 border border-white/[0.06] space-y-1">
              <div className="text-[10px] text-gray-400 uppercase">USER QUERY</div>
              <div className="text-white font-semibold">"Explain the communication protocol."</div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
              <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>⚠ LOCAL ANSWER NOT FOUND (NO INVENTED DATA)</span>
              </div>
              <div className="text-xs text-amber-200">
                Queue ID: <strong>Q001</strong> · Status: <strong className="text-white">QUEUED FOR GROUND</strong>
              </div>
            </div>
          </div>

          {/* Metadata Badges & OLED Hardware Mirror */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs text-center">
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">QUEUE ID</div>
              <div className="font-bold text-amber-300">Q001</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">DEVICE</div>
              <div className="font-bold text-white">TRINETRA-001</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
              <div className="text-[9px] text-gray-500">SYNC RETRY</div>
              <div className="font-bold text-cyan-300">EVERY 5 SEC</div>
            </div>
            <div className="p-2 rounded-lg bg-[#050a05] border border-[#1a381a] shadow-inner text-[#7fff7f] flex flex-col justify-center">
              <div className="text-[7px] text-gray-500">OLED MIRROR</div>
              <div className="text-[9px] font-bold leading-tight">QUERY QUEUED</div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ═══ 6. FLASH-BACKED QUERY QUEUE ═══ */}
      <GlassPanel className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyan-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              FLASH-BACKED QUERY QUEUE
            </h3>
          </div>

          {/* 5-Second Sync Timer Indicator */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-black/50 border border-white/[0.08] px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-gray-400">NEXT SYNC:</span>
              <span className="font-bold text-emerald-400">
                {isOnline ? `${nextSyncSeconds} SEC` : 'WAITING FOR LINK'}
              </span>
            </div>

            {hasQueue && (
              <button
                onClick={syncOfflineQueue}
                disabled={isSyncingQueue || !isOnline}
                className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-emerald-300 font-bold hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                <span>SYNC NOW</span>
              </button>
            )}

            {offlineQueue.length > 0 && (
              <button
                onClick={clearOfflineQueue}
                className="text-gray-500 hover:text-rose-400 text-xs transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Lifecycle: PENDING -> READY TO SYNC -> SENT -> PROCESSING -> RESPONSE RECEIVED -> COMPLETED */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
            Queue Synchronization Lifecycle (5-Second Loop):
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
            {[
              { key: 'PENDING', label: 'PENDING', sub: 'Flash Stored' },
              { key: 'READY_TO_SYNC', label: 'READY TO SYNC', sub: '5s Check' },
              { key: 'SENT', label: 'SENT', sub: 'Ground Uplink' },
              { key: 'GROUND_PROCESSING', label: 'PROCESSING', sub: 'Remote LLM' },
              { key: 'RESPONSE_RECEIVED', label: 'RECEIVED', sub: 'TLS 1.3' },
              { key: 'COMPLETED', label: 'COMPLETED', sub: 'Web Ready' },
            ].map((step) => {
              const active =
                offlineQueue.some((q) => q.status === step.key) ||
                (step.key === 'COMPLETED' && offlineQueue.some((q) => q.status === 'COMPLETED'));

              return (
                <div
                  key={step.key}
                  className={`p-2.5 rounded-xl border transition-all ${
                    active
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'border-white/[0.06] bg-black/40 text-gray-500'
                  }`}
                >
                  <div className={`font-bold text-[11px] ${active ? 'text-cyan-300' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{step.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Queue Table */}
        {offlineQueue.length > 0 ? (
          <div className="space-y-2 pt-1">
            {offlineQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-black/50 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 font-bold text-[10px]">
                      {item.queryId}
                    </span>
                    <span className="text-white font-semibold">"{item.query}"</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{item.reason}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`rounded px-2.5 py-1 text-[10px] font-bold ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : item.status === 'RESPONSE_RECEIVED'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    }`}
                  >
                    {item.status === 'COMPLETED'
                      ? '✓ COMPLETED'
                      : item.status === 'RESPONSE_RECEIVED'
                      ? 'RESPONSE RECEIVED'
                      : item.status}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 font-mono text-xs text-gray-500 bg-black/30 rounded-xl border border-white/[0.04]">
            Queue empty · All voice queries currently resolved
          </div>
        )}
      </GlassPanel>

      {/* ═══ 7. CURRENT USER QUERY — MUST BE VISIBLE ═══ */}
      {lastResponseResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassPanel className="p-6 border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-[#070b14] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-cyan-400 animate-pulse" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  CURRENT USER QUERY
                </h3>
              </div>
              <span className="font-mono text-xs text-gray-400">
                Latency: {lastResponseResult.latency_ms} ms
              </span>
            </div>

            {/* Spoken Query Card */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                <span>🎙 USER ASKED</span>
              </div>
              <div className="text-base font-semibold text-white">
                "{lastResponseResult.query}"
              </div>
            </div>

            {/* Response Card */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                {lastResponseResult.source === 'LOCAL SLM' ? 'LOCAL SLM RESPONSE' : 'GROUND-ASSISTED RESPONSE'}
              </div>
              <div className="text-lg font-bold text-white leading-relaxed">
                "{lastResponseResult.response_text}"
              </div>
            </div>

            {/* Live Status, Source, Timestamp, Device */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">STATUS</div>
                <div className="font-bold text-emerald-400">{lastResponseResult.status}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">SOURCE</div>
                <div className="font-bold text-cyan-300">{lastResponseResult.source}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">TIMESTAMP</div>
                <div className="font-bold text-white">
                  {new Date(lastResponseResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">DEVICE</div>
                <div className="font-bold text-white">TRINETRA-001</div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* ═══ 7. TELEMETRY CONTEXT (SMALL CURRENT MACHINE TELEMETRY PANEL) ═══ */}
      <GlassPanel className="p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              CURRENT MACHINE TELEMETRY CONTEXT · TRINETRA-001
            </span>
          </div>
          <span className="font-mono text-[10px] text-gray-400">
            Defines Local SLM Answering Scope
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center font-mono text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">CPU TEMP</div>
            <div className="font-bold text-white mt-0.5">
              {profile.system.cpu_temperature !== null ? `${profile.system.cpu_temperature}°C` : 'DATA UNAVAILABLE'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">FREE HEAP</div>
            <div className="font-bold text-cyan-300 mt-0.5">
              {profile.system.free_heap ? `${Math.round(profile.system.free_heap / 1024)} KB` : 'DATA UNAVAILABLE'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">MIC 1</div>
            <div className="font-bold text-emerald-400 mt-0.5">
              {profile.audio.mic_1 === 'active' ? 'ACTIVE' : 'DATA UNAVAILABLE'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">MIC 2</div>
            <div className="font-bold text-emerald-400 mt-0.5">
              {profile.audio.mic_2 === 'active' ? 'ACTIVE' : 'DATA UNAVAILABLE'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">COMMUNICATION</div>
            <div className={`font-bold mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'CONNECTED' : 'OFFLINE'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">POWER</div>
            <div className="font-bold text-emerald-400 mt-0.5">
              {profile.power.status === 'normal' ? 'NORMAL' : 'DATA UNAVAILABLE'}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ 8. RECENT VOICE INTERACTIONS — AT THE BOTTOM ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            <span>RECENT VOICE INTERACTIONS</span>
          </h3>
          {conversationHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs font-mono text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Log
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
          <AnimatePresence initial={false}>
            {conversationHistory.slice().reverse().map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <GlassPanel className="p-4 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono text-[10px] border-b border-white/[0.04] pb-1.5">
                    <div className="flex items-center gap-2">
                      {item.queryId && (
                        <span className="rounded bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 font-bold">
                          {item.queryId}
                        </span>
                      )}
                      <span className="text-gray-300 font-bold">TRINETRA-001</span>
                      <span className="text-gray-500">|</span>
                      <span className="text-cyan-400 font-semibold">SOURCE: {item.source}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          item.status === 'ANSWERED LOCALLY'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : item.status === 'GROUND RESPONSE RECEIVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.status === 'ANSWERED LOCALLY' ? '✓ ANSWERED' : item.status}
                      </span>
                      <span className="text-gray-400">MODE: {item.mode}</span>
                      <span className="text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-gray-400">USER QUERY:</div>
                    <div className="font-semibold text-cyan-200">"{item.query}"</div>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <div className="text-[10px] font-mono text-gray-400">RESPONSE:</div>
                    <div className="text-gray-200 pl-3 border-l-2 border-cyan-500/40 leading-relaxed font-sans">
                      "{item.response_text}"
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
