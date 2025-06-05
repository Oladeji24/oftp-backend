// User authentication routes and logic
// Handles registration and login for demo mode

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const router = express.Router();

// Wallet Audit Log: logs all wallet-related actions (deposit, withdraw, trade, profit, etc.)
const logWalletAudit = async (username, action, amount, meta = {}) => {
  try {
    await pool.query(
      'INSERT INTO wallet_audit_logs (username, action, amount, meta) VALUES ($1, $2, $3, $4)',
      [username, action, amount, JSON.stringify(meta)]
    );
  } catch (err) {
    // Optionally log error
    console.error('Audit log error:', err.message);
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user with default balance
    const result = await pool.query(
      'INSERT INTO users (username, password, balance) VALUES ($1, $2, $3) RETURNING id, username, balance',
      [username, hashedPassword, 10000] // Start with demo balance
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    // Create JWT token
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, balance: user.balance } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Deposit funds (demo mode)
router.post('/deposit', async (req, res) => {
  const { username, amount } = req.body;
  if (!username || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Valid username and amount are required.' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE username = $2 RETURNING id, username, balance',
      [amount, username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // Log transaction after deposit
    await pool.query(
      'INSERT INTO transactions (username, type, amount) VALUES ($1, $2, $3)',
      [username, 'deposit', amount]
    );
    // Wallet audit log
    await logWalletAudit(username, 'deposit', amount, { source: 'paystack' });
    res.json({ user: result.rows[0], message: 'Deposit successful.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Withdraw funds (demo mode)
router.post('/withdraw', async (req, res) => {
  const { username, amount } = req.body;
  if (!username || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Valid username and amount are required.' });
  }
  try {
    // Check current balance
    const userResult = await pool.query('SELECT balance FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const currentBalance = parseFloat(userResult.rows[0].balance);
    if (currentBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance.' });
    }
    const result = await pool.query(
      'UPDATE users SET balance = balance - $1 WHERE username = $2 RETURNING id, username, balance',
      [amount, username]
    );
    // Log transaction after withdrawal
    await pool.query(
      'INSERT INTO transactions (username, type, amount) VALUES ($1, $2, $3)',
      [username, 'withdraw', amount]
    );
    // Wallet audit log
    await logWalletAudit(username, 'withdraw', amount, {});
    res.json({ user: result.rows[0], message: 'Withdrawal successful.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get transaction history for a user
router.post('/transactions', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }
  try {
    const result = await pool.query(
      'SELECT type, amount, date FROM transactions WHERE username = $1 ORDER BY date DESC LIMIT 20',
      [username]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get wallet audit logs for a user
router.post('/audit-logs', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }
  try {
    const result = await pool.query(
      'SELECT action, amount, meta, created_at FROM wallet_audit_logs WHERE username = $1 ORDER BY created_at DESC LIMIT 30',
      [username]
    );
    // Parse meta JSON for each log
    const logs = result.rows.map(log => ({ ...log, meta: log.meta || {} }));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Export logWalletAudit for use in other modules
module.exports = router;
module.exports.logWalletAudit = logWalletAudit;
