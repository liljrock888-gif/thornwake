// Accounts, cloud saves and online play for the self-hosted game, powered by Supabase.
// It only switches on when /api/config reports a Supabase project.
//  - Account screen: sign up or sign in with email and password.
//  - Cloud saves: the profile (Crowns, heroes, pets, rank, purchases) follows the account to any device.
//  - Online play: gives the game the same "room" interface the Claude artifact provides, on Supabase Realtime.
(() => {
  const TW = window.Thornwake;
  if (!TW) return;
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const PID_KEY = 'thornwake.playerId', LINK_KEY = 'thornwake.cloud';
  const TAB = Math.random().toString(36).slice(2, 12); // this tab's id in online rooms

  let sb = null, user = null, ready;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const playerId = () => { try { return localStorage.getItem(PID_KEY); } catch (e) { return null; } };

  // The game asks for a room when Multiplayer or Ranked opens; it waits here until Supabase is loaded.
  window.claude = window.claude || {};
  if (!window.claude.use) window.claude.use = async cap => (cap === 'room' && await ready) ? lobby() : null;

  ready = fetch('/api/config').then(r => r.ok ? r.json() : null).then(c => {
    if (!c || !c.supabase) return false;
    return new Promise(resolve => {
      const sc = document.createElement('script');
      sc.src = LIB; sc.onerror = () => resolve(false);
      sc.onload = () => {
        sb = window.supabase.createClient(c.supabase.url, c.supabase.anonKey, {realtime: {params: {eventsPerSecond: 20}}});
        setupAccount();
        resolve(true);
      };
      document.head.appendChild(sc);
    });
  }).catch(() => false);

  // ---------- accounts and cloud saves ----------
  const ui = {};
  function setupAccount() {
    const sec = document.createElement('section'); sec.id = 'scr-account';
    sec.innerHTML = `<h2>Account</h2>
      <p class="status ok" id="acStatus" aria-live="polite"></p>
      <div class="menu" id="acForm">
        <input id="acEmail" type="email" autocomplete="email" placeholder="Email" aria-label="Email">
        <input id="acPass" type="password" autocomplete="current-password" placeholder="Password (6 or more characters)" aria-label="Password">
        <button class="mbtn primary" id="acIn">Sign in</button>
        <button class="mbtn" id="acUp">Create account</button>
      </div>
      <div class="menu" id="acChoice" hidden>
        <button class="mbtn primary" id="acUseCloud">Use my account's progress</button>
        <button class="mbtn" id="acUseLocal">Replace it with this device's progress</button>
      </div>
      <div class="menu" id="acSigned" hidden><button class="mbtn" id="acOut">Sign out</button></div>
      <p class="status">With an account, your Crowns, heroes, pets, rank and purchases are saved online, so you can pick up on any device.</p>
      <button class="mbtn small back" id="acBack">Back</button>`;
    TW.addScreen(sec);
    for (const id of ['acStatus', 'acForm', 'acEmail', 'acPass', 'acIn', 'acUp', 'acChoice', 'acUseCloud', 'acUseLocal', 'acSigned', 'acOut', 'acBack']) ui[id] = sec.querySelector('#' + id);
    for (const inp of [ui.acEmail, ui.acPass]) Object.assign(inp.style, {padding: '12px 14px', borderRadius: '10px', font: 'inherit', fontSize: '16px', width: '100%', boxSizing: 'border-box'});
    ui.menuBtn = TW.addMenuButton('m-account', 'Account', () => { render(); TW.show('scr-account'); });
    ui.acBack.addEventListener('click', () => TW.show('scr-main'));
    ui.acIn.addEventListener('click', () => auth('in'));
    ui.acUp.addEventListener('click', () => auth('up'));
    ui.acPass.addEventListener('keydown', e => { if (e.key === 'Enter') auth('in'); });
    ui.acOut.addEventListener('click', async () => { await sb.auth.signOut(); store.set(LINK_KEY, null); user = null; render('Signed out. Progress on this device stays here.'); });
    ui.acUseCloud.addEventListener('click', () => { if (ui.pending) useCloud(ui.pending); });
    ui.acUseLocal.addEventListener('click', () => { ui.pending = null; reconciling = false; push(true); });
    TW.onSave(() => { if (user && !ui.pending && !reconciling) schedulePush(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) push(); });
    sb.auth.getSession().then(({data}) => { if (data.session) signedIn(data.session.user); else render(); });
  }

  function render(msg) {
    if (!ui.acStatus) return;
    ui.acForm.hidden = !!user; ui.acSigned.hidden = !user || !!ui.pending; ui.acChoice.hidden = !ui.pending;
    ui.menuBtn.textContent = user ? 'Account (signed in)' : 'Account';
    ui.acStatus.textContent = msg || (user ? `Signed in as ${user.email}. Your progress saves online automatically.` : 'Sign in to save your progress online.');
  }

  async function auth(kind) {
    const email = ui.acEmail.value.trim(), password = ui.acPass.value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return render('Enter your email address.');
    if (password.length < 6) return render('Passwords need at least 6 characters.');
    ui.acIn.disabled = ui.acUp.disabled = true; render(kind === 'up' ? 'Creating your account…' : 'Signing in…');
    const {data, error} = kind === 'up' ? await sb.auth.signUp({email, password}) : await sb.auth.signInWithPassword({email, password});
    ui.acIn.disabled = ui.acUp.disabled = false; ui.acPass.value = '';
    if (error) return render(error.message.includes('Invalid login') ? 'That email and password don\'t match an account.' : error.message);
    if (!data.session) return render('Check your email to confirm your account, then sign in.');
    signedIn(data.session.user);
  }

  // A device counts as having its own progress if it has moved past a fresh profile.
  function hasProgress(p) {
    return p.crowns !== 300 || p.heroes.length > 6 || (p.paid || []).length > 0 || p.pass.xp > 0 || p.pets.length > 0 || !!(p.rank && (p.rank.w || p.rank.l));
  }

  async function signedIn(u) {
    user = u; reconciling = true; render('Syncing your progress…');
    const {data: row, error} = await sb.from('saves').select('data, player_id, updated_at').eq('user_id', u.id).maybeSingle();
    if (error) { reconciling = false; return render('Couldn\'t reach your online save right now. Your progress is still saved on this device.'); }
    const local = TW.getProfile(), link = store.get(LINK_KEY);
    // This device has purchases the account's save has never seen. Loading the
    // account's save would silently drop them, so this device's progress is
    // kept and saved online instead.
    const cloudPaid = new Set(((row && row.data) || {}).paid || []);
    if ((local.paid || []).some(id => !cloudPaid.has(id))) {
      reconciling = false; push(true);
      return render('This device has purchases your account\'s save doesn\'t include, so this device\'s progress was kept and saved online.');
    }
    if (!row || !row.data || (row.data.epoch || 0) < (local.epoch || 0)) { reconciling = false; return push(true); } // a save from before the last wipe is replaced, never loaded
    if (link && link.uid === u.id) {
      // this device was already linked: keep whichever side changed last
      if (link.dirty && new Date(link.dirty) > new Date(row.updated_at)) { reconciling = false; return push(true); }
      if (link.synced === row.updated_at) { reconciling = false; return render(); }
      return useCloud(row);
    }
    if (hasProgress(local)) { ui.pending = row; return render('This account already has saved progress, and so does this device. Which do you want to keep? The other one will be replaced.'); }
    useCloud(row);
  }

  function useCloud(row) {
    ui.pending = null; reconciling = false;
    store.set(LINK_KEY, {uid: user.id, synced: row.updated_at, dirty: null});
    const samePlayer = row.player_id && row.player_id === playerId();
    TW.replaceProfile(row.data);
    dirty = false; // replaceProfile doesn't need pushing back
    if (row.player_id && !samePlayer) {
      // purchases are delivered to the account's player id, so the store must restart with it
      try { localStorage.setItem(PID_KEY, row.player_id); } catch (e) { /* storage blocked */ }
      location.reload(); return;
    }
    render('Loaded your account\'s progress.');
  }

  let dirty = false, pushTimer = 0, pushing = false, reconciling = false; // reconciling: signed in, cloud read or choice not settled yet
  function schedulePush() {
    // Never upload while reconciliation is pending (the cloud read is in flight or
    // the player is choosing between their device's progress and the account's):
    // uploading would overwrite the cloud save first.
    if (ui.pending || reconciling) return;
    dirty = true;
    const link = store.get(LINK_KEY);
    if (link && link.uid === user.id) { link.dirty = new Date().toISOString(); store.set(LINK_KEY, link); }
    clearTimeout(pushTimer); pushTimer = setTimeout(push, 3000);
  }
  async function push(first) {
    if (!user || ui.pending || reconciling) return;
    if (pushing) { // an upload is in flight: try again once it finishes
      clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500);
      return;
    }
    pushing = true; dirty = false; clearTimeout(pushTimer);
    const snapshot = TW.getProfile();
    const {data, error} = await sb.from('saves').upsert({user_id: user.id, data: snapshot, player_id: playerId(), updated_at: new Date().toISOString()})
      .select('updated_at').single();
    pushing = false;
    if (error) {
      dirty = true;
      if (first) render('Couldn\'t save online right now. Your progress is still saved on this device.');
    } else {
      // keep the dirty marker if a newer local change arrived while uploading
      store.set(LINK_KEY, {uid: user.id, synced: data.updated_at, dirty: dirty ? new Date().toISOString() : null});
      if (first) render('Your progress is now saved to your account.');
    }
    if (dirty) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 3000); } // a newer save arrived while uploading
  }

  // ---------- online rooms on Supabase Realtime ----------
  // Matches the room interface the game uses: peers(), presence(state), onPeers(cb, lost), join(name), leave().
  // Each tab's presence is a small object it merges updates into and broadcasts to the room.
  let lobbyRoom = null;
  async function lobby() { return lobbyRoom || (lobbyRoom = await openRoom('lobby')); }
  function openRoom(name) {
    const ch = sb.channel('thornwake:' + name, {config: {presence: {key: TAB}, broadcast: {self: false}}});
    const states = {}, members = new Set(), subs = [];
    let mine = {}, sendTimer = 0, lastSend = 0, closed = false, joined = false;
    const notify = () => { for (const [cb] of subs) try { cb(); } catch (e) { console.error(e); } };
    const sendNow = () => {
      sendTimer = 0; lastSend = Date.now();
      if (joined && !closed) ch.send({type: 'broadcast', event: 's', payload: {p: TAB, s: mine}});
    };
    // snapshots arrive about 10 times a second; send the latest state at most every 100 ms
    const send = () => { if (!sendTimer) sendTimer = setTimeout(sendNow, Math.max(0, 100 - (Date.now() - lastSend))); };
    ch.on('presence', {event: 'sync'}, () => {
      members.clear();
      for (const k of Object.keys(ch.presenceState())) members.add(k);
      for (const k of Object.keys(states)) if (!members.has(k)) delete states[k];
      notify();
    });
    ch.on('presence', {event: 'join'}, ({key}) => { if (key !== TAB) send(); }); // newcomers need everyone's current state
    ch.on('broadcast', {event: 's'}, ({payload}) => {
      if (!payload || typeof payload.p !== 'string' || payload.p === TAB || !payload.s || typeof payload.s !== 'object') return;
      states[payload.p] = payload.s; members.add(payload.p); notify();
    });
    const room = {
      peers() {
        const out = [{peer: TAB, sameTab: true, guest: !user, presence: mine}];
        for (const k of members) if (k !== TAB) out.push({peer: k, sameTab: false, guest: false, presence: states[k] || {}});
        return out;
      },
      presence(update) { Object.assign(mine, update); send(); return Promise.resolve(); },
      onPeers(cb, lost) { subs.push([cb, lost]); },
      join(sub) { return openRoom(name + ':' + sub); },
      async leave() { closed = true; clearTimeout(sendTimer); await sb.removeChannel(ch); },
    };
    return new Promise((resolve, reject) => {
      ch.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (joined) return;
          joined = true; ch.track({t: Date.now()}); send(); resolve(room);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!joined) { reject(new Error(status)); return; }
          if (!closed) for (const [, lost] of subs) if (lost) lost();
        }
      });
    });
  }
})();
