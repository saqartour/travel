# Saqartour Travel Hub v3.0 — Production Ready

Full-stack travel platform with **real** email, Stripe payments, WebSocket chat, host marketplace, and admin CRM.

## Quick Start

```bash
cd travel
npm install
npm start
```

- **Website:** http://localhost:3000
- **Admin CRM:** http://localhost:3000/admin

## Configure Real Services

Copy `.env.example` to `.env` and fill in:

### Email (required for verification & password reset)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=saqartour@gmail.com
SMTP_PASS=your-google-app-password
EMAIL_FROM=Saqartour <saqartour@gmail.com>
```
Without SMTP, emails save to `data/outbox/` as `.eml` files.

### Stripe (required for wallet top-up & tour bookings)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
```

Get test keys at https://dashboard.stripe.com/test/apikeys

Use Stripe CLI for webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## Real Features (v3)

| Feature | Implementation |
|---------|----------------|
| **Email verification** | Real SMTP email with 6-digit code |
| **Password reset** | Email link + token (1hr expiry) |
| **Wallet top-up** | Stripe Checkout (card payments) |
| **Tour bookings** | Stripe Checkout → confirmed + email |
| **Redemptions** | Real withdrawal requests → admin processes |
| **Live chat** | Socket.io WebSockets (instant) |
| **Host listings** | CRUD + admin approval workflow |
| **Forum** | Server-persisted, country/city/topics |
| **IP tracking** | Server-side on register/login |
| **Transaction history** | Full wallet audit trail |

## Default Admin

| Email | `saqartour@gmail.com` |
| Password | `Sakartvelo2026!` |

## Deploy Free (Render.com)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/saqartour/travel)

1. Click the button above (log in with GitHub account **saqartour**)
2. Approve the Blueprint — creates **https://saqartour-travel.onrender.com**
3. When prompted, set these environment variables:
   - `APP_URL` → `https://saqartour-travel.onrender.com`
   - `CORS_ORIGIN` → `https://saqartour-travel.onrender.com`
   - `SMTP_PASS` → your Gmail app password
   - `ADMIN_PASSWORD` → your admin password
4. Wait ~3 minutes for build → site is live

> Free tier sleeps after 15 min idle (cold start ~30s). SQLite data resets on redeploy.

## Go Live (Production)

1. Copy `.env.example` → `.env` and set:
   - `NODE_ENV=production`
   - `APP_URL=https://yourdomain.com`
   - `CORS_ORIGIN=https://yourdomain.com`
   - `JWT_SECRET` — long random string (32+ chars)
   - `SMTP_*` — Gmail for verification emails
   - `STRIPE_*` — live or test keys + webhook secret
2. Run behind HTTPS (Nginx/Caddy) with reverse proxy to port 3000
3. Start: `npm start` (or PM2: `pm2 start server/index.js --name saqartour`)
4. Back up `data/saqartour.db` regularly

### Translations

Locale files: `public/locales/en.json`, `ka.json`, `ru.json`, `ar.json`  
Edit these JSON files to add or update UI text — no code changes needed.