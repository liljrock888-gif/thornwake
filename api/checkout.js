// Creates a Stripe Checkout page for one product. Stripe's page handles cards,
// Apple Pay and Google Pay; which wallets appear is set in the Stripe Dashboard.
const Stripe = require('stripe');

// ---- shared helpers (kept in each function so it has no other files to load) ----
// Real-money products. Prices live on the server so a player can't change what they pay.
// Eggs are deliberately not sold for money: they're bought with Crowns or earned.
const PRODUCTS = {
  crowns_500:  {name: 'Pouch of Crowns', desc: '500 Crowns', cents: 99, grant: {crowns: 500}},
  crowns_1400: {name: 'Sack of Crowns', desc: '1,400 Crowns (about 10% bonus)', cents: 249, grant: {crowns: 1400}},
  crowns_3000: {name: 'Chest of Crowns', desc: '3,000 Crowns (about 20% bonus)', cents: 499, grant: {crowns: 3000}},
  crowns_6500: {name: 'Dragon Hoard', desc: '6,500 Crowns (about 30% bonus)', cents: 999, grant: {crowns: 6500}},
  starter:     {name: 'Starter Pack', desc: '1,000 Crowns and the Gilded skin. One per player.', cents: 199, grant: {crowns: 1000, skin: 'gilded'}, once: true},
  game_pass:   {name: 'Game Pass Premium', desc: 'Unlocks the premium reward track for Season 1. One per player.', cents: 299, grant: {premium: true}, once: true},
};
const PLAYER_ID = /^[a-zA-Z0-9-]{8,64}$/;

// Minimal Upstash Redis REST client (no SDK needed).
async function redisCall(path, body) {
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL + path, {
    method: 'POST',
    headers: {Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error('Redis error: ' + (j.error || r.status));
  return j;
}
// redis('SET', 'key', 'value') -> result
async function redis(...cmd) { return (await redisCall('', cmd)).result; }
// multi([['RPUSH', ...], ['SADD', ...]]) runs the commands as one transaction
async function multi(cmds) {
  const out = await redisCall('/multi-exec', cmds);
  return out.map(x => { if (x.error) throw new Error('Redis error: ' + x.error); return x.result; });
}

// Reads the request body ourselves, so these functions work with Vercel's body helpers
// turned off (NODEJS_HELPERS=0), which the Stripe webhook needs for signature checks.
function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function jsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const buf = await rawBody(req);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch (e) { return {}; }
}
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
// ---- end shared helpers ----

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
