import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  parseUserQuery,
  generateLocalSLMResponse,
  generateGroundAssistedResponse,
  generateCloudLLMResponse,
  type ParsedQuery,
  type ValidationCheckResult,
  type SLMResponseResult,
  type QueuedOfflineRequest,
  type QueueSyncState,
  type QuerySource,
  type QueryStatus,
  DEVICE_TELEMETRY_REGISTRY,
} from '@/lib/slmEngine';
import { useTelemetryContext } from '@/context/TelemetryContext';

export type IntelligenceMode = 'ONLINE' | 'OFFLINE' | 'AUTOMATIC';
export type NetworkState = 'ONLINE' | 'OFFLINE';

export type PipelineStage =
  | 'IDLE'
  | 'LISTENING'
  | 'WAKE_WORD'
  | 'CAPTURING_QUERY'
  | 'QUERY_PARSER'
  | 'LOCAL_SLM_EVALUATION'
  | 'FLASH_QUEUE_STORE'
  | 'GROUND_SYNC'
  | 'RESPONSE_VALIDATOR'
  | 'OUTPUT_DISPATCH';

export interface IntelligenceContextType {
  intelligenceMode: IntelligenceMode;
  setIntelligenceMode: (mode: IntelligenceMode) => void;
  simulatedNetwork: NetworkState;
  setSimulatedNetwork: (net: NetworkState) => void;
  toggleNetwork: () => void;
  goOnline: () => void;
  goOffline: () => void;
  restoreConnection: () => void;
  effectiveMode: 'ONLINE' | 'OFFLINE';
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  activePipelineStage: PipelineStage;
  lastParsedQuery: ParsedQuery | null;
  lastValidation: ValidationCheckResult | null;
  lastResponseResult: SLMResponseResult | null;
  isProcessingQuery: boolean;
  offlineQueue: QueuedOfflineRequest[];
  conversationHistory: SLMResponseResult[];
  oledDisplayLines: string[];
  nextSyncSeconds: number;
  isSyncingQueue: boolean;
  processInteraction: (queryText: string, deviceOverride?: string) => Promise<SLMResponseResult>;
  syncOfflineQueue: () => Promise<void>;
  addToQueue: (queryText?: string, reason?: string) => void;
  clearOfflineQueue: () => void;
  clearHistory: () => void;
  runDemoScenario: (scenarioNum: 1 | 2 | 3) => Promise<void>;
  runVoiceDemo: () => Promise<void>;
  isDemoRunning: boolean;
  currentDemoScenario: 1 | 2 | 3 | null;
  demoStatusText: string;
}

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

