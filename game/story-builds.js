// Bounded, composable build choices. Enemy profiles do not inspect the chosen build.
const FW_TALENTS=[
  ['force','Blade Discipline','+4% attack and −2% magic per rank.'],
  ['focus','Spell Focus','+4% magic and −2% attack per rank.'],
  ['bastion','Bastion','+5% defense and −2% speed per rank.'],
  ['vitality','Vitality','+4% health and −2% mana per rank.'],
  ['reservoir','Deep Reservoir','+5% mana and −2% health per rank.'],
  ['tempo','Quick Hands','Basic attacks recover 3% faster; −1% attack power per rank.'],
  ['siphon','Sanguine Edge','Basic hits heal 1% of actual damage per rank; −1% maximum health per rank.'],
  ['execution','Finisher','+3% damage to foes below 35% health; potions heal 3% less per rank.'],
  ['element','Elemental Thesis','+3% damage in your chosen school, −1% in other schools, per rank.'],
  ['fleet','Fleetfoot','+3% movement speed; −1% defense per rank.']
].map(([id,name,desc])=>({id,name,desc}));
function fwTalentData(){
  const f=fwData();if(!f.talents||typeof f.talents!=='object'||Array.isArray(f.talents))f.talents={};
  for(const T of FW_TALENTS)f.talents[T.id]=clamp(Math.floor(Number(f.talents[T.id])||0),0,3);
  if(!FW_SCHOOLS.some(s=>s.id===f.affinity))f.affinity='ember';
  return f.talents;
}
function fwTalentBudget(){return Math.min(12,1+Math.floor((stData().lv-1)/5));}
function fwTalentSpent(){const r=fwTalentData();return FW_TALENTS.reduce((sum,t)=>sum+r[t.id],0);}
function fwTalent(id){return fwTalentData()[id]||0;}
function fwTalentBuy(id){
  const T=FW_TALENTS.find(t=>t.id===id),r=fwTalentData();
  if(ST.battle||!T||fwTalentSpent()>=fwTalentBudget()||r[id]>=3)return false;
  r[id]++;const s=stStats(),d=stData();d.hp=Math.min(d.hp,s.hp);d.mp=Math.min(d.mp,s.mp);stSave();return true;
}
function fwTalentRespec(){
  const d=stData(),fee=100+d.lv*10;if(ST.battle||!fwTalentSpent()||d.gold<fee)return false;
  d.gold-=fee;fwData().talents={};const s=stStats();d.hp=Math.min(d.hp,s.hp);d.mp=Math.min(d.mp,s.mp);stSave();return true;
}
const fwBuildStats=stStats;
stStats=function(){
  const s=fwBuildStats(),d=stData();if(!d?.frontier?.talents)return s;
  const r=fwTalentData();
  s.atk=Math.max(1,Math.round(s.atk*(1+r.force*.04-r.focus*.02-r.tempo*.01)));
  s.mag=Math.max(1,Math.round(s.mag*(1+r.focus*.04-r.force*.02)));
  s.def=Math.max(0,Math.round(s.def*(1+r.bastion*.05-r.fleet*.01)));
  s.spd=Math.max(1,Math.round(s.spd*(1-r.bastion*.02)));
  s.hp=Math.max(1,Math.round(s.hp*(1+r.vitality*.04-r.reservoir*.02-r.siphon*.01)));
  s.mp=Math.max(0,Math.round(s.mp*(1+r.reservoir*.05-r.vitality*.02)));return s;
};
function fwBuildMenu(){
  const d=stData(),r=fwTalentData(),f=fwData(),spent=fwTalentSpent(),budget=fwTalentBudget(),m=fwPanel('Buildcraft','YOUR HERO / YOUR SYNERGIES',`${budget-spent} available talent points · ${spent}/${budget} spent. Earn one at creation and one every five levels, up to twelve. Maximum three ranks per talent. Combine a class, weapon type, five equipment slots, four archive spells, one clan and one permanent secret eye. Tradeoffs prevent every path from excelling at everything.`);
  const active=FW_TALENTS.filter(t=>r[t.id]>0).sort((a,b)=>r[b.id]-r[a.id]).map(t=>t.name+' '+r[t.id]);
  m.appendChild(el('p','',active.length?'Your build: '+active.join(' / '):'No talents selected. You can save points until you know your preferred playstyle.'));
  const affinity=el('select');affinity.setAttribute('aria-label','Elemental thesis school');affinity.className='fwAffinity';
  for(const S of FW_SCHOOLS){const o=el('option','',S.name);o.value=S.id;o.selected=S.id===f.affinity;affinity.appendChild(o);}
  affinity.disabled=!!ST.battle;affinity.addEventListener('change',()=>{if(ST.battle)return;f.affinity=affinity.value;stSave();});m.append(el('p','','Elemental Thesis attunement (used only if that talent is trained):'),affinity);
  const list=el('div','fwCards');m.appendChild(list);
  for(const T of FW_TALENTS){
    const c=el('article','fwCard');c.append(el('h4','',`${T.name} · ${r[T.id]}/3`),el('p','',T.desc));
    fwButton(c,'Train · 1 point',()=>{fwTalentBuy(T.id);fwBuildMenu();},!!ST.battle||r[T.id]>=3||spent>=budget);list.appendChild(c);
  }
  m.appendChild(el('p','','Enemies have fixed roles and soft counters, never adaptive immunity. Armor reduces physical damage modestly; the slowest heavy attacks can be dodged. Elemental resistances are capped at 20%, vulnerabilities at 12%. A single-school build can still win; changing tactics makes it easier.'));
  fwButton(m,`Reset talents · ${100+d.lv*10} gold`,()=>{if(fwTalentRespec())fwBuildMenu();},!!ST.battle||!spent||d.gold<100+d.lv*10);
  fwButton(m,'Equipment & weapon shop',fwShop);fwButton(m,'Living grimoire',fwSpellbook);fwBack(m);
}
const fwBuildOpen=stOpenMenu;
stOpenMenu=function(){
  fwBuildOpen();if(ST.mode!=='menu')return;
  const m=$('stMenu'),b=el('button','fwButton','Buildcraft · talents & synergies');b.addEventListener('click',fwBuildMenu);m.insertBefore(b,m.firstChild.nextSibling);
};
const FW_ENEMY_PROFILES={
  charge:{role:'Armored charger',hint:'Dodge the long windup. Magic is slightly stronger.',physical:.9,magic:1.08},
  tide:{role:'Tidal controller',hint:'Wide tidal markers. Tide −20%; Frost +12%.',resist:'tide',weak:'frost'},
  gaze:{role:'Gaze hunter',hint:'Avoid its strike to escape a short root. Dawn +12%.',weak:'dawn'},
  heads:{role:'Many-headed bruiser',hint:'Broad attacks and slow regeneration. Ember +12%.',weak:'ember'},
  riddle:{role:'Spellward guardian',hint:'Physical +8%; magic −12%. Strikes drain a little mana.',physical:1.08,magic:.88},
  frost:{role:'Winter wyrm',hint:'Frost −20%; Ember +12%. Avoid freezing strikes.',resist:'frost',weak:'ember'},
  flame:{role:'Fire-born',hint:'Ember −20%; Tide +12%. Avoid lingering fire.',resist:'ember',weak:'tide'},
  venom:{role:'Venom hunter',hint:'Brief poison on a hit. Bloom +12%.',weak:'bloom'},
  swoop:{role:'Mobile skirmisher',hint:'Fast approach, small windup circle. Frost +12%.',weak:'frost'}
};
const fwBuildDamage=rtDamage;
rtDamage=function(foe,power,color,kind='mag',school){
  const P=FW_ENEMY_PROFILES[foe.pattern],d=stData();let mult=1;
  if(P){mult*=kind==='mag'?(P.magic||1):(P.physical||1);if(school===P.resist)mult*=.8;if(school===P.weak)mult*=1.12;}
  if(foe.hp<foe.maxHp*.35)mult*=1+fwTalent('execution')*.03;
  if(school&&fwTalent('element'))mult*=school===fwData().affinity?1+fwTalent('element')*.03:1-fwTalent('element')*.01;
  const dealt=fwBuildDamage(foe,power*mult,color,kind,school);
  return dealt;
};
const fwBuildMove=rtMove;
rtMove=function(dt){return fwBuildMove(dt*(1+fwTalent('fleet')*.03));};
const fwBuildUpdate=rtUpdate;
rtUpdate=function(dt){
  fwBuildUpdate(dt);const b=ST.battle;if(!b?.realtime||b.over||ST.mode!=='battle')return;
  for(const foe of b.foes)if(foe.pattern==='heads'&&foe.hp>0&&!(foe.rtBurnUntil>RT.time))foe.hp=Math.min(foe.maxHp,foe.hp+Math.min(6,foe.maxHp*.002)*Math.min(dt,.06));
};
const fwTarget=el('aside','fwTarget');fwTarget.id='fwTarget';fwTarget.hidden=true;$('story').appendChild(fwTarget);
const fwBuildToolbar=rtToolbar;
rtToolbar=function(force=false){
  fwBuildToolbar(force);const foe=rtTarget();fwTarget.hidden=!(rtActive()&&ST.mode==='battle'&&foe);
  if(foe){const P=FW_ENEMY_PROFILES[foe.pattern];fwTarget.textContent=foe.name+(P?' · '+P.role+'\n'+P.hint:' · Watch its ground marker, then strike between attacks.');}
};
const fwBuildStyle=el('style');fwBuildStyle.textContent=`
.fwAffinity{min-height:44px;background:#1b3025;color:#eddfbd;border:1px solid #7d8a67;font-size:16px;padding:8px}
.fwTarget{position:absolute;z-index:25;top:12px;left:50%;transform:translateX(-50%);width:min(380px,40%);padding:8px 12px;background:#15271fe8;border:1px solid #9b9d72;color:#ece0b9;font:14px/1.4 'Barlow Semi Condensed',sans-serif;white-space:pre-line;pointer-events:none}
.fwTarget[hidden]{display:none}@media(max-width:640px){.fwTarget{top:118px;left:8px;transform:none;width:180px;font-size:12px;padding:6px}}
`;document.head.appendChild(fwBuildStyle);
ST_GUIDE.push(['Buildcraft & enemy counterplay','Ten talents, three ranks each, twelve total points by late game. Attack, magic, defense, health, mana, attack tempo, lifesteal, finishing damage, elemental specialization and movement all have tradeoffs. Combine talents with class abilities, real weapon ranges/speeds, equipment, four archive spells, clan passives and one permanent secret eye. Reset talents for earned gold outside combat. Mythological foes have visible, fixed soft counters: no build-reading or full elemental immunity. Resistances never exceed 20%; vulnerabilities never exceed 12%.']);
