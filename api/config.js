// Tells the game whether payments are switched on, and what's for sale.
const {PRODUCTS} = require('../lib/products');
const {send} = require('../lib/http');

module.exports = (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  send(res, 200, {
    enabled: Boolean(key && process.env.UPSTASH_REDIS_REST_URL),
    testMode: key.startsWith('sk_test_'),
    products: Object.entries(PRODUCTS).map(([id, p]) => ({id, name: p.name, desc: p.desc, cents: p.cents, once: !!p.once})),
  });
};
