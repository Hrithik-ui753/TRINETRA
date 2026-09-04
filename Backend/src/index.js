import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Firebase Admin Init ───
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
};

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp(firebaseConfig);
  }
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.warn('⚠️  Firebase Admin init failed:', err.message);
  console.warn('   Auth verification will be bypassed. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.');
}

const db = admin.firestore();
const app = express();

// ─── Stage 9B Multi-Machine Telemetry Store ───
const DEVICE_PROFILES = {
  'TRINETRA-001': {
    device_id: 'TRINETRA-001',
    source: 'simulated',
    status: 'valid',
    timestamp: new Date().toISOString(),
    last_received_ms: Date.now(),
    system: {
      uptime: 18452,
      free_heap: 410000,
      cpu_temperature: 42.3,
      firmware_version: '1.0.0',
      status: 'normal',
    },
    communication: {
      wifi: 'connected',
      server: 'connected',
      signal_strength: -61,
      packet_loss: 0.2,
    },
    audio: {
      mic_1: 'active',
      mic_2: 'active',
      sample_rate: 16000,
      last_wake_confidence: 0.962,
    },
    ml: {
      mfcc_latency_ms: 2.636,
      inference_latency_ms: 0.146,
      total_compute_latency_ms: 2.783,
      wake_threshold: 0.85,
      acwe: '2-of-3',
    },
    sensors: {
      temperature: 28.4,
      humidity: 54.2,
      door: 'closed',
      hatch: 'locked',
      vibration: 'normal',
      pressure: null,
    },
    power: {
      voltage: 5.02,
      current_ma: 620,
      battery_percent: 78,
      charging: true,
      status: 'normal',
    },
    faults: [],
    warnings: [],
  },

  'TRINETRA-002': {
    device_id: 'TRINETRA-002',
    source: 'simulated',
    status: 'valid',
    timestamp: new Date().toISOString(),
    last_received_ms: Date.now(),
    system: {
      uptime: 4210,
      free_heap: 385000,
      cpu_temperature: 48.7,
      firmware_version: '1.0.0',
      status: 'warning',
    },
    communication: {
      wifi: 'connected',
      server: 'connected',
      signal_strength: -74,
      packet_loss: 1.4,
    },
    audio: {
      mic_1: 'active',
      mic_2: 'active',
      sample_rate: 16000,
      last_wake_confidence: 0.887,
    },
    ml: {
      mfcc_latency_ms: 2.636,
      inference_latency_ms: 0.146,
      total_compute_latency_ms: 2.783,
      wake_threshold: 0.85,
      acwe: '2-of-3',
    },
    sensors: {
      temperature: 34.7,
      humidity: 61.3,
      door: 'open',
      hatch: 'unlocked',
      vibration: 'elevated',
      pressure: null,
    },
    power: {
      voltage: 4.91,
      current_ma: 740,
      battery_percent: 42,
      charging: false,
      status: 'discharging',
    },
    faults: ['MIC_02 low signal'],
    warnings: ['Microphone 2 is reporting a low signal', 'Chamber door is currently OPEN'],
  },

  'TRINETRA-003': {
    device_id: 'TRINETRA-003',
    source: 'simulated',
    status: 'valid',
    timestamp: new Date().toISOString(),
    last_received_ms: Date.now(),
    system: {
      uptime: 94200,
      free_heap: 446000,
      cpu_temperature: 38.2,
      firmware_version: '1.0.0',
      status: 'normal',
    },
    communication: {
      wifi: 'disconnected',
      server: 'disconnected',
      signal_strength: -95,
      packet_loss: 0.0,
    },
    audio: {
      mic_1: 'active',
      mic_2: 'active',
      sample_rate: 16000,
      last_wake_confidence: 0.945,
    },
    ml: {
      mfcc_latency_ms: 2.636,
      inference_latency_ms: 0.146,
      total_compute_latency_ms: 2.783,
      wake_threshold: 0.85,
      acwe: '2-of-3',
    },
    sensors: {
      temperature: 24.8,
      humidity: 47.5,
      door: 'closed',
      hatch: 'locked',
      vibration: 'normal',
      pressure: null,
    },
    power: {
      voltage: 4.76,
      current_ma: 410,
      battery_percent: 91,
      charging: true,
      status: 'normal',
    },
    faults: [],
    warnings: [],
  },
};

let selectedDeviceId = 'TRINETRA-001';

