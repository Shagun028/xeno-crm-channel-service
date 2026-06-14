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

const seedDatabase = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

  if (count > 0) {
    console.log("DB already seeded");
    return;
  }

  console.log("Seeding database...");

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, email, phone, city, total_spent, order_count, last_order_date, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_id, amount, product, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const customers = [
    { name: 'Aditi Sharma', email: 'aditi@gmail.com', phone: '+919876543210', city: 'Mumbai', tags: 'vip,frequent' },
    { name: 'Rahul Mehta', email: 'rahul@gmail.com', phone: '+919876543211', city: 'Delhi', tags: 'new' },
    { name: 'Priya Nair', email: 'priya@gmail.com', phone: '+919876543212', city: 'Bangalore', tags: 'vip' },
  ];

  const products = ['Silk Kurta', 'Sneakers', 'Denim Jacket'];

  const uuid = require('uuid').v4;

  for (const c of customers) {
    const id = uuid();
    const orderCount = Math.floor(Math.random() * 3) + 1;

    let total = 0;
    let lastDate = new Date().toISOString();

    insertCustomer.run(
      id,
      c.name,
      c.email,
      c.phone,
      c.city,
      total,
      orderCount,
      lastDate,
      c.tags
    );

    for (let i = 0; i < orderCount; i++) {
      const amount = Math.floor(Math.random() * 4000) + 500;
      total += amount;

      insertOrder.run(
        uuid(),
        id,
        amount,
        products[Math.floor(Math.random() * products.length)],
        'fashion',
        new Date().toISOString()
      );
    }
  }

  console.log("✅ Seed complete");
};


app.listen(process.env.PORT, () => {
  console.log(`📡 Channel service running on port ${process.env.PORT}`);
});