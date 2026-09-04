import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Wifi,
  WifiOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Activity,
  MessageSquare,
  Clock,
  Database,
  BrainCircuit,
  Play,
  Server,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { useIntelligenceContext } from '@/context/IntelligenceContext';

const CASE_1_LOCAL_PROMPTS = [
  'What is the current system temperature?',
  'What is the current CPU temperature?',
  'What is the free heap?',
  'Are both microphones active?',
  'Is the communication link connected?',
  'What is the power status?',
];

const CASE_2_GROUND_PROMPTS = [
  'Explain the communication protocol.',
  'Explain the hybrid system architecture.',
  'Show me the maintenance history from last month.',
];

export function VoiceAssistant() {
  const { kwsState, triggerWakeWord } = useTelemetryContext();
  const {
    connectionState,
    simulatedNetwork,
    toggleNetwork,
    effectiveMode,
    activePipelineStage,
    isProcessingQuery,
    lastResponseResult,
    conversationHistory,
    offlineQueue,
    nextSyncSeconds,
    isSyncingQueue,
    processInteraction,
    syncOfflineQueue,
    clearHistory,
  } = useIntelligenceContext();

  const [isRecording, setIsRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isOnline = simulatedNetwork === 'ONLINE';

  // Text-to-speech
  const speakResponse = useCallback((text: string) => {
    if (speakerOn && 'speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [speakerOn]);

  // Execute Voice Query Pipeline
  const executeVoiceQuery = useCallback(async (spokenText: string) => {
    if (!spokenText.trim() || isProcessingQuery) return;
    setLiveTranscript(spokenText);
    triggerWakeWord();

    const result = await processInteraction(spokenText, 'TRINETRA-001');
    if (result.response_text) {
      speakResponse(result.response_text);
    }
  }, [isProcessingQuery, processInteraction, speakResponse, triggerWakeWord]);

  // Web Speech API for Real Mic Capture
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);

        if (event.results[0].isFinal) {
          executeVoiceQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error !== 'no-speech') {
          setVoiceError(`Microphone notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

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
  }, [executeVoiceQuery]);

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
          executeVoiceQuery('What is the current system temperature?');
        }
      } else {
        executeVoiceQuery('What is the current system temperature?');
      }
    }
  };

  // State Labels for Spacecraft Voice State Machine
  let voiceStateTitle = 'Speak to TRINETRA';
  let voiceStateSub = 'Click the microphone or trigger a spoken command.';

  if (isRecording) {
    voiceStateTitle = 'LISTENING...';
    voiceStateSub = 'Capturing audio through INMP441 DMA buffer...';
  } else if (kwsState === 'WAKE_DETECTED' || activePipelineStage === 'WAKE_WORD') {
    voiceStateTitle = 'TRINETRA DETECTED';
    voiceStateSub = 'INT8 Softmax Threshold > 0.85 Confirmed';
  } else if (activePipelineStage === 'LOCAL_SLM_EVALUATION') {
    voiceStateTitle = 'LOCAL SLM FIRST LAYER';
    voiceStateSub = 'Evaluating local telemetry & context sufficiency...';
  } else if (activePipelineStage === 'FLASH_QUEUE_STORE') {
    voiceStateTitle = 'FLASH QUEUE BUFFER';
    voiceStateSub = 'Unanswered query stored. Awaiting ground synchronization...';
  } else if (lastResponseResult && !isProcessingQuery) {
    voiceStateTitle = lastResponseResult.source === 'LOCAL SLM' ? 'LOCAL RESPONSE READY' : 'GROUND RESPONSE READY';
    voiceStateSub = `Telemetry grounded response dispatched to OLED and Web.`;
  }

  const isGroundResponse = lastResponseResult?.source === 'GROUND LLM';
  const isQueued = lastResponseResult?.status === 'QUEUED';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ═══ Header & Controls ═══ */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-wide">TRINETRA Voice Assistant</h1>
            <span className="rounded-md bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
              VOICE-FIRST INTERFACE
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Talk to <span className="font-mono text-cyan-400 font-bold">TRINETRA-001</span>. Zero text typing — Direct voice communication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSpeakerOn(!speakerOn)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
              speakerOn
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                : 'border-white/[0.08] bg-graphite-900 text-gray-400 hover:text-gray-200'
            }`}
          >
            {speakerOn ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{speakerOn ? 'SPEECH AUDIO ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={toggleNetwork}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
              isOnline
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs font-bold text-white">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>TRINETRA-001</span>
          </div>
        </div>
      </div>

      {/* ═══ 5-Second Ground Synchronization Indicator ═══ */}
      {offlineQueue.filter((q) => q.status !== 'COMPLETED').length > 0 && (
        <GlassPanel className="p-3.5 border-amber-500/30 bg-amber-500/10 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-400" />
            <span className="text-gray-300 font-bold">GROUND QUEUE:</span>
            <span className="text-amber-200">
              {offlineQueue.find((q) => q.status !== 'COMPLETED')?.queryId} — WAITING
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">NEXT SYNC:</span>
            <span className="font-bold text-emerald-400">
              {isOnline ? `${nextSyncSeconds}s` : 'PAUSED (OFFLINE)'}
            </span>
          </div>

          <button
            onClick={syncOfflineQueue}
            disabled={isSyncingQueue}
            className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
            <span>SYNC NOW</span>
          </button>
        </GlassPanel>
      )}

      {/* ═══ Central Futuristic Microphone Visualizer ═══ */}
      <GlassPanel className="relative overflow-hidden p-8 text-center space-y-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Central State Label */}
        <div className="space-y-1">
          <div className="font-mono text-2xl font-extrabold uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            {voiceStateTitle}
          </div>
          <p className="font-mono text-xs text-cyan-300">{voiceStateSub}</p>
          {voiceError && <p className="text-xs text-rose-400 font-mono">{voiceError}</p>}
        </div>

        {/* Large Microphone with Circular Waves */}
        <div className="relative flex items-center justify-center py-6">
          {(isRecording || isProcessingQuery) && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.3, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                className="absolute h-32 w-32 rounded-full border-2 border-cyan-400/60"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.8, delay: 0.6, ease: 'easeOut' }}
                className="absolute h-32 w-32 rounded-full border-2 border-indigo-400/60"
              />
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMicrophone}
            className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all shadow-2xl cursor-pointer ${
              isRecording
                ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_40px_rgba(244,63,94,0.5)] animate-pulse'
                : isProcessingQuery
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 shadow-[0_0_40px_rgba(99,102,241,0.5)]'
                : 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_35px_rgba(34,211,238,0.35)]'
            }`}
          >
            <Mic className={`h-14 w-14 ${isRecording ? 'animate-bounce' : ''}`} />
          </motion.button>
        </div>

        {/* Live Audio Waveform Bars */}
        <div className="flex items-center justify-center gap-1.5 h-10">
          {Array.from({ length: 32 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isRecording || isProcessingQuery ? [6, Math.sin(i * 0.35) * 32 + 8, 6] : 4,
                backgroundColor: isRecording ? '#f43f5e' : isProcessingQuery ? '#818cf8' : '#22d3ee',
                opacity: isRecording || isProcessingQuery ? 0.9 : 0.25,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.6 + (i % 5) * 0.1,
                ease: 'easeInOut',
              }}
              className="w-1.5 rounded-full"
            />
          ))}
        </div>

        {/* Spoken Prompts Categorized by Case */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-left">
          {/* Case 1 Prompts */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              CASE 1 — LOCAL TELEMETRY QUERIES (LOCAL SLM FIRST):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CASE_1_LOCAL_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => executeVoiceQuery(prompt)}
                  disabled={isProcessingQuery}
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-2.5 py-1 text-xs text-cyan-300 transition-all hover:bg-cyan-500/15 hover:border-cyan-500/40 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  <Mic className="h-2.5 w-2.5 text-cyan-400" />
                  <span>"{prompt}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Case 2 Prompts */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              CASE 2 — COMPLEX / ARCHIVE (FLASH QUEUE & GROUND FALLBACK):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CASE_2_GROUND_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => executeVoiceQuery(prompt)}
                  disabled={isProcessingQuery}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1 text-xs text-amber-300 transition-all hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  <Mic className="h-2.5 w-2.5 text-amber-400" />
                  <span>"{prompt}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ PROMINENT VOICE RESPONSE BOX (CASE 1 vs CASE 2) ═══ */}
      {lastResponseResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <GlassPanel
            className={`p-6 space-y-4 shadow-[0_0_30px_rgba(34,211,238,0.15)] ${
              isGroundResponse
                ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-[#070b14]'
                : isQueued
                ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-[#070b14]'
                : 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 to-[#070b14]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
                {isGroundResponse ? (
                  <>
                    <Server className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">GROUND-ASSISTED RESPONSE</span>
                  </>
                ) : isQueued ? (
                  <>
                    <HardDrive className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-300">FLASH-BACKED QUERY QUEUE</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-4 w-4 text-cyan-400" />
                    <span>LOCAL RESPONSE</span>
                  </>
                )}
              </span>

              <div className="flex items-center gap-2 font-mono text-xs">
                {isGroundResponse ? (
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 font-bold text-[10px]">
                    ✓ RESPONSE RECEIVED
                  </span>
                ) : isQueued ? (
                  <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 font-bold text-[10px]">
                    QUEUED FOR GROUND
                  </span>
                ) : (
                  <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 font-bold text-[10px]">
                    ANSWERED LOCALLY
                  </span>
                )}
                <span className="text-gray-400">Latency: {lastResponseResult.latency_ms} ms</span>
              </div>
            </div>

            {/* Spoken Query Transcript */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                USER (SPOKEN QUERY)
              </div>
              <div className="text-base font-semibold text-gray-200">
                "{lastResponseResult.query}"
              </div>
            </div>

            {/* TRINETRA / Ground Response */}
            <div
              className={`rounded-xl p-4 space-y-1 border ${
                isGroundResponse
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : isQueued
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-cyan-500/30 bg-cyan-500/10'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                {isGroundResponse ? 'GROUND LLM RESPONSE' : isQueued ? 'LOCAL SLM' : 'LOCAL SLM'}
              </div>
              <div className="text-lg font-bold text-white leading-relaxed">
                "{lastResponseResult.response_text}"
              </div>
            </div>

            {/* OLED Display Mirror & Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">SOURCE</div>
                <div className="font-bold text-cyan-300">{lastResponseResult.source}</div>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">STATUS</div>
                <div className="font-bold text-emerald-300">{lastResponseResult.status}</div>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">DEVICE</div>
                <div className="font-bold text-white">TRINETRA-001</div>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">OLED MIRROR</div>
                <div className="font-bold text-[#7fff7f]">
                  {lastResponseResult.oled_lines?.[1] || 'STAT: OK'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
                <div className="text-[10px] text-gray-500">TIME</div>
                <div className="font-bold text-white">
                  {new Date(lastResponseResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* ═══ WEB VOICE HISTORY (Full Metadata Log) ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span>Voice Assistant History (Question, Answer, Source, Status, Timestamp)</span>
          </h2>
          {conversationHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs font-mono text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Clear Log
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          <AnimatePresence>
            {conversationHistory.slice(-6).reverse().map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
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
                        {item.status}
                      </span>
                      <span className="text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-gray-400">QUESTION:</div>
                    <div className="font-semibold text-cyan-200">"{item.query}"</div>
                  </div>

                  <div className="space-y-1 pt-0.5">
                    <div className="text-[10px] font-mono text-gray-400">ANSWER:</div>
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