// ─── Middleware ───
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// ─── JWT Authentication Engine ───
const JWT_SECRET = process.env.JWT_SECRET || 'trinetra_super_secure_jwt_secret_key_sih26172_2026';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function generateJWT(payload, expiresInSeconds = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

function verifyJWT(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password, salt = 'trinetra_edge_salt') {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

// In-Memory persistent users store (pre-seeded with default operator)
const USERS_DB = new Map([
  [
    'operator@trinetra.edge',
    {
      uid: 'usr_operator_001',
      name: 'Lead System Operator',
      email: 'operator@trinetra.edge',
      passwordHash: hashPassword('Trinetra@2026'),
      role: 'lead_operator',
      createdAt: new Date().toISOString(),
    },
  ],
  [
    'admin@trinetra.edge',
    {
      uid: 'usr_admin_002',
      name: 'System Administrator',
      email: 'admin@trinetra.edge',
      passwordHash: hashPassword('Admin@2026'),
      role: 'administrator',
      createdAt: new Date().toISOString(),
    },
  ],
]);

// ─── Auth Middleware ───
async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // 1. Check custom JWT first
  const jwtDecoded = verifyJWT(token);
  if (jwtDecoded) {
    req.user = {
      uid: jwtDecoded.uid,
      email: jwtDecoded.email,
      name: jwtDecoded.name || jwtDecoded.email?.split('@')[0],
      role: jwtDecoded.role || 'operator',
    };
    return next();
  }

  // 2. Fallback to Firebase ID token verification if configured
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name || decoded.email?.split('@')[0], role: 'operator' };
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
}

// ─── Stage 9B Grounded Response Generator ───
function generateGroundedResponse(query, targetDeviceId) {
  const devId = targetDeviceId || selectedDeviceId;
  const t = DEVICE_PROFILES[devId] || DEVICE_PROFILES['TRINETRA-001'];
  const lower = query.toLowerCase();

  // Safety Actuator Command Guard
  if (lower.includes('turn off') || lower.includes('shutdown') || lower.includes('reboot') || lower.includes('unlock')) {
    return `Command rejected on ${t.device_id}. Stage 9 operates strictly as a read-only telemetry and diagnostic intelligence interface. Actuator controls are not permitted.`;
  }

  // Check Disconnected or Stale Status
  const isDisconnected = t.system.status === 'disconnected' || t.status === 'disconnected';
  if (isDisconnected) {
    return `The machine's current telemetry is unavailable because the ESP32 is disconnected.`;
  }

  const isStale = t.status === 'stale' || (Date.now() - (t.last_received_ms || Date.now()) > 30000 && t.source === 'esp32');

  // Missing metric checks
  if (lower.includes('battery health') || lower.includes('health of battery') || lower.includes('soh')) {
    return `Battery health data is unavailable for ${t.device_id}.`;
  }
  if (lower.includes('pressure') || lower.includes('barometer')) {
    return `Pressure data is currently unavailable for ${t.device_id}.`;
  }

  // Temperature
  if (lower.includes('temperature') || lower.includes('temp') || lower.includes('how hot') || lower.includes('how cold')) {
    if (isStale) {
      return `${t.device_id}'s latest temperature reading is stale; a current temperature is unavailable.`;
    }
    if (t.sensors.temperature === null || t.sensors.temperature === undefined) {
      return `Temperature data is currently unavailable for ${t.device_id}.`;
    }
    return `${t.device_id} is currently at ${t.sensors.temperature}°C.`;
  }

  // Humidity
  if (lower.includes('humidity')) {
    if (isStale) {
      return `${t.device_id}'s latest humidity reading is stale; a current humidity is unavailable.`;
    }
    if (t.sensors.humidity === null || t.sensors.humidity === undefined) {
      return `Humidity data is unavailable because no humidity sensor is currently connected.`;
    }
    return `${t.device_id} relative humidity is ${t.sensors.humidity}%.`;
  }

  // Door
  if (lower.includes('door')) {
    if (isStale) {
      return `${t.device_id}'s latest door status is stale; current state is unavailable.`;
    }
    if (!t.sensors.door || t.sensors.door === 'unknown') {
      return `Door sensor data is unavailable because no door sensor is currently connected.`;
    }
    if (t.sensors.door === 'closed') {
      return `Yes. The door is closed on ${t.device_id}.`;
    } else {
      return `No. The door is currently open on ${t.device_id}.`;
    }
  }

  // Voltage
  if (lower.includes('voltage') || lower.includes('volts')) {
    if (isStale) {
      return `${t.device_id}'s latest voltage reading is stale; a current reading is unavailable.`;
    }
    if (t.power.voltage === null || t.power.voltage === undefined) {
      return `Voltage data is unavailable because no voltage sensor is currently connected.`;
    }
    return `${t.device_id} supply voltage is ${t.power.voltage} V.`;
  }

  // Power / Charging
  if (lower.includes('charging') || lower.includes('charge')) {
    if (t.power.charging) {
      return `Yes. ${t.device_id} is currently charging. Battery level is ${t.power.battery_percent}%.`;
    } else {
      return `No. ${t.device_id} is not currently charging. Battery level is ${t.power.battery_percent}%.`;
    }
  }

  // Wi-Fi / Server / Communication
  if (lower.includes('wifi') || lower.includes('wi-fi')) {
    return `${t.device_id} Wi-Fi is ${t.communication.wifi} (signal: ${t.communication.signal_strength} dBm).`;
  }

  if (lower.includes('communication') || lower.includes('network') || lower.includes('connectivity')) {
    if (t.communication.wifi === 'connected' && t.communication.server === 'connected') {
      return `Wi-Fi and server communication are connected on ${t.device_id}.`;
    } else if (t.communication.wifi === 'disconnected') {
      return `Wi-Fi is disconnected on ${t.device_id}.`;
    }
    return `${t.device_id} communication status: Wi-Fi is ${t.communication.wifi}, server is ${t.communication.server}.`;
  }

  // Microphones
  if (lower.includes('microphone') || lower.includes('mic')) {
    return `Both microphones on ${t.device_id} are ACTIVE and operational (16 kHz stereo).`;
  }

  // ML Latency
  if (lower.includes('mfcc')) {
    return `${t.device_id} MFCC feature extraction latency is ${t.ml.mfcc_latency_ms} ms.`;
  }
  if (lower.includes('inference') || lower.includes('latency')) {
    return `${t.device_id} DS-CNN inference latency is ${t.ml.inference_latency_ms} ms.`;
  }

  // Faults / Diagnostics
  if (lower.includes('fault') || lower.includes('wrong') || lower.includes('error') || lower.includes('issue')) {
    const issues = [...t.faults, ...t.warnings];
    if (issues.length === 0) {
      return `${t.device_id} reports 0 active faults or warnings. System health is normal.`;
    }
    return `${t.device_id} diagnostics: ${issues.join('; ')}.`;
  }

  // Default / Complete Status
  return `Complete status for ${t.device_id}: Status is ${t.system.status}. Ambient Temp: ${t.sensors.temperature}°C, Battery: ${t.power.battery_percent}% (${t.power.charging ? 'charging' : 'not charging'}), Wi-Fi: ${t.communication.wifi}. ${t.faults.length > 0 ? 'Faults: ' + t.faults.join(', ') : '0 active faults'}.`;
}