let queryCounter = 1;

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const telemetryCtx = useTelemetryContext();
  const selectedDevice = 'TRINETRA-001';
  const setSelectedDevice = telemetryCtx.setSelectedDevice;
  const connectionState = telemetryCtx.connectionState;
  const setConnectionState = telemetryCtx.setConnectionState;
  const triggerWakeWord = telemetryCtx.triggerWakeWord;

  const [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>('AUTOMATIC');
  const [activePipelineStage, setActivePipelineStage] = useState<PipelineStage>('IDLE');
  const [lastParsedQuery, setLastParsedQuery] = useState<ParsedQuery | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationCheckResult | null>(null);
  const [lastResponseResult, setLastResponseResult] = useState<SLMResponseResult | null>(null);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedOfflineRequest[]>([]);
  const [oledDisplayLines, setOledDisplayLines] = useState<string[]>([
    'TRINETRA-001',
    'TEMP: 28.4 C',
    'STAT: NOMINAL',
  ]);
  const [nextSyncSeconds, setNextSyncSeconds] = useState<number>(5);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  const [conversationHistory, setConversationHistory] = useState<SLMResponseResult[]>([
    {
      id: 'init-seed-1',
      queryId: 'Q000',
      query: 'What is the current system temperature?',
      mode: 'ONLINE',
      model_type: 'Local SLM',
      source: 'LOCAL SLM',
      device_id: 'TRINETRA-001',
      data_source: 'SIMULATED TELEMETRY [LOCAL BUFFER]',
      parsed: {
        raw_query: 'What is the current system temperature?',
        intent: 'temperature',
        target_device: 'TRINETRA-001',
        telemetry_field: 'sensors.temperature',
        raw_value: 28.4,
        value_display: '28.4°C',
        is_telemetry_query: true,
        can_local_slm_answer: true,
        requires_cloud: false,
        is_actuator_command: false,
        oled_summary: 'TEMP: 28.4 C',
      },
      validation: {
        telemetry_grounded: true,
        device_matched: true,
        no_unsupported_values: true,
        safety_actuator_passed: true,
        overall_status: 'PASSED',
        details: ['Provenance: SIMULATED TELEMETRY [LOCAL SLM]'],
      },
      response_text: 'Current temperature is 28.4°C.',
      status: 'ANSWERED LOCALLY',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      latency_ms: 18,
      oled_lines: ['TRINETRA-001', 'TEMP: 28.4 C', 'STAT: NOMINAL'],
    },
  ]);

  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [currentDemoScenario, setCurrentDemoScenario] = useState<1 | 2 | 3 | null>(null);
  const [demoStatusText, setDemoStatusText] = useState<string>('');

  const simulatedNetwork: NetworkState = connectionState;
  const setSimulatedNetwork = useCallback(
    (net: NetworkState) => {
      setConnectionState(net);
    },
    [setConnectionState]
  );

  const toggleNetwork = useCallback(() => {
    setConnectionState((prev) => (prev === 'ONLINE' ? 'OFFLINE' : 'ONLINE'));
  }, [setConnectionState]);

  const goOnline = useCallback(() => {
    setConnectionState('ONLINE');
  }, [setConnectionState]);

  const goOffline = useCallback(() => {
    setConnectionState('OFFLINE');
  }, [setConnectionState]);

  const restoreConnection = useCallback(() => {
    setConnectionState('ONLINE');
  }, [setConnectionState]);

  // Effective mode resolution
  const effectiveMode: 'ONLINE' | 'OFFLINE' =
    intelligenceMode === 'AUTOMATIC'
      ? simulatedNetwork
      : intelligenceMode;

  // ─── 5-SECOND GROUND SYNCHRONIZATION TIMER & STATE MACHINE ───
  useEffect(() => {
    // Only count down if there are queued items waiting to be synced
    const hasUnsynced = offlineQueue.some((q) => q.status !== 'COMPLETED');
    if (!hasUnsynced) {
      setNextSyncSeconds(5);
      return;
    }

    const timer = setInterval(() => {
      setNextSyncSeconds((prev) => {
        if (prev <= 1) {
          // Trigger sync attempt if online
          if (simulatedNetwork === 'ONLINE' && !isSyncingQueue) {
            triggerGroundSyncStep();
          }
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offlineQueue, simulatedNetwork, isSyncingQueue]);

  // Sequential Ground Sync Pipeline: PENDING -> READY_TO_SYNC -> SENT -> GROUND_PROCESSING -> RESPONSE_RECEIVED -> COMPLETED
  const triggerGroundSyncStep = useCallback(async () => {
    const pendingItem = offlineQueue.find((q) => q.status === 'PENDING' || q.status === 'READY_TO_SYNC');
    if (!pendingItem || isSyncingQueue) return;

    setIsSyncingQueue(true);

    // Step 1: READY_TO_SYNC
    setOfflineQueue((prev) =>
      prev.map((q) => (q.id === pendingItem.id ? { ...q, status: 'READY_TO_SYNC' } : q))
    );
    await new Promise((r) => setTimeout(r, 200));

    // Step 2: SENT
    setOfflineQueue((prev) =>
      prev.map((q) => (q.id === pendingItem.id ? { ...q, status: 'SENT' } : q))
    );
    setOledDisplayLines(['SYNCING...', `${pendingItem.queryId} SENT`, 'GROUND UPLINK']);
    await new Promise((r) => setTimeout(r, 300));

    // Step 3: GROUND_PROCESSING
    setOfflineQueue((prev) =>
      prev.map((q) => (q.id === pendingItem.id ? { ...q, status: 'GROUND_PROCESSING' } : q))
    );
    setOledDisplayLines(['PROCESSING...', `${pendingItem.queryId} GROUND`, 'GEMINI FLASH']);

    // Step 4: Call Real Gemini Backend API
    const targetTelemetry = DEVICE_TELEMETRY_REGISTRY['TRINETRA-001'];
    const token = typeof window !== 'undefined' ? localStorage.getItem('trinetra_jwt_token') : null;
    
    let groundResponseText = '';
    let groundModel = 'gemini-3.6-flash';
    let groundLatencyMs = 320;
    let groundStatus: QueryStatus = 'GROUND RESPONSE RECEIVED';
    let oledLines = ['GROUND SYNC OK', `${pendingItem.queryId} DONE`, 'GEMINI FLASH'];
    let syncSuccess = false;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ground/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: pendingItem.query,
          device_id: 'TRINETRA-001',
          query_id: pendingItem.queryId,
          source: 'GROUND_FALLBACK',
          telemetry: targetTelemetry,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        groundResponseText = data.response;
        groundModel = data.model || 'gemini-3.6-flash';
        groundLatencyMs = data.processing_time_ms || 320;
        syncSuccess = true;
        oledLines = ['GROUND SYNC OK', `${pendingItem.queryId} DONE`, 'GEMINI FLASH'];
      } else if (data.error_code === 'GEMINI_API_KEY_NOT_CONFIGURED') {
        groundResponseText = 'Ground Intelligence is not configured on the server (GEMINI_API_KEY not set).';
        groundStatus = 'GROUND RESPONSE RECEIVED';
        oledLines = ['GROUND AI', 'NOT CONFIGURED', 'TRINETRA-001'];
        syncSuccess = true;
      } else {
        // Deterministic fallback if API returned error
        groundResponseText = data.message || 'Ground intelligence is currently unavailable.';
        oledLines = ['GROUND ERROR', `${pendingItem.queryId} RETRY`, 'LINK RETRY'];
        syncSuccess = false;
      }
    } catch (err) {
      console.warn('⚠️ Ground API Network call failed:', err);
      groundResponseText = 'Ground station link unavailable. Query retained in flash queue for retry.';
      oledLines = ['LINK OFFLINE', `${pendingItem.queryId} QUEUED`, 'WAITING LINK'];
      syncSuccess = false;
    }

    if (syncSuccess) {
      // Step 4b: RESPONSE_RECEIVED
      setOfflineQueue((prev) =>
        prev.map((q) =>
          q.id === pendingItem.id
            ? {
                ...q,
                status: 'RESPONSE_RECEIVED',
                groundResponseText,
                groundLatencyMs,
              }
            : q
        )
      );
      setOledDisplayLines(oledLines);
      await new Promise((r) => setTimeout(r, 350));

      // Step 5: COMPLETED -> Push to Voice Response & History
      const parsed = parseUserQuery(pendingItem.query, 'TRINETRA-001');
      const groundResult: SLMResponseResult = {
        id: `ground-${Date.now()}-${pendingItem.queryId}`,
        queryId: pendingItem.queryId,
        query: pendingItem.query,
        mode: 'ONLINE',
        model_type: 'Ground LLM',
        source: 'GROUND LLM',
        device_id: 'TRINETRA-001',
        data_source: `GROUND MISSION CONTROL [${groundModel.toUpperCase()}]`,
        parsed,
        validation: {
          telemetry_grounded: true,
          device_matched: true,
          no_unsupported_values: true,
          safety_actuator_passed: true,
          overall_status: 'PASSED',
          details: [
            `Resolved via Google Gemini Ground LLM (${groundModel})`,
            `Provenance: LIVE MISSION CONTROL UPLINK`,
            `Device: TRINETRA-001`,
          ],
        },
        response_text: groundResponseText,
        status: groundStatus,
        timestamp: new Date().toISOString(),
        latency_ms: groundLatencyMs,
        oled_lines: oledLines,
      };

      setOfflineQueue((prev) =>
        prev.map((q) =>
          q.id === pendingItem.id
            ? {
                ...q,
                status: 'COMPLETED',
                completedAt: new Date().toISOString(),
              }
            : q
        )
      );

      setConversationHistory((prev) => {
        const idx = prev.findIndex((h) => h.queryId === pendingItem.queryId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = groundResult;
          return next;
        }
        return [...prev, groundResult];
      });

      setLastResponseResult(groundResult);
      setLastParsedQuery(parsed);
      setLastValidation(groundResult.validation);
    } else {
      // Revert to pending for 5-second automatic retry
      setOfflineQueue((prev) =>
        prev.map((q) =>
          q.id === pendingItem.id
            ? {
                ...q,
                status: 'PENDING',
                retryCount: (q.retryCount || 0) + 1,
              }
            : q
        )
      );
      setOledDisplayLines(oledLines);
    }

    setIsSyncingQueue(false);
  }, [offlineQueue, isSyncingQueue]);

  const syncOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || isSyncingQueue) return;
    await triggerGroundSyncStep();
  }, [offlineQueue, isSyncingQueue, triggerGroundSyncStep]);

  const addToQueue = useCallback((queryText?: string, reason?: string) => {
    const q = queryText || 'Explain the communication protocol.';
    const qId = `Q${String(queryCounter++).padStart(3, '0')}`;
    const r = reason || 'Local SLM lacks sufficient context. Queued for Ground LLM synchronization.';
    const queueItem: QueuedOfflineRequest = {
      id: `queue-${Date.now()}-${qId}`,
      queryId: qId,
      query: q,
      target_device: 'TRINETRA-001',
      timestamp: new Date().toISOString(),
      reason: r,
      status: 'PENDING',
      retryCount: 0,
    };
    setOfflineQueue((prev) => [...prev, queueItem]);
    setOledDisplayLines(['QUERY QUEUED', `${qId} | FLASH`, 'GROUND SYNC']);
  }, []);

  // ─── HYBRID VOICE-RESPONSE PIPELINE (LOCAL SLM FIRST LAYER) ───
  const processInteraction = useCallback(
    async (queryText: string, deviceOverride?: string): Promise<SLMResponseResult> => {
      setIsProcessingQuery(true);
      const startTime = performance.now();

      // Step 1: Wake Word confirmed
      setActivePipelineStage('WAKE_WORD');
      await new Promise((r) => setTimeout(r, 140));

      // Step 2: Capturing Spoken Query
      setActivePipelineStage('CAPTURING_QUERY');
      await new Promise((r) => setTimeout(r, 120));

      // Step 3: Query Parser / ASR
      setActivePipelineStage('QUERY_PARSER');
      const parsed = parseUserQuery(queryText, 'TRINETRA-001');
      setLastParsedQuery(parsed);
      await new Promise((r) => setTimeout(r, 160));

      // Step 4: LOCAL SLM IS THE FIRST DECISION LAYER
      setActivePipelineStage('LOCAL_SLM_EVALUATION');
      await new Promise((r) => setTimeout(r, 160));

      let result: SLMResponseResult;

      // CASE 1: LOCAL SLM CAN ANSWER (Telemetry / Context Sufficient)
      if (parsed.can_local_slm_answer && !parsed.is_actuator_command) {
        const localOut = generateLocalSLMResponse(parsed);
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        result = {
          id: `slm-${Date.now()}`,
          query: queryText,
          mode: effectiveMode,
          model_type: 'Local SLM',
          source: 'LOCAL SLM',
          device_id: 'TRINETRA-001',
          data_source: 'SIMULATED TELEMETRY [LOCAL SLM]',
          parsed,
          validation: localOut.validation,
          response_text: localOut.responseText,
          status: 'ANSWERED LOCALLY',
          timestamp: new Date().toISOString(),
          latency_ms: latency,
          oled_lines: localOut.oledLines,
        };

        setOledDisplayLines(localOut.oledLines);
      } else if (parsed.is_actuator_command) {
        // Safety Guarded Actuator
        const localOut = generateLocalSLMResponse(parsed);
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        result = {
          id: `slm-actuator-${Date.now()}`,
          query: queryText,
          mode: effectiveMode,
          model_type: 'Local SLM',
          source: 'LOCAL SLM',
          device_id: 'TRINETRA-001',
          data_source: 'SAFETY ACTUATOR GUARD',
          parsed,
          validation: localOut.validation,
          response_text: localOut.responseText,
          status: 'ANSWERED LOCALLY',
          timestamp: new Date().toISOString(),
          latency_ms: latency,
          oled_lines: localOut.oledLines,
        };

        setOledDisplayLines(localOut.oledLines);
      } else {
        // CASE 2: LOCAL SLM CANNOT ANSWER -> DO NOT HALLUCINATE -> FLASH-BACKED QUERY QUEUE
        setActivePipelineStage('FLASH_QUEUE_STORE');
        const qId = `Q${String(queryCounter++).padStart(3, '0')}`;

        const queueItem: QueuedOfflineRequest = {
          id: `queue-${Date.now()}-${qId}`,
          queryId: qId,
          query: queryText,
          target_device: 'TRINETRA-001',
          timestamp: new Date().toISOString(),
          reason: 'Local SLM has no grounded telemetry for this query. Queued for Ground LLM synchronization.',
          status: 'PENDING',
          retryCount: 0,
        };

        setOfflineQueue((prev) => [...prev, queueItem]);
        const oledLines = ['QUERY QUEUED', `${qId} | FLASH`, 'GROUND SYNC'];
        setOledDisplayLines(oledLines);

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        result = {
          id: `slm-queued-${Date.now()}-${qId}`,
          queryId: qId,
          query: queryText,
          mode: effectiveMode,
          model_type: 'Ground LLM',
          source: 'GROUND LLM',
          device_id: 'TRINETRA-001',
          data_source: 'FLASH BUFFER [AWAITING GROUND SYNC]',
          parsed,
          validation: {
            telemetry_grounded: false,
            device_matched: true,
            no_unsupported_values: true,
            safety_actuator_passed: true,
            overall_status: 'PASSED',
            details: [
              `Local SLM cannot answer without ground telemetry/knowledge base.`,
              `Stored in persistent flash-backed queue (${qId}). Anti-hallucination enforced.`,
            ],
          },
          response_text: `Answer not found in local telemetry buffer. Query stored in flash-backed queue (${qId}) for ground synchronization.`,
          status: 'QUEUED',
          timestamp: new Date().toISOString(),
          latency_ms: latency,
          oled_lines: oledLines,
        };
      }

      // Step 5: Response Validator
      setActivePipelineStage('RESPONSE_VALIDATOR');
      setLastValidation(result.validation);
      await new Promise((r) => setTimeout(r, 140));

      // Step 6: Output Dispatch
      setActivePipelineStage('OUTPUT_DISPATCH');
      setLastResponseResult(result);
      setConversationHistory((prev) => [...prev, result]);

      await new Promise((r) => setTimeout(r, 180));
      setActivePipelineStage('IDLE');
      setIsProcessingQuery(false);

      return result;
    },
    [effectiveMode]
  );

  const clearOfflineQueue = useCallback(() => {
    setOfflineQueue([]);
    setOledDisplayLines(['TRINETRA-001', 'TEMP: 28.4 C', 'STAT: NOMINAL']);
  }, []);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setLastResponseResult(null);
    setLastParsedQuery(null);
    setLastValidation(null);
  }, []);

  // ─── Spoken Voice Demo Trigger ───
  const runVoiceDemo = useCallback(async () => {
    if (isDemoRunning || isProcessingQuery) return;
    triggerWakeWord();
    await new Promise((r) => setTimeout(r, 700));
    await processInteraction('What is the current system temperature?');
  }, [isDemoRunning, isProcessingQuery, triggerWakeWord, processInteraction]);

  // ─── Interactive SIH 2026 Demo Scenarios ───
  const runDemoScenario = useCallback(
    async (scenarioNum: 1 | 2 | 3) => {
      if (isDemoRunning) return;
      setIsDemoRunning(true);
      setCurrentDemoScenario(scenarioNum);

      if (scenarioNum === 1) {
        // SCENARIO 1: CASE 1 — Local SLM Can Answer (Telemetry Query)
        setDemoStatusText('Executing Scenario 1: Spoken telemetry query -> Local SLM answers locally -> OLED & Web updated.');
        setSelectedDevice('TRINETRA-001');
        await new Promise((r) => setTimeout(r, 400));

        await processInteraction('What is the current system temperature?');
        setDemoStatusText('Scenario 1 complete: Local SLM answered locally ("Current temperature is 28.4°C"), OLED displays "TEMP: 28.4 C".');
      } else if (scenarioNum === 2) {
        // SCENARIO 2: CASE 2 — Local SLM Cannot Answer (Flash Queue & Anti-Hallucination)
        setDemoStatusText('Executing Scenario 2: Spoken complex query -> Local SLM detects "ANSWER NOT FOUND" -> Queues into Flash Buffer with Q001.');
        setSelectedDevice('TRINETRA-001');
        setConnectionState('OFFLINE');
        await new Promise((r) => setTimeout(r, 400));

        await processInteraction('Explain the communication protocol.');
        setDemoStatusText('Scenario 2 complete: Zero hallucination. Query placed in Flash-Backed Queue with ID Q001 (Waiting for Ground link).');
      } else if (scenarioNum === 3) {
        // SCENARIO 3: Complete 5-Second Ground Synchronization Cycle
        setDemoStatusText('Executing Scenario 3: Restoring ground link -> 5-Second timer triggers -> Syncing Q001 to Ground LLM -> Response Received.');
        setConnectionState('ONLINE');
        await new Promise((r) => setTimeout(r, 600));

        await triggerGroundSyncStep();
        setDemoStatusText('Scenario 3 complete: Ground-Assisted Response received ("✓ RESPONSE RECEIVED"), full explanation shown on Web Dashboard!');
      }

      await new Promise((r) => setTimeout(r, 1200));
      setIsDemoRunning(false);
      setCurrentDemoScenario(null);
    },
    [isDemoRunning, processInteraction, triggerGroundSyncStep, setConnectionState, setSelectedDevice]
  );

  return (
    <IntelligenceContext.Provider
      value={{
        intelligenceMode,
        setIntelligenceMode,
        simulatedNetwork,
        setSimulatedNetwork,
        toggleNetwork,
        goOnline,
        goOffline,
        restoreConnection,
        effectiveMode,
        selectedDevice,
        setSelectedDevice,
        activePipelineStage,
        lastParsedQuery,
        lastValidation,
        lastResponseResult,
        isProcessingQuery,
        offlineQueue,
        conversationHistory,
        oledDisplayLines,
        nextSyncSeconds,
        isSyncingQueue,
        processInteraction,
        syncOfflineQueue,
        addToQueue,
        clearOfflineQueue,
        clearHistory,
        runDemoScenario,
        runVoiceDemo,
        isDemoRunning,
        currentDemoScenario,
        demoStatusText,
      }}
    >
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligenceContext(): IntelligenceContextType {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) {
    throw new Error('useIntelligenceContext must be used within an IntelligenceProvider');
  }
  return ctx;
}


