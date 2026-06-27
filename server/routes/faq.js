const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  let sql = "SELECT * FROM faqs WHERE status = 'active'";
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY sort_order ASC';
  res.json({ faqs: db.prepare(sql).all(...params) });
});

module.exports = router;