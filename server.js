const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const MARZPAY_BASE  = 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH  = process.env.MARZPAY_AUTH  || 'bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';

// Accept BOTH the old key (rutooma_agro_2025_proxy_key) and the new SACCOPLUS key
// so existing installs keep working while new ones use the new key
const PROXY_KEYS    = new Set([
  process.env.PROXY_KEY || 'saccoplus_pro_2025_proxy_key',
  'rutooma_agro_2025_proxy_key',   // legacy — old app versions
  'saccoplus_pro_2025_proxy_key',  // new app versions
]);

const RELWORX_BASE  = 'https://payments.relworx.com/api';
const RELWORX_KEY   = process.env.RELWORX_API_KEY || 'e4d6b28b39d2cf.zfWf7ysq7Gyo7F3owgkSaw';

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

const relworxHeaders = () => ({
  'Accept': 'application/vnd.relworx.v2',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${RELWORX_KEY}`,
});

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
  res.json({ 
    status: 'ok', 
    service: 'SACCOPLUS Pro Proxy',
    version: '2.0.0',
    endpoints: {
      marzpay: ['collect', 'withdraw', 'status/:uuid', 'phone-verification', 'bill-payment', 'bank-transfer'],
      marzpay_airtime: ['marzpay/airtime/catalog', 'marzpay/airtime/purchase', 'marzpay/airtime/:reference'],
      relworx: ['relworx/products', 'relworx/products/price-list', 'relworx/products/validate', 'relworx/products/purchase']
    }
  });
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
// MARZPAY — Airtime & Data (NEW!)
// ════════════════════════════════════════════════════════════════════════════

app.get('/marzpay/airtime/catalog', async (req, res) => {
  try {
    console.log('[MARZ-AIRTIME] GET catalog');
    const r = await axios.get(`${MARZPAY_BASE}/airtime-data/catalog`, { headers: marzHeaders });
    console.log('[MARZ-AIRTIME] catalog response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[MARZ-AIRTIME] catalog error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/marzpay/airtime/purchase', async (req, res) => {
  try {
    console.log('[MARZ-AIRTIME] POST purchase:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/airtime-data`, req.body, { headers: marzHeaders });
    console.log('[MARZ-AIRTIME] purchase response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[MARZ-AIRTIME] purchase error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/marzpay/airtime/:reference', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/airtime-data/${req.params.reference}`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    console.error('[MARZ-AIRTIME] get by reference error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/marzpay/airtime/purchases', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/airtime-data`, { 
      headers: marzHeaders,
      params: req.query 
    });
    res.json(r.data);
  } catch (e) {
    console.error('[MARZ-AIRTIME] list purchases error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
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
// RELWORX — Airtime & Data Bundles
// ════════════════════════════════════════════════════════════════════════════

app.get('/relworx/products', async (_, res) => {
  try {
    const r = await axios.get(`${RELWORX_BASE}/products`, { headers: relworxHeaders() });
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX-PRODUCTS]', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.get('/relworx/products/price-list', async (req, res) => {
  try {
    const code = req.query.code;
    const r = await axios.get(`${RELWORX_BASE}/products/price-list?code=${code}`, { headers: relworxHeaders() });
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX-PRICELIST]', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.post('/relworx/products/validate', async (req, res) => {
  try {
    console.log('[RELWORX-VALIDATE] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${RELWORX_BASE}/products/validate`, req.body, { headers: relworxHeaders() });
    console.log('[RELWORX-VALIDATE] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX-VALIDATE]', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.post('/relworx/products/purchase', async (req, res) => {
  try {
    console.log('[RELWORX-PURCHASE] Request:', JSON.stringify(req.body));
    const r = await axios.post(`${RELWORX_BASE}/products/purchase`, req.body, { headers: relworxHeaders() });
    console.log('[RELWORX-PURCHASE] Response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX-PURCHASE]', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✓ SACCOPLUS Pro Proxy v2.0.0 running on port ${PORT}`));
