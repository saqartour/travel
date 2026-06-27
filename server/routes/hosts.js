const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function requireHost(req, res, next) {
  const user = db.prepare('SELECT account_type, verified_email FROM users WHERE id = ?').get(req.user.id);
  if (!user?.verified_email) return res.status(403).json({ error: 'Verify email to manage listings' });
  if (user.account_type !== 'host') return res.status(403).json({ error: 'Host account required' });
  next();
}

router.get('/listings', (req, res) => {
  const { country, city, type } = req.query;
  let sql = "SELECT * FROM host_listings WHERE status = 'approved'";
  const params = [];
  if (country) { sql += ' AND country = ?'; params.push(country); }
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';
  res.json({ listings: db.prepare(sql).all(...params) });
});

router.get('/my-listings', authRequired, requireHost, (req, res) => {
  const listings = db.prepare('SELECT * FROM host_listings WHERE host_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ listings });
});

router.post('/listings', authRequired, requireHost, (req, res) => {
  const { type, title, description, country, city, price, price_unit, image_url, contact_email, contact_phone } = req.body;
  if (!type || !title || !country || !city || !price) {
    return res.status(400).json({ error: 'Type, title, country, city, and price are required' });
  }
  if (!['hotel', 'car_rental', 'tour', 'experience'].includes(type)) {
    return res.status(400).json({ error: 'Invalid listing type' });
  }

  const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  db.prepare(`INSERT INTO host_listings (id, host_id, host_name, type, title, description, country, city, price, price_unit, image_url, contact_email, contact_phone, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, user.username, type, title, description || '', country, city, parseFloat(price), price_unit || 'night', image_url || '', contact_email || user.email, contact_phone || '', 'pending', new Date().toISOString());

  res.json({ listing: db.prepare('SELECT * FROM host_listings WHERE id = ?').get(id) });
});

router.put('/listings/:id', authRequired, requireHost, (req, res) => {
  const listing = db.prepare('SELECT * FROM host_listings WHERE id = ? AND host_id = ?').get(req.params.id, req.user.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const fields = ['title', 'description', 'country', 'city', 'price', 'price_unit', 'image_url', 'contact_email', 'contact_phone', 'type'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (updates.length) {
    updates.push("status = 'pending'");
    values.push(req.params.id);
    db.prepare(`UPDATE host_listings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json({ listing: db.prepare('SELECT * FROM host_listings WHERE id = ?').get(req.params.id) });
});

router.delete('/listings/:id', authRequired, requireHost, (req, res) => {
  const result = db.prepare('DELETE FROM host_listings WHERE id = ? AND host_id = ?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Listing not found' });
  res.json({ ok: true });
});

module.exports = router;