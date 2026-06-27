const Stripe = require('stripe');

let stripe = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

async function createCheckoutSession({ mode, amount, currency, metadata, successUrl, cancelUrl, customerEmail }) {
  const s = getStripe();
  if (!s) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');

  const session = await s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [{
      price_data: {
        currency: currency || 'usd',
        unit_amount: Math.round(amount * 100),
        product_data: {
          name: metadata.product_name || 'Saqartour Payment',
          description: metadata.description || ''
        }
      },
      quantity: 1
    }],
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl
  });

  return session;
}

module.exports = { getStripe, isConfigured, createCheckoutSession };