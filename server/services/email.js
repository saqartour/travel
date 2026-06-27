const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const outboxDir = path.join(__dirname, '..', '..', 'data', 'outbox');

function ensureOutbox() {
  if (!fs.existsSync(outboxDir)) fs.mkdirSync(outboxDir, { recursive: true });
}

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    if (user.endsWith('@gmail.com') && !process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }
  return null;
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'Saqartour <saqartour@gmail.com>';
  const transport = createTransport();

  if (transport) {
    const info = await transport.sendMail({ from, to, subject, html, text });
    return { delivered: true, method: 'smtp', messageId: info.messageId };
  }

  ensureOutbox();
  const filename = `${Date.now()}-${to.replace(/[^a-z0-9]/gi, '_')}.eml`;
  const filepath = path.join(outboxDir, filename);
  const body = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html || text
  ].join('\n');
  fs.writeFileSync(filepath, body, 'utf8');
  const codeMatch = (html || text || '').match(/>(\d{6})</);
  console.log(`[email] ⚠️  SMTP not configured — saved locally: ${filepath}`);
  if (codeMatch) console.log(`[email] Verification code for ${to}: ${codeMatch[1]}`);
  return { delivered: true, method: 'outbox', filepath };
}

function verificationEmail(code, username) {
  return {
    subject: 'Verify your Saqartour account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f1f35;color:#e2f6ff;border-radius:16px">
        <h1 style="color:#5eead4;margin:0 0 16px">🌍 Saqartour</h1>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#5eead4;text-align:center;padding:16px;background:#071422;border-radius:12px">${code}</p>
        <p style="color:#7a9bb6;font-size:14px">This code expires in 30 minutes. If you didn't register, ignore this email.</p>
      </div>`
  };
}

function passwordResetEmail(token, username) {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const link = `${base}/?reset=${token}`;
  return {
    subject: 'Reset your Saqartour password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f1f35;color:#e2f6ff;border-radius:16px">
        <h1 style="color:#5eead4">🔐 Password Reset</h1>
        <p>Hi <strong>${username}</strong>,</p>
        <p>Click the button below to reset your password. Link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#5eead4;color:#0f172a;text-decoration:none;border-radius:999px;font-weight:bold">Reset Password</a>
        <p style="color:#7a9bb6;font-size:13px">Or use this code: <strong>${token.slice(0, 8).toUpperCase()}</strong></p>
      </div>`
  };
}

function bookingConfirmationEmail(booking, tour, user) {
  return {
    subject: `Booking confirmed — ${tour.title}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f1f35;color:#e2f6ff;border-radius:16px">
        <h1 style="color:#5eead4">🎫 Booking Received</h1>
        <p>Hi <strong>${user.username}</strong>,</p>
        <p>Your booking for <strong>${tour.title}</strong> has been received.</p>
        <ul style="color:#a0b9da;line-height:1.8">
          <li>Guests: ${booking.guests}</li>
          <li>Date: ${booking.travel_date || 'TBD'}</li>
          <li>Total: $${booking.total_price.toFixed(2)}</li>
          <li>Status: ${booking.status}</li>
          <li>Reference: ${booking.id.slice(0, 8).toUpperCase()}</li>
        </ul>
      </div>`
  };
}

function redemptionEmail(amount, user) {
  return {
    subject: 'Redemption request received',
    html: `<p>Hi ${user.username}, your redemption of <strong>$${amount.toFixed(2)}</strong> is being processed. You'll receive funds within 3–5 business days.</p>`
  };
}

module.exports = { sendMail, verificationEmail, passwordResetEmail, bookingConfirmationEmail, redemptionEmail, isSmtpConfigured };