const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, generateReferralCode } = require('../db');
const { adminRequired, getClientIp, sanitizeUser } = require('../middleware/auth');

const router = express.Router();
router.use(adminRequired);

function audit(admin, action, targetType, targetId, details, ip) {
  db.prepare(`INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, details, ip, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(admin.id, admin.username, action, targetType, targetId, JSON.stringify(details || {}), ip, new Date().toISOString());
}

router.get('/dashboard', (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('user').c,
    verified: db.prepare('SELECT COUNT(*) as c FROM users WHERE verified_email = 1 AND role = ?').get('user').c,
    pendingThreads: db.prepare("SELECT COUNT(*) as c FROM threads WHERE status = 'pending'").get().c,
    bookings: db.prepare('SELECT COUNT(*) as c FROM bookings').get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(total_price),0) as t FROM bookings WHERE status IN ('confirmed','completed')").get().t,
    tours: db.prepare("SELECT COUNT(*) as c FROM tours WHERE status = 'active'").get().c,
    banned: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'banned'").get().c,
    todayLogins: db.prepare("SELECT COUNT(*) as c FROM ip_logs WHERE action = 'login' AND created_at >= date('now')").get().c
  };
  const recentActivity = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20').all();
  const recentLogins = db.prepare(`
    SELECT il.*, u.username, u.email FROM ip_logs il
    LEFT JOIN users u ON u.id = il.user_id
    WHERE il.action = 'login' ORDER BY il.created_at DESC LIMIT 15
  `).all();
  res.json({ stats, recentActivity, recentLogins });
});

router.get('/users', (req, res) => {
  const { search, status, role } = req.query;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (username LIKE ? OR email LIKE ? OR registration_ip LIKE ? OR last_login_ip LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY registered_at DESC';
  const users = db.prepare(sql).all(...params).map(sanitizeUser);
  res.json({ users });
});

router.get('/users/:id', (req, res) => {
  const user = sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ipHistory = db.prepare('SELECT * FROM ip_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
  const bookings = db.prepare('SELECT b.*, t.title as tour_title FROM bookings b JOIN tours t ON t.id = b.tour_id WHERE b.user_id = ? ORDER BY b.created_at DESC').all(req.params.id);
  const transactions = db.prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.params.id);
  res.json({ user, ipHistory, bookings, transactions });
});

router.post('/users', (req, res) => {
  const { username, email, password, address, nationality, role, account_type, points, wallet, verified_email, status } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Required fields missing' });

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username.toLowerCase(), email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Username or email exists' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const ip = getClientIp(req);
  db.prepare(`INSERT INTO users (id, username, email, password_hash, address, nationality, points, wallet, referral_code, role, account_type, status, verified_email, registration_ip, registered_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, username, email.toLowerCase(), hash, address || '', nationality || 'Georgia',
    points ?? 50, wallet ?? 0, generateReferralCode(), role || 'user', account_type || 'traveler', status || 'active',
    verified_email ? 1 : 0, ip, new Date().toISOString()
  );

  audit(req.user, 'create_user', 'user', id, { username, email }, ip);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

router.put('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const fields = ['username', 'email', 'address', 'nationality', 'points', 'wallet', 'verified_level', 'verified_email', 'two_factor_enabled', 'role', 'status', 'notes', 'account_type'];
  const updates = [];
  const values = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(typeof req.body[f] === 'boolean' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  if (req.body.password) {
    updates.push('password_hash = ?');
    values.push(bcrypt.hashSync(req.body.password, 10));
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  audit(req.user, 'update_user', 'user', req.params.id, req.body, getClientIp(req));
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)) });
});

router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  audit(req.user, 'delete_user', 'user', req.params.id, { username: user.username }, getClientIp(req));
  res.json({ ok: true });
});

