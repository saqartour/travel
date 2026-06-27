const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authRequired } = require('../middleware/auth');
const { createCheckoutSession, isConfigured, getStripe } = require('../services/stripe');
const { sendMail, bookingConfirmationEmail } = require('../services/email');

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

router.get('/config', (_req, res) => {
  res.json({
    stripeEnabled: isConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
  });
});

router.post('/wallet-checkout', authRequired, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!amount || amount < 1) return res.status(400).json({ error: 'Minimum top-up is $1' });

  const user = db.prepare('SELECT email, username FROM users WHERE id = ?').get(req.user.id);
  const paymentId = uuidv4();

  try {
    const session = await createCheckoutSession({
      amount,
      customerEmail: user.email,
      metadata: {
        type: 'wallet_topup',
        user_id: req.user.id,
        payment_id: paymentId,
        amount: String(amount),
        product_name: 'Saqartour Wallet Top-Up',
        description: `Add $${amount.toFixed(2)} to wallet`
      },
      successUrl: `${APP_URL}/?payment=wallet_success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP_URL}/?payment=cancelled`
    });

    db.prepare(`INSERT INTO payment_records (id, user_id, stripe_session_id, type, amount, status, metadata, created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(paymentId, req.user.id, session.id, 'wallet_topup', amount, 'pending', JSON.stringify({ amount }), new Date().toISOString());

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/booking-checkout', authRequired, async (req, res) => {
  const { tour_id, guests, travel_date } = req.body;
  if (!tour_id) return res.status(400).json({ error: 'Tour required' });

  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tour_id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });

  const user = db.prepare('SELECT email, username FROM users WHERE id = ?').get(req.user.id);
  const guestCount = Math.max(1, parseInt(guests) || 1);
  const total = tour.price * guestCount;
  const bookingId = uuidv4();
  const paymentId = uuidv4();

  db.prepare(`INSERT INTO bookings (id, tour_id, user_id, guests, total_price, travel_date, status, payment_status, created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(bookingId, tour_id, req.user.id, guestCount, total, travel_date || null, 'pending', 'unpaid', new Date().toISOString());

  try {
    const session = await createCheckoutSession({
      amount: total,
      customerEmail: user.email,
      metadata: {
        type: 'booking',
        user_id: req.user.id,
        booking_id: bookingId,
        payment_id: paymentId,
        tour_id,
        product_name: tour.title,
        description: `${guestCount} guest(s) — ${travel_date || 'Date TBD'}`
      },
      successUrl: `${APP_URL}/?payment=booking_success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP_URL}/?payment=cancelled`
    });

    db.prepare('UPDATE bookings SET stripe_session_id = ? WHERE id = ?').run(session.id, bookingId);
    db.prepare(`INSERT INTO payment_records (id, user_id, stripe_session_id, type, amount, status, metadata, created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(paymentId, req.user.id, session.id, 'booking', total, 'pending', JSON.stringify({ booking_id: bookingId, tour_id }), new Date().toISOString());

    res.json({ url: session.url, sessionId: session.id, bookingId });
  } catch (e) {
    db.prepare('DELETE FROM bookings WHERE id = ?').run(bookingId);
    res.status(500).json({ error: e.message });
  }
});

async function handleWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(400).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      event = JSON.parse(req.body.toString());
    } else {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};
    const now = new Date().toISOString();

    db.prepare(`UPDATE payment_records SET status = 'completed', completed_at = ? WHERE stripe_session_id = ?`)
      .run(now, session.id);

    if (meta.type === 'wallet_topup') {
      const amount = parseFloat(meta.amount || session.amount_total / 100);
      db.prepare('UPDATE users SET wallet = wallet + ? WHERE id = ?').run(amount, meta.user_id);
      db.prepare(`INSERT INTO wallet_transactions (id, user_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?)`)
        .run(uuidv4(), meta.user_id, 'topup_stripe', amount, 'completed', now);
    }

    if (meta.type === 'booking') {
      db.prepare(`UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = ?`).run(meta.booking_id);
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(meta.booking_id);
      const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(meta.tour_id);
      const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(meta.user_id);
      if (booking && tour && user) {
        const mail = bookingConfirmationEmail(booking, tour, user);
        sendMail({ to: user.email, ...mail }).catch(console.error);
      }
    }
  }

  res.json({ received: true });
}

router.get('/verify-session/:sessionId', authRequired, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status !== 'paid') return res.json({ paid: false });

    const record = db.prepare('SELECT * FROM payment_records WHERE stripe_session_id = ? AND user_id = ?')
      .get(req.params.sessionId, req.user.id);

    if (record && record.status === 'pending') {
      const meta = session.metadata || {};
      const now = new Date().toISOString();
      db.prepare(`UPDATE payment_records SET status = 'completed', completed_at = ? WHERE id = ?`).run(now, record.id);

      if (meta.type === 'wallet_topup') {
        const exists = db.prepare(`SELECT id FROM wallet_transactions WHERE user_id = ? AND type = 'topup_stripe' AND amount = ? AND created_at > datetime('now', '-1 hour')`).get(req.user.id, record.amount);
        if (!exists) {
          db.prepare('UPDATE users SET wallet = wallet + ? WHERE id = ?').run(record.amount, req.user.id);
          db.prepare(`INSERT INTO wallet_transactions (id, user_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?)`)
            .run(uuidv4(), req.user.id, 'topup_stripe', record.amount, 'completed', now);
        }
      }
      if (meta.type === 'booking') {
        db.prepare(`UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = ?`).run(meta.booking_id);
      }
    }

    const user = db.prepare('SELECT wallet, points FROM users WHERE id = ?').get(req.user.id);
    res.json({ paid: true, wallet: user.wallet, points: user.points });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
module.exports.handleWebhook = handleWebhook;