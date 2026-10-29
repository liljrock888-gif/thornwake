// Loaded inside the game closure after class ownership and balance, before startup.
// Collection is additive save data; summoned combatants are deliberately battle-local.
const ST_SOUL_ODDS = {ordinary:.35,boss:.08};
const ST_SOUL_STARTER = {name:'Gravebound Skeleton',draw:'skeleton',boss:false};
LOOKS.necromancer = {...LOOKS.warlock,skin:'#c8cbb3',body:'#35463e',glow:'#a5dcc3'};
LOOK_STYLE.necromancer = 'magic';

Object.assign(ST_SKILLS.necromancer_tier0,{
  name:'Raise Dead',kind:'mag',mp:8,mult:0,summon:'undead',all:false,
  desc:'Raise an unraised fallen enemy in this battle, or your selected grimoire soul if none has fallen. One summon beside your companion; attacks, can absorb hits, and lasts 5 allied turns. Available from level 1.'
});
Object.assign(ST_SKILLS.warlock_tier0,{
  name:'Call Imp',kind:'mag',mp:8,mult:0,summon:'imp',all:false,
  desc:'Call a Brimstone Imp for 5 allied turns. It attacks with magic, ignites its target and can absorb enemy hits. One summon beside your companion.'
});
Object.assign(ST_SKILLS.warlock_4,{
  kind:'mag',mp:0,mult:0,bloodOffering:true,
  desc:'Once per battle, sacrifice 12% of maximum health to restore 25% of maximum mana. Cannot kill you or be used at full mana. Uses your turn.'
});
for(const id of ['warlock_tier2','warlock_tier4']){
  ST_SKILLS[id].burn=true;ST_SKILLS[id].desc=stBalanceDescription(ST_SKILLS[id]);
}
ST_SKILLS.warlock_tier3.drainRatio=.35;
ST_SKILLS.warlock_tier3.desc=stBalanceDescription(ST_SKILLS.warlock_tier3);
SK_COLOR.necromancer_tier0='#a5dcc3';SK_FX.necromancer_tier0='runes';
SK_COLOR.warlock_tier0='#ffb078';SK_FX.warlock_tier0='runes';
for(const id of Object.keys(ST_SKILLS).filter(id=>ST_SKILLS[id].owner==='warlock'))SK_COLOR[id]='#e4a07c';

function stSoulDefinition(key){return key==='bone_thrall'?ST_SOUL_STARTER:ST_FOES[key];}
function stSoulBook(d=stData()){
  if(!d.soulBook||typeof d.soulBook!=='object'||Array.isArray(d.soulBook))d.soulBook={};
  const book=d.soulBook;
  if(!book.entries||typeof book.entries!=='object'||Array.isArray(book.entries))book.entries={};
  if(!book.entries.bone_thrall||!(book.entries.bone_thrall.copies>0))book.entries.bone_thrall={copies:1,attempts:0,starter:true};
  for(const [key,e]of Object.entries(book.entries)){
    if(!stSoulDefinition(key)||!e||typeof e!=='object')continue;
    for(const field of ['copies','attempts'])e[field]=Number.isFinite(e[field])?clamp(Math.floor(e[field]),0,1000000):0;
  }
  if(!stSoulDefinition(book.selected)||!(book.entries[book.selected]?.copies>0))book.selected='bone_thrall';
  if(!Array.isArray(book.last))book.last=[];
  book.version=1;return book;
}
const stSoulBaseSync=stSyncProgress;
stSyncProgress=function(notify){stSoulBaseSync(notify);if(stData()?.cls==='necromancer')stSoulBook();};

