#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sendMail, verificationEmail, isSmtpConfigured } = require('../server/services/email');

if (!isSmtpConfigured()) {
  console.error('SMTP not configured');
  process.exit(1);
}

(async () => {
  const mail = verificationEmail('123456', 'test');
  const result = await sendMail({ to: process.env.SMTP_USER, ...mail });
  console.log('✅ Test email sent via', result.method, result.messageId || '');
})().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});