router.get('/ip-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT il.*, u.username, u.email FROM ip_logs il
    LEFT JOIN users u ON u.id = il.user_id
    ORDER BY il.created_at DESC LIMIT 200
  `).all();
  res.json({ logs });
});

router.get('/audit', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ logs });
});

router.get('/threads/pending', (req, res) => {
  const threads = db.prepare("SELECT * FROM threads WHERE status = 'pending' ORDER BY created_at DESC").all();
  res.json({ threads });
});

router.patch('/threads/:id', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const points = status === 'approved' ? (thread.points || 10) : thread.points;
  db.prepare('UPDATE threads SET status = ?, points = ? WHERE id = ?').run(status, points, req.params.id);
  audit(req.user, `thread_${status}`, 'thread', req.params.id, { title: thread.title }, getClientIp(req));
  res.json({ thread: db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id) });
});

router.get('/tours', (req, res) => {
  res.json({ tours: db.prepare('SELECT * FROM tours ORDER BY created_at DESC').all() });
});

router.post('/tours', (req, res) => {
  const { title, slug, destination, description, duration_days, price, max_guests, rating, image_url, highlights, status } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO tours (id, title, slug, destination, description, duration_days, price, max_guests, rating, image_url, highlights, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title, slug || title.toLowerCase().replace(/\s+/g, '-'), destination, description, duration_days || 1, price, max_guests || 12, rating || 4.5, image_url || '', highlights || '', status || 'active', new Date().toISOString());
  audit(req.user, 'create_tour', 'tour', id, { title }, getClientIp(req));
  res.json({ tour: db.prepare('SELECT * FROM tours WHERE id = ?').get(id) });
});

router.put('/tours/:id', (req, res) => {
  const fields = ['title', 'slug', 'destination', 'description', 'duration_days', 'price', 'max_guests', 'rating', 'image_url', 'highlights', 'status'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  values.push(req.params.id);
  db.prepare(`UPDATE tours SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  audit(req.user, 'update_tour', 'tour', req.params.id, req.body, getClientIp(req));
  res.json({ tour: db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id) });
});

router.delete('/tours/:id', (req, res) => {
  db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id);
  audit(req.user, 'delete_tour', 'tour', req.params.id, {}, getClientIp(req));
  res.json({ ok: true });
});

router.get('/bookings', (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, t.title as tour_title, t.destination, u.username, u.email, u.registration_ip, u.last_login_ip
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    JOIN users u ON u.id = b.user_id
    ORDER BY b.created_at DESC
  `).all();
  res.json({ bookings });
});

router.patch('/bookings/:id', (req, res) => {
  const { status, notes } = req.body;
  const updates = [];
  const values = [];
  if (status) { updates.push('status = ?'); values.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  values.push(req.params.id);
  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  audit(req.user, 'update_booking', 'booking', req.params.id, req.body, getClientIp(req));
  res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) });
});

router.get('/chat', (req, res) => {
  const messages = db.prepare('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 200').all();
  res.json({ messages });
});

router.delete('/chat/:id', (req, res) => {
  db.prepare('DELETE FROM chat_messages WHERE id = ?').run(req.params.id);
  audit(req.user, 'delete_chat', 'chat', req.params.id, {}, getClientIp(req));
  res.json({ ok: true });
});

router.get('/destinations', (req, res) => {
  res.json({ destinations: db.prepare('SELECT * FROM destinations ORDER BY name').all() });
});

router.post('/destinations', (req, res) => {
  const { name, slug, country, description, image_url, highlights, best_season, status } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO destinations (id, name, slug, country, description, image_url, highlights, best_season, status) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, name, slug || name.toLowerCase().replace(/\s+/g, '-'), country || 'Georgia', description, image_url, highlights, best_season, status || 'active');
  res.json({ destination: db.prepare('SELECT * FROM destinations WHERE id = ?').get(id) });
});

router.put('/destinations/:id', (req, res) => {
  const fields = ['name', 'slug', 'country', 'description', 'image_url', 'highlights', 'best_season', 'status'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No updates' });
  values.push(req.params.id);
  db.prepare(`UPDATE destinations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ destination: db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id) });
});

router.get('/listings', (req, res) => {
  const listings = db.prepare('SELECT * FROM host_listings ORDER BY created_at DESC').all();
  res.json({ listings });
});

router.patch('/listings/:id', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE host_listings SET status = ? WHERE id = ?').run(status, req.params.id);
  audit(req.user, `listing_${status}`, 'listing', req.params.id, req.body, getClientIp(req));
  res.json({ listing: db.prepare('SELECT * FROM host_listings WHERE id = ?').get(req.params.id) });
});

router.get('/redemptions', (req, res) => {
  const redemptions = db.prepare(`
    SELECT wt.*, u.username, u.email FROM wallet_transactions wt
    JOIN users u ON u.id = wt.user_id
    WHERE wt.type = 'redeem' ORDER BY wt.created_at DESC
  `).all();
  res.json({ redemptions });
});

router.patch('/redemptions/:id', (req, res) => {
  const { status } = req.body;
  if (!['completed', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE wallet_transactions SET status = ? WHERE id = ?').run(status, req.params.id);
  audit(req.user, `redemption_${status}`, 'redemption', req.params.id, req.body, getClientIp(req));
  res.json({ ok: true });
});

module.exports = router;