function stSoulCollectVictory(b,lines){
  const d=stData();
  if(d.cls!=='necromancer'||d.hr||b.soulsRolled)return;
  b.soulsRolled=true;
  const book=stSoulBook(),results=[];
  for(const f of b.foes){
    if(f.hp>0||!ST_FOES[f.key])continue;
    const chance=f.boss?ST_SOUL_ODDS.boss:ST_SOUL_ODDS.ordinary;
    const old=book.entries[f.key];
    const e=old&&typeof old==='object'?old:(book.entries[f.key]={copies:0,attempts:0});
    e.attempts=(e.attempts||0)+1;
    const bound=Math.random()<chance;
    if(bound)e.copies=(e.copies||0)+1;
    const result={key:f.key,bound,chance,copies:e.copies||0};
    results.push(result);
    const message=bound
      ?`${f.name}'s soul bound to your grimoire! ${e.copies===1?'New undead unlocked.':`Soul strength +3% (up to +12%). ${e.copies} souls bound.`}`
      :`${f.name}'s soul escaped the grimoire (${Math.round(chance*100)}% binding chance). Defeat another to try again.`;
    lines.push(['Grimoire of the Fallen',message]);stLog(message);
    if(bound)stLearnNotice('Soul bound: '+f.name,'#a5dcc3');
  }
  book.last=results.slice(-8);
  stSave();
}
function stHexPower(power,target,kind){
  return power*(stData().cls==='warlock'&&kind==='mag'&&target.hex>0?1.2:1);
}
function stSoulSkillLocked(S,b,d){
  if(S.summon)return !!(b.summon&&b.summon.hp>0);
  if(S.bloodOffering){const s=stStats();return !!b.bloodOffering||d.mp>=s.mp||d.hp<=Math.ceil(s.hp*.12);}
  return false;
}
function stSoulCast(id){
  const b=ST.battle,d=stData(),S=ST_SKILLS[id];
  if(!b||b.over||b.turn!=='player'||!S||!stOwnsSkill(d,id)||!d.skills.includes(id)||d.mp<stSkCost(S)||stSoulSkillLocked(S,b,d))return;
  const s=stStats();
  b.turn='anim';ST.sub=null;d.mp-=stSkCost(S);stMaster(id);
  stAnim('p','cast',.5);
  if(S.bloodOffering){
    const hp=Math.ceil(s.hp*.12),mp=Math.min(s.mp-d.mp,Math.ceil(s.mp*.25));
    b.bloodOffering=true;d.hp-=hp;d.mp+=mp;
    stNum('p','-'+hp+' HP / +'+mp+' MP','#e4a07c');
    stEffect('runes','p','#d58975');stLog(`Blood Offering: sacrificed ${hp} health for ${mp} mana. Pact spent until next battle.`);
  }else{
    const book=S.summon==='undead'?stSoulBook():null;
    const corpse=book?b.foes.find(f=>f.hp<=0&&!f.raised&&ST_FOES[f.key]):null;
    const key=book?(corpse?.key||book.selected):'imp',F=stSoulDefinition(key);
    if(corpse)corpse.raised=true;
    const bonus=book?1+Math.min(4,Math.max(0,(book.entries[key]?.copies||1)-1))*.03:1;
    const hp=Math.round((s.hp*.38+10)*bonus);
    b.summon={key,name:book?(key==='bone_thrall'?F.name:'Risen '+F.name):'Pact Imp',
      hp,maxHp:hp,atk:(s.mag*.6+3)*bonus,def:s.def*.35,
      turns:5,attacks:0,undead:!!book,burn:!book,source:corpse?'fallen':'bound'};
    stEffect('runes','s',book?'#a5dcc3':'#e4a07c');stBurst('s',book?'#a5dcc3':'#e4a07c',20);
    stLog(`${b.summon.name} ${corpse?'rises from a fallen enemy':'answers your '+(book?'grimoire':'pact')}! It fights for 5 allied turns.`);
    stCallout(book?'THE FALLEN RISE':'THE PACT ANSWERS',book?'#a5dcc3':'#e4a07c');
  }
  sfx('shield');stRenderBattle();
  setTimeout(()=>{if(ST.battle===b&&!b.over)stEndTurn();},450);
}
function stSoulSummonTurn(b){
  const a=b.summon,t=b.foes.find(f=>f.hp>0);
  if(!a||a.hp<=0||!t)return;
  const damage=Math.min(t.hp,stDmg(stHexPower(a.atk,t,a.burn?'mag':'phys'),a.burn?t.def*.5:t.def));
  t.hp=Math.max(0,t.hp-damage);t.flash=.25;if(t.hp<=0)t.deadT=0;
  if(a.burn&&t.hp>0)t.burn=Math.max(t.burn||0,2);
  a.attacks++;stAnim('s',a.burn?'cast':'lunge');stAnim(t.id,'hurt');
  stEffect(a.burn?'zap':'slash',t.id,a.burn?'#e4a07c':'#a5dcc3');
  stNum(t.id,damage,a.burn?'#e4a07c':'#a5dcc3');
  stLog(`${a.name} strikes ${t.name} for ${damage}${a.burn&&t.hp>0?' and ignites it':''}.`);
}
function stSoulSummonTick(b){
  const a=b.summon;if(!a||a.hp<=0)return;
  if(--a.turns<=0){a.hp=0;stLog(`${a.name}'s binding fades. You may summon again.`);}
}
function stSoulIntercept(b,f){
  const a=b.summon;if(!a||a.hp<=0||Math.random()>=.25)return false;
  const damage=Math.min(a.hp,stDmg(f.atk,a.def));a.hp=Math.max(0,a.hp-damage);
  stAnim(f.id,'lunge');stAnim('s','hurt');stNum('s',damage,'#e4a07c');
  stLog(`${f.name} hits ${a.name} for ${damage}.${a.hp<=0?' The summon falls; its soul remains yours.':''}`);
  return true;
}
function stDrawSkeleton(g,x,y,scale,now){
  g.save();g.translate(x,y+Math.sin(now*3)*2);g.scale(scale,scale);
  inkOval(g,0,0,21,6,'#151f1c80',null);
  const bone='#e3dcc3',edge='#8da891';
  inkLine(g,[[0,-63],[0,-24]],bone,5);
  for(const dy of [-53,-46,-39]){inkLine(g,[[-15,dy],[0,dy+4],[15,dy]],bone,3);inkLine(g,[[-15,dy],[-12,dy+7]],edge,2);inkLine(g,[[15,dy],[12,dy+7]],edge,2);}
  inkLine(g,[[-14,-54],[-23,-39],[-18,-24]],bone,4);inkLine(g,[[14,-54],[25,-40],[30,-27]],bone,4);
  inkLine(g,[[-10,-25],[0,-21],[10,-25]],bone,4);
  for(const side of [-1,1]){inkLine(g,[[side*8,-22],[side*14,-12],[side*13,-2],[side*21,0]],bone,4);}
  inkOval(g,0,-72,15,17,bone,edge);
  inkPath(g,[[-11,-65],[11,-65],[8,-54],[-8,-54]],bone,edge);
  inkOval(g,-6,-73,4,5,'#213e33',null);inkOval(g,6,-73,4,5,'#213e33',null);
  inkOval(g,-6,-73,2,2,'#b9f2cf',null);inkOval(g,6,-73,2,2,'#b9f2cf',null);
  for(const xx of [-6,-2,2,6])inkLine(g,[[xx,-62],[xx,-56]],edge,1);
  g.restore();
}
function stDrawSoulSummon(b,x,y,now,k){
  const a=b.summon;if(!a||a.hp<=0)return;
  STFX.pos.s=[x,y];const [ox,oy]=stFxOffset('s');
  ctx.save();
  ctx.strokeStyle=a.undead?'#a5dcc3':'#e4a07c';ctx.fillStyle=a.undead?'#5aaf8d22':'#d97f4b22';
  ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+4,34*k,11*k,0,0,7);ctx.fill();ctx.stroke();
  ctx.globalAlpha=.85;
  if(a.key==='bone_thrall')stDrawSkeleton(ctx,x+ox,y+oy,k*.9,now);
  else stDrawFoe(a.key,x+ox,y+oy,now,k*.75,0,0);
  ctx.globalAlpha=1;ctx.font='600 12px \"Barlow Semi Condensed\",sans-serif';ctx.textAlign='center';
  ctx.fillStyle=a.undead?'#c3e9d5':'#f4c39e';ctx.fillText(a.undead?'RISEN ALLY':'PACT IMP',x,y+23);
  ctx.fillStyle='#161d1a';ctx.fillRect(x-27,y+29,54,4);
  ctx.fillStyle=a.undead?'#a5dcc3':'#e4a07c';ctx.fillRect(x-27,y+29,54*a.hp/a.maxHp,4);
  ctx.restore();
}
function stSoulBookMenu(){
  const d=stData();if(d.cls!=='necromancer')return;
  const book=stSoulBook(),m=stSystemPanel('Grimoire of the Fallen');
  const shell=el('section','soulBook'),top=el('header','soulBookHead'),sigil=el('div','soulSigil');
  sigil.setAttribute('aria-hidden','true');sigil.textContent='✧';
  const title=el('div');title.append(el('small','soulKicker','NECROMANCER / SOUL ARCHIVE'),el('h2','','The dead remember.'),el('p','','Defeat. Bind. Raise again.'));
  const keys=['bone_thrall',...Object.keys(ST_FOES)],count=keys.filter(key=>book.entries[key]?.copies>0).length;
  top.append(sigil,title,el('div','soulCount',`${count} / ${keys.length} bound`));shell.appendChild(top);
  shell.append(el('p','soulRules','After victory, each defeated enemy has a 35% binding chance; bosses have 8%. Binding is automatic. Duplicates strengthen that summon by 3%, up to +12%. Souls are never consumed.'));
  shell.append(el('p','soulRules','Raise Dead prefers an unraised corpse in your current battle; otherwise it calls your selected soul. One summon, separate from your companion, for 5 allied turns. Enemy forms scale to your stats, including boss echoes.'));
  if(d.hr)shell.append(el('p','soulRules','Heavenly Restriction seals raising and new soul bindings. Your collection is preserved.'));
  if(book.last.length){
    const receipt=el('section','soulReceipt');receipt.appendChild(el('h4','','Last victory'));
    for(const r of book.last){const F=stSoulDefinition(r.key);if(F)receipt.appendChild(el('p',r.bound?'bound':'escaped',`${r.bound?'BOUND':'ESCAPED'} · ${F.name} · ${Math.round(r.chance*100)}% chance${r.bound?' · '+r.copies+' souls':''}`));}
    shell.appendChild(receipt);
  }
  const controls=el('div','soulTools'),search=el('input'),filter=el('select');
  search.type='search';search.placeholder='Search defeated creatures…';search.setAttribute('aria-label','Search souls');
  filter.setAttribute('aria-label','Soul filter');
  for(const [value,text]of [['all','All souls'],['bound','Bound souls'],['unbound','Unbound souls']]){const option=el('option','',text);option.value=value;filter.appendChild(option);}
  controls.append(search,filter);shell.appendChild(controls);
  const grid=el('div','soulGrid');grid.setAttribute('aria-live','polite');shell.appendChild(grid);
  const draw=()=>{
    grid.replaceChildren();
    const shown=keys.filter(key=>{
      const e=book.entries[key],bound=e?.copies>0,seen=bound||e?.attempts>0,F=stSoulDefinition(key);
      return (filter.value==='all'||(filter.value==='bound'?bound:!bound))&&(!search.value.trim()||(seen&&F.name.toLowerCase().includes(search.value.trim().toLowerCase())));
    }).sort((a,b)=>(b===book.selected)-(a===book.selected)||((book.entries[b]?.copies>0)-(book.entries[a]?.copies>0))||a.localeCompare(b));
    if(!shown.length){grid.appendChild(el('p','soulEmpty','No matching souls. Try another search or defeat more enemies.'));return;}
    for(const key of shown){
      const F=stSoulDefinition(key),e=book.entries[key],bound=e?.copies>0,seen=bound||e?.attempts>0,selected=key===book.selected;
      const card=el('article','soulCard'+(bound?' isBound':'')+(selected?' isSelected':'')),art=el('canvas');
      art.width=180;art.height=130;art.setAttribute('aria-hidden','true');
      const g=art.getContext('2d');g.fillStyle=bound?'#c4dfce':'#655e53';g.textAlign='center';g.font='52px \"Cinzel\",serif';
      if(!seen){g.fillText('?',90,88);}else if(key==='bone_thrall')stDrawSkeleton(g,90,116,1.05,0);
      else{
        const u={x:90,y:118,id:1,team:1,level:1,walk:0,_lw:0,face:0,atkT:0,atkCd:1,hitFlash:0,look:F.look||'knight',color:F.color||'#54705d',enemyKey:key,foe:F,fur:F.fur,horns:F.horns};
        if(!bound)g.globalAlpha=.4;
        g.save();if(F.draw==='hero'||F.draw==='goblin')drawStorybookCharacter(g,u,0);else {g.translate(90,118);g.scale(.8,.8);g.translate(-90,-118);drawDreadCreature(g,F,u,0,key);}g.restore();
      }
      const rank=bound?Math.min(4,e.copies-1)*3:0;
      card.append(el('small','soulCardTag',selected?'SELECTED':key==='bone_thrall'?'STARTER SIGIL':F.boss?'BOSS ECHO · 8%':'SOUL ECHO · 35%'),art,
        el('h4','',seen?F.name:'Undiscovered soul'),
        el('p','',bound?`${key==='bone_thrall'?'Starter binding':e.copies+' souls bound'} · +${rank}% strength`:seen?`${e.attempts} defeated · soul escaped`:'Defeat this creature to reveal its entry.'));
      const select=el('button',selected?'primary':'',selected?'Selected for raising':bound?'Select soul':'Not yet bound');
      select.disabled=!bound||selected;
      select.addEventListener('click',()=>{if(stData()!==d||!(book.entries[key]?.copies>0))return;book.selected=key;stSave();draw();});
      card.appendChild(select);grid.appendChild(card);
    }
  };
  search.addEventListener('input',draw);filter.addEventListener('change',draw);
  m.appendChild(shell);draw();stPanelBack(m);m.scrollTop=0;
}
const stSoulStyles=el('style');
stSoulStyles.textContent=`
.soulBook{--soul-ink:#dfe8d7;--soul-muted:#bac6b7;--soul-accent:#a5dcc3;color:var(--soul-ink)}
.soulBookHead{display:flex;align-items:center;gap:20px;padding:24px 0 20px;border-bottom:1px solid #78938455}
.soulBookHead h2{font:600 clamp(23px,3vw,34px)/1.2 'Cinzel',serif;margin:7px 0}
.soulBookHead p{margin:0;color:var(--soul-muted)}.soulKicker,.soulCardTag{font-size:12px;letter-spacing:.09em;color:var(--soul-accent)}
.soulSigil{font-size:54px;color:var(--soul-accent);width:74px;height:74px;border:1px solid #78938488;display:grid;place-items:center;flex-shrink:0;border-radius:50%}
.soulCount{margin-left:auto;color:var(--soul-accent);font-size:14px;white-space:nowrap}
#stMenu .soulRules{font-size:14px;line-height:1.6;color:var(--soul-muted);margin:16px 0}
.soulReceipt{border-left:2px solid var(--soul-accent);padding:4px 16px;background:#394c3e22;margin:20px 0}
.soulReceipt h4{margin:5px 0 9px}.soulReceipt .bound{color:#b6e4c9}.soulReceipt .escaped{color:#d3c5aa}
.soulTools{display:flex;gap:12px;margin:24px 0 16px}.soulTools input{flex:1;min-width:0}.soulTools select{max-width:180px}
.soulTools input,.soulTools select{min-height:44px;border:1px solid #697a66;background:#171d1b;color:var(--soul-ink);padding:10px 12px;border-radius:5px;font:inherit}
.soulGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.soulCard{min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;background:#20231f;border:1px solid #635e4b;padding:16px 12px;border-radius:5px}
.soulCard.isBound{background:#202e27;border-color:#789384}.soulCard.isSelected{box-shadow:inset 0 0 0 1px var(--soul-accent)}
.soulCard canvas{width:160px;max-width:100%;height:116px;object-fit:contain}
#stMenu .soulCard h4{font-size:16px;margin:8px 0;line-height:1.4}#stMenu .soulCard p{font-size:13px;line-height:1.5;margin:0 0 16px;color:var(--soul-muted)}
.soulCard button{margin-top:auto;min-height:44px;width:100%;white-space:normal}.soulEmpty{grid-column:1/-1;padding:24px 0}
body:has(#stMenu:not([hidden]) .soulBook) #stLearnNotices{visibility:hidden}
@media(max-width:640px){#stParty .pm.summonRow{flex:1 1 100%;grid-template-columns:minmax(0,1fr) minmax(90px,.65fr)}#stParty .pm.summonRow b{white-space:normal}}
@media(max-width:640px){.soulBookHead{gap:12px;flex-wrap:wrap;padding:12px 0 16px}.soulSigil{width:46px;height:46px;font-size:34px}.soulBookHead>div:nth-child(2){flex:1}.soulCount{margin:0 0 0 58px}.soulGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.soulTools{gap:8px}.soulTools input,.soulTools select{font-size:13px;padding:8px}.soulTools select{max-width:125px}.soulCard{padding:12px 8px}.soulCardTag{font-size:12px;letter-spacing:0}.soulCard canvas{height:95px}.soulCard button{font-size:13px}}
`;
document.head.appendChild(stSoulStyles);
ST_GUIDE.push(
  ['Stacking attack & defense buffs','Attack and defense buffs have separate pools capped at 3 stacks. Total attack bonuses: +25%, +40%, +50%; defense: +40%, +65%, +80%. These are cumulative totals, not bonuses multiplied together. Each cast costs its normal mana and one turn, and refreshes only its own pool for 4 enemy turns, including the turn you cast. Recasting at 3 stacks refreshes duration only. Badges show stacks and turns; expiry, defense breaks and new battles clear stacks. Defend, shields and transformations do not gain multiple stacks.'],
  ['Necromancer & the soul grimoire','Necromancer is a playable class with Raise Dead from level 1. Open Menu → Grimoire of the Fallen. Winning rolls a 35% binding chance for each ordinary defeated enemy or 8% for bosses. Choose a bound soul for future battles. Duplicates add 3% summon strength, up to 12%; souls are never consumed. Raise Dead first uses a fallen enemy in the current battle, otherwise your selected soul. One summon alongside your companion, for five allied turns. Existing Necromancers receive the grimoire and Raise Dead without restarting.'],
  ['Warlock & infernal pacts','Choose Warlock when creating a new hero. Call Imp unlocks at level 1 and gives a separate fighting summon. Binding Hex makes its target take 20% more Warlock magic damage for three turns; Hellfire and Brimstone burn enemies. Learn Blood Offering from Class abilities at level 5: trade 12% maximum health for 25% maximum mana once per battle, never lethally. Warlocks do not collect undead souls.']
);
