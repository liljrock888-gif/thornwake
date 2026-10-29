// Stripe calls this after a payment. It checks Stripe's signature, then queues
// the purchase for the player's game to pick up. Each checkout is granted once.
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
  game_pass:   {name: 'Game Pass Premium', desc: 'Unlocks the premium reward track for this season. One per player.', cents: 499, grant: {premium: true}, once: true},
  // Mythic superhero bundles: a hero, their pet and 500 Crowns. One per player.
  bundle_volt:       {name: 'Volt Mythic Bundle', desc: 'Volt, the Mythic lightning speedster, with the Mythic pet Sparky, and 500 Crowns.', cents: 999, grant: {hero: 'volt', pet: 'sparky', crowns: 500}, once: true, bundle: true},
  bundle_aegis:      {name: 'Aegis Mythic Bundle', desc: 'Aegis, the Mythic shield guardian, with the Mythic pet Bulwark, and 500 Crowns.', cents: 999, grant: {hero: 'aegis', pet: 'bulwark', crowns: 500}, once: true, bundle: true},
  bundle_nightshade: {name: 'Nightshade Mythic Bundle', desc: 'Nightshade, the Mythic shadow vigilante, with the Mythic pet Echo, and 500 Crowns.', cents: 999, grant: {hero: 'nightshade', pet: 'echo', crowns: 500}, once: true, bundle: true},
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

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

// Optional Discord notification: set DISCORD_WEBHOOK_URL in the environment
// (Discord → channel settings → Integrations → Webhooks). It never blocks or
// breaks purchase delivery: failures are swallowed and it times out quickly.
const money = c => '$' + (c / 100).toFixed(2);
async function notifyDiscord(text) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: text}), signal: ctl.signal});
    clearTimeout(t);
  } catch (e) { /* Discord is optional; never let it break delivery */ }
}
const isTestMode = () => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');
const purchaseMessage = (p, playerId) =>
  `💰 **${p.name}** purchased for ${money(p.cents)}${isTestMode() ? ' *(test mode)*' : ''} — player \`${playerId}\``;
const refundMessage = (p, playerId) =>
  `↩️ **${p.name}** (${money(p.cents)}) was refunded — player \`${playerId}\``;

// A full refund queues a "revoke" for the game, which takes back the unspent Crowns and the
// Starter Pack skin or Game Pass. Partial refunds are left alone.
async function handleRefund(stripe, charge, res) {
  if (!charge.refunded || !charge.payment_intent) return send(res, 200, {received: true});
  const {data} = await stripe.checkout.sessions.list({payment_intent: charge.payment_intent, limit: 1});
  const s = data[0], {playerId, productId} = (s && s.metadata) || {};
  const p = PRODUCTS[productId];
  if (!p || !PLAYER_ID.test(playerId || '')) return send(res, 200, {received: true, ignored: true});
  try {
    // Skip if this refund was already handled (see the purchase path: replays
    // must not take back a product the player has since bought again).
    if (await redis('GET', `refund:${s.id}`)) return send(res, 200, {received: true});
    const cmds = [['RPUSH', `grants:${playerId}`, JSON.stringify({id: 'refund:' + s.id, productId, revoke: p.grant, at: Date.now()})]];
    if (p.once) cmds.push(['SREM', `owned:${playerId}`, productId]);
    await multi(cmds);
    await redis('SET', `refund:${s.id}`, '1', 'EX', 60 * 60 * 24 * 365);
    await notifyDiscord(refundMessage(p, playerId));
    send(res, 200, {received: true});
  } catch (e) {
    console.error('refund storage failed', e);
    send(res, 500, {error: 'Try again.'});
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST.'});
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return send(res, 400, {error: 'Bad signature.'});
  }
  if (event.type === 'charge.refunded') return handleRefund(stripe, event.data.object, res);
  if (!PAID_EVENTS.includes(event.type)) return send(res, 200, {received: true});
  const s = event.data.object;
  if (s.payment_status !== 'paid') return send(res, 200, {received: true});
  const {playerId, productId} = s.metadata || {};
  const p = PRODUCTS[productId];
  if (!p || !PLAYER_ID.test(playerId || '')) return send(res, 200, {received: true, ignored: true});
  try {
    // Skip if this session was already handled. Replays (Stripe resending, or the
    // same payment confirmed twice) must not queue a second grant or re-mark a
    // once-product as owned after a refund took it back.
    if (await redis('GET', `session:${s.id}`)) return send(res, 200, {received: true});
    // Queue the grant BEFORE the marker: if the function dies in between, the
    // retry queues a duplicate grant, which is harmless (the game applies each
    // checkout id once) and the marker is then set. The old order could leave
    // the marker set with no grant queued, and the retry would skip it: a lost
    // purchase.
    const cmds = [['RPUSH', `grants:${playerId}`, JSON.stringify({id: s.id, productId, grant: p.grant, at: Date.now()})]];
    if (p.once) cmds.push(['SADD', `owned:${playerId}`, productId]);
    await multi(cmds);
    await redis('SET', `session:${s.id}`, '1', 'EX', 60 * 60 * 24 * 180);
    await notifyDiscord(purchaseMessage(p, playerId));
    send(res, 200, {received: true});
  } catch (e) {
    // a non-2xx answer makes Stripe retry later
    console.error('webhook storage failed', e);
    send(res, 500, {error: 'Try again.'});
  }
};
