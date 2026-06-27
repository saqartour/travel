require('dotenv').config();
const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDb } = require('./db');
const { initSocket } = require('./socket');
const { handleWebhook } = require('./routes/payments');
const { isSmtpConfigured } = require('./services/email');

initDb();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.set('trust proxy', true);

const corsOrigin = process.env.CORS_ORIGIN || process.env.APP_URL || true;
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change'))) {
  console.warn('⚠️  Set a strong JWT_SECRET before going live!');
}

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/faq', require('./routes/faq'));
app.use('/api/tours', require('./routes/tours'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/hosts', require('./routes/hosts'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    features: {
      emailOutbox: !isSmtpConfigured(),
      smtp: isSmtpConfigured(),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      realtimeChat: true
    }
  });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Saqartour Travel Hub v3 running at ${APP_URL}`);
  console.log(`Admin CRM: ${APP_URL}/admin`);
  if (isSmtpConfigured()) console.log(`📧 Email → Gmail SMTP (${process.env.SMTP_USER})`);
  else console.log('📧 Email → data/outbox/ (set SMTP_USER + SMTP_PASS in .env for live delivery)');
  if (!process.env.STRIPE_SECRET_KEY) console.log('💳 Set STRIPE_SECRET_KEY for payments');
});