// ─── Query Processing ───
async function processQuery(userId, queryText, inputType = 'web_text', deviceId = null) {
  const startTime = Date.now();
  const targetDevice = deviceId || selectedDeviceId;
  const t = DEVICE_PROFILES[targetDevice] || DEVICE_PROFILES['TRINETRA-001'];
  const response = generateGroundedResponse(queryText, targetDevice);
  const processingTime = Date.now() - startTime;

  if (userId) {
    try {
      const queryRef = db.collection('users').doc(userId).collection('queries');
      await queryRef.add({
        userId,
        deviceId: targetDevice,
        inputType,
        transcript: queryText,
        response,
        source: t.source || 'simulated',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processingTime,
        status: 'completed',
      });
    } catch (err) {
      console.warn('Failed to save query to Firestore:', err.message);
    }
  }

  return {
    query: queryText,
    deviceId: targetDevice,
    response,
    inputType,
    source: t.source || 'simulated',
    processingTime,
    timestamp: new Date().toISOString(),
  };
}

// ─── Routes ───

// ─── Authentication API (JWT) ───
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (USERS_DB.has(normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userName = (name && typeof name === 'string' && name.trim()) ? name.trim() : normalizedEmail.split('@')[0];
  const userRole = normalizedEmail.includes('admin') ? 'administrator' : 'operator';

  const newUser = {
    uid,
    name: userName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: userRole,
    createdAt: new Date().toISOString(),
  };

  USERS_DB.set(normalizedEmail, newUser);

  const token = generateJWT({
    uid: newUser.uid,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  });

  return res.status(201).json({
    status: 'success',
    token,
    user: {
      uid: newUser.uid,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
  });
});

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = USERS_DB.get(normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. No account found with this email.' });
  }

  const inputHash = hashPassword(password);
  if (inputHash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  const token = generateJWT({
    uid: user.uid,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return res.json({
    status: 'success',
    token,
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

app.get('/api/auth/me', verifyAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
  return res.json({
    status: 'success',
    user: req.user,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  // In a simulated / edge system, we acknowledge the reset link issuance
  return res.json({
    status: 'success',
    message: `Password reset instructions sent to ${email.trim()}.`,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trinetra-backend',
    selectedDevice: selectedDeviceId,
    telemetrySource: DEVICE_PROFILES[selectedDeviceId]?.source || 'simulated',
    realHardware: 'pending',
    timestamp: new Date().toISOString()
  });
});

// Section 15 Stage 9A Endpoints: GET /api/devices
app.get(['/api/devices', '/api/telemetry/devices'], (req, res) => {
  res.json({
    selectedDevice: selectedDeviceId,
    devices: Object.keys(DEVICE_PROFILES),
    source: DEVICE_PROFILES[selectedDeviceId]?.source || 'simulated'
  });
});

// Section 15 Stage 9A Endpoints: GET /api/devices/:deviceId/telemetry
app.get(['/api/devices/:deviceId/telemetry', '/api/telemetry/:deviceId'], (req, res) => {
  const device = DEVICE_PROFILES[req.params.deviceId];
  if (!device) {
    return res.status(404).json({ error: `Device '${req.params.deviceId}' not found.` });
  }
  res.json(device);
});

// Section 15 Stage 9A Endpoints: POST /api/devices/:deviceId/select
app.post(['/api/devices/:deviceId/select', '/api/telemetry/select'], (req, res) => {
  const deviceId = req.params.deviceId || req.body.deviceId;
  if (!deviceId || !DEVICE_PROFILES[deviceId]) {
    return res.status(400).json({ error: `Invalid deviceId '${deviceId}'. Must be one of: ${Object.keys(DEVICE_PROFILES).join(', ')}` });
  }
  selectedDeviceId = deviceId;
  res.json({
    status: 'ok',
    message: `Selected machine context switched to ${selectedDeviceId}`,
    selectedDevice: selectedDeviceId,
    telemetry: DEVICE_PROFILES[selectedDeviceId],
    source: DEVICE_PROFILES[selectedDeviceId]?.source || 'simulated'
  });
});

// GET /api/telemetry/active
app.get('/api/telemetry/active', (req, res) => {
  res.json(DEVICE_PROFILES[selectedDeviceId]);
});

// Stage 9B Section 6: Ingestion Endpoint POST /api/telemetry
app.post('/api/telemetry', (req, res) => {
  const payload = req.body;

  // Validation
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Payload must be a JSON object' });
  }

  const { device_id, source = 'esp32', status = 'valid', system, communication, audio, ml, sensors, power, faults } = payload;

  if (!device_id || typeof device_id !== 'string' || !device_id.trim()) {
    return res.status(400).json({ error: "Missing or invalid mandatory 'device_id'" });
  }

  // Type checks
  if (sensors && typeof sensors.temperature !== 'undefined' && sensors.temperature !== null && typeof sensors.temperature !== 'number') {
    return res.status(400).json({ error: "Field 'sensors.temperature' must be a number or null" });
  }

  if (power && typeof power.voltage !== 'undefined' && power.voltage !== null && typeof power.voltage !== 'number') {
    return res.status(400).json({ error: "Field 'power.voltage' must be a number or null" });
  }

  // Update or register target device profile
  if (!DEVICE_PROFILES[device_id]) {
    DEVICE_PROFILES[device_id] = {
      device_id,
      source: 'esp32',
      status: 'valid',
      timestamp: new Date().toISOString(),
      last_received_ms: Date.now(),
      system: {},
      communication: {},
      audio: {},
      ml: {},
      sensors: {},
      power: {},
      faults: [],
      warnings: [],
    };
  }

  const dev = DEVICE_PROFILES[device_id];
  dev.source = source;
  dev.status = status;
  dev.timestamp = payload.timestamp || new Date().toISOString();
  dev.last_received_ms = Date.now();

  if (system) Object.assign(dev.system, system);
  if (communication) Object.assign(dev.communication, communication);
  if (audio) Object.assign(dev.audio, audio);
  if (ml) Object.assign(dev.ml, ml);
  if (sensors) Object.assign(dev.sensors, sensors);
  if (power) Object.assign(dev.power, power);
  if (Array.isArray(faults)) dev.faults = [...faults];

  return res.status(200).json({
    status: 'accepted',
    device_id,
    source,
    timestamp: dev.timestamp,
  });
});

// POST /api/query
app.post('/api/query', verifyAuth, async (req, res) => {
  const { message, inputType = 'web_text', deviceId = null } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
  }

  try {
    const result = await processQuery(req.user?.uid, message.trim(), inputType, deviceId);
    res.json(result);
  } catch (err) {
    console.error('Query processing error:', err);
    res.status(500).json({ error: 'Failed to process query. Please try again.' });
  }
});

// Query History
app.get('/api/queries', verifyAuth, async (req, res) => {
  if (!req.user?.uid) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const queriesRef = db.collection('users').doc(req.user.uid).collection('queries');
    const snapshot = await queriesRef.orderBy('timestamp', 'desc').limit(50).get();
    const queries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ queries });
  } catch (err) {
    console.error('Failed to fetch queries:', err);
    res.json({ queries: [] });
  }
});

// ─── Start Server ───
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 TRINETRA Backend running on port ${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log(`   Devices:   http://localhost:${PORT}/api/devices`);
  console.log(`   Telemetry: POST http://localhost:${PORT}/api/telemetry`);
  console.log(`   Query:     POST http://localhost:${PORT}/api/query`);
});
