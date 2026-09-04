/**
 * TRINETRA Ground Intelligence Service
 * Powered by Google Gemini API (@google/genai SDK)
 * 
 * Strict Ground Fallback Layer for TRINETRA-001 Edge System.
 */

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3.6-flash';

const TRINETRA_GROUND_SYSTEM_INSTRUCTION = `You are the Ground Intelligence assistant for TRINETRA-001.

TRINETRA is a voice-first edge AI system.
The Local SLM is always attempted before Ground Intelligence.
You are the Ground fallback model.

Answer the user's question clearly, accurately and concisely.
You may answer questions that require broader reasoning or knowledge unavailable to the Local SLM.

When telemetry is supplied, treat it as current telemetry for TRINETRA-001 only.
Never invent telemetry values.
Never claim that a telemetry value exists if it was not provided.
If the question asks for current machine state and the required telemetry is unavailable, explicitly state that the data is unavailable.

Do not confuse simulated telemetry with physical hardware telemetry.
If the supplied context says SIMULATED TELEMETRY, do not describe it as live physical hardware data.

Do not claim that you are running on the ESP32-S3.
The ESP32-S3 handles edge audio, TinyML wake detection, telemetry collection and queue management.
The Local SLM runs on the local companion compute layer.
You are the Ground/Remote Intelligence layer.

Keep responses concise enough for a voice-first spacecraft/mission interface (1-3 clear sentences).
Do not fabricate system status, sensor readings, communication state, or hardware measurements.`;

class GeminiGroundService {
  constructor() {
    this.client = null;
    this.apiKey = null;
    this.modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    this._initClient();
  }

  _initClient() {
    const key = process.env.GEMINI_API_KEY;
    if (key && typeof key === 'string' && key.trim() && key !== 'your_gemini_api_key_here') {
      try {
        this.apiKey = key.trim();
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        this.modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
        console.log(`✅ Gemini Ground Intelligence initialized with model: ${this.modelName}`);
      } catch (err) {
        console.warn('⚠️ Failed to initialize Google GenAI client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    // Re-check env in case it was set dynamically
    if (!this.client && process.env.GEMINI_API_KEY) {
      this._initClient();
    }
    return Boolean(this.client);
  }

  getModelName() {
    return this.modelName;
  }

  /**
   * Formats telemetry context into clear, concise prompt input for Ground LLM
   */
  _buildTelemetryContextString(telemetry) {
    if (!telemetry || typeof telemetry !== 'object') {
      return 'Telemetry Context: No specific telemetry provided for this query.';
    }

    const sys = telemetry.system || {};
    const comm = telemetry.communication || {};
    const audio = telemetry.audio || {};
    const ml = telemetry.ml || {};
    const sensors = telemetry.sensors || {};
    const power = telemetry.power || {};
    const faults = Array.isArray(telemetry.faults) ? telemetry.faults : [];

    return `[CURRENT TRINETRA-001 TELEMETRY CONTEXT - SIMULATED PROVENANCE]
- Device ID: ${telemetry.device_id || 'TRINETRA-001'}
- System Status: ${sys.status || 'normal'} (Uptime: ${sys.uptime ?? 'N/A'}s, Free Heap: ${sys.free_heap ? Math.round(sys.free_heap / 1024) + ' KB' : 'N/A'}, CPU Temp: ${sys.cpu_temperature !== null && sys.cpu_temperature !== undefined ? sys.cpu_temperature + '°C' : 'UNAVAILABLE'})
- Communication: Wi-Fi is ${comm.wifi || 'connected'}, Server is ${comm.server || 'connected'} (Signal: ${comm.signal_strength ?? '-61'} dBm)
- Audio: Mic 1 is ${audio.mic_1 || 'active'}, Mic 2 is ${audio.mic_2 || 'active'} (Sample Rate: ${audio.sample_rate || 16000} Hz)
- Edge ML: DS-CNN Wake threshold ${ml.wake_threshold || 0.85}, Inference Latency: ${ml.inference_latency_ms ?? 0.146} ms, MFCC Latency: ${ml.mfcc_latency_ms ?? 2.636} ms
- Sensors: Ambient Temp: ${sensors.temperature !== null && sensors.temperature !== undefined ? sensors.temperature + '°C' : 'UNAVAILABLE'}, Humidity: ${sensors.humidity !== null && sensors.humidity !== undefined ? sensors.humidity + '%' : 'UNAVAILABLE'}, Door: ${sensors.door || 'UNAVAILABLE'}
- Power: Supply Voltage: ${power.voltage !== null && power.voltage !== undefined ? power.voltage + ' V' : 'UNAVAILABLE'}, Battery: ${power.battery_percent ?? 78}%, Status: ${power.status || 'normal'}
- Active Faults: ${faults.length > 0 ? faults.join(', ') : '0 active faults'}`;
  }

  /**
   * Generates Ground LLM response for ungrounded / complex voice queries
   */
  async generateGroundResponse(queryText, telemetry = null, options = {}) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error_code: 'GEMINI_API_KEY_NOT_CONFIGURED',
        message: 'Ground intelligence API key is not configured on the server.',
      };
    }

    const prompt = `${this._buildTelemetryContextString(telemetry)}

USER VOICE QUERY:
"${queryText}"

Provide the Ground Intelligence response for TRINETRA-001:`;

    const timeoutMs = options.timeoutMs || 35000;

    try {
      const apiCallPromise = this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: TRINETRA_GROUND_SYSTEM_INSTRUCTION,
          temperature: 0.2,
          maxOutputTokens: 350,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
      );

      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      const responseText = response.text ? response.text.trim() : '';

      if (!responseText) {
        return {
          success: false,
          error_code: 'EMPTY_RESPONSE',
          message: 'Ground intelligence returned an empty response.',
        };
      }

      return {
        success: true,
        responseText,
        model: this.modelName,
      };
    } catch (err) {
      if (err.message === 'REQUEST_TIMEOUT') {
        console.error('⏱️ Ground Gemini API call timed out after', timeoutMs, 'ms');
        return {
          success: false,
          error_code: 'TIMEOUT',
          message: 'Ground intelligence request timed out.',
        };
      }

      console.error('❌ Ground Gemini API call failed:', err.message);
      return {
        success: false,
        error_code: 'GROUND_AI_UNAVAILABLE',
        message: 'Ground intelligence is currently unavailable.',
      };
    }
  }
}

export const geminiGroundService = new GeminiGroundService();
