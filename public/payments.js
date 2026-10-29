// Adds a "Buy Crowns" tab to the in-game store and delivers finished purchases.
// It only appears when /api/config reports that payments are switched on.
(() => {
  const TW = window.Thornwake;
  if (!TW) return;
  const KEY = 'thornwake.playerId';
  let playerId = null;
  try {
    playerId = localStorage.getItem(KEY);
    if (!playerId) { playerId = crypto.randomUUID(); localStorage.setItem(KEY, playerId); }
  } catch (e) { return; } // no storage: purchases could not be kept, so don't offer them

  let config = null;
  const money = c => '$' + (c / 100).toFixed(2);
  const post = (url, body) => fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.'); return j; });

  function renderBuy(body) {
    const head = TW.el('div', 'passhead');
    head.append(TW.el('b', '', 'Buy Crowns'),
      TW.el('small', '', 'Pay with a card, Apple Pay or Google Pay on Stripe\'s secure checkout page. Crowns arrive as soon as you come back.'),
      TW.el('small', '', 'Purchase ID for support: ' + playerId));
    const links = TW.el('small');
    for (const [href, label, sep] of [['/terms.html', 'Terms of Sale', ' · '], ['/refunds.html', 'Refund Policy', '']]) {
      const a = TW.el('a', '', label); a.href = href; a.target = '_blank'; a.rel = 'noopener';
      links.append(a, document.createTextNode(sep));
    }
    links.prepend(document.createTextNode('By buying, you agree to our '));
    head.appendChild(links);
    if (config.testMode) head.appendChild(TW.el('small', '', 'Test mode: no real money is charged. Use card 4242 4242 4242 4242.'));
    body.appendChild(head);
    for (const p of config.products.filter(x => !x.bundle)) {
      const owned = p.once && TW.ownsProduct(p.id);
      TW.storeCard(body, {color: '#f2c14e', title: p.name, desc: p.desc, label: owned ? 'Owned' : `Buy · ${money(p.cents)}`, primary: !owned, disabled: owned,
        onClick: e => buy(p.id, e.currentTarget)});
    }
  }

  // Mythic superhero bundles, each with a hero, their pet and Crowns
  function renderBundles(body) {
    const head = TW.el('div', 'passhead');
    head.append(TW.el('b', '', 'Mythic superhero bundles'),
      TW.el('small', '', 'Each bundle unlocks a Mythic hero with a cape and golden aura, their Mythic pet, and 500 Crowns. One of each per player.'));
    if (config.testMode) head.appendChild(TW.el('small', '', 'Test mode: no real money is charged. Use card 4242 4242 4242 4242.'));
    body.appendChild(head);
    for (const p of config.products.filter(x => x.bundle)) {
      const owned = TW.ownsProduct(p.id);
      TW.storeCard(body, {color: '#ffd75e', title: p.name, desc: p.desc, label: owned ? 'Owned' : `Buy · ${money(p.cents)}`, primary: !owned, disabled: owned,
        onClick: e => buy(p.id, e.currentTarget)});
    }
  }

  async function buy(productId, btn) {
    btn.disabled = true; btn.textContent = 'Opening checkout…';
    try { location.href = (await post('/api/checkout', {playerId, productId})).url; }
    catch (e) { btn.disabled = false; btn.textContent = e.message; }
  }

  // Picks up finished purchases. After returning from checkout the payment can take a few seconds
  // to confirm (longer for some payment methods), so after the quick checks it keeps a slow watch.
  let waiting = false; // true while the game still expects a purchase to arrive
  async function claim(tries, slow) {
    try {
      const {grants} = await post('/api/claim', {playerId});
      const added = [];
      for (const g of grants) if (TW.grantPaid(g)) added.push(g);
      // Acknowledge the exact grants seen (by id), so a purchase that arrives
      // between reading and acknowledging is never skipped — and only grants
      // that are durably saved: if the save didn't stick (storage full or
      // blocked), the grant stays queued and is delivered again next time.
      let savedPaid = [];
      try { savedPaid = (JSON.parse(localStorage.getItem('thornwake.profile') || '{}').paid) || []; } catch (e) { /* storage blocked */ }
      const ackIds = added.filter(g => savedPaid.includes(g.id)).map(g => g.id);
      if (ackIds.length) await post('/api/claim', {playerId, ackIds});
      if (added.length) {
        const names = list => list.map(g => (config.products.find(p => p.id === g.productId) || {}).name).filter(Boolean).join(', ');
        const bought = added.filter(g => !g.revoke), refunded = added.filter(g => g.revoke);
        if (bought.length) TW.banner('Purchase added', names(bought));
        else TW.banner('Purchase refunded', names(refunded) + ' was refunded and removed from your game.');
        TW.refresh();
        waiting = false;
      } else if (tries > 0) setTimeout(() => claim(tries - 1, slow), slow ? 15000 : 2500);
      else if (waiting) { waiting = false; claim(24, true); } // keep a slow watch for late payments
    } catch (e) {
      if (tries > 0) setTimeout(() => claim(tries - 1, slow), 4000);
    }
  }

  fetch('/api/config').then(r => r.ok ? r.json() : null).then(c => {
    if (!c || !c.enabled) return;
    config = c;
    TW.addStoreTab('buy', 'Buy Crowns', renderBuy);
    if (config.products.some(p => p.bundle)) TW.addStoreTab('bundles', 'Bundles', renderBundles);
    const params = new URLSearchParams(location.search), result = params.get('purchase');
    if (result) history.replaceState(null, '', location.pathname);
    if (result === 'cancelled') TW.banner('Checkout cancelled', 'You were not charged.');
    if (result === 'success') waiting = true; // quick checks first, then a slow watch
    claim(result === 'success' ? 8 : 0);
  }).catch(() => {});
})();
