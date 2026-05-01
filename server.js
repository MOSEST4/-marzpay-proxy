const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const MARZPAY_BASE = 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH = 'bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';
const PROXY_SECRET = 'rutooma_agro_2025_proxy_key';

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key, Cache-Control, Pragma');
  res.header('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Auth
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-proxy-key'];
  if (key !== PROXY_SECRET) return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  next();
});

const marzHeaders = {
  'Authorization': `Basic ${MARZPAY_AUTH}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Cache-Control': 'no-cache',
};

// Health check
app.get('/health', async (_, res) => {
  try {
    const r = await axios.get('https://api.ipify.org?format=json');
    res.json({ status: 'ok', outgoing_ip: r.data.ip });
  } catch {
    res.json({ status: 'ok' });
  }
});

// Collect (deposit)
app.post('/collect', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/collect-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Withdraw
app.post('/withdraw', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/send-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Status check — no caching, always fresh
app.get('/status/:uuid', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const url = `${MARZPAY_BASE}/collect-money/${req.params.uuid}?_t=${Date.now()}`;
    const r = await axios.get(url, {
      headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' },
    });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ─── Phone Verification Routes ───────────────────────────────────────────────

// Verify phone number and get registered name
app.post('/phone-verification/verify', async (req, res) => {
  try {
    console.log('[PHONE-VERIFY] Request:', JSON.stringify(req.body, null, 2));
    const r = await axios.post(`${MARZPAY_BASE}/phone-verification/verify`, req.body, { headers: marzHeaders });
    console.log('[PHONE-VERIFY] Response:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[PHONE-VERIFY] Error:', e.message);
    if (e.response) {
      console.error('[PHONE-VERIFY] Error response:', JSON.stringify(e.response.data, null, 2));
    }
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// Get phone verification service info
app.get('/phone-verification/service-info', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/service-info`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// Check phone verification subscription status
app.get('/phone-verification/subscription-status', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/subscription-status`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// ─── Bank Transfer Routes ────────────────────────────────────────────────────

// Get list of supported banks
app.get('/bank-transfer/banks', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/banks`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Validate bank account
app.post('/bank-transfer/validate', async (req, res) => {
  try {
    console.log('[VALIDATE] Request:', JSON.stringify(req.body, null, 2));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer/validate`, req.body, { headers: marzHeaders });
    console.log('[VALIDATE] Response:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[VALIDATE] Error:', e.message);
    if (e.response) {
      console.error('[VALIDATE] Error response:', JSON.stringify(e.response.data, null, 2));
    }
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Get bank transfer service settings
app.get('/bank-transfer/services', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Create bank transfer
app.post('/bank-transfer', async (req, res) => {
  try {
    console.log('[BANK-TRANSFER] Request:', JSON.stringify(req.body, null, 2));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer`, req.body, { headers: marzHeaders });
    console.log('[BANK-TRANSFER] Response status:', r.status);
    console.log('[BANK-TRANSFER] Response data:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[BANK-TRANSFER] Error:', e.message);
    if (e.response) {
      console.error('[BANK-TRANSFER] Error response:', JSON.stringify(e.response.data, null, 2));
    }
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// Check bank transfer status
app.get('/bank-transfer/:reference', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const url = `${MARZPAY_BASE}/bank-transfer/${req.params.reference}?_t=${Date.now()}`;
    const r = await axios.get(url, {
      headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' },
    });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MarzPay proxy running on port ${PORT}`));
