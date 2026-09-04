import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Sparkles, Loader2, Trash2, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  source?: 'web_text' | 'web_voice';
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export function ChatBot() {
  const { getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'error'>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamText]);

  const sendQuery = useCallback(async (text: string, source: 'web_text' | 'web_voice' = 'web_text') => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      source,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setStreaming(true);
    setStreamText('');

    try {
      const token = await getIdToken();

      if (!API_URL) {
        // No backend configured — show fallback
        const fallback = `TRINETRA Edge AI: I received your query "${text}". Set VITE_API_URL to connect to the TRINETRA backend.`;
        await new Promise((r) => setTimeout(r, 600));
        setStreamText('');
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: fallback, timestamp: Date.now(), source },
        ]);
        return;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, inputType: source }),
      });

      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      // Try streaming via SSE
      if (res.body && res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                accumulated += parsed.text || parsed.content || parsed.delta?.content || '';
              } catch {
                accumulated += data;
              }
            }
          }
          setStreamText(accumulated);
        }

        setStreamText('');
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: accumulated, timestamp: Date.now(), source },
          ]);
        }
      } else {
        const data = await res.json();
        const reply = data.response || data.reply || data.content || data.message || JSON.stringify(data);
        setStreamText('');
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: Date.now(), source },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setStreamText('');
    } finally {
      setStreaming(false);
    }
  }, [streaming, getIdToken]);

  const send = useCallback(() => {
    sendQuery(input, 'web_text');
  }, [input, sendQuery]);

  // Voice input using Web Speech API
  const startVoiceInput = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceStatus('listening');
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        setVoiceStatus('processing');
        sendQuery(transcript, 'web_voice');
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        setVoiceStatus('error');
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Allow mic access in browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Try again.');
          setVoiceStatus('idle');
        } else {
          setError(`Speech recognition error: ${event.error}`);
          setVoiceStatus('idle');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (voiceStatus === 'listening') setVoiceStatus('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
    }).catch(() => {
      setError('Microphone access is required. Allow mic access in browser settings.');
      setVoiceStatus('error');
    });
  }, [sendQuery, voiceStatus]);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setVoiceStatus('idle');
  }, []);

  const clearChat = () => {
    setMessages([]);
    setStreamText('');
    setError(null);
    setVoiceStatus('idle');
  };

  return (
    <div className="flex h-full flex-col" style={{ perspective: '1000px' }}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 pr-2" style={{ maxHeight: '400px' }}>
        {messages.length === 0 && !streaming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <div className="mb-4 rounded-2xl bg-accent-500/10 p-4">
              <Sparkles className="h-8 w-8 text-accent-400" />
            </div>
            <p className="text-sm font-medium text-gray-300">Ask TRINETRA anything</p>
            <p className="mt-1 text-xs text-gray-500">Cloud-powered edge intelligence assistant</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, rotateX: -8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{ transformStyle: 'preserve-3d', perspective: '600px' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent-500/15 text-accent-100 border border-accent-500/20'
                    : 'bg-graphite-800/60 text-gray-200 border border-white/[0.06]'
                }`}
              >
                {msg.role === 'assistant' && (
                  <Bot className="mb-1.5 h-3.5 w-3.5 text-accent-400/60" />
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[9px] text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  {msg.source && (
                    <span className="rounded bg-white/5 px-1 py-0.5 uppercase">
                      {msg.source === 'web_voice' ? '🎤 voice' : '⌨ text'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming indicator */}
        {streaming && streamText && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] rounded-2xl border border-accent-500/15 bg-graphite-800/60 px-4 py-3 text-sm leading-relaxed text-gray-200">
              <Bot className="mb-1.5 h-3.5 w-3.5 text-accent-400/60" />
              <div className="whitespace-pre-wrap">{streamText}</div>
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent-400 align-middle" />
            </div>
          </motion.div>
        )}

        {streaming && !streamText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-graphite-800/60 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
              <span className="text-xs text-gray-400">
                {voiceStatus === 'processing' ? 'Converting speech...' : 'Thinking...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Voice listening indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-error-500/20 bg-error-500/5 px-5 py-3">
              <div className="relative">
                <Mic className="h-5 w-5 text-error-400" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-error-400 animate-ping" />
              </div>
              <div>
                <div className="text-xs font-medium text-error-300">Listening...</div>
                <div className="text-[10px] text-error-400/60">Speak now</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mx-4 mb-2 rounded-lg border border-error-500/20 bg-error-500/5 px-3 py-2 text-xs text-error-400"
        >
          {error}
        </motion.div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-white/[0.04] bg-graphite-900/40 px-3 py-3 backdrop-blur-sm">
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-400"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {/* Voice button */}
        <button
          onClick={isRecording ? stopVoiceInput : startVoiceInput}
          disabled={streaming}
          className={`rounded-xl p-2.5 transition-all ${
            isRecording
              ? 'bg-error-500 text-white animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.4)]'
              : 'bg-graphite-800/60 text-gray-400 hover:bg-graphite-700/60 hover:text-accent-400'
          } disabled:opacity-30`}
          title={isRecording ? 'Stop recording' : 'Voice input'}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={streaming}
          className="flex-1 rounded-xl border border-white/[0.06] bg-graphite-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-accent-500/30 focus:shadow-[0_0_12px_rgba(34,211,238,0.06)] disabled:opacity-50"
          placeholder={API_URL ? 'Ask something...' : 'Configure VITE_API_URL to connect...'}
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          className="rounded-xl bg-accent-500 p-2.5 text-base-950 transition-all hover:bg-accent-400 hover:shadow-[0_0_16px_rgba(34,211,238,0.3)] disabled:opacity-30 disabled:hover:shadow-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
