// Regression tests for the purchase-delivery fixes. Run: node test/purchase-flow.test.mjs
// Simulates Upstash Redis REST with an in-memory store (with NX semantics) and
// stubs the Stripe SDK, then drives the api/ functions with mock req/res.
import {createRequire} from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const DATA = new Map(); // the "Redis" database

// Minimal Upstash REST simulator; other URLs (Discord) are recorded.
const DISCORD_CALLS = [];
globalThis.fetch = async (url, opts) => {
  if (!url.startsWith(process.env.UPSTASH_REDIS_REST_URL)) { // any non-Upstash call is the Discord webhook
    if (DISCORD_FAIL) throw new Error('discord down');
    DISCORD_CALLS.push(JSON.parse(opts.body).content);
    return {ok: true, json: async () => ({})};
  }
  const body = JSON.parse(opts.body);
  const cmds = Array.isArray(body[0]) && typeof body[0] === 'object' ? body : [body];
  const out = [];
  for (const cmd of cmds) out.push(run(cmd));
  return {ok: true, json: async () => (url.endsWith('/multi-exec') ? out : out[0])};
};
let DISCORD_FAIL = false;
function run(cmd) {
  const [op, key, ...args] = cmd;
  const res = {result: null};
  switch (op) {
    case 'SET': {
      const opts = args.slice(1).map(String); // [value, 'NX', 'EX', seconds...]
      if (opts.includes('NX') && DATA.has(key)) { res.result = null; break; }
      DATA.set(key, args[0]); res.result = 'OK'; break;
    }
    case 'GET': res.result = DATA.has(key) ? DATA.get(key) : null; break;
    case 'DEL': res.result = DATA.delete(key) ? 1 : 0; break;
    case 'RPUSH': { const l = DATA.get(key) || []; l.push(args[0]); DATA.set(key, l); res.result = l.length; break; }
    case 'LRANGE': { const l = DATA.get(key) || []; res.result = l.slice(args[0], args[1] === -1 ? undefined : args[1] + 1); break; }
    case 'LTRIM': { const l = DATA.get(key) || []; DATA.set(key, l.slice(args[0], args[1] === -1 ? undefined : args[1] + 1)); res.result = 'OK'; break; }
    case 'LREM': { const l = DATA.get(key) || []; const i = l.indexOf(args[1]); if (i >= 0) l.splice(i, args[0]); res.result = i >= 0 ? 1 : 0; break; }
    case 'SADD': { const s = DATA.get(key) || new Set(); const n = !s.has(args[0]); s.add(args[0]); DATA.set(key, s); res.result = n ? 1 : 0; break; }
    case 'SREM': { const s = DATA.get(key) || new Set(); res.result = s.delete(args[0]) ? 1 : 0; DATA.set(key, s); break; }
    case 'SISMEMBER': { const s = DATA.get(key) || new Set(); res.result = s.has(args[0]) ? 1 : 0; break; }
    default: return {error: 'unknown op ' + op};
  }
  return res;
}

process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.UPSTASH_REDIS_REST_URL = 'http://fake';
process.env.UPSTASH_REDIS_REST_TOKEN = 't';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.SITE_URL = 'https://example.com';
process.env.DISCORD_WEBHOOK_URL = 'https://discord.example/hook';

// Stub the Stripe SDK before the api functions load it: signature verification
// behaves like the real one, checkout sessions come from a test-controlled map.
const PAYMENT_INTENTS = new Map(); // payment_intent id -> checkout session
function fakeStripe(key) {
  return {
    webhooks: {
      constructEvent: (raw, header, secret) => {
        const m = /^t=(\d+),v1=([0-9a-f]+)$/.exec(header || '');
        if (!m) throw new Error('bad header');
        const mac = crypto.createHmac('sha256', secret).update(`${m[1]}.${raw.toString()}`).digest('hex');
        if (mac !== m[2]) throw new Error('bad signature');
        return JSON.parse(raw.toString());
      },
    },
    checkout: {
      sessions: {
        create: async () => ({url: 'https://checkout.example/test'}),
        list: async params => ({data: PAYMENT_INTENTS.get(params.payment_intent) ? [PAYMENT_INTENTS.get(params.payment_intent)] : []}),
      },
    },
  };
}
const stripePath = require.resolve('stripe');
require.cache[stripePath] = {id: stripePath, filename: stripePath, loaded: true, exports: fakeStripe};

