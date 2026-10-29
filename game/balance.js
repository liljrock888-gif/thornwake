// Balance pass 58. Data-only tuning keeps every ability's owner and unlock level.
const ST_BALANCE_VERSION = 63;
const ST_CLASS_TUNING = {
  warrior: {role:'Armored frontline fighter; reliable strikes and group control.',base:{hp:124,mp:34,atk:15,mag:4,def:9,spd:6},growth:{hp:15,mp:5,atk:2.2,mag:1.2,def:1.35,spd:.35}},
  mage: {role:'High magical burst and area damage; fragile without a shield.',base:{hp:92,mp:74,atk:6,mag:17,def:4,spd:7},growth:{hp:12,mp:7,atk:1.3,mag:2.3,def:1,spd:.4}},
  ranger: {role:'Efficient ranged damage, poison arrows and flexible volleys.',base:{hp:108,mp:48,atk:14,mag:7,def:6,spd:10},growth:{hp:13.5,mp:5.5,atk:2.15,mag:1.3,def:1.1,spd:.45}},
  rogue: {role:'Fast single-target burst and poison; lower armor rewards planning.',base:{hp:100,mp:44,atk:15,mag:6,def:5,spd:12},growth:{hp:13,mp:5,atk:2.2,mag:1.2,def:1.05,spd:.5}},
  paladin: {role:'Durable hybrid with healing and wards; less burst than specialists.',base:{hp:122,mp:52,atk:12,mag:11,def:9,spd:5},growth:{hp:14.5,mp:6,atk:1.85,mag:1.85,def:1.3,spd:.3}},
  gunner: {role:'Strong direct shots and costly barrages; limited defensive tools.',base:{hp:102,mp:44,atk:16,mag:3,def:5,spd:8},growth:{hp:13,mp:5,atk:2.25,mag:1.1,def:1.05,spd:.4}},
  necromancer: {role:'Raise the fallen, bind their souls in your grimoire, and sustain undead with life drain.',base:{hp:96,mp:70,atk:5,mag:15,def:5,spd:7},growth:{hp:12.5,mp:6.5,atk:1.2,mag:2.15,def:1.05,spd:.35}},
  warlock: {role:'An infernal pact: command an imp, amplify magic with Hex, and trade health for mana.',base:{hp:100,mp:66,atk:6,mag:16,def:4,spd:8},growth:{hp:12.5,mp:6,atk:1.25,mag:2.2,def:1,spd:.4}},
  monk: {role:'Mobile martial support; ki attacks and self-healing scale with attack.',base:{hp:110,mp:46,atk:14,mag:8,def:7,spd:11},growth:{hp:14,mp:5.5,atk:2.1,mag:1.4,def:1.2,spd:.45}},
  druid: {role:'Nature-based group control and strong healing; moderate direct damage.',base:{hp:104,mp:66,atk:7,mag:14,def:6,spd:7},growth:{hp:13.5,mp:6.5,atk:1.4,mag:2.05,def:1.15,spd:.35}},
  berserker: {role:'Highest physical offense and health, balanced by low armor and mana.',base:{hp:138,mp:32,atk:17,mag:2,def:4,spd:7},growth:{hp:16,mp:4.5,atk:2.35,mag:1,def:.95,spd:.35}},
  blademaster: {role:'Precise, sustained weapon damage with parries and measured bursts.',base:{hp:106,mp:44,atk:15,mag:5,def:7,spd:10},growth:{hp:13.5,mp:5,atk:2.2,mag:1.2,def:1.15,spd:.45}},
};
for(const [cls,T] of Object.entries(ST_CLASS_TUNING))Object.assign(ST_CLASSES[cls],T.base,{growth:T.growth,role:T.role});
const ST_PROPERTY_BALANCE = {
  willowhome:{price:250,target:'Starter home: save early quest and first-contract gold.'},
  homestead:{price:600,target:'Working farm: a larger investment with twelve crop plots.'},
  harborhome:{price:900,target:'Established adventurer: regional quests and trade earnings.'},
  townhome:{price:1800,target:'Midgame residence: guild jobs and dungeon rewards.'},
  briarmanor:{price:4800,target:'Late-midgame estate: major quests and boss rewards.'},
  suncrest:{price:10000,target:'Endgame estate: a long-term goal, not an early purchase.'},
};
for(const P of ST_PROPERTIES)Object.assign(P,ST_PROPERTY_BALANCE[P.id]);
// Cumulative bonuses, not three multiplicative buffs. Building both pools takes
// six paid actions; each pool expires unless refreshed within four enemy turns.
const ST_STACK_BUFFS = {
  rally:{name:'Attack',bonuses:[.25,.4,.5],turns:4},
  guard:{name:'Defense',bonuses:[.4,.65,.8],turns:4}
};
function stBuffStacks(b,key){
  if(!ST_STACK_BUFFS[key]||!(b.buffs?.[key]>0))return 0;
  return clamp(Math.floor(b.buffStacks?.[key]||1),1,3);
}
function stBuffMultiplier(b,key){
  const n=stBuffStacks(b,key);return 1+(n?ST_STACK_BUFFS[key].bonuses[n-1]:0);
}
function stApplyStackBuff(b,key){
  const T=ST_STACK_BUFFS[key];if(!T)return false;
  const n=Math.min(3,stBuffStacks(b,key)+1);
  b.buffStacks=b.buffStacks||{};b.buffStacks[key]=n;b.buffs[key]=T.turns;return true;
}
function stTickCombatBuffs(b){
  for(const key of ['guard','rally','wolf','mist','vamp','rage','stone','ward']){
    if(!b.buffs[key])continue;
    if(--b.buffs[key]===0){
      if(ST_STACK_BUFFS[key]){if(b.buffStacks)b.buffStacks[key]=0;stLog('Your '+ST_STACK_BUFFS[key].name.toLowerCase()+' buff expires.');}
      else if(key==='ward')stLog('Your shield fades.');
    }
  }
}
// Per-slot [mana, multiplier, optional effect overrides]. Costs are base values;
// the existing level multiplier remains in force and menus show the real cost.
const ST_ABILITY_TUNING = {
  warrior:[[6,1.75],[5,1],[6,1],[11,.95],[8,2.05],[10,1.25],[16,1.35],[12,1]],
  mage:[[8,1.9],[7,1.45],[13,1.15],[10,1],[6,1.55],[14,.9,{slow:true,slowP:.3,poison:false}],[12,2.5],[19,1.65]],
  ranger:[[10,.95],[6,1.05],[6,1.75],[5,1],[9,1.2],[9,1.65,{slowP:.4}],[14,.95],[6,1]],
  rogue:[[6,1.8],[6,1],[9,1],[7,1.05],[8,1.4,{slowP:.4}],[12,2.55],[14,.85],[6,1]],
  paladin:[[6,1.7],[9,2.3],[5,1],[11,1],[13,1.05],[11,2.15],[15,3.1],[6,1]],
  gunner:[[10,1],[6,1.8],[8,1.7],[5,1],[10,1.25],[9,1.55,{slowP:.35}],[15,1.15],[19,1.65]],
  necromancer:[[7,1.65],[9,1.35],[12,.75],[5,1],[10,2.2],[14,1.9],[17,1.05,{drain:true,drainRatio:.25}],[11,1]],
  warlock:[[7,1.7],[9,1.65],[6,.75,{hex:true}],[10,1],[0,1],[13,1.8,{drainRatio:.35}],[18,1.35,{burn:true}],[16,.85,{hex:true,poison:false}]],
  monk:[[7,1.1],[5,1],[6,1.75],[10,2.1,{scale:'atk',scaleMult:.8}],[8,1.4,{slowP:.4}],[11,2.4],[14,1.05,{scale:'atk'}],[11,1]],
  druid:[[7,1.4],[10,2.6],[12,.9,{kind:'mag'}],[5,1],[14,.85],[10,2.1],[12,1],[17,3.5]],
  berserker:[[6,1.8],[6,1],[11,.95],[9,1.2],[11,1.55,{drainRatio:.35}],[12,2.5],[5,1],[17,1.4]],
  blademaster:[[7,1.1],[6,1.8],[5,1],[6,1],[8,1.5,{slowP:.35}],[13,1.15],[14,1.65],[12,1]],
};
function stBalanceDescription(S){
  const effects=[];
  if(S.kind==='heal')effects.push('Restores health to you and your ally');
  else if(S.kind==='buff'){
    const T=ST_STACK_BUFFS[S.buff];
    if(T)effects.push(`Stacks ${T.name.toLowerCase()} up to 3 times: ${T.bonuses.map(n=>'+'+Math.round(n*100)+'%').join(' / ')} total. Each cast refreshes 4 enemy turns; at cap, refreshes only`);
    else effects.push(S.buff==='ward'?'Reduces incoming damage by 60% for 2 turns':S.buff==='wolf'?'+80% attack for 3 turns':S.buff==='vamp'?'+50% attack and magic for 3 turns':'Evasive form for 2 turns');
  }
  else effects.push(`${Math.round(S.mult*100)}% ${S.scale==='atk'?'attack':S.kind==='mag'?'magic':'attack'} power${S.all?' to every foe':''}${S.twice?' plus a 70% follow-up hit':''}`);
  if(S.burn)effects.push('burns for 2 turns');
  if(S.poison)effects.push('poisons for 3 turns');
  if(S.slow)effects.push(`${Math.round((S.slowP??.5)*100)}% chance to interrupt one turn (bosses resist)`);
  if(S.drain)effects.push(`heals for ${Math.round((S.drainRatio??.5)*100)}% of actual damage dealt`);
  if(S.hex)effects.push('Hex: takes 20% more Warlock magic damage for 3 turns');
  return effects.join('; ')+'.';
}
for(const [cls,slots]of Object.entries(ST_ABILITY_TUNING))slots.forEach(([mp,mult,extra],i)=>{
  const S=ST_SKILLS[cls+'_'+i];Object.assign(S,{mp,mult},extra||{});S.desc=stBalanceDescription(S);
});
for(const cls of Object.keys(ST_CLASSES))for(let i=0;i<5;i++){
  const S=ST_SKILLS[stTierSkill(cls,i)];
  // Mage's tier-IV drain stays single-target; physical tier IV is a double hit.
  const mult=cls==='mage'?[1.25,2.05,1.45,2.7,2.15]:['paladin','necromancer','warlock','druid'].includes(cls)?[1.3,2.05,1.3,2.45,1.95]:[1.3,2.05,1.15,1.55,1.8];
  S.mp=[4,9,16,23,30][i];S.mult=mult[i];S.desc=stBalanceDescription(S);
}
ST_SKILLS.cindertempest.burn=true;
ST_SKILLS.cindertempest.desc=stBalanceDescription(ST_SKILLS.cindertempest);
// A single shared implementation is used by single-target and area attacks.
function stAbilityEffects(S,t,dealt,s){
  if(t.hp>0){
    if(S.hex){t.hex=Math.max(t.hex||0,3);stNum(t.id,'Hexed','#d4a4e8');}
    if(S.burn)t.burn=Math.max(t.burn||0,2);
    if(S.poison)t.poison=Math.max(t.poison||0,3);
    if(S.slow&&Math.random()<(S.slowP??.5)*(t.boss ? .4 : 1)){t.frozen=1;stNum(t.id,'Interrupted','#9fe6ff');}
  }
  if(S.drain&&dealt>0){const d=stData(),h=Math.round(dealt*(S.drainRatio??.5));d.hp=Math.min(s.hp,d.hp+h);stNum('p','+'+h,'#6be08a');stBurst('p','#b06bff',10);}
}
function stAbilityPower(S,s,b,rank){
  const stat=S.scale==='atk'?s.atk*(S.scaleMult||1):(S.kind==='mag'||S.kind==='heal'?s.mag:s.atk);
  const buff=S.scale==='atk'||!['mag','heal'].includes(S.kind)?stAtkMul(b):(b.buffs.vamp?1.5:1);
  return stat*buff*(S.mult||1)*(S.kind==='heal'||S.all?1+.2*rank:1);
}
function stDotDamage(f,rate=.06,floor=1){
  // Ordinary enemies retain 6%-health DoTs. Bosses get 1%, bounded by the
  // attacker's progression so a starter poison cannot erase endgame bosses.
  const cap=12+stData().lv*3;
  return Math.min(f.hp,Math.max(floor,Math.round(f.boss?Math.min(f.maxHp*.01,cap):f.maxHp*rate)));
}
