import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, VolumeX, Radio, Cpu, RadioTower } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTelemetryContext } from '@/context/TelemetryContext';
import type { ConversationMessage, KwsState } from '@/types';

const DEVICE_OPTIONS = ['TRINETRA-001', 'TRINETRA-002', 'TRINETRA-003'];

const stateFlow: KwsState[] = ['LISTENING', 'CANDIDATE', 'VERIFYING', 'WAKE_DETECTED', 'STREAMING', 'ASR', 'RESPONSE'];

export function VoiceAssistant() {
  const { triggerWakeWord, kwsState } = useTelemetryContext();
  const [selectedDevice, setSelectedDevice] = useState('TRINETRA-001');
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: 'init-0',
      role: 'assistant',
      text: 'Hello. I am TRINETRA, your edge telemetry intelligence assistant. Select a machine context above and ask any diagnostic or operational question.',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localState, setLocalState] = useState<KwsState>('LISTENING');
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation, isProcessing]);

  const processQuery = async (query: string) => {
    setIsProcessing(true);

    // Walk through visual state pipeline
    for (const s of stateFlow) {
      setLocalState(s);
      if (s === 'WAKE_DETECTED') {
        await new Promise((r) => setTimeout(r, 300));
      } else if (s === 'STREAMING') {
        await new Promise((r) => setTimeout(r, 300));
      } else if (s === 'ASR') {
        await new Promise((r) => setTimeout(r, 400));
      } else {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const userMsg: ConversationMessage = {
      id: String(msgIdRef.current++),
      role: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) => [...prev, userMsg]);

    let responseText = '';
    try {
      const res = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, deviceId: selectedDevice })
      });
      if (res.ok) {
        const data = await res.json();
        responseText = data.response;
      }
    } catch {
      // Offline fallback: Stage 9 deterministic response synthesis
      const lower = query.toLowerCase();
      if (lower.includes('temperature') || lower.includes('temp') || lower.includes('hot') || lower.includes('cold')) {
        const tempMap: Record<string, string> = {
          'TRINETRA-001': '28.4°C',
          'TRINETRA-002': '34.7°C',
          'TRINETRA-003': '24.8°C'
        };
        responseText = `${selectedDevice} is currently at ${tempMap[selectedDevice] || '28.4°C'}.`;
      } else if (lower.includes('door')) {
        responseText = selectedDevice === 'TRINETRA-002'
          ? `No. The door is currently open on ${selectedDevice}.`
          : `Yes. The door is closed on ${selectedDevice}.`;
      } else if (lower.includes('communication') || lower.includes('wifi')) {
        responseText = selectedDevice === 'TRINETRA-003'
          ? `Wi-Fi is disconnected on ${selectedDevice}.`
          : `Wi-Fi and server communication are connected on ${selectedDevice}.`;
      } else if (lower.includes('battery health')) {
        responseText = `Battery health data is unavailable for ${selectedDevice}.`;
      } else {
        responseText = `Grounded telemetry for ${selectedDevice}: Operating nominal with telemetry source tagged as SIMULATED.`;
      }
    }

    const assistantMsg: ConversationMessage = {
      id: String(msgIdRef.current++),
      role: 'assistant',
      text: responseText,
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) => [...prev, assistantMsg]);

    if (speakerOn && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.rate = 1.0;
      speechSynthesis.speak(utterance);
    }

    setLocalState('LISTENING');
    setIsProcessing(false);
  };

  const handleSayTrinetra = () => {
    triggerWakeWord();
    setTimeout(() => {
      setInputText('');
      processQuery('What is the machine temperature?');
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const q = inputText;
    setInputText('');
    processQuery(q);
  };

  const stateLabel = isProcessing ? localState : kwsState;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header & Device Selector */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice & Telemetry Assistant</h1>
          <p className="mt-1 text-sm text-gray-400">
            Say <span className="font-mono text-accent-400">TRINETRA</span> or type a telemetry question.
          </p>
        </div>

        {/* Device Switcher & Provenance Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-graphite-700 bg-graphite-900/80 px-3 py-1.5 shadow-inner">
            <Cpu className="h-4 w-4 text-accent-400" />
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-transparent font-mono text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {DEVICE_OPTIONS.map((dev) => (
                <option key={dev} value={dev} className="bg-graphite-900 text-white">
                  {dev}
                </option>
              ))}
            </select>
          </div>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-400">
            SIMULATED TELEMETRY
          </span>
        </div>
      </div>

      {/* Central orb */}
      <GlassPanel className="relative overflow-hidden p-8">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-full bg-accent-500/5 blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center">
          {/* Orb */}
          <motion.div
            animate={{
              scale: isProcessing ? [1, 1.08, 1] : 1,
              boxShadow: stateLabel === 'WAKE_DETECTED'
                ? '0 0 60px rgba(34,211,238,0.5), 0 0 120px rgba(34,211,238,0.15)'
                : stateLabel === 'LISTENING'
                  ? '0 0 20px rgba(34,211,238,0.15)'
                  : '0 0 40px rgba(34,211,238,0.3)',
            }}
            transition={{ repeat: isProcessing ? Infinity : 0, duration: 1.5 }}
            className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-accent-500/30 bg-gradient-to-b from-graphite-700/80 to-base-900/80"
          >
            {/* Pulse rings when listening */}
            {stateLabel === 'LISTENING' && (
              <>
                <div className="absolute inset-0 rounded-full border border-accent-500/25 animate-ring-expand" />
                <div className="absolute inset-0 rounded-full border border-accent-500/20 animate-ring-expand" style={{ animationDelay: '0.7s' }} />
                <div className="absolute inset-0 rounded-full border border-accent-500/15 animate-ring-expand" style={{ animationDelay: '1.4s' }} />
              </>
            )}
            {/* Glow burst on wake */}
            {stateLabel === 'WAKE_DETECTED' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 rounded-full border-2 border-accent-400/40"
              />
            )}
            <Mic className="h-10 w-10 text-accent-400" />
          </motion.div>

          {/* Status */}
          <div className="mt-6 flex items-center gap-3">
            <StatusBadge
              status={stateLabel === 'LISTENING' ? 'success' : stateLabel === 'WAKE_DETECTED' ? 'info' : 'warning'}
              label={stateLabel}
              pulse
            />
            <span className="font-mono text-xs text-accent-400">Target: {selectedDevice}</span>
          </div>

          <p className="mt-3 font-mono text-sm text-gray-400">
            {stateLabel === 'LISTENING' && 'Say TRINETRA to begin.'}
            {stateLabel === 'CANDIDATE' && 'Candidate detected...'}
            {stateLabel === 'VERIFYING' && 'Verifying wake word on ESP32-S3...'}
            {stateLabel === 'WAKE_DETECTED' && 'Wake word confirmed (ACWE 2-of-3)!'}
            {stateLabel === 'STREAMING' && 'Streaming query to SLM...'}
            {stateLabel === 'ASR' && 'Transcribing speech...'}
            {stateLabel === 'RESPONSE' && 'Generating grounded answer...'}
          </p>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleSayTrinetra}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-base-950 transition-all hover:bg-accent-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              Say TRINETRA (Temp Query)
            </button>
            <button
              onClick={() => processQuery('Is the door closed?')}
              disabled={isProcessing}
              className="rounded-lg border border-graphite-700 bg-graphite-800/80 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-graphite-700 disabled:opacity-50"
            >
              Ask Door Status
            </button>
            <button
              onClick={() => processQuery('What is the communication status?')}
              disabled={isProcessing}
              className="rounded-lg border border-graphite-700 bg-graphite-800/80 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-graphite-700 disabled:opacity-50"
            >
              Ask Comms Status
            </button>
            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                speakerOn
                  ? 'border-graphite-700 bg-graphite-800 text-white hover:bg-graphite-700'
                  : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}
            >
              {speakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {speakerOn ? 'Speaker ON' : 'Muted'}
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Conversation history */}
      <GlassPanel className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-white">Grounded Telemetry Conversation</h2>
        <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto pr-2">
          <AnimatePresence initial={false}>
            {conversation.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent-500/20 text-accent-100 border border-accent-500/30'
                      : 'bg-graphite-800/90 text-gray-200 border border-graphite-700/60'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="mt-1 font-mono text-[10px] text-gray-500">
                  {msg.role === 'user' ? 'Operator' : 'TRINETRA SLM'} · {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Text query input */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask ${selectedDevice} a question... (e.g. "What is the temperature?", "Are there faults?")`}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-graphite-700 bg-graphite-900/90 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-accent-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-base-950 transition-all hover:bg-accent-400 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
