// The game asks for its waiting purchases, applies them, then confirms how many it applied.
// POST {playerId}            -> {grants: [...]}
// POST {playerId, ack: n}    -> removes the first n grants
// Grants carry their checkout id, so the game never applies one twice even if a confirm is lost.
const {PLAYER_ID} = require('../lib/products');
const {redis} = require('../lib/redis');
const {jsonBody, send} = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST.'});
  const {playerId, ack} = await jsonBody(req);
  if (!PLAYER_ID.test(playerId || '')) return send(res, 400, {error: 'Unknown player.'});
  const key = `grants:${playerId}`;
  try {
    if (Number.isInteger(ack) && ack > 0) {
      await redis('LTRIM', key, ack, -1);
      return send(res, 200, {ok: true});
    }
    const list = await redis('LRANGE', key, 0, 49);
    send(res, 200, {grants: (list || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean)});
  } catch (e) {
    console.error('claim failed', e);
    send(res, 500, {error: 'Try again.'});
  }
};
