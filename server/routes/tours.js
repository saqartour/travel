const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { destination, search } = req.query;
  let sql = "SELECT * FROM tours WHERE status = 'active'";
  const params = [];
  if (destination) { sql += ' AND destination = ?'; params.push(destination); }
  if (search) { sql += ' AND (title LIKE ? OR description LIKE ? OR destination LIKE ?)'; const q = `%${search}%`; params.push(q, q, q); }
  sql += ' ORDER BY rating DESC, price ASC';
  res.json({ tours: db.prepare(sql).all(...params) });
});

router.get('/destinations', (_req, res) => {
  res.json({ destinations: db.prepare("SELECT * FROM destinations WHERE status = 'active' ORDER BY name").all() });
});

router.get('/:slug', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE slug = ? OR id = ?').get(req.params.slug, req.params.slug);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json({ tour });
});

module.exports = router;