const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const { getCountry, FORUM_SUBCATEGORIES } = require('../data/regions');

const router = express.Router();

function requireVerified(req, res, next) {
  const user = db.prepare('SELECT verified_email FROM users WHERE id = ?').get(req.user.id);
  if (!user?.verified_email) return res.status(403).json({ error: '✉️ Verify your email to use the forum' });
  next();
}

router.get('/meta', (_req, res) => {
  res.json({ subcategories: FORUM_SUBCATEGORIES });
});

router.get('/threads', (req, res) => {
  const { country, city, subcategory, sort } = req.query;
  let sql = "SELECT * FROM threads WHERE status = 'approved'";
  const params = [];
  if (country && country !== 'all') { sql += ' AND country = ?'; params.push(country); }
  if (city && city !== 'all') { sql += ' AND city = ?'; params.push(city); }
  if (subcategory && subcategory !== 'all') { sql += ' AND subcategory = ?'; params.push(subcategory); }

  let threads = db.prepare(sql).all(...params);
  if (sort === 'points') threads.sort((a, b) => (b.points || 0) - (a.points || 0));
  else if (sort === 'comments') threads.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
  else threads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  threads = threads.map(t => {
    const c = getCountry(t.country);
    const sub = FORUM_SUBCATEGORIES.find(s => s.id === t.subcategory);
    return { ...t, country_name: c?.name, country_flag: c?.flag, subcategory_label: sub?.label, subcategory_emoji: sub?.emoji };
  });

  res.json({ threads });
});

router.get('/threads/:id', (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const comments = db.prepare('SELECT * FROM thread_comments WHERE thread_id = ? ORDER BY created_at ASC').all(req.params.id);
  const c = getCountry(thread.country);
  const sub = FORUM_SUBCATEGORIES.find(s => s.id === thread.subcategory);
  res.json({ thread: { ...thread, country_name: c?.name, country_flag: c?.flag, subcategory_label: sub?.label, subcategory_emoji: sub?.emoji }, comments });
});

router.post('/threads', authRequired, requireVerified, (req, res) => {
  const { title, country, city, subcategory, body } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  if (!country || !city) return res.status(400).json({ error: 'Country and city required' });

  const user = db.prepare('SELECT username, account_type FROM users WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  db.prepare(`INSERT INTO threads (id, title, category, body, author_id, author_name, country, city, subcategory, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title, subcategory || 'general', body || '', req.user.id, user?.username || 'user', country, city, subcategory || 'general', 'pending', new Date().toISOString());

  res.json({ thread: db.prepare('SELECT * FROM threads WHERE id = ?').get(id) });
});

router.post('/threads/:id/comments', authRequired, requireVerified, (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Comment required' });

  const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
  const id = uuidv4();
  db.prepare(`INSERT INTO thread_comments (id, thread_id, author_id, author_name, body, created_at) VALUES (?,?,?,?,?,?)`)
    .run(id, req.params.id, req.user.id, user?.username || 'user', body, new Date().toISOString());

  db.prepare('UPDATE threads SET comment_count = comment_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ comment: db.prepare('SELECT * FROM thread_comments WHERE id = ?').get(id) });
});

module.exports = router;