const claim = require('../api/claim.js');
const webhook = require('../api/webhook.js');
const config = require('../api/config.js');
const checkout = require('../api/checkout.js');

const req = body => ({method: 'POST', body: Buffer.from(JSON.stringify(body)), headers: {}});
const res = () => { const r = {statusCode: 0, headers: {}, body: ''}; r.setHeader = (k, v) => r.headers[k] = v; r.end = d => r.body = d; return r; };
let pass = 0, fail = 0;
const check = (name, ok, extra) => { if (ok) { pass++; console.log('  ok ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); } };
const body = r => JSON.parse(r.body);
const grants = pid => (DATA.get(`grants:${pid}`) || []).map(x => JSON.parse(x));
const owned = pid => DATA.get(`owned:${pid}`) || new Set();

const P = 'player-00000000-0000-0000-0000-00000000000a';

// A Stripe webhook request with a valid signature.
function stripeEvent(type, obj) {
  const payload = JSON.stringify({id: 'evt_' + Math.random().toString(36).slice(2), type, data: {object: obj}});
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${payload}`).digest('hex');
  return {method: 'POST', body: Buffer.from(payload), headers: {'stripe-signature': `t=${t},v1=${v1}`}};
}
const paidSession = (id, productId = 'starter', playerId = P) => ({id, payment_status: 'paid', metadata: {playerId, productId}});
const refundCharge = (intentId, session) => ({refunded: true, payment_intent: intentId});

// ---- claim.js ----
console.log('claim.js');
DATA.set(`grants:${P}`, [JSON.stringify({id: 'cs_a', productId: 'crowns_500', grant: {crowns: 500}})]);
let r = res(); await claim(req({playerId: P}), r);
check('returns waiting grants in the response', body(r).grants.length === 1 && body(r).grants[0].id === 'cs_a');

// overlapping readers: both tabs read cs_a, tab 1 acks, cs_b arrives, tab 2 acks
r = res(); await claim(req({playerId: P, ackIds: ['cs_a']}), r); // tab 1
DATA.get(`grants:${P}`).push(JSON.stringify({id: 'cs_b', productId: 'crowns_500', grant: {crowns: 500}}));
r = res(); await claim(req({playerId: P, ackIds: ['cs_a']}), r); // tab 2 (same stale view)
check('second ack leaves the newer grant alone', JSON.stringify(grants(P).map(g => g.id)) === '["cs_b"]', JSON.stringify(grants(P)));
r = res(); await claim(req({playerId: P, ackIds: ['cs_b']}), r);
check('queue drains by id', grants(P).length === 0);
r = res(); await claim(req({playerId: P, ackIds: ['cs_b']}), r);
check('repeated ack is harmless', r.statusCode === 200 && grants(P).length === 0);
r = res(); await claim(req({playerId: P, ack: 1}), r);
check('old count-based ack is refused with a reload hint', r.statusCode === 409 && /reload/i.test(body(r).error));
r = res(); await claim(req({playerId: 'bad'}), r);
check('bad player id rejected', r.statusCode === 400);

// ---- webhook.js: purchases ----
console.log('webhook.js (purchases)');
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_1')), r);
check('first delivery queues the grant', grants(P).length === 1 && grants(P)[0].id === 'cs_1');
check('once-product marked owned', owned(P).has('starter'));
check('marker set', DATA.get('session:cs_1') === '1');
check('Discord notified of the purchase', DISCORD_CALLS.some(m => /Starter Pack/.test(m) && /\$1\.99/.test(m) && /test mode/.test(m) && m.includes(P)), DISCORD_CALLS.join(' | '));
const discordCount = DISCORD_CALLS.length;
const afterFirst = grants(P).length;
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_1')), r);
check('replay with marker set is skipped', grants(P).length === afterFirst && owned(P).has('starter'));
check('replay does not notify Discord again', DISCORD_CALLS.length === discordCount);
// crash between queue and marker: marker missing, replay must not lose the purchase
DATA.delete('session:cs_2');
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_2')), r);
DATA.delete('session:cs_2'); // simulate the crash: grant queued, marker never set
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_2')), r);
check('replay after crash queues a duplicate (harmless) and marks it',
  grants(P).filter(g => g.id === 'cs_2').length === 2 && DATA.get('session:cs_2') === '1');
r = res(); await webhook(stripeEvent('checkout.session.completed', {id: 'cs_np', payment_status: 'unpaid', metadata: {playerId: P, productId: 'starter'}}), r);
check('unpaid session ignored', body(r).received === true && !grants(P).some(g => g.id === 'cs_np'));
r = res(); await webhook(stripeEvent('checkout.session.completed', {id: 'cs_up', payment_status: 'paid', metadata: {playerId: P, productId: 'nope'}}), r);
check('unknown product ignored', body(r).ignored === true && !grants(P).some(g => g.id === 'cs_up'));
const bad = stripeEvent('checkout.session.completed', paidSession('cs_bs'));
bad.headers['stripe-signature'] = 't=1,v1=deadbeef';
r = res(); await webhook(bad, r);
check('bad signature rejected', r.statusCode === 400 && !grants(P).some(g => g.id === 'cs_bs'));

// ---- webhook.js: refunds and replays ----
console.log('webhook.js (refunds)');
// player bought starter (cs_1, owned). Now refund it.
PAYMENT_INTENTS.set('pi_1', paidSession('cs_1'));
r = res(); await webhook(stripeEvent('charge.refunded', refundCharge('pi_1')), r);
check('refund queues a revoke and clears ownership',
  grants(P).some(g => g.id === 'refund:cs_1' && g.revoke) && !owned(P).has('starter') && DATA.get('refund:cs_1') === '1');
check('Discord notified of the refund', DISCORD_CALLS.some(m => /refunded/.test(m) && /Starter Pack/.test(m)), DISCORD_CALLS.slice(-1)[0]);
// replay of the ORIGINAL paid event must not resurrect ownership
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_1')), r);
check('paid-event replay after refund is skipped', !owned(P).has('starter') && grants(P).filter(g => g.id === 'cs_1').length === 1);
// the player buys the starter pack again (new session), then the OLD refund event is replayed
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_3')), r);
check('repurchase restores ownership', owned(P).has('starter'));
r = res(); await webhook(stripeEvent('charge.refunded', refundCharge('pi_1')), r);
check('old-refund replay does not steal back the repurchase', owned(P).has('starter'));
// partial refund is left alone
r = res(); await webhook(stripeEvent('charge.refunded', {refunded: false, payment_intent: 'pi_1'}), r);
check('partial refund ignored', body(r).received === true);

// ---- checkout.js ----
console.log('checkout.js');
r = res(); await checkout(req({playerId: P, productId: 'crowns_500'}), r);
check('complete config returns a checkout url', r.statusCode === 200 && body(r).url === 'https://checkout.example/test');
r = res(); await checkout(req({playerId: P, productId: 'starter'}), r);
check('once-product already owned is refused', r.statusCode === 409);
const savedSite = process.env.SITE_URL;
delete process.env.SITE_URL;
r = res(); await checkout(req({playerId: P, productId: 'crowns_500'}), r);
check('incomplete config refused before contacting Stripe', r.statusCode === 503 && /set up/i.test(body(r).error));
process.env.SITE_URL = savedSite;
r = res(); await checkout(req({playerId: P, productId: 'nope'}), r);
check('unknown product rejected', r.statusCode === 400);

// ---- config.js ----
console.log('config.js');
r = res(); await config({method: 'GET'}, r);
check('enabled with full config', body(r).enabled === true);
for (const v of ['STRIPE_WEBHOOK_SECRET', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SITE_URL']) {
  const saved = process.env[v]; delete process.env[v];
  r = res(); await config({method: 'GET'}, r);
  check('disabled without ' + v, body(r).enabled === false);
  process.env[v] = saved;
}
r = res(); await config({method: 'GET'}, r);
check('re-enabled once restored', body(r).enabled === true);

// ---- Discord notifications ----
console.log('discord');
// no URL set -> no notification, delivery still works
const savedHook = process.env.DISCORD_WEBHOOK_URL;
delete process.env.DISCORD_WEBHOOK_URL;
const before = DISCORD_CALLS.length;
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_d1')), r);
check('no Discord URL means no call, purchase still delivered', DISCORD_CALLS.length === before && grants(P).some(g => g.id === 'cs_d1'));
process.env.DISCORD_WEBHOOK_URL = savedHook;
// Discord being down must not break the webhook response or delivery
DISCORD_FAIL = true;
r = res(); await webhook(stripeEvent('checkout.session.completed', paidSession('cs_d2')), r);
check('Discord failure never breaks delivery', r.statusCode === 200 && grants(P).some(g => g.id === 'cs_d2'));
DISCORD_FAIL = false;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
