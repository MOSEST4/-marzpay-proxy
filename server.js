const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const MARZPAY_BASE  = 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH  = process.env.MARZPAY_AUTH; // set in Render environment variables
const GROQ_API_KEY  = process.env.GROQ_API_KEY; // set in Render environment variables

// Accept BOTH the old key (rutooma_agro_2025_proxy_key) and the new SACCOPLUS key
// so existing installs keep working while new ones use the new key
const PROXY_KEYS    = new Set([
  process.env.PROXY_KEY || 'saccoplus_pro_2025_proxy_key',
  'rutooma_agro_2025_proxy_key',   // legacy — old app versions
  'saccoplus_pro_2025_proxy_key',  // new app versions
]);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key, Cache-Control, Pragma');
  res.header('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  // Skip auth for health check and root
  if (req.path === '/health' || req.path === '/') return next();
  
  const key = req.headers['x-proxy-key'];
  if (!PROXY_KEYS.has(key)) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }
  next();
});

// ── Shared headers ────────────────────────────────────────────────────────────
const marzHeaders = {
  'Authorization': `Basic ${MARZPAY_AUTH}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Cache-Control': 'no-cache',
};

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_, res) => {
  try {
    const r = await axios.get('https://api.ipify.org?format=json');
    res.json({ status: 'ok', service: 'SACCOPLUS Pro Proxy', outgoing_ip: r.data.ip });
  } catch {
    res.json({ status: 'ok', service: 'SACCOPLUS Pro Proxy' });
  }
});

app.get('/', (_, res) => {
  res.json({ status: 'ok', service: 'SACCOPLUS Pro Proxy v2.0.0' });
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY — Mobile Money
// ════════════════════════════════════════════════════════════════════════════

// Collect (deposit) — MarzPay endpoint is /collect-money
app.post('/collect', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/collect-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    console.error('[COLLECT]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Withdraw — MarzPay endpoint is /send-money
app.post('/withdraw', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/send-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    console.error('[WITHDRAW]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Status check — MarzPay endpoint is /collect-money/:uuid
app.get('/status/:uuid', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const url = `${MARZPAY_BASE}/collect-money/${req.params.uuid}?_t=${Date.now()}`;
    const r = await axios.get(url, { headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' } });
    res.json(r.data);
  } catch (e) {
    console.error('[STATUS]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY — Phone Verification
// ════════════════════════════════════════════════════════════════════════════

app.post('/phone-verification/verify', async (req, res) => {
  try {
    console.log('[PHONE-VERIFY] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/phone-verification/verify`, req.body, { headers: marzHeaders });
    console.log('[PHONE-VERIFY] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[PHONE-VERIFY]', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.get('/phone-verification/service-info', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/service-info`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.get('/phone-verification/subscription-status', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/subscription-status`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY — Bill Payments
// ════════════════════════════════════════════════════════════════════════════

app.get('/bill-payment/services', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/nwsc/areas', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/nwsc/areas`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/dstv/bouquet-codes', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/dstv/bouquet-codes`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/gotv/bouquet-codes', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/gotv/bouquet-codes`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bill-payment/verify', async (req, res) => {
  try {
    console.log('[BILL-VERIFY] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/bill-payment/verify`, req.body, { headers: marzHeaders });
    console.log('[BILL-VERIFY] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BILL-VERIFY]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bill-payment', async (req, res) => {
  try {
    console.log('[BILL-PAY] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/bill-payment`, req.body, { headers: marzHeaders });
    console.log('[BILL-PAY] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BILL-PAY]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/:reference', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/${req.params.reference}`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY — Bank Transfer
// ════════════════════════════════════════════════════════════════════════════

app.get('/bank-transfer/banks', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/banks`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bank-transfer/validate', async (req, res) => {
  try {
    console.log('[BANK-VALIDATE] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer/validate`, req.body, { headers: marzHeaders });
    console.log('[BANK-VALIDATE] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BANK-VALIDATE]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bank-transfer/services', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bank-transfer', async (req, res) => {
  try {
    console.log('[BANK-TRANSFER] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer`, req.body, { headers: marzHeaders });
    console.log('[BANK-TRANSFER] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[BANK-TRANSFER]', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bank-transfer/:reference', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const url = `${MARZPAY_BASE}/bank-transfer/${req.params.reference}?_t=${Date.now()}`;
    const r = await axios.get(url, { headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' } });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY — Airtime & Data Bundles (MTN, Airtel, Lyca Uganda)
// Proxy path: /marzpay/airtime/*  →  MarzPay /api/v1/airtime-data/*
// ════════════════════════════════════════════════════════════════════════════

// GET /marzpay/airtime/catalog  →  GET /airtime-data/catalog
app.get('/marzpay/airtime/catalog', async (_, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/airtime-data/catalog`, { headers: marzHeaders });
    console.log('[AIRTIME-CATALOG] status:', r.data?.status);
    res.json(r.data);
  } catch (e) {
    console.error('[AIRTIME-CATALOG]', e.message, e.response?.data);
    res.status(e.response?.status ?? 502).json(
      e.response?.data ?? { status: 'error', message: e.message }
    );
  }
});

// POST /marzpay/airtime/purchase  →  POST /airtime-data
app.post('/marzpay/airtime/purchase', async (req, res) => {
  try {
    console.log('[AIRTIME-PURCHASE] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/airtime-data`, req.body, { headers: marzHeaders });
    console.log('[AIRTIME-PURCHASE] Response status:', r.status, '| data status:', r.data?.status);
    // MarzPay returns 202 for pending Airtel data bundles — forward the real HTTP status
    res.status(r.status).json(r.data);
  } catch (e) {
    console.error('[AIRTIME-PURCHASE]', e.message, e.response?.data);
    res.status(e.response?.status ?? 502).json(
      e.response?.data ?? { status: 'error', message: e.message }
    );
  }
});

// GET /marzpay/airtime/status/:reference  →  GET /airtime-data/:reference
// Used for polling pending Airtel data bundles
app.get('/marzpay/airtime/status/:reference', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const url = `${MARZPAY_BASE}/airtime-data/${req.params.reference}?_t=${Date.now()}`;
    const r = await axios.get(url, { headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' } });
    console.log('[AIRTIME-STATUS]', req.params.reference, '→', r.data?.data?.status);
    res.json(r.data);
  } catch (e) {
    console.error('[AIRTIME-STATUS]', e.message, e.response?.data);
    res.status(e.response?.status ?? 502).json(
      e.response?.data ?? { status: 'error', message: e.message }
    );
  }
});

// GET /marzpay/airtime/detect-network  →  GET /airtime-data/detect-network?msisdn=...
app.get('/marzpay/airtime/detect-network', async (req, res) => {
  try {
    const msisdn = req.query.msisdn;
    const r = await axios.get(`${MARZPAY_BASE}/airtime-data/detect-network?msisdn=${msisdn}`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    console.error('[AIRTIME-DETECT-NETWORK]', e.message, e.response?.data);
    res.status(e.response?.status ?? 502).json(
      e.response?.data ?? { status: 'error', message: e.message }
    );
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AI CHAT — Groq (llama-3.3-70b-versatile)
// POST /ai/chat  { messages: [{role, content}] }
// ════════════════════════════════════════════════════════════════════════════

const GROQ_BASE = 'https://api.groq.com/openai/v1';

const SACCO_SYSTEM_PROMPT = `You are SACCOPLUS AI Assistant, a helpful financial assistant for SACCOPLUS Pro — a SACCO (Savings and Credit Cooperative) fintech platform in Uganda.

You help members with:
- Understanding their wallet, savings, shares, and fixed deposits
- Loan applications, eligibility, and repayment guidance
- Mobile money (MoMo) deposits and withdrawals
- Airtime & data bundle purchases (MTN, Airtel, Lyca Uganda)
- Bill payments (UMEME electricity, NWSC water, DStv, GOtv, StarTimes)
- Bank transfers
- General SACCO financial literacy and advice

SACCOPLUS Pro key features:
- Wallet: deposit via MTN/Airtel MoMo, withdraw to mobile money
- Savings: Voluntary and Compulsory savings accounts
- Shares: purchase cooperative shares
- Fixed Deposits: earn interest on locked savings
- Loans: apply, track, and repay SACCO loans
- Airtime & Data: buy for MTN, Airtel, Lyca Uganda
- Bill Pay: UMEME, NWSC, DStv, GOtv, StarTimes
- Bank Transfer: send to any Ugandan bank

Currency: Ugandan Shillings (UGX). Always be friendly, concise, and practical. If you don't know something specific about the member's account, encourage them to check the relevant screen in the app.`;

app.post('/ai/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const r = await axios.post(
      `${GROQ_BASE}/chat/completions`,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SACCO_SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = r.data.choices?.[0]?.message?.content ?? '';
    res.json({ reply });
  } catch (e) {
    console.error('[AI-CHAT]', e.message, e.response?.data);
    res.status(e.response?.status ?? 502).json({
      error: e.response?.data?.error?.message ?? e.message,
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// Fail fast if required secrets are missing
const REQUIRED_ENV = ['MARZPAY_AUTH', 'GROQ_API_KEY', 'PROXY_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`✗ Missing required environment variables: ${missing.join(', ')}`);
  console.error('  Set them in Render → Environment → Environment Variables');
  process.exit(1);
}

app.listen(PORT, () => console.log(`✓ SACCOPLUS Pro Proxy v2.0.0 running on port ${PORT}`));
