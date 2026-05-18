const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const MARZPAY_BASE  = 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH  = 'bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';
const PROXY_SECRET  = 'rutooma_agro_2025_proxy_key';

const RELWORX_BASE  = 'https://payments.relworx.com/api';
const RELWORX_KEY   = process.env.RELWORX_API_KEY || 'fa5bc086ef97db.RFg3yY3XNHUo27d1lhTXZA';

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Key, Cache-Control, Pragma');
  res.header('Cache-Control', 'no-store, no-cache');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
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

const relworxHeaders = () => ({
  'Accept': 'application/vnd.relworx.v2',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${RELWORX_KEY}`,
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_, res) => {
  try {
    const r = await axios.get('https://api.ipify.org?format=json');
    res.json({ status: 'ok', outgoing_ip: r.data.ip });
  } catch {
    res.json({ status: 'ok' });
  }
});

// ─── MarzPay: Collect (deposit) ───────────────────────────────────────────────
app.post('/collect', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/collect-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ─── MarzPay: Withdraw ────────────────────────────────────────────────────────
app.post('/withdraw', async (req, res) => {
  try {
    const r = await axios.post(`${MARZPAY_BASE}/send-money`, req.body, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ─── MarzPay: Status check ────────────────────────────────────────────────────
app.get('/status/:uuid', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const url = `${MARZPAY_BASE}/collect-money/${req.params.uuid}?_t=${Date.now()}`;
    const r = await axios.get(url, { headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' } });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ─── Phone Verification ───────────────────────────────────────────────────────
app.post('/phone-verification/verify', async (req, res) => {
  try {
    console.log('[PHONE-VERIFY] Request:', JSON.stringify(req.body, null, 2));
    const r = await axios.post(`${MARZPAY_BASE}/phone-verification/verify`, req.body, { headers: marzHeaders });
    console.log('[PHONE-VERIFY] Response:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[PHONE-VERIFY] Error:', e.message);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.get('/phone-verification/service-info', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/service-info`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

app.get('/phone-verification/subscription-status', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/phone-verification/subscription-status`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// ─── Bill Payment ─────────────────────────────────────────────────────────────
app.get('/bill-payment/services', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/nwsc/areas', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/nwsc/areas`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/dstv/bouquet-codes', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bill-payment/dstv/bouquet-codes`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bill-payment/gotv/bouquet-codes', async (req, res) => {
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
    console.error('[BILL-VERIFY] Error:', e.message, e.response?.data);
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
    console.error('[BILL-PAY] Error:', e.message, e.response?.data);
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

// ─── Bank Transfer ────────────────────────────────────────────────────────────
app.get('/bank-transfer/banks', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/banks`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bank-transfer/validate', async (req, res) => {
  try {
    console.log('[VALIDATE] Request body:', JSON.stringify(req.body));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer/validate`, req.body, { headers: marzHeaders });
    console.log('[VALIDATE] Response:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[VALIDATE] Error:', e.message);
    if (e.response) return res.json(e.response.data);
    res.json({ status: 'error', message: e.message });
  }
});

app.get('/bank-transfer/services', async (req, res) => {
  try {
    const r = await axios.get(`${MARZPAY_BASE}/bank-transfer/services`, { headers: marzHeaders });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.post('/bank-transfer', async (req, res) => {
  try {
    console.log('[BANK-TRANSFER] Request:', JSON.stringify(req.body, null, 2));
    const r = await axios.post(`${MARZPAY_BASE}/bank-transfer`, req.body, { headers: marzHeaders });
    console.log('[BANK-TRANSFER] Response:', JSON.stringify(r.data, null, 2));
    res.json(r.data);
  } catch (e) {
    console.error('[BANK-TRANSFER] Error:', e.message);
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

app.get('/bank-transfer/:reference', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const url = `${MARZPAY_BASE}/bank-transfer/${req.params.reference}?_t=${Date.now()}`;
    const r = await axios.get(url, { headers: { ...marzHeaders, 'Cache-Control': 'no-cache, no-store' } });
    res.json(r.data);
  } catch (e) {
    res.json(e.response?.data ?? { status: 'error', message: e.message });
  }
});

// ─── Relworx: Airtime & Data Bundles ─────────────────────────────────────────

// GET /relworx/products — list all available products
app.get('/relworx/products', async (req, res) => {
  try {
    console.log('[RELWORX] GET products');
    const r = await axios.get(`${RELWORX_BASE}/products`, { headers: relworxHeaders() });
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX] products error:', e.message);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// GET /relworx/products/:code/price_list — bundle packages for a product
app.get('/relworx/products/:code/price_list', async (req, res) => {
  try {
    console.log('[RELWORX] GET price_list for', req.params.code);
    const r = await axios.get(`${RELWORX_BASE}/products/${req.params.code}/price_list`, { headers: relworxHeaders() });
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX] price_list error:', e.message);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// POST /relworx/products/validate — validate phone/product before purchase
app.post('/relworx/products/validate', async (req, res) => {
  try {
    console.log('[RELWORX] POST validate:', JSON.stringify(req.body));
    const r = await axios.post(`${RELWORX_BASE}/products/validate`, req.body, { headers: relworxHeaders() });
    console.log('[RELWORX] validate response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX] validate error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// POST /relworx/products/purchase — buy airtime or data bundle
app.post('/relworx/products/purchase', async (req, res) => {
  try {
    console.log('[RELWORX] POST purchase:', JSON.stringify(req.body));
    const r = await axios.post(`${RELWORX_BASE}/products/purchase`, req.body, { headers: relworxHeaders() });
    console.log('[RELWORX] purchase response:', JSON.stringify(r.data));
    res.json(r.data);
  } catch (e) {
    console.error('[RELWORX] purchase error:', e.message, e.response?.data);
    res.json(e.response?.data ?? { success: false, message: e.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
