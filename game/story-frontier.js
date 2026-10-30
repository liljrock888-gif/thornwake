// Additive, per-character Story expansion. Arena and account commerce are untouched.
const FW_SCHOOLS=[
  ['ember','Ember','#f29b68','burns over time'],['tide','Tide','#7bc9e4','restores a little mana on impact'],
  ['frost','Frost','#b6e6ef','slows enemy movement'],['storm','Storm','#d2c0ef','jumps to a nearby second enemy'],
  ['stone','Stone','#c7b48b','pushes enemies back'],['bloom','Bloom','#a6d9a0','heals for part of actual damage'],
  ['shade','Shade','#bd9edb','marks enemies for increased damage'],['dawn','Dawn','#efda94','interrupts an enemy windup'],
  ['blood','Blood','#d58991','trades a little health for stronger hits'],['prism','Prism','#a2dfcd','builds a small protective barrier']
].map(([id,name,color,trait])=>({id,name,color,trait}));
const FW_FORMS=[
  ['bolt','Bolt',1,5,1.2,'A fast single-target projectile.'],['lance','Lance',1.45,8,2,'A long piercing line.'],
  ['fan','Fan',.65,9,3,'A spreading cone that can strike several foes.'],['ring','Ring',.8,11,4,'A close ring around the caster.'],
  ['well','Well',.42,14,7,'A stationary field pulsing four times.'],['ward','Ward',.8,10,9,'A school attunement and protective barrier.'],
  ['spear','Spear',2.1,14,5,'A narrow, hard-hitting long shot.'],['burst','Burst',1.1,16,5,'An explosion around the selected target.'],
  ['beam','Beam',1.7,19,6,'A wide beam through all foes in its path.'],['orb','Orbit',.38,14,8,'An orbiting aura that strikes three times.'],
  ['chain','Chain',.9,17,6,'A chain striking up to four nearby enemies.'],['trap','Snare',1.3,12,7,'A placed trap that roots the first foe to cross it.'],
  ['aura','Sanctuary',.45,20,12,'A healing circle with three damaging pulses.'],['blink','Blink',.85,13,7,'Step away from your target and damage the departure area.'],
  ['rain','Rain',.55,24,10,'Five falling strikes across the target area.'],['drain','Siphon',1.2,18,8,'Steal health equal to 30% of damage dealt.'],
  ['echo','Echo',.9,22,9,'A delayed second strike against the same target.'],['hex','Seal',.65,16,9,'Weaken a target’s attacks for six seconds.'],
  ['familiar','Wisp',.42,25,16,'An independent spirit attacks four times.'],['nova','Nova',1.6,30,14,'A broad blast centered on the caster.']
].map(([id,name,power,mp,cooldown,desc],i)=>({id,name,power,mp,cooldown,desc,level:1+i*3}));
const FW_SPELLS={};
for(const school of FW_SCHOOLS)for(const form of FW_FORMS){
  const id='archive_'+school.id+'_'+form.id;
  FW_SPELLS[id]={id,name:school.name+' '+form.name,school:school.id,form:form.id,color:school.color,
    level:form.level,mp:form.mp,power:form.power,cooldown:form.cooldown,
    desc:form.desc+' '+school.name+' attunement '+school.trait+'.'};
}
const FW_LANDS=[
  {id:'lumenreach',name:'Lumenreach',sub:'Crystal Coast',color:'#91d8cd',level:4,
    lore:'A harbor of slate roofs and floating lantern-crystals. The tide has begun carrying fragments of unwritten memories.',
    streets:['Pearl Quay','Lantern Row','Kingfisher Market','Prism Causeway']},
  {id:'cinderward',name:'Cinderward',sub:'The Brass March',color:'#d7b17f',level:14,
    lore:'A castle town of forges, clockwork lifts and warded stone. Its engines run on enchanted crystals, not oil.',
    streets:['Forge Street','Crownwalk','Brass Arcade','Pilgrim’s Steps']},
  {id:'veilwood',name:'Veilwood',sub:'The Whispering Frontier',color:'#b5c994',level:25,
    lore:'An ancient forest settlement built around an impossible library. Its books whisper the names of people not yet born.',
    streets:['Willow Way','Mothlight Lane','Sage Circle','Old Root Road']}
];
const FW_CLANS=[
  {id:'none',name:'Unbound',stat:'hp',bonus:0,desc:'No oath. Your character and existing race remain unchanged.'},
  {id:'cinder',name:'Cinder Covenant',stat:'mag',bonus:.06,desc:'+6% magic. A tradition of measured elemental casting.'},
  {id:'thorn',name:'Thornward Kin',stat:'def',bonus:.07,desc:'+7% defense. Living armor and protective vows.'},
  {id:'tide',name:'Tideglass Line',stat:'mp',bonus:.07,desc:'+7% maximum mana. Patient, efficient spell study.'},
  {id:'dawn',name:'Dawnveil House',stat:'hp',bonus:.07,desc:'+7% maximum health. Oaths of restoration and endurance.'},
  {id:'iron',name:'Ironroot Circle',stat:'atk',bonus:.06,desc:'+6% attack. Weapon discipline passed between generations.'},
  {id:'moth',name:'Mothbound Court',stat:'spd',bonus:.07,desc:'+7% speed. Perception, misdirection and footwork.'},
  {id:'prism',name:'Prismborn',stat:'mag',bonus:.04,desc:'+4% magic and defense. Balanced crystal-channeling.'}
];
const FW_EYES=[
  {id:'none',name:'Natural Sight',mp:0,cd:0,desc:'No awakened eye. No cost.'},
  {id:'foresight',name:'Glimpse Eye',mp:12,cd:24,desc:'Foresee incoming attacks: 55% evasion for 4 seconds.'},
  {id:'mana',name:'Aether Eye',mp:5,cd:25,desc:'Reveal a target’s weak seam: its magic defense falls 25% for 8 seconds.'},
  {id:'binding',name:'Stillwater Eye',mp:15,cd:28,desc:'Root ordinary foes for 3 seconds; bosses for 0.6 seconds.'},
  {id:'mirror',name:'Mirror Iris',mp:16,cd:30,desc:'Reflect 30% of actual incoming damage for 5 seconds.'},
  {id:'hunter',name:'Hawthorn Eye',mp:13,cd:24,desc:'Your next three basic attacks have +25% power; lasts 8 seconds.'},
  {id:'mending',name:'Mercy Eye',mp:18,cd:30,desc:'Recover 18% maximum health, up to your missing health.'},
  {id:'rift',name:'Wayglass Eye',mp:14,cd:20,desc:'Blink away from your target and gain a brief barrier.'}
];
function fwData(d=stData()){
  if(!d.frontier||typeof d.frontier!=='object'||Array.isArray(d.frontier))d.frontier={};
  const f=d.frontier;
  if(!Array.isArray(f.learned))f.learned=[];
  f.learned=[...new Set(f.learned.filter(id=>FW_SPELLS[id]||FW_FUSIONS[id]))];
  if(!Array.isArray(f.equipped))f.equipped=[];
  f.equipped=[...new Set(f.equipped.filter(id=>f.learned.includes(id)))].slice(0,4);
  for(const key of ['quests','nodes','visits','choices'])if(!f[key]||typeof f[key]!=='object'||Array.isArray(f[key]))f[key]={};
  if(!Array.isArray(f.loot))f.loot=[];
  if(!f.worn||typeof f.worn!=='object')f.worn={};
  if(!FW_CLANS.some(c=>c.id===f.clan))f.clan='none';
  if(!FW_EYES.some(c=>c.id===f.eye))f.eye='none';
  f.deepest=clamp(Math.floor(Number(f.deepest)||0),0,200);
  f.shards=clamp(Math.floor(Number(f.shards)||0),0,999999);
  f.chips=clamp(Math.floor(Number(f.chips)||0),0,10000);
  return f;
}
function fwButton(parent,label,fn,disabled=false){
  const b=el('button','fwButton',label);b.disabled=disabled;b.addEventListener('click',fn);parent.appendChild(b);return b;
}
function fwPanel(title,kicker,copy){
  const m=stSystemPanel(title);m.classList.add('fwPanel');
  if(kicker)m.appendChild(el('small','fwKicker',kicker));
  if(copy)m.appendChild(el('p','',copy));
  return m;
}
function fwBack(m){fwButton(m,'Back to Story menu',()=>{stCloseMenu();stOpenMenu();});stPanelBack(m);}
const fwBaseStats=stStats;
stStats=function(){
  const s=fwBaseStats(),d=stData();if(!d?.frontier)return s;
  const f=d.frontier,C=FW_CLANS.find(c=>c.id===f.clan)||FW_CLANS[0];
  if(C.bonus)s[C.stat]=Math.round(s[C.stat]*(1+C.bonus));
  if(C.id==='prism')s.def=Math.round(s.def*1.04);
  for(const id of Object.values(f.worn||{})){
    const it=(f.loot||[]).find(x=>x.id===id);if(!it||it.level>d.lv)continue;
    for(const [key,n]of Object.entries(it.stats||{}))if(['hp','mp','atk','mag','def','spd'].includes(key)&&Number.isFinite(n))s[key]+=n;
  }
  return s;
};
const FW_WEAPONS=[
  ['oak_wand','Oak Channeling Wand','weapon','mag',6,1,45],
  ['iron_sabre','Wayfarer’s Sabre','weapon','atk',6,1,45],
  ['hunter_bow','Willow Longbow','weapon','atk',8,5,110],
  ['rune_pistol','Runelock Pistol','weapon','atk',11,10,230],
  ['moon_staff','Moonwell Staff','weapon','mag',12,10,240],
  ['guardian_lance','Guardian’s Lance','weapon','atk',16,18,470],
  ['obsidian_grimoire','Obsidian Grimoire','weapon','mag',19,25,720],
  ['storm_blade','Stormglass Blade','weapon','atk',23,35,1200],
  ['linen_mantle','Warded Linen','armor','def',3,1,40],
  ['knight_mail','Lantern Knight Mail','armor','def',7,10,210],
  ['moon_robes','Moonweave Robes','armor','def',11,20,520],
  ['royal_plate','Royal Prism Plate','armor','def',17,35,1400],
  ['tide_ring','Tideglass Ring','ring','mp',15,1,65],
  ['hawk_ring','Hawthorn Signet','ring','atk',6,15,360],
  ['prism_charm','Prism Charm','charm','hp',28,8,180],
  ['sage_charm','Sage’s Pendant','charm','mag',9,22,620]
].map(([id,name,slot,stat,power,level,price])=>({id,name,slot,stats:{[stat]:power},level,price,rarity:'Uncommon'}));
function fwBuy(id){
  const d=stData(),f=fwData(),it=FW_WEAPONS.find(x=>x.id===id);
  if(ST.battle||!it||d.lv<it.level||d.gold<it.price||f.loot.some(x=>x.id===id))return false;
  d.gold-=it.price;f.loot.push(structuredClone(it));stSave();return true;
}
function fwShop(){
  const d=stData(),f=fwData(),m=fwPanel('The Lantern Armory','WEAPONS / ARMOR / ACCESSORIES',`${d.gold} earned gold. No Crowns, real-money purchases or paid combat boosts. Gear has a level requirement and one equipped item per slot.`);
  const list=el('div','fwCards');m.appendChild(list);
  for(const it of FW_WEAPONS){
    const card=el('article','fwCard');card.append(el('small','fwKicker',it.slot.toUpperCase()+' / LEVEL '+it.level),el('h4','',it.name),el('p','',Object.entries(it.stats).map(([k,v])=>'+'+v+' '+k.toUpperCase()).join(' · ')));
    const owned=f.loot.some(x=>x.id===it.id);
    fwButton(card,owned?'Owned':`Buy · ${it.price} gold`,()=>{fwBuy(it.id);fwShop();},owned||d.lv<it.level||d.gold<it.price);list.appendChild(card);
  }
  fwButton(m,'Open equipment',fwEquipment);fwBack(m);
}
function fwEquip(id){
  const d=stData(),f=fwData(),it=f.loot.find(x=>x.id===id);if(ST.battle||!it||it.level>d.lv)return false;
  if(f.worn[it.slot]===id)delete f.worn[it.slot];else f.worn[it.slot]=id;
  const s=stStats();d.hp=Math.min(d.hp,s.hp);d.mp=Math.min(d.mp,s.mp);stSave();return true;
}
function fwEquipment(){
  const d=stData(),f=fwData(),m=fwPanel('Adventurer’s equipment','SAVED PER HERO',`${f.loot.length} items · ${f.shards} crystal shards. Slots: weapon, armor, ring and charm. New equipment adds to existing crafted gear, not replaces your old inventory.`);
  if(!f.loot.length)m.appendChild(el('p','','Your new equipment bag is empty. Visit the armory or defeat a labyrinth guardian.'));
  for(const it of f.loot){
    const card=el('article','fwCard'+(it.rarity==='Legendary'?' legendary':''));
    card.append(el('h4','',it.name),el('p','',`${it.rarity} · ${it.slot} · Level ${it.level} · `+Object.entries(it.stats).map(([k,v])=>'+'+v+' '+k).join(' · ')));
    fwButton(card,f.worn[it.slot]===it.id?'Unequip':'Equip',()=>{fwEquip(it.id);fwEquipment();},d.lv<it.level);
    m.appendChild(card);
  }
  fwButton(m,'Visit the armory',fwShop);fwBack(m);
}
function fwLegendary(floor,guaranteed=false){
  const d=stData(),f=fwData();if(!guaranteed&&Math.random()>.12)return null;
  const slot=['weapon','armor','ring','charm'][Math.floor(floor/5)%4],level=Math.max(1,Math.min(60,Math.floor(floor*.28)+1));
  const stat=slot==='weapon'?(['mage','warlock','necromancer','druid'].includes(d.cls)?'mag':'atk'):slot==='armor'?'def':slot==='ring'?'mp':'hp';
  const statScale={atk:.6,mag:.6,def:.4,mp:1.3,hp:2.1}[stat];
  const id='legend_'+floor+'_'+slot;if(f.loot.some(x=>x.id===id))return null;
  const it={id,name:['Dawnsealed','Hollowstar','Moonforged','Thorncrowned'][Math.floor(floor/25)%4]+' '+{weapon:'Relic',armor:'Aegis',ring:'Signet',charm:'Heartstone'}[slot],slot,level,rarity:'Legendary',stats:{[stat]:Math.round(5+level*statScale)}};
  f.loot.push(it);stLearnNotice('Legendary found: '+it.name,'#edc77e');return it;
}
function fwHeritage(){
  const d=stData(),f=fwData(),m=fwPanel('Bloodlines & awakened eyes','ORIGINAL FANTASY PATHS','Choose one clan, independently of class and race. Your first clan oath is free; changing an oath costs 150 earned gold. Clan bonuses do not stack. Awakened eyes are secret encounter rewards, never shop purchases. Each hero can choose and keep only one eye, permanently.');
  m.appendChild(el('h3','','Clan oaths'));
  for(const c of FW_CLANS.slice(1)){
    const card=el('article','fwCard');card.append(el('h4','',c.name),el('p','',c.desc));
    const fee=f.clan==='none'?0:150;
    fwButton(card,f.clan===c.id?'Your clan':`Swear oath${fee?' · '+fee+' gold':' · free'}`,()=>{
      if(ST.battle||f.clan===c.id||d.gold<fee)return;d.gold-=fee;f.clan=c.id;
      const s=stStats();d.hp=Math.min(d.hp,s.hp);d.mp=Math.min(d.mp,s.mp);stSave();fwHeritage();
    },f.clan===c.id||d.gold<fee);m.appendChild(card);
  }
  m.appendChild(el('h3','','Awakened eyes'));
  if(f.eye!=='none'){
    const eye=FW_EYES.find(e=>e.id===f.eye);
    m.append(el('h4','',eye.name+' · Your one permanent eye'),el('p','',eye.desc+` ${eye.mp} MP · ${eye.cd}s cooldown. No second eye, replacement or stacking.`));
  }else if(f.eyeToken)fwButton(m,'Choose your earned eye · one permanent choice',fwEyeChoice);
  else m.appendChild(el('p','','Your sight is unawakened. Some gifts are found in encounters away from the familiar roads. Nothing here can sell or grant an eye.'));
  if(d.hr)m.appendChild(el('p','','Your Heavenly Restriction seals awakened-eye magic; clan physical bonuses remain.'));
  fwBack(m);
}
function fwChooseEye(id){
  const d=stData(),f=fwData(),E=FW_EYES.find(e=>e.id===id);
  if(ST.battle||!f.eyeToken||f.eye!=='none'||!E||id==='none'||d.hr||d.lv<5)return false;
  f.eye=id;f.eyeToken=false;f.eyeChosenAt=Date.now();stSave();return true;
}
function fwEyeChoice(){
  const d=stData(),f=fwData();
  if(!f.eyeToken||f.eye!=='none')return fwHeritage();
  const m=fwPanel('The gift of a single eye','SECRET ENCOUNTER REWARD','You earned one awakening. Choose any one of these eyes. You may leave now and decide later. The final confirmation binds this eye permanently to this hero; a second eye and replacement are not available.');
  for(const E of FW_EYES.slice(1)){
    const card=el('article','fwCard');card.append(el('h4','',E.name),el('p','',E.desc+` ${E.mp} MP · ${E.cd}s cooldown.`));
    fwButton(card,'Choose '+E.name,()=>{
      const confirmPanel=fwPanel('Bind '+E.name+'?','ONE HERO / ONE EYE / PERMANENT',E.desc+' This uses your one earned awakening. You cannot change this eye or gain another on this character.');
      fwButton(confirmPanel,'Confirm my one eye',()=>{if(fwChooseEye(E.id))fwHeritage();else fwEyeChoice();},d.hr||d.lv<5);
      fwButton(confirmPanel,'Go back and choose a different eye',fwEyeChoice);
    },d.hr||d.lv<5);m.appendChild(card);
  }
  fwBack(m);
}
const FW_SECRETS=[{map:'lumenreach',x:31,y:4},{map:'cinderward',x:3,y:22},{map:'veilwood',x:31,y:6}];
function fwEyeEncounter(){
  const d=stData(),f=fwData();
  if(f.eye!=='none')return stSay([['The Veiled Stranger','Your chosen eye already holds its one vow. No second awakening will answer.']]);
  if(d.lv<5||d.hr)return stSay([['A reflection without a face','The water moves without wind. Something watches, but your sight is not ready to answer.']]);
  if(f.eyeToken)return fwEyeChoice();
  stSay([['The Veiled Stranger','You found a path no chart keeps. I offer no bloodline, no throne, and no borrowed destiny. Only one new way to see.'],
    ['The Veiled Stranger','There are many eyes, but a single soul can keep only one. Earn the gift by answering: will you use sight to own another life, or to understand it?']],null,[
    ['To understand, not to own',()=>{if(f.eye==='none'){f.eyeToken=true;f.eyeEncounter='veiled_stranger';stSave();fwEyeChoice();}}],
    ['I am not ready to answer',null]
  ]);
}
let fwSpellQuery='',fwSpellSchool='all';
function fwLearn(id){
  const d=stData(),f=fwData(),S=FW_SPELLS[id];if(!S||d.hr||f.learned.includes(id)||d.lv<S.level)return false;
  const fee=20+S.level*9;if(d.gold<fee)return false;
  d.gold-=fee;f.learned.push(id);if(f.equipped.length<4)f.equipped.push(id);stSave();return true;
}
function fwSpellbook(){
  const d=stData(),f=fwData(),m=fwPanel('The Living Grimoire','200 SPELLS / TEN SCHOOLS',`${f.learned.length} learned · ${f.equipped.length}/4 equipped · ${d.gold} gold. Every school has twenty casting forms. Form controls targeting, range and timing; attunement adds the school effect. Class abilities remain separate.`);
  const controls=el('div','fwTools'),search=el('input'),filter=el('select'),count=el('p','fwCount'),list=el('div','fwCards');
  search.placeholder='Search spells or effects';search.setAttribute('aria-label','Search the 200 spells');search.value=fwSpellQuery;
  for(const [value,label]of [['all','All schools'],['learned','Learned'],['ready','Can learn'],...FW_SCHOOLS.map(s=>[s.id,s.name])]){
    const o=el('option','',label);o.value=value;o.selected=fwSpellSchool===value;filter.appendChild(o);
  }
  filter.setAttribute('aria-label','Filter spell school');
  const render=()=>{
    list.replaceChildren();const ids=Object.keys(FW_SPELLS).filter(id=>{
      const S=FW_SPELLS[id];return (fwSpellSchool==='all'||S.school===fwSpellSchool||fwSpellSchool==='learned'&&f.learned.includes(id)||fwSpellSchool==='ready'&&!f.learned.includes(id)&&!d.hr&&S.level<=d.lv&&d.gold>=20+S.level*9)&&
        (S.name+' '+S.desc).toLowerCase().includes(fwSpellQuery.toLowerCase());
    });
    count.textContent=`${ids.length} of 200 spells shown`;
    if(!ids.length)list.appendChild(el('p','','No spells match. Try another school or search.'));
    for(const id of ids){
      const S=FW_SPELLS[id],known=f.learned.includes(id),equipped=f.equipped.includes(id),card=el('article','fwCard');
      card.style.setProperty('--spell-color',S.color);
      card.append(el('small','fwKicker',S.school.toUpperCase()+' / LEVEL '+S.level),el('h4','',S.name),el('p','',S.desc),el('small','',`${S.mp} MP · ${S.cooldown}s cooldown`));
      fwButton(card,known?(equipped?'Unequip':'Equip'):`Learn · ${20+S.level*9} gold`,()=>{
        if(!known)fwLearn(id);
        else if(equipped)f.equipped=f.equipped.filter(k=>k!==id);
        else if(f.equipped.length<4)f.equipped.push(id);
        stSave();fwSpellbook();
      },known?!equipped&&f.equipped.length>=4:d.hr||d.lv<S.level||d.gold<20+S.level*9);
      list.appendChild(card);
    }
  };
  search.addEventListener('input',()=>{fwSpellQuery=search.value;render();});
  filter.addEventListener('change',()=>{fwSpellSchool=filter.value;render();});
  controls.append(search,filter);m.append(controls,count,list);render();fwBack(m);
}
const FW_QUESTS=[
  ['lanterns','Lanterns without flame','lumenreach','lamplighter','Restore the three street crystals in Lumenreach.',120,90],
  ['letter','A letter across the water','lumenreach','postmaster','Carry a sealed letter to Cinderward’s archivist.',150,110],
  ['tide_memory','The tide remembers','lumenreach','tidekeeper','Listen to every Lumenreach crystal after restoring the lamps.',180,130],
  ['armorer','A blade with a history','cinderward','smith','Buy a weapon from the Lantern Armory and return to the smith.',180,140],
  ['brass_message','The brass confession','cinderward','archivist','Speak to Veilwood’s historian about the first crystal engine.',210,170],
  ['iron_lamps','The sleeping engines','cinderward','engineer','Restore all three Cinderward crystals.',240,190],
  ['roots','Roots of the unwritten','veilwood','historian','Listen to all three Veilwood crystals.',280,220],
  ['lost_pages','Pages beneath the world','veilwood','librarian','Defeat the first five labyrinth guardians.',320,260],
  ['first_descent','The first descent','lumenreach','warden','Defeat the first labyrinth guardian.',150,120],
  ['deep_echo','Twenty-five heartbeats','cinderward','warden','Reach the first story seal on labyrinth floor 25.',650,600],
  ['eye_oath','A different way to see','veilwood','seer','Awaken an eye, swear a clan oath, and return to the seer.',250,200],
  ['wanderer','Three distant hearths','lumenreach','ferryman','Visit Lumenreach, Cinderward and Veilwood.',220,160]
].map(([id,name,map,giver,desc,gold,xp])=>({id,name,map,giver,desc,gold,xp}));
const FW_RESIDENTS=[
  ['lamplighter','Mira the Lamplighter','The crystals have gone quiet. Once they held the songs of this harbor, but something below the earth is swallowing the last note.'],
  ['postmaster','Postmaster Oren','A letter arrived in a bottle before its sender was born. The wax bears the mark of Cinderward’s vanished royal engineer.'],
  ['tidekeeper','Sister Elowen','The sea does not return the dead. It returns what they could not finish. Listen before you draw your sword.'],
  ['smith','Master Brannic','A sword should remember its owner, not their wealth. I sell honest iron, warded bows, runelocks and spellbooks for earned coin.'],
  ['archivist','Archivist Sera','The first engine was not a machine. It was a promise: no child would freeze while a castle kept its hearths burning.'],
  ['engineer','Rune-Engineer Tamsin','We wound tiny clocks around crystals and called it progress. Then the crystals started counting down.'],
  ['historian','Historian Ilyth','Beneath the roots lies a library of futures. Someone is tearing out every page on which the Hollow King loses.'],
  ['librarian','Keeper Nyra','Two hundred floors. Eight seals. One name erased from every history. Bring back its syllables, and we may yet write another ending.'],
  ['seer','Seer Vael','A strange eye sees possibilities, not destiny. Your clan may teach a technique, but the choice of who to protect remains yours.'],
  ['warden','Warden Halden','The labyrinth changes its corridors, never its debt. Defeat a guardian, kindle its seal, and the next stair will open.'],
  ['ferryman','Captain Aster','The old islands are still where you left them. These new coasts lie beyond the chart’s silver edge. Your mount travels with the ferry.'],
  ['casino','Madam Rowan','Welcome to the Gilded Gryphon. Our games use free festival chips only. No coin buys them, and no chip buys coin.']
];
const FW_NODES=[];
function fwBuildLand(land,index){
  const W=36,H=30,g=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1?'#':'.'));
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    if([6,7,8,17,18,19,28,29,30].includes(x)||[7,8,9,16,17,18,25,26,27].includes(y))g[y][x]='=';
    else if(x%6===2&&y%7===2)g[y][x]=index===2?'T':'H';
  }
  for(const [x,y]of [[11,12],[23,12],[11,21],[23,21]]){g[y][x]='L';g[y+1][x]='=';}
  if(index===0)for(let y=22;y<29;y++)for(let x=32;x<35;x++)g[y][x]='#';
  if(index===1)for(let x=21;x<28;x++)g[3][x]='W';
  if(index===2)for(let y=2;y<7;y++)for(let x=22;x<34;x++)if((x+y)%3===0)g[y][x]='T';
  if(land.terrain==='jungle'){
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(g[y][x]==='.'&&(x*13+y*7)%5<3)g[y][x]='T';
    for(let y=1;y<H-1;y++)g[y][24]=[8,17,26].includes(y)?'Z':'#';
    for(const y of [7,9,16,18,25,27])g[y][24]='Z';
  }
  if(land.terrain==='desert'){
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(g[y][x]==='.')g[y][x]=',';
    for(let y=2;y<6;y++)for(let x=22;x<27;x++)g[y][x]='#';
    for(const [x,y]of [[3,3],[12,3],[32,13],[4,23]])g[y][x]='^';
  }
  if(land.terrain==='snow'){
    for(let x=2;x<34;x++)if(![6,7,8,17,18,19,28,29,30].includes(x))g[3][x]='^';
    for(let y=21;y<25;y++)g[y][24]='^';
  }
  g[26][6]='E';g[9][18]='S';
  const P={sea:index===2?'#15382e':'#244a50',grass:index===1?'#5a6045':'#4e7448',grass2:index===1?'#606449':'#537c4c',road:'#8a8872',mount:'#726e68',hut:'#b1a17f',roof:index===1?'#74504a':'#45665d',...land.palette};
  ST_DUNGEONS[land.id]={name:land.name+' · '+land.sub,outdoor:true,land:true,lit:true,pal:P,trees:index===2?'pine':'crystal',pool:[['wolf'],['bandit']],zones:[{r:[1,1,34,28],lv:land.level,name:land.sub}],exit:[12,12],rows:g.map(r=>r.join('')),frontier:true};
  const residents=land.residents||(index===0?['lamplighter','postmaster','tidekeeper','warden','ferryman','casino']:index===1?['smith','archivist','engineer','warden','ferryman','casino']:['historian','librarian','seer','warden','ferryman','smith']);
  residents.forEach((key,i)=>{
    const R=FW_RESIDENTS.find(r=>r[0]===key);
    ST_NPCS.push({id:'fw_'+land.id+'_'+key,fwKey:key,name:R[1],map:land.id,x:[8,18,29,8,18,29][i],y:i<3?10:20,look:['mage','paladin','witch','knight','pirate','shaman'][i],color:land.color});
  });
  for(let n=0;n<3;n++)FW_NODES.push({id:land.id+'_'+n,map:land.id,x:12+n*6,y:17,color:land.color});
}
FW_LANDS.forEach(fwBuildLand);
ST_NPCS.push({id:'fw_world_ferryman',fwKey:'ferryman',name:'Captain Aster',x:16,y:15,look:'pirate',color:'#91d8cd'});
const FW_ARCS=[
  ['The Unlit Harbor','The first seal contains a child’s lullaby. Halden recognizes it: his mother sang it before the harbor existed. The labyrinth is not burying the past. It is hiding the future.'],
  ['The Engine’s Promise','The second seal holds the royal engineer’s oath. The crystal engines were built to warm the poor, then chained to the king’s war. Sera asks you to carry the oath back into the light.'],
  ['An Eye for Tomorrow','The third seal opens like an iris. Vael sees two roads: one where you control every fate, and one where you leave people free to choose. Neither road is safe.'],
  ['The Clan without a Name','The fourth seal belongs to the first wardens, who surrendered their clan names so no royal house could own the labyrinth. Their descendants still guard its gates.'],
  ['A Library of Ash','The fifth seal is a book with living pages. Nyra finds her own handwriting in its margins: a warning she has not yet written.'],
  ['The Heart beneath the Streets','The sixth seal beats with the pulse of every restored street crystal. The cities above are one great ward, and each small act of care strengthens it.'],
  ['The King’s Other Name','The seventh seal reveals that the Hollow King once volunteered to hold the darkness below. Someone erased his rescue from history and left only the monster.'],
  ['The Unwritten Dawn','The last seal offers no prophecy. The lost name returns to the world, the crystals ring together, and the people of three lands begin writing a future that no king can own.']
];
function fwFloorKey(n){return 'labyrinth_'+String(n).padStart(3,'0');}
function fwBuildFloor(n){
  const key=fwFloorKey(n),size=25,g=Array.from({length:size},()=>Array(size).fill('#'));
  let seed=(n*2654435761)>>>0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const stack=[[1,1]];g[1][1]='.';
  while(stack.length){
    const [x,y]=stack.at(-1),next=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dy])=>x+dx>0&&x+dx<size-1&&y+dy>0&&y+dy<size-1&&g[y+dy][x+dx]==='#');
    if(!next.length){stack.pop();continue;}const [dx,dy]=next[Math.floor(rnd()*next.length)];
    g[y+dy/2][x+dx/2]='.';g[y+dy][x+dx]='.';stack.push([x+dx,y+dy]);
  }
  for(let y=19;y<=23;y++)for(let x=19;x<=23;x++)g[y][x]='.';
  g[1][1]='E';g[21][23]='B';g[23][23]='E';g[1][3]='c';
  const open=[];for(let y=3;y<19;y++)for(let x=3;x<23;x++)if(g[y][x]==='.')open.push([x,y]);
  for(let i=0;i<4;i++){const [x,y]=open[Math.floor(rnd()*open.length)];g[y][x]='X';}
  const biome=Math.floor((n-1)/25),boss='fw_guardian_'+n,level=1+Math.floor(n*.28);
  const base=ST_FOES.golem;
  ST_FOES[boss]={...base,name:(n%25===0?['Harbor’s Echo','Oathbound Engine','Oracle of Glass','Nameless Warden','Ash Librarian','Heart of the Streets','Crown’s Last Memory','Keeper of Unwritten Dawn'][biome]:'Seal Guardian '+n),hp:70+n*10,atk:6+n*.48,def:2+n*.12,spd:5+n*.035,xp:25+n*7,gold:18+n*3,boss:true,draw:base.draw||'golem',color:FW_SCHOOLS[biome].color};
  ST_DUNGEONS[key]={name:`The Unwritten Labyrinth · Floor ${n}/200`,rows:g.map(r=>r.join('')),boss,pool:[n<35?['goblin']:['bandit']],theme:{floor:['#35463f','#4d4238','#354b51','#3f394d','#334a3b','#49432e','#423446','#30494b'][biome],wall:'#111c1a',glow:FW_SCHOOLS[biome].color},exit:[1,1],fwFloor:n,fwLevel:level};
  ST_MAP_LV[key]=level;
}
for(let n=1;n<=200;n++)fwBuildFloor(n);
function fwLands(){
  const f=fwData(),m=fwPanel('Lands & stories','BEYOND THE SILVER EDGE','Original islands, castles, housing and quests remain. The new lands can be reached by Captain Aster or this chart. Crystal magic powers their modest clockwork technology; fantasy still rules these shores.');
  for(const L of FW_LANDS){
    const card=el('article','fwCard');card.append(el('small','fwKicker',L.sub.toUpperCase()),el('h3','',L.name),el('p','',L.lore),el('p','',L.streets.join(' · ')));
    fwButton(card,'Travel to '+L.name,()=>{stCloseMenu();stEnterMap(L.id,7,25);});m.appendChild(card);
  }
  fwButton(m,'Return to Thornwake',()=>{stCloseMenu();stEnterMap('world',16,14);});
  fwButton(m,'The Unwritten Labyrinth',fwLabMenu);fwButton(m,'Story journal',fwJournal);fwBack(m);
}
function fwLabMenu(){
  const d=stData(),f=fwData(),m=fwPanel('The Unwritten Labyrinth','200 EXPLORABLE FLOORS / EIGHT STORY SEALS',`Deepest guardian defeated: ${f.deepest}/200. Each seeded floor has connected corridors, hunters, a guardian and two stairs. Defeat the guardian to descend. Checkpoints open every ten floors. Gear drops scale with floor level; every 25th first-clear guardian guarantees a legendary.`);
  fwButton(m,f.deepest>=200?'Revisit floor 200':`Continue at floor ${f.deepest+1}`,()=>{stCloseMenu();stEnterMap(fwFloorKey(Math.min(200,f.deepest+1)),1,2);});
  for(let n=1;n<=200;n+=10)if(n<=f.deepest+1)fwButton(m,`Checkpoint · floor ${n} · suggested level ${ST_DUNGEONS[fwFloorKey(n)].fwLevel}`,()=>{stCloseMenu();stEnterMap(fwFloorKey(n),1,2);});
  for(let i=0;i<FW_ARCS.length;i++)m.appendChild(el('p','',`${f.deepest>=(i+1)*25?'Revealed':'Sealed'} · Floor ${(i+1)*25} · ${FW_ARCS[i][0]}`));
  fwBack(m);
}
function fwQuestReady(Q,f=fwData()){
  if(Q.id==='lanterns'||Q.id==='tide_memory')return [0,1,2].every(n=>f.nodes['lumenreach_'+n]);
  if(Q.id==='iron_lamps')return [0,1,2].every(n=>f.nodes['cinderward_'+n]);
  if(Q.id==='roots')return [0,1,2].every(n=>f.nodes['veilwood_'+n]);
  if(Q.id==='letter')return !!f.visits.cinderward_archivist;
  if(Q.id==='brass_message')return !!f.visits.veilwood_historian;
  if(Q.id==='armorer')return f.loot.some(it=>it.slot==='weapon');
  if(Q.id==='first_descent')return f.deepest>=1;
  if(Q.id==='lost_pages')return f.deepest>=5;
  if(Q.id==='deep_echo')return f.deepest>=25;
  if(Q.id==='eye_oath')return f.eye!=='none'&&f.clan!=='none';
  if(Q.id==='wanderer')return FW_LANDS.every(l=>f.visits[l.id]);
  return false;
}
function fwQuestClaim(id){
  const d=stData(),f=fwData(),Q=FW_QUESTS.find(q=>q.id===id);
  if(!Q||f.quests[id]!=='active'||!fwQuestReady(Q,f))return false;
  f.quests[id]='claimed';d.gold+=Q.gold;d.xp+=Q.xp;f.shards+=2;
  while(d.xp>=stXpNeed(d.lv)){d.xp-=stXpNeed(d.lv);d.lv++;}
  stSyncProgress(false);stSave();return true;
}
function fwJournal(){
  const f=fwData(),m=fwPanel('Chronicles of the Unwritten','SIDE STORIES / MAIN SEALS','These new chronicles run beside your original campaign. Accepted objectives and choices are saved on this hero.');
  for(const Q of FW_QUESTS){const status=f.quests[Q.id]||'Not accepted',card=el('article','fwCard');
    card.append(el('h4','',Q.name),el('p','',Q.desc),el('small','',`${status}${status==='active'&&fwQuestReady(Q)?' · Ready to turn in':''} · ${Q.gold} gold / ${Q.xp} XP`));m.appendChild(card);}
  for(let i=0;i<FW_ARCS.length;i++)if(f.deepest>=(i+1)*25)m.append(el('h3','',FW_ARCS[i][0]),el('p','',FW_ARCS[i][1]));
  if(f.choices.final)m.appendChild(el('p','','Your final oath: '+f.choices.final));
  fwBack(m);
}
const fwBaseTalk=stTalk;
stTalk=function(id){
  const n=ST_NPCS.find(n=>n.id===id);if(!n?.fwKey)return fwBaseTalk(id);
  const d=stData(),f=fwData(),R=FW_RESIDENTS.find(r=>r[0]===n.fwKey),opts=[];
  f.visits[(n.map||'world')+'_'+n.fwKey]=true;
  for(const Q of FW_QUESTS.filter(q=>q.giver===n.fwKey&&q.map===(n.map||'world'))){
    if(!f.quests[Q.id])opts.push(['Accept: '+Q.name,()=>{f.quests[Q.id]='active';stSave();stSay([[n.name,Q.desc]]);}]);
    else if(f.quests[Q.id]==='active'&&fwQuestReady(Q,f))opts.push(['Complete: '+Q.name,()=>{if(fwQuestClaim(Q.id))stSay([[n.name,`You kept your word. ${Q.gold} gold, ${Q.xp} XP and two crystal shards are yours.`]]);}]);
    else if(f.quests[Q.id]==='active')opts.push(['Ask about: '+Q.name,()=>stSay([[n.name,Q.desc]])]);
  }
  if(n.fwKey==='smith')opts.push(['Browse weapons & equipment',fwShop]);
  if(n.fwKey==='ferryman')opts.push(['Sail to another land',fwLands]);
  if(n.fwKey==='warden'||n.fwKey==='librarian')opts.push(['Enter the labyrinth',fwLabMenu]);
  if(n.fwKey==='seer')opts.push(['Clans & awakened eyes',fwHeritage]);
  if(n.fwKey==='casino')opts.push(['Enter the Gilded Gryphon',fwCasino]);
  if(n.fwKey==='librarian'||n.fwKey==='archivist')opts.push(['Study the 200-spell grimoire',fwSpellbook]);
  if(n.fwKey==='tidekeeper')opts.push(['Receive healing · 15 gold',()=>{if(d.gold<15)return stSay([[n.name,'You need 15 gold. The public shrine nearby is free.']]);d.gold-=15;const s=stStats();d.hp=s.hp;d.mp=s.mp;stSave();}]);
  opts.push(['Goodbye',null]);stSay([[n.name,R[2]]],null,opts);
};
const fwBaseEnter=stEnterMap;
stEnterMap=function(key,tx,ty){
  if(ST.battle&&!ST.battle.over){stCallout('Finish or flee the encounter before traveling.','#e4c592');return false;}
  const n=ST_DUNGEONS[key]?.fwFloor,f=fwData();
  if(n&&n>f.deepest+1)return stSay([['Warden Halden','Defeat the previous floor’s guardian before descending.']]);
  fwBaseEnter(key,tx,ty);
  if(FW_LANDS.some(l=>l.id===key)){f.visits[key]=true;stSave();}
};
const fwBaseNearby=stNearby;
stNearby=function(){
  const d=stData(),D=ST_DUNGEONS[d.map];
  for(const s of FW_SECRETS)if(s.map===d.map&&Math.hypot(d.x-s.x*64-32,d.y-s.y*64-32)<70)return {kind:'fwSecretEye',label:'Investigate the impossible reflection'};
  for(const node of FW_NODES)if(node.map===d.map&&Math.hypot(d.x-node.x*64-32,d.y-node.y*64-32)<72)return {kind:'fwCrystal',node,label:'Attune the street crystal'};
  if(D?.fwFloor){
    if(Math.hypot(d.x-96,d.y-96)<80)return {kind:'fwUp',floor:D.fwFloor,label:'Climb to the previous floor'};
    if(Math.hypot(d.x-1504,d.y-1504)<80)return {kind:'fwDown',floor:D.fwFloor,label:'Descend to the next floor'};
  }
  return fwBaseNearby();
};
const fwBaseInteract=stInteract;
stInteract=function(pre){
  const it=pre||stNearby(),d=stData(),f=fwData();if(!it)return;
  if(it.kind==='fwSecretEye')return fwEyeEncounter();
  if(it.kind==='fwCrystal'){
    const N=it.node,first=!f.nodes[N.id];f.nodes[N.id]=true;if(first)f.shards++;
    stSave();return stSay([['The street crystal',first?'A floating diamond turns toward your hand. Light runs through the cobbles, and a lost voice whispers: “Remember why we built the lanterns.” You receive one crystal shard.':'The crystal hums with the harbor’s remembered song. Its light is steady. This crystal’s shard has already been gathered.']]);
  }
  if(it.kind==='fwUp'){stEnterMap(it.floor===1?'lumenreach':fwFloorKey(it.floor-1),it.floor===1?8:23,it.floor===1?20:22);return;}
  if(it.kind==='fwDown'){
    if(f.deepest<it.floor)return stSay([['The sealed stair','Defeat this floor’s guardian to open the next stair.']]);
    if(it.floor<200){stEnterMap(fwFloorKey(it.floor+1),1,2);return;}
    return stSay([['The Unwritten Dawn','The last stair leads not deeper, but home. What oath will you carry back?']],null,[
      ['Protect the freedom to choose',()=>{f.choices.final='Protect the freedom to choose';stSave();stEnterMap('veilwood',18,20);}],
      ['Keep the lanterns burning',()=>{f.choices.final='Keep the lanterns burning';stSave();stEnterMap('lumenreach',8,10);}]
    ]);
  }
  if(it.kind==='ship'&&ST_DUNGEONS[d.map]?.frontier)return fwLands();
  return fwBaseInteract(it);
};
const fwBaseEnd=stEndBattle;
stEndBattle=function(result){
  const b=ST.battle;if(b&&!b.ended&&result==='won'){
    const d=stData(),f=fwData(),floor=ST_DUNGEONS[d.map]?.fwFloor;
    if(floor&&b.bossId==='fw_guardian_'+floor&&floor>f.deepest){
      f.deepest=floor;f.shards+=1+Math.floor(floor/25);fwLegendary(floor,floor%25===0);
      if(floor%25===0)stLearnNotice('Story seal: '+FW_ARCS[floor/25-1][0],'#e7cc92');
    }
  }
  return fwBaseEnd(result);
};
const fwBaseMenu=stOpenMenu;
stOpenMenu=function(){
  fwBaseMenu();if(ST.mode!=='menu')return;const m=$('stMenu');m.classList.remove('fwPanel');
  const row=el('section','fwMenuLinks');row.appendChild(el('h3','','Beyond the Vale'));
  for(const [label,fn]of [['Lands & stories',fwLands],['Living grimoire · 200 spells',fwSpellbook],['Weapons & equipment shop',fwShop],['Equipment bag',fwEquipment],['Clans & awakened eyes',fwHeritage],['200-floor labyrinth',fwLabMenu],['New story journal',fwJournal],['The Gilded Gryphon · free play',fwCasino]])fwButton(row,label,fn);
  m.insertBefore(row,m.firstChild.nextSibling);
};
let fwCasinoReceipt='';
function fwCasinoRoll(choice){
  const f=fwData();if(!['low','high'].includes(choice)||f.chips<10)return false;
  f.chips-=10;const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),sum=a+b;
  const won=choice==='low'?sum<7:sum>7;if(won)f.chips=Math.min(10000,f.chips+20);
  fwCasinoReceipt=`The runed dice show ${a} + ${b} = ${sum}. ${sum===7?'Seven belongs to the house.':won?'You win 20 chips (10 net).':'The house wins.'}`;
  stSave();return {a,b,won};
}
function fwCasino(){
  const f=fwData(),m=fwPanel('The Gilded Gryphon','A FANTASY FESTIVAL / FREE PLAY ONLY','Ten free festival chips per roll. Choose a total below or above seven on two six-sided dice. Seven loses. Winning returns 20 chips including your stake. Win probability: 15/36 (41.7%); expected loss: 1.67 chips per roll. Chips cannot be bought, transferred, redeemed, or exchanged for gear, gold, Crowns or cash.');
  m.append(el('div','fwDice','◇  ◇'),el('h3','',f.chips+' festival chips'));
  if(fwCasinoReceipt)m.appendChild(el('p','fwReceipt',fwCasinoReceipt));
  const day=Math.floor(Date.now()/86400000);
  fwButton(m,'Claim 100 free daily chips',()=>{if(f.chipDay===day)return;f.chipDay=day;f.chips=Math.min(10000,f.chips+100);stSave();fwCasino();},f.chipDay===day);
  fwButton(m,'Low · 2–6 · 10 chips',()=>{fwCasinoRoll('low');fwCasino();},f.chips<10);
  fwButton(m,'High · 8–12 · 10 chips',()=>{fwCasinoRoll('high');fwCasino();},f.chips<10);
  fwBack(m);
}
function fwInspect(peer){
  const d=stData(),s=stStats(),f=fwData(),sw=peer?.presence?.sw;
  const m=fwPanel(sw?'Adventurer: '+sw.n:d.name,'PLAYER INSPECTION',sw?'Public presence only. Other players’ private inventory and saves are not exposed.':'Click your character to inspect your live attributes. Equipment and clan bonuses are included.');
  const values=sw?[['Level',sw.lv],['Health',sw.hp],['Attack',sw.at]]:[['Class',ST_CLASSES[d.cls].name],['Level',d.lv],['Health',Math.round(d.hp)+' / '+s.hp],['Mana',Math.round(d.mp)+' / '+s.mp],['Attack',s.atk],['Magic',s.mag],['Defense',s.def],['Speed',s.spd],['Clan',FW_CLANS.find(c=>c.id===f.clan)?.name],['Eye',FW_EYES.find(e=>e.id===f.eye)?.name]];
  const grid=el('div','fwStats');for(const [k,v]of values){const box=el('div','fwCard');box.append(el('small','fwKicker',k),el('strong','',String(v??'Unknown')));grid.appendChild(box);}m.appendChild(grid);
  if(!sw)fwButton(m,'Manage equipment',fwEquipment);fwBack(m);
}
const fwStyle=el('style');
fwStyle.textContent=`
.fwPanel{--spell-color:#a2cfbd}.fwKicker{display:block;font:600 12px/1.5 'Barlow Semi Condensed',sans-serif;letter-spacing:.08em;color:#c3ccaf}
.fwCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fwCard{min-width:0;margin:8px 0;padding:16px;border:1px solid #57665b;border-left:3px solid var(--spell-color,#8aa68a);background:#182820;color:#e9e4ce;border-radius:4px}
.fwCard h4{font:600 18px/1.3 'Barlow Semi Condensed',sans-serif;color:#ead7a8;margin:6px 0}.fwCard p{font-size:15px;line-height:1.5;margin:8px 0}.fwCard small{font-size:12px}.fwCard.legendary{border-color:#d8b373;background:#302b1e}
.fwButton{min-height:44px!important;white-space:normal!important;overflow-wrap:anywhere;margin:6px 6px 6px 0!important;padding:10px 14px!important;font-size:14px!important}
.fwButton:disabled{opacity:.5}.fwButton:focus-visible{outline:2px solid #f2d48b;outline-offset:3px}
.fwMenuLinks{padding:12px;border:1px solid #617661;margin-bottom:18px;background:#1c3026}.fwMenuLinks h3{margin-top:0!important}
.fwTools{display:flex;gap:8px;margin:18px 0}.fwTools input{flex:1;min-width:0}.fwTools input,.fwTools select{min-height:44px;background:#10241c;color:#eee5cc;border:1px solid #78866a;padding:10px;font:16px 'Barlow Semi Condensed',sans-serif}
.fwStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.fwStats strong{display:block;font-size:20px;margin-top:8px}
.fwDice{font:56px/1.4 'Cinzel',serif;text-align:center;color:#e7ca88;animation:fwDice 4s ease-in-out infinite}.fwReceipt{padding:16px;background:#293b2b;border:1px solid #b6b77d}
@keyframes fwDice{50%{transform:translateY(-5px);color:#b5dcc8}}
@media(max-width:640px){.fwCards{grid-template-columns:1fr}.fwStats{grid-template-columns:repeat(2,minmax(0,1fr))}.fwTools{flex-direction:column}.fwCard{padding:12px}.fwMenuLinks .fwButton{width:100%;margin-right:0!important}}
@media(prefers-reduced-motion:reduce){.fwDice{animation:none}}
`;
document.head.appendChild(fwStyle);
ST_GUIDE.push(['The Unwritten Frontier','Story-only: three new lands, connected streets, twelve saved side quests, 200 learnable spells in ten schools, equipment for earned gold, original clan oaths and awakened eye powers, and 200 labyrinth floors. Find Captain Aster near Thornwake or use Menu → Lands & stories. The free-chip casino has no purchases or cash-outs. Existing islands, heroes, Arena, homes and purchases remain.']);
