const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db, generateReferralCode } = require('../db');
const { getClientIp, signToken, sanitizeUser, authRequired } = require('../middleware/auth');
const { sendMail, verificationEmail, passwordResetEmail, isSmtpConfigured } = require('../services/email');
const { authCookieOptions } = require('../utils/cookies');

const router = express.Router();

function logIp(userId, ip, action, userAgent) {
  db.prepare('INSERT INTO ip_logs (user_id, ip, action, user_agent, created_at) VALUES (?,?,?,?,?)')
    .run(userId, ip, action, userAgent || '', new Date().toISOString());
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function setVerificationCode(userId) {
  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?').run(code, expires, userId);
  return { code, expires };
}

router.post('/register', async (req, res) => {
  const { username, email, password, password_confirm, address, nationality, referral, account_type } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password_confirm && password !== password_confirm) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–24 characters (letters, numbers, underscore)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const type = ['host', 'traveler'].includes(account_type) ? account_type : 'traveler';
  const ip = getClientIp(req);
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username.toLowerCase(), email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Username or email already registered' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const referralCode = generateReferralCode();
  const now = new Date().toISOString();
  let points = type === 'host' ? 70 : 50;

  let referredBy = null;
  if (referral) {
    const referrer = db.prepare('SELECT id, referral_code FROM users WHERE referral_code = ?').get(referral.toUpperCase());
    if (referrer) {
      referredBy = referrer.referral_code;
      points += 30;
      db.prepare('UPDATE users SET points = points + 30 WHERE id = ?').run(referrer.id);
    }
  }

  const { code, expires } = { code: generateVerificationCode(), expires: new Date(Date.now() + 30 * 60 * 1000).toISOString() };

  db.prepare(`INSERT INTO users (id, username, email, password_hash, address, nationality, points, referral_code, referred_by,
    registration_ip, last_login_ip, registered_at, account_type, verification_code, verification_expires, verified_email)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, username.trim(), email.toLowerCase().trim(), hash,
    address || '', nationality || 'Georgia', points, referralCode, referredBy,
    ip, ip, now, type, code, expires, 0
  );

  logIp(id, ip, 'register', req.headers['user-agent']);

  try {
    const mail = verificationEmail(code, username);
    await sendMail({ to: email.toLowerCase().trim(), ...mail });
  } catch (e) {
    console.error('[email] Verification send failed:', e.message);
    return res.status(500).json({ error: 'Could not send verification email. Check SMTP settings.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.cookie('token', token, authCookieOptions());
  res.json({
    token,
    user: sanitizeUser(user),
    emailDelivery: isSmtpConfigured() ? 'smtp' : 'outbox',
    message: isSmtpConfigured()
      ? `📧 Verification code sent to ${email}. Check your inbox (and spam folder).`
      : `📧 Email delivery not configured. Set SMTP_PASS for saqartour@gmail.com in .env, or check server logs for your code.`
  });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Credentials required' });

  const user = db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`).get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }
  if (user.status === 'banned') return res.status(403).json({ error: 'Account has been suspended' });

  const ip = getClientIp(req);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_ip = ?, last_seen_at = ? WHERE id = ?').run(ip, now, user.id);
  logIp(user.id, ip, 'login', req.headers['user-agent']);

  const token = signToken(user);
  res.cookie('token', token, authCookieOptions());
  res.json({
    token,
    user: sanitizeUser(user),
    needsVerification: !user.verified_email
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return res.json({ user: null });
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.json({ user: null });
    res.json({ user: sanitizeUser(user) });
  } catch {
    res.json({ user: null });
  }
});

router.post('/verify-email', (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Login required' });
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const { code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified_email) return res.json({ user: sanitizeUser(user), message: 'Already verified ✅' });

  if (!code || code !== user.verification_code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }
  if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Click Resend to get a new one.' });
  }

  db.prepare('UPDATE users SET verified_email = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?').run(user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: sanitizeUser(updated), message: '🎉 Email verified! Full access unlocked.' });
});

router.post('/resend-verification', async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Login required' });
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (user.verified_email) return res.json({ message: 'Already verified' });

  const { code } = setVerificationCode(decoded.id);
  try {
    const mail = verificationEmail(code, user.username);
    await sendMail({ to: user.email, ...mail });
    res.json({
      message: isSmtpConfigured()
        ? '📧 New verification code sent to your email'
        : '📧 Code generated — check server terminal logs (SMTP not configured)',
      emailDelivery: isSmtpConfigured() ? 'smtp' : 'outbox'
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not send email. Check SMTP settings.' });
  }
});

router.get('/email-status', (_req, res) => {
  res.json({
    smtpConfigured: isSmtpConfigured(),
    smtpUser: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
    hint: isSmtpConfigured()
      ? 'Emails are sent to your real inbox'
      : 'Set SMTP_USER=saqartour@gmail.com and SMTP_PASS in .env for Gmail delivery'
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?').run(token, expires, user.id);

  try {
    const mail = passwordResetEmail(token, user.username);
    await sendMail({ to: user.email, ...mail });
  } catch (e) {
    return res.status(500).json({ error: 'Could not send reset email' });
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

router.post('/reset-password', (req, res) => {
  const { token, code, password, password_confirm } = req.body;
  const lookup = token || code;
  if (!lookup || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password_confirm && password !== password_confirm) return res.status(400).json({ error: 'Passwords do not match' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare(`SELECT * FROM users WHERE password_reset_token = ? OR password_reset_token LIKE ?`)
    .get(lookup, lookup.toLowerCase() + '%');
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
  if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
    return res.status(400).json({ error: 'Reset token expired. Request a new one.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?').run(hash, user.id);
  res.json({ message: '✅ Password reset successfully. You can now log in.' });
});

router.put('/username', authRequired, (req, res) => {
  const { username } = req.body;
  if (!username || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–24 characters (letters, numbers, underscore)' });
  }
  const taken = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(username, req.user.id);
  if (taken) return res.status(409).json({ error: 'Username already taken' });

  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const newToken = signToken(updated);
  res.cookie('token', newToken, authCookieOptions());
  res.json({ user: sanitizeUser(updated), token: newToken, message: '✏️ Username updated!' });
});

router.post('/change-password', authRequired, (req, res) => {
  const { current_password, password, password_confirm } = req.body;
  if (!current_password || !password) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (password_confirm && password !== password_confirm) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const newToken = signToken(updated);
  res.cookie('token', newToken, authCookieOptions());
  res.json({ token: newToken, message: 'Password updated successfully' });
});

router.get('/dashboard', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const bookings = db.prepare('SELECT COUNT(*) as c FROM bookings WHERE user_id = ?').get(user.id).c;
  const threads = db.prepare('SELECT COUNT(*) as c FROM threads WHERE author_id = ?').get(user.id).c;
  res.json({
    user: sanitizeUser(user),
    stats: {
      bookings,
      threads,
      points: user.points,
      wallet: user.wallet || 0,
      verified: !!user.verified_email
    }
  });
});

module.exports = router;