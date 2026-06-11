require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Environment Variables ────────────────────────────────────────────────────
const MARZPAY_BASE_URL = process.env.MARZPAY_BASE_URL || 'https://wallet.wearemarz.com/api/v1';
const MARZPAY_AUTH = process.env.MARZPAY_AUTH || 'bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';
const PROXY_KEY = process.env.PROXY_KEY || 'saccoplus_pro_2025_proxy_key';

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Proxy key validation
const validateProxyKey = (req, res, next) => {
  // Skip validation for health check
  if (req.path === '/') {
    return next();
  }
  
  const key = req.headers['x-proxy-key'];
  if (key !== PROXY_KEY) {
    return res.status(403).json({ error: 'Invalid proxy key' });
  }
  next();
};

app.use(validateProxyKey);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'SACCOPLUS Pro Proxy',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      marzpay: ['collect', 'withdraw', 'status/:uuid', 'bill-payment', 'bank-transfer', 'phone-verification'],
      marzpay_airtime: ['airtime/catalog', 'airtime/purchase', 'airtime/:reference', 'airtime/purchases']
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── Mobile Money: Collect ────────────────────────────────────────────────────
app.post('/collect', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/collect`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Mobile Money: Withdraw ───────────────────────────────────────────────────
app.post('/withdraw', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/withdraw`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Mobile Money: Check Status ───────────────────────────────────────────────
app.get('/status/:uuid', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/status/${req.params.uuid}`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Phone Verification ───────────────────────────────────────────────────────
app.post('/phone-verification/verify', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/phone-verification/verify`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/phone-verification/service-info', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/phone-verification/service-info`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Bill Payments ────────────────────────────────────────────────────────────
app.post('/bill-payment', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/bill-payment`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/bill-payment/verify', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/bill-payment/verify`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/bill-payment/services', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/bill-payment/services`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Bank Transfer ────────────────────────────────────────────────────────────
app.get('/bank-transfer/banks', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/bank-transfer/banks`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/bank-transfer/validate', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/bank-transfer/validate`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/bank-transfer', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/bank-transfer`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/bank-transfer/:reference', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/bank-transfer/${req.params.reference}`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// MARZPAY AIRTIME & DATA ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── Get Catalog ──────────────────────────────────────────────────────────────
app.get('/marzpay/airtime/catalog', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/airtime-data/catalog`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Purchase Airtime or Bundle ───────────────────────────────────────────────
app.post('/marzpay/airtime/purchase', async (req, res) => {
  try {
    const response = await axios.post(`${MARZPAY_BASE_URL}/airtime-data`, req.body, {
      headers: {
        'Authorization': `Basic ${MARZPAY_AUTH}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Get Purchase by Reference ────────────────────────────────────────────────
app.get('/marzpay/airtime/:reference', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/airtime-data/${req.params.reference}`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── List Purchases ───────────────────────────────────────────────────────────
app.get('/marzpay/airtime/purchases', async (req, res) => {
  try {
    const response = await axios.get(`${MARZPAY_BASE_URL}/airtime-data`, {
      headers: { 'Authorization': `Basic ${MARZPAY_AUTH}` },
      params: req.query
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✓ SACCOPLUS Pro Proxy running on port ${PORT}`);
  console.log(`✓ MarzPay Base URL: ${MARZPAY_BASE_URL}`);
  console.log(`✓ Ready to process payments & airtime`);
});
