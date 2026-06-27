const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const { sendMail, redemptionEmail } = require('../services/email');

const router = express.Router();

router.get('/balance', authRequired, (req, res) => {
  const user = db.prepare('SELECT wallet, points, verified_level FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.get('/transactions', authRequired, (req, res) => {
  const transactions = db.prepare(
    'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json({ transactions });
});

router.post('/redeem', authRequired, async (req, res) => {
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.verified_level < 2) return res.status(403).json({ error: 'Level 2 verification required' });
  if (user.wallet < amt) return res.status(400).json({ error: 'Insufficient balance' });

  const id = uuidv4();
  const bonusPoints = Math.ceil(amt / 5);
  db.prepare('UPDATE users SET wallet = wallet - ?, points = points + ? WHERE id = ?').run(amt, bonusPoints, req.user.id);
  db.prepare(`INSERT INTO wallet_transactions (id, user_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?)`)
    .run(id, req.user.id, 'redeem', -amt, 'pending', new Date().toISOString());

  try {
    const mail = redemptionEmail(amt, user);
    await sendMail({ to: user.email, ...mail });
  } catch (e) { console.error('[email] Redemption notice failed:', e.message); }

  const updated = db.prepare('SELECT wallet, points, verified_level FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...updated, bonusPoints, message: `Redemption of $${amt.toFixed(2)} submitted. Funds processed within 3–5 business days.` });
});

router.post('/verify-level', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.verified_level >= 2) return res.json({ verified_level: 2, message: 'Already Level 2' });
  if (user.points < 120) return res.status(400).json({ error: 'Need 120+ points for Level 2' });
  db.prepare('UPDATE users SET verified_level = 2 WHERE id = ?').run(req.user.id);
  res.json({ verified_level: 2, message: 'Congratulations! Level 2 verified.' });
});

router.put('/profile', authRequired, (req, res) => {
  const { address, nationality, two_factor_enabled, username } = req.body;
  const updates = [];
  const values = [];
  if (address !== undefined) { updates.push('address = ?'); values.push(address); }
  if (nationality !== undefined) { updates.push('nationality = ?'); values.push(nationality); }
  if (two_factor_enabled !== undefined) { updates.push('two_factor_enabled = ?'); values.push(two_factor_enabled ? 1 : 0); }
  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: 'Invalid username format' });
    const taken = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(username, req.user.id);
    if (taken) return res.status(409).json({ error: 'Username taken' });
    updates.push('username = ?'); values.push(username.trim());
  }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const { sanitizeUser } = require('../middleware/auth');
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

module.exports = router;