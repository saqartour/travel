#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDb, db } = require('../server/db');
const { sendMail, verificationEmail, isSmtpConfigured } = require('../server/services/email');

initDb();

const email = process.argv[2] || 'saqartour@gmail.com';
const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

if (!user) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

const code = Math.floor(100000 + Math.random() * 900000).toString();
const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
db.prepare('UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?').run(code, expires, user.id);

(async () => {
  const mail = verificationEmail(code, user.username);
  const result = await sendMail({ to: user.email, ...mail });
  console.log(`\n✅ New code for ${user.email}: ${code}`);
  console.log(`   Expires: ${expires}`);
  console.log(`   Delivery: ${result.method}${result.filepath ? ' → ' + result.filepath : ''}`);
  if (!isSmtpConfigured()) {
    console.log('\n⚠️  To receive emails in Gmail inbox, add to .env:');
    console.log('   SMTP_USER=saqartour@gmail.com');
    console.log('   SMTP_PASS=<google-app-password>');
    console.log('   EMAIL_FROM=Saqartour <saqartour@gmail.com>');
    console.log('   Get App Password: https://myaccount.google.com/apppasswords\n');
  }
})();