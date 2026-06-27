const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const { chatChannelId, getCountry } = require('../data/regions');
const { getIO, chatRoom } = require('../socket');

const router = express.Router();

function requireVerified(req, res, next) {
  const user = db.prepare('SELECT verified_email FROM users WHERE id = ?').get(req.user.id);
  if (!user?.verified_email) return res.status(403).json({ error: '✉️ Verify your email to use live chat' });
  next();
}

router.get('/messages', (req, res) => {
  const { country, city } = req.query;
  let sql = `SELECT cm.*, u.account_type
    FROM chat_messages cm
    LEFT JOIN users u ON cm.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (country) { sql += ' AND cm.country = ?'; params.push(country); }
  if (city) {
    sql += ' AND cm.city = ?';
    params.push(city);
  } else if (country) {
    sql += ' AND (cm.city IS NULL OR cm.city = \'\')';
  }
  sql += ' ORDER BY cm.created_at ASC LIMIT 2000';

  const messages = db.prepare(sql).all(...params).map(m => {
    const c = getCountry(m.country);
    return { ...m, country_flag: c?.flag, country_name: c?.name };
  });
  res.json({ messages });
});

router.post('/messages', authRequired, requireVerified, (req, res) => {
  const { message, country, city } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  if (!country) return res.status(400).json({ error: 'Select a country channel' });

  const user = db.prepare('SELECT username, account_type FROM users WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  const channel = chatChannelId(country, city);
  const now = new Date().toISOString();
  const badge = user?.account_type === 'host' ? '🏠' : '🧳';

  const cityVal = city && String(city).trim() ? String(city).trim() : null;
  db.prepare(`INSERT INTO chat_messages (id, user_id, username, message, category, country, city, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, user?.username || 'user', message.trim(), channel, country, cityVal, now);

  const c = getCountry(country);
  const payload = {
    id, user_id: req.user.id, username: user?.username || 'user',
    message: message.trim(), country, city: cityVal,
    account_type: user?.account_type, created_at: now
  };

  const io = getIO();
  if (io) io.to(chatRoom(country, cityVal || '')).emit('new_message', payload);

  res.json({ message: { ...payload, country_flag: c?.flag, account_badge: badge } });
});

module.exports = router;