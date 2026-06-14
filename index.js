require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const CALLBACK_URL = process.env.CRM_CALLBACK_URL;

if (!CALLBACK_URL) {
  console.error('❌ CRM_CALLBACK_URL env var is required');
  process.exit(1);
}

async function simulateDelivery(commId) {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  await delay(1000 + Math.random() * 2000);
  const failed = Math.random() < 0.1; // 10% fail rate

  if (failed) {
    await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
      commId,
      status: 'failed',
      reason: 'Number not reachable',
      timestamp: new Date().toISOString()
    }).catch(err => console.error('Callback error (failed):', err.message));
    return;
  }

  await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
    commId, status: 'delivered', timestamp: new Date().toISOString()
  }).catch(err => console.error('Callback error (delivered):', err.message));

  // 70% open rate
  if (Math.random() < 0.7) {
    await delay(2000 + Math.random() * 3000);
    await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
      commId, status: 'opened', timestamp: new Date().toISOString()
    }).catch(err => console.error('Callback error (opened):', err.message));

    // 40% click rate
    if (Math.random() < 0.4) {
      await delay(1000 + Math.random() * 2000);
      await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
        commId, status: 'clicked', timestamp: new Date().toISOString()
      }).catch(err => console.error('Callback error (clicked):', err.message));
    }
  }
}

app.get('/', (_, res) => res.json({ status: 'ok', service: 'Channel Service' }));
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.post('/send', async (req, res) => {
  const { communications } = req.body;

  if (!communications || !Array.isArray(communications)) {
    return res.status(400).json({ error: 'communications array required' });
  }

  // Acknowledge immediately, simulate async
  res.json({ accepted: communications.length, status: 'processing' });

  for (const comm of communications) {
    simulateDelivery(comm.commId);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`📡 Channel service running on port ${PORT}`);
});