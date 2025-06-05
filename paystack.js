// Paystack integration for deposit initialization and verification
const express = require('express');
const axios = require('axios');
const pool = require('./db');
const { logWalletAudit } = require('./auth'); // Reuse audit log

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize deposit (get payment link)
router.post('/initialize', async (req, res) => {
  const { email, amount, username } = req.body;
  if (!email || !amount || !username) {
    return res.status(400).json({ message: 'Email, amount, and username required.' });
  }
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      { email, amount: Math.round(amount * 100), metadata: { username } },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Paystack init error', error: err.message });
  }
});

// Verify deposit after payment
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const data = response.data.data;
    if (data.status === 'success') {
      // Credit user wallet if not already credited
      const username = data.metadata.username;
      const amount = data.amount / 100;
      // Check if already credited (idempotency)
      const exists = await pool.query(
        'SELECT 1 FROM wallet_audit_logs WHERE meta->>\'paystack_ref\' = $1',
        [reference]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          'UPDATE users SET balance = balance + $1 WHERE username = $2',
          [amount, username]
        );
        await logWalletAudit(username, 'deposit', amount, { paystack_ref: reference });
      }
      res.json({ success: true, credited: exists.rows.length === 0 });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Paystack verify error', error: err.message });
  }
});

module.exports = router;
