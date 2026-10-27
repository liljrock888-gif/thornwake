// Creates a Stripe Checkout page for one product. Stripe's page handles cards,
// Apple Pay and Google Pay; which wallets appear is set in the Stripe Dashboard.
const Stripe = require('stripe');
const {PRODUCTS, PLAYER_ID} = require('../lib/products');
const {redis} = require('../lib/redis');
const {jsonBody, send} = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST.'});
  const {playerId, productId} = await jsonBody(req);
  const p = PRODUCTS[productId];
  if (!p || !PLAYER_ID.test(playerId || '')) return send(res, 400, {error: 'Unknown product or player.'});
  try {
    if (p.once && await redis('SISMEMBER', `owned:${playerId}`, productId)) return send(res, 409, {error: 'You already own this.'});
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{quantity: 1, price_data: {currency: 'usd', unit_amount: p.cents, product_data: {name: p.name, description: p.desc}}}],
      client_reference_id: playerId,
      metadata: {playerId, productId},
      success_url: `${site}/?purchase=success`,
      cancel_url: `${site}/?purchase=cancelled`,
    });
    send(res, 200, {url: session.url});
  } catch (e) {
    console.error('checkout failed', e);
    send(res, 500, {error: 'Checkout is unavailable right now. Try again in a minute.'});
  }
};
