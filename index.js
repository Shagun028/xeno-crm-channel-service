require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const CALLBACK_URL = process.env.CRM_CALLBACK_URL;

// Simulate delivery lifecycle for one communication
async function simulateDelivery(commId) {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Always: delivered or failed
  await delay(1000 + Math.random() * 2000);
  const failed = Math.random() < 0.1; // 10% fail rate

  if (failed) {
    await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
      commId,
      status: 'failed',
      reason: 'Number not reachable',
      timestamp: new Date().toISOString()
    }).catch(() => {});
    return;
  }

  await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
    commId, status: 'delivered', timestamp: new Date().toISOString()
  }).catch(() => {});

  // 70% open
  if (Math.random() < 0.7) {
    await delay(2000 + Math.random() * 3000);
    await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
      commId, status: 'opened', timestamp: new Date().toISOString()
    }).catch(() => {});

    // 40% click
    if (Math.random() < 0.4) {
      await delay(1000 + Math.random() * 2000);
      await axios.post(`${CALLBACK_URL}/api/callbacks/receipt`, {
        commId, status: 'clicked', timestamp: new Date().toISOString()
      }).catch(() => {});
    }
  }
}

app.post('/send', async (req, res) => {
  const { communications } = req.body; // array of { commId, recipient, message, channel }

  if (!communications || !Array.isArray(communications)) {
    return res.status(400).json({ error: 'communications array required' });
  }

  // Acknowledge immediately
  res.json({ accepted: communications.length, status: 'processing' });

  // Fire async simulation for each
  for (const comm of communications) {
    simulateDelivery(comm.commId);
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT, () => {
  console.log(`📡 Channel service running on port ${process.env.PORT}`);
});