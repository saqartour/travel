const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, (_req, res) => {
  res.status(400).json({ error: 'Use POST /api/payments/booking-checkout for paid bookings' });
});

router.get('/my', authRequired, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, t.title as tour_title, t.destination, t.image_url, t.duration_days
    FROM bookings b JOIN tours t ON t.id = b.tour_id
    WHERE b.user_id = ? ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json({ bookings });
});

module.exports = router;