// Stripe calls this after a payment. It checks Stripe's signature, then queues
// the purchase for the player's game to pick up. Each checkout is granted once.
const Stripe = require('stripe');
const {PRODUCTS, PLAYER_ID} = require('../lib/products');
const {redis, multi} = require('../lib/redis');
const {rawBody, send} = require('../lib/http');

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST.'});
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return send(res, 400, {error: 'Bad signature.'});
  }
  if (!PAID_EVENTS.includes(event.type)) return send(res, 200, {received: true});
  const s = event.data.object;
  if (s.payment_status !== 'paid') return send(res, 200, {received: true});
  const {playerId, productId} = s.metadata || {};
  const p = PRODUCTS[productId];
  if (!p || !PLAYER_ID.test(playerId || '')) return send(res, 200, {received: true, ignored: true});
  try {
    const fresh = await redis('SET', `session:${s.id}`, '1', 'NX', 'EX', 60 * 60 * 24 * 180);
    if (fresh === 'OK') {
      const cmds = [['RPUSH', `grants:${playerId}`, JSON.stringify({id: s.id, productId, grant: p.grant, at: Date.now()})]];
      if (p.once) cmds.push(['SADD', `owned:${playerId}`, productId]);
      await multi(cmds);
    }
    send(res, 200, {received: true});
  } catch (e) {
    // a non-2xx answer makes Stripe retry later
    console.error('webhook storage failed', e);
    await redis('DEL', `session:${s.id}`).catch(() => {});
    send(res, 500, {error: 'Try again.'});
  }
};
