// Registered inside the game's closure by scripts/build.mjs before startup.
const ST_CLASS_PATHS = {
  warrior: [['Shield Bash','strike'],['Iron Guard','guard'],['Battle Cry','rally'],['Cleave','quake'],['Pommel Break','strike'],['Vanguard Rush','flurry'],['Siegebreaker','quake'],['Unyielding Wall','ward']],
  mage: [['Fireball','fireball'],['Frost Bolt','frost'],['Chain Lightning','lightning'],['Arcane Shield','ward'],['Arcane Missile','bonespear'],['Ice Nova','wither'],['Sun Lance','fireball'],['Tempest Gate','lightning']],
  ranger: [['Arrow Rain','rain'],['Viper Arrow','venom'],['Aimed Shot','strike'],['Barkskin Cloak','guard'],['Twin Arrows','flurry'],['Frost Arrow','frost'],['Bramble Volley','wither'],['Eagle Eye','rally']],
  rogue: [['Backstab','strike'],['Envenomed Edge','venom'],['Smoke Veil','ward'],['Twin Daggers','flurry'],['Nerve Cut','frost'],['Night Ambush','strike'],['Poison Fan','wither'],['Assassin Focus','rally']],
  paladin: [['Radiant Smite','strike'],['Lay on Hands','heal'],['Oathguard','guard'],['Sacred Aegis','ward'],['Consecration','lightning'],['Judgment','fireball'],['Dawn Prayer','heal'],['Crusader Vow','rally']],
  gunner: [['Buckshot','rain'],['Deadeye Shot','strike'],['Incendiary Round','fireball'],['Take Cover','guard'],['Double Tap','flurry'],['Shock Round','frost'],['Suppressing Fire','quake'],['Powder Barrage','lightning']],
  necromancer: [['Bone Spear','bonespear'],['Life Drain','drain'],['Wither','wither'],['Bone Armor','guard'],['Grave Lance','bonespear'],['Soul Harvest','drain'],['Crypt Plague','wither'],['Death Shroud','ward']],
  monk: [['Hundred Fists','flurry'],['Stone Stance','guard'],['Palm Strike','strike'],['Breath of Life','heal'],['Pressure Point','frost'],['Dragon Kick','strike'],['Ki Wave','lightning'],['Tranquil Mind','ward']],
  druid: [['Thornlash','thornlash'],['Wild Mend','heal'],['Rootquake','quake'],['Barkskin','guard'],['Spore Cloud','wither'],['Moonbeam','bonespear'],['Briar Crown','ward'],['Grove Renewal','heal']],
  berserker: [['Rending Blow','strike'],['Blood Roar','rally'],['Groundsplitter','quake'],['Savage Rush','flurry'],['Blood Hunger','bloodfeast'],['Skull Hammer','strike'],['Iron Fury','guard'],['Ravager Sweep','rain']],
  blademaster: [['Twin Slash','flurry'],['Iaido Draw','strike'],['Sword Guard','guard'],['Battle Focus','rally'],['Winter Cut','frost'],['Crescent Arc','rain'],['Thousand Cuts','flurry'],['Perfect Parry','ward']],
};
const ST_CLASS_MILESTONES = {
  warrior:['Vanguard Cut','Steel Onslaught','Shield Tempest','Warlord Resolve','Last Bastion'],
  mage:['Ember Spark','Flame Lance','Cinder Tempest','Eclipse of Ash','Crown of Stars'],
  ranger:['Hunting Shot','Falcon Strike','Hail of Thorns','Wild Hunt','Skyfall Volley'],
  rogue:['Silent Edge','Shadow Lunge','Night of Knives','Crimson Ambush','Death in the Dark'],
  paladin:['Dawnstrike','Light of Judgment','Hallowed Ground','Seraphic Grace','Heavenfall'],
  gunner:['Quickdraw','Armor Piercer','Shrapnel Storm','Dragonfire Round','Final Salvo'],
  necromancer:['Grave Touch','Soul Lance','Legion of Ash','Devour Soul','Requiem'],
  monk:['Flowing Palm','Rising Dragon','Thunderous Ki','Inner Sun','Thousandfold Heaven'],
  druid:['Wild Spark','Moon Lance','Wrath of Roots','Ancient Renewal','Heart of the Wild'],
  berserker:['Savage Cut','Titan Cleaver','Blood Tempest','Undying Rage','Ragnarok'],
  blademaster:['Falling Petal','Moon Splitter','Storm of Steel','Void Draw','Heaven Sundering Slash'],
};
const stTierSkill=(cls,i)=>cls==='mage'?ST_MAGIC_TIERS[i].spell:cls+'_tier'+i;
const ST_CLASS_LEGACY = {};
for(const [cls,path] of Object.entries(ST_CLASS_PATHS)){
  ST_CLASS_LEGACY[cls]={};
  path.forEach(([name,base],i)=>{
    const id=cls+'_'+i,S=ST_SKILLS[base];
    ST_SKILLS[id]={...S,name,base,owner:cls,gift:false,level:[1,1,1,1,5,10,18,30][i],desc:name+'. '+S.desc};
    if(['warrior','ranger','rogue','gunner','berserker','blademaster'].includes(cls)&&ST_SKILLS[id].kind==='mag')ST_SKILLS[id].kind='phys';
    if(!ST_CLASS_LEGACY[cls][base])ST_CLASS_LEGACY[cls][base]=id;
    ST_EVOLVE[id]=[name,'Honed '+name,'Greater '+name,'Master '+name];
    SK_COLOR[id]=SK_COLOR[base]||'#c9a26a';SK_SHOT[id]=SK_SHOT[base];SK_FX[id]=SK_FX[base];
    if(ST_BEAMS[base])ST_BEAMS[id]=1;
  });
  ST_CLASSES[cls].skills=path.slice(0,4).map((_,i)=>cls+'_'+i);
  ST_CLASS_MILESTONES[cls].forEach((name,i)=>{
    const id=stTierSkill(cls,i);
    if(cls==='mage'){ST_SKILLS[id].owner=cls;ST_SKILLS[id].level=ST_MAGIC_TIERS[i].level;return;}
    const magic=['paladin','necromancer','druid'].includes(cls),base=magic?['bonespear','fireball','lightning','drain','lightning'][i]:['strike','strike','rain','flurry','rain'][i];
    ST_SKILLS[id]={...ST_SKILLS[base],name,base,owner:cls,gift:true,level:ST_MAGIC_TIERS[i].level,tier:i,mp:[4,9,16,23,32][i],mult:[1.25,2.05,1.45,1.6,2.25][i],desc:`${ST_CLASSES[cls].name}-only milestone. `+ST_SKILLS[base].desc};
    SK_COLOR[id]=SK_COLOR[base]||'#d9b978';SK_SHOT[id]=SK_SHOT[base];SK_FX[id]=SK_FX[base];
  });
}
function stOwnsSkill(d,id){
  const S=ST_SKILLS[id];if(!S)return false;
  if(S.owner)return S.owner===d.cls&&d.lv>=(S.level||1)&&!(d.hr&&['mag','heal','buff'].includes(S.kind));
  return (d.hr&&['flash','crush'].includes(id))||(d.were&&['wolfform','howl'].includes(id))||(d.vamp&&['bloodfeast','vampform','mist'].includes(id));
}
function stSyncClass(d){
  d.mastery=d.mastery||{};d.archivedSkills=d.archivedSkills||[];
  d.skills=[...new Set((d.skills||[]).map(id=>{
    if(stOwnsSkill(d,id))return id;
    const mapped=ST_CLASS_LEGACY[d.cls]?.[id];
    if(mapped&&stOwnsSkill(d,mapped)){d.mastery[mapped]=Math.max(d.mastery[mapped]||0,d.mastery[id]||0);return mapped;}
    if(!d.archivedSkills.includes(id))d.archivedSkills.push(id);return null;
  }).filter(Boolean))];
  for(const id of ST_CLASSES[d.cls].skills)if(d.skills.length<3&&!d.skills.includes(id)&&stOwnsSkill(d,id))d.skills.push(id);
}
function stPanelBack(m){const b=el('button','','Resume exploring');b.addEventListener('click',stCloseMenu);m.appendChild(b);}
function stClassMenu(){
  const d=stData();stSyncProgress(false);const m=stSystemPanel(ST_CLASSES[d.cls].name+' ability path');
  m.append(el('p','',`Level ${d.lv} · ${d.gold} gold. ${ST_CLASSES[d.cls].role||''} Only your own class can learn these abilities. Basic attack, items and racial powers are separate.`));
  const add=(id,auto)=>{
    const S=ST_SKILLS[id],known=d.skills.includes(id),fee=30+S.level*12,card=el('div','progressCard');
    const b=el('button','',known?'Learned':auto?'Milestone unlock':`Learn ${S.name} (${fee} gold)`);
    b.disabled=known||auto||d.lv<S.level||d.gold<fee||!stOwnsSkill(d,id);
    b.addEventListener('click',()=>{if(d.skills.includes(id)||!stOwnsSkill(d,id)||d.gold<fee)return;d.gold-=fee;d.skills.push(id);stLearnNotice('Learned '+S.name);stSave();stClassMenu();});
    card.append(el('h4','',S.name+' · Level '+S.level),el('p','',S.desc+` ${stSkCost(S)} MP at your level.`),b);m.appendChild(card);
  };
  ST_CLASS_PATHS[d.cls].forEach((_,i)=>add(d.cls+'_'+i,false));
  m.append(el('h3','','Class milestones'));ST_MAGIC_TIERS.forEach((_,i)=>add(stTierSkill(d.cls,i),true));
  stPanelBack(m);
}
// Level-up rewards share the owner and level gates used by training and combat.
stLearnSkill=function(){
  const d=stData(),ids=Object.keys(ST_SKILLS).filter(id=>ST_SKILLS[id].owner===d.cls&&!ST_SKILLS[id].gift&&stOwnsSkill(d,id)&&!d.skills.includes(id)).slice(0,3);
  if(ids.length)stSay([['',`Choose a ${ST_CLASSES[d.cls].name} ability.`]],null,ids.map(id=>[ST_SKILLS[id].name,()=>{if(stOwnsSkill(d,id)&&!d.skills.includes(id)){d.skills.push(id);stLearnNotice('Learned '+ST_SKILLS[id].name);stSave();}}]));
};
// Milestone presentation is class-specific, including in the bloodline panel.
const stBaseProgressMenu=stProgressMenu;
stProgressMenu=function(){
  stBaseProgressMenu();const d=stData();
  [...$('stMenu').querySelectorAll('.progressCard')].slice(0,5).forEach((card,i)=>{
    const S=ST_SKILLS[stTierSkill(d.cls,i)];card.querySelector('h4').textContent=ST_CLASSES[d.cls].name+' · '+ST_MAGIC_TIERS[i].name+' · Level '+S.level;
    card.querySelector('p').textContent=S.name+': '+S.desc;
  });
};
const ST_PROPERTIES = [
  {id:'homestead',name:'Harrowfield Homestead',price:600,x:27,y:25,style:'farmhouse',roof:'#854832',wall:'#d4bd8d',desc:'Your original farm, twelve growing plots and a family home.'},
  {id:'willowhome',name:'Willowbank Cottage',price:450,x:12,y:15,style:'cottage',roof:'#678063',wall:'#e1caa2',desc:'A warm one-bedroom cottage with a kitchen and flower boxes.'},
  {id:'harborhome',name:'Saltmere Harbor House',price:1200,x:31,y:14,style:'coastal',roof:'#457b8a',wall:'#cfddd4',desc:'A blue-shuttered coastal home with a study and dining room.'},
  {id:'townhome',name:'Thornwake Townhouse',price:2200,x:15,y:4,style:'townhouse',roof:'#5d627d',wall:'#d7b99b',desc:'A timber-and-stone town residence with a private bedroom and library.'},
  {id:'briarmanor',name:'Briarwood Manor',price:6500,x:29,y:25,style:'manor',roof:'#654664',wall:'#c3bca6',estate:true,desc:'A country estate with a walled garden, two bedrooms and a great dining room.'},
  {id:'suncrest',name:'Suncrest Estate',price:14000,x:32,y:26,style:'estate',roof:'#8d633b',wall:'#e0d3b0',estate:true,desc:'A grand estate with a courtyard, guest wing, library and private kitchen.'},
];
const ST_HEISTS=[
  {id:'ledger',name:'The Missing Ledger',x:9,y:18,lv:1,pay:160,rep:1,text:'Recover a smuggler ledger from the marked cache beside Ravenhollow pond.'},
  {id:'seal',name:'The Harbor Seal',x:35,y:16,lv:5,pay:350,rep:2,text:'Lift a shipping seal from the marked dockside cache in Saltmere.'},
  {id:'letters',name:'A Noble Secret',x:25,y:8,lv:10,pay:650,rep:2,text:'Retrieve sealed letters from the marked cache south of the Keep.'},
  {id:'idol',name:'The Ashen Idol',x:39,y:25,lv:18,pay:1100,rep:3,text:'Recover the idol from the marked cache at the edge of the eastern dunes.'},
  {id:'crown',name:'The Unseen Hand',x:30,y:22,lv:25,pay:2000,rep:4,text:'Take the final cipher from the marked cache in the Gloamwood.'},
];
const ST_THIEVES_HOME={x:3,y:12};
function stHomeRows(estate,variant=0){
  const w=estate?18:14,h=estate?13:10,m=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'.'));
  m[h-1][Math.floor(w/2)]='E';
  for(let y=1;y<5;y++)m[y][5]='#';m[4][5]='.';
  m[1][2]='b';m[1][3]='b';m[1][w-3]='f';m[2][w-3]='k';m[2][2]='k';
  m[5][3]='t';m[5][4]='t';m[6][3]='t';m[6][4]='t';m[2][w-5]='k';
  if(estate){for(let y=1;y<5;y++)m[y][10]='#';m[4][10]='.';m[1][7]='b';m[1][8]='b';m[7][w-4]='t';m[7][w-5]='t';}
  if(variant%2)m[3][w-5]='k';return m.map(r=>r.join(''));
}
for(const [i,P]of ST_PROPERTIES.entries()){
  if(P.id==='homestead')continue;
  ST_DUNGEONS[P.id]={name:P.name,home:true,own:true,lit:true,pool:[],theme:{floor:i%2?'#8c6747':'#9b7956',wall:P.wall,glow:'#ffcf8b'},exit:[P.x,P.y+1],rows:stHomeRows(P.estate,i)};
  ST_HOUSES.push({key:P.id,x:P.x,y:P.y,start:[Math.floor(ST_DUNGEONS[P.id].rows[0].length/2),ST_DUNGEONS[P.id].rows.length-2]});
  ST_MAP[P.y][P.x]='H';ST_MAP[P.y][P.x+1]=ST_MAP[P.y+1][P.x]=ST_MAP[P.y+1][P.x+1]='h';
  ST_MAP[P.y+2][P.x]='=';ST_MAP[P.y+2][P.x+1]='=';
}
{const D=ST_DUNGEONS.homestead,row=[...D.rows[2]];row[2]='k';row[row.length-5]='k';D.rows[2]=row.join('');}
ST_DUNGEONS.veiledhand={name:'The Veiled Hand · Thieves Guild',home:true,lit:true,pool:[],theme:{floor:'#665342',wall:'#343d3c',glow:'#77bcb0'},exit:[ST_THIEVES_HOME.x,ST_THIEVES_HOME.y+1],rows:['##############','#k..f.....k..#','#............#','#..tt....tt..#','#..tt....tt..#','#............#','#b.........k.#','#............#','######E#######']};
ST_HOUSES.push({key:'veiledhand',...ST_THIEVES_HOME,start:[6,7]});
{const {x,y}=ST_THIEVES_HOME;ST_MAP[y][x]='H';ST_MAP[y][x+1]=ST_MAP[y+1][x]=ST_MAP[y+1][x+1]='h';ST_MAP[y+2][x]=ST_MAP[y+2][x+1]='=';}
const stPropertyOwned=(d,id)=>id==='homestead'?!!d.farm:!!d.properties?.[id];
function stHousingMenu(){
  const d=stData(),m=stSystemPanel('Housing & estates');m.append(el('p','',`${d.gold} gold · Permanent deeds bought with earned gold, not Crowns. Visit an exterior, then use E to enter. Beds, kitchens, wardrobes, dining tables and personal storage are usable inside.`));
  for(const P of ST_PROPERTIES){
    const owned=stPropertyOwned(d,P.id),card=el('div','progressCard'),buy=el('button','',owned?'Deed owned':`Buy ${P.name} (${P.price} gold)`);
    buy.disabled=owned||d.gold<P.price;
    buy.addEventListener('click',()=>{if(stPropertyOwned(d,P.id)||d.gold<P.price)return;d.gold-=P.price;d.properties=d.properties||{};d.properties[P.id]={bought:Date.now(),pricePaid:P.price,storedGold:0};if(P.id==='homestead'){d.farm={plots:{}};d.seeds={...(d.seeds||{}),wheat:(d.seeds?.wheat||0)+6,carrot:(d.seeds?.carrot||0)+3};}stSave();sfx('levelup');stHousingMenu();});
    const visit=el('button','','Visit '+P.name);visit.addEventListener('click',()=>{stCloseMenu();stEnterMap('world',P.x+.5,P.y+2);});
    card.append(el('h4','',P.name+(P.estate?' · Estate':'')),el('p','',P.desc),el('p','hint',P.target||''),el('small','hint',`${P.style} · World (${P.x+1}, ${P.y+2})`),buy,visit);m.appendChild(card);
  }stPanelBack(m);
}
const stThiefRank=g=>['Outsider','Cutpurse','Footpad','Shadow','Nightblade','Master Thief','Guildmaster'][Math.min(6,(g?.done||[]).length+(g?1:0))];
function stThievesMenu(){
  const d=stData(),g=d.thieves,m=stSystemPanel('The Veiled Hand · Thieves Guild'),inside=d.map==='veiledhand';
  m.append(el('p','',`A guild beneath the notice of kings. ${stThiefRank(g)}${g?' · '+g.rep+' reputation':''}. Membership never grants another class's moves. Meet the guild in its hideout west of Thornwake.`));
  if(!inside){const b=el('button','','Visit the guild hideout');b.addEventListener('click',()=>{stCloseMenu();stEnterMap('world',ST_THIEVES_HOME.x+.5,ST_THIEVES_HOME.y+2);});m.append(b);stPanelBack(m);return;}
  if(!g){const b=el('button','','Join the Veiled Hand (50 gold)');b.disabled=d.gold<50;b.addEventListener('click',()=>{if(d.thieves||d.gold<50)return;d.gold-=50;d.thieves={rep:0,done:[],active:null};stSave();stThievesMenu();});m.append(b);stPanelBack(m);return;}
  for(const H of ST_HEISTS){
    const done=g.done.includes(H.id),active=g.active===H.id,ready=active&&g.recovered,card=el('div','progressCard'),b=el('button','',done?'Completed':ready?'Claim '+H.pay+' gold':active?'Contract in progress':'Accept '+H.name);
    b.disabled=done||d.lv<H.lv||(!active&&!!g.active)||(active&&!ready);
    b.addEventListener('click',()=>{if(g.done.includes(H.id)||d.lv<H.lv)return;if(ready&&g.active===H.id&&g.recovered){d.gold+=H.pay;g.rep+=H.rep;g.done.push(H.id);g.active=null;g.recovered=false;sfx('pickup');}else if(!g.active){g.active=H.id;g.recovered=false;}stSave();stThievesMenu();});
    card.append(el('h4','',H.name+' · Level '+H.lv),el('p','',H.text+` Reward: ${H.pay} gold, ${H.rep} reputation. World (${H.x}, ${H.y}).`),b);m.append(card);
    if(active&&!ready){const route=el('button','','Travel to '+H.name);route.addEventListener('click',()=>{stCloseMenu();stEnterMap('world',H.x,H.y+1);});card.append(route);}
  }
  m.append(el('p','','Recover each cache on foot with E, then return here to claim. Five one-time jobs. Crime and guard bounties remain separate; the guild cannot erase them.'));
  stPanelBack(m);
}
function stHomeNearby(d,near){
  if(d.map==='world'){
    const h=ST_HOUSES.find(h=>(h.key==='veiledhand'||ST_PROPERTIES.some(p=>p.id===h.key))&&Math.hypot(d.x-(h.x+1)*64,d.y-(h.y+2)*64)<60);
    if(h)return{kind:'house',h};
  }
  const H=ST_HEISTS.find(h=>d.thieves?.active===h.id);
  if(d.map==='world'&&H&&!d.thieves.recovered&&near(H.x,H.y))return{kind:'heistcache',label:'Recover '+H.name,H};
  const D=ST_DUNGEONS[d.map];if(!D?.home)return null;
  if(D.garden)return null;
  const estate=ST_PROPERTIES.find(p=>p.id===d.map&&p.estate);
  if(estate&&near(D.rows[0].length-3,D.rows.length-2))return{kind:'garden',label:'Step into your private garden',estate};
  if(d.map==='veiledhand'&&near(3,3))return{kind:'thieves',label:'Read the Veiled Hand contract table'};
  const owned=stPropertyOwned(d,d.map),P=ST_PROPERTIES.find(p=>p.id===d.map);
  const choices=[],add=(x,y,it,priority=5)=>{if(near(x,y))choices.push({it,priority,distance:Math.hypot(d.x-(x*64+32),d.y-(y*64+32))});};
  if(owned)add(2,2,{kind:'homestore',label:'Open your personal strongbox'},2);
  if(owned)add(D.rows[0].length-5,2,{kind:'wardrobe',label:'Change your home furnishing colors'},2);
  for(let y=0;y<D.rows.length;y++)for(let x=0;x<D.rows[y].length;x++){
    const t=D.rows[y][x];if(!near(x,y))continue;
    if(t==='b')add(x,y,{kind:'homebed',label:owned?'Rest in your bed':'Inspect the bed',owned},1);
    if(t==='f')add(x,y,{kind:'homehearth',label:'Use the cooking hearth',owned},1);
    if(t==='t')add(x,y,{kind:'homeseat',label:'Sit at the dining table',owned},3);
    if(t==='k')add(x,y,{kind:'homeshelf',label:P?'Browse your books and keepsakes':'Browse the household shelves'});
  }
  return choices.sort((a,b)=>a.distance-b.distance||a.priority-b.priority)[0]?.it||null;
}
function stHomeInteract(it,d){
  if(it.kind==='exit'&&ST_DUNGEONS[d.map]?.garden){const P=ST_PROPERTIES.find(p=>p.id===ST_DUNGEONS[d.map].parent);stEnterMap(P.id,ST_DUNGEONS[P.id].rows[0].length-4,ST_DUNGEONS[P.id].rows.length-2);return true;}
  if(it.kind==='garden'){stEnterMap(it.estate.id+'_garden',7,8);return true;}
  if(it.kind==='house'){
    const P=ST_PROPERTIES.find(p=>p.id===it.h.key);
    if(P){
      if(!stPropertyOwned(d,P.id)){stSay([['Estate Steward',`${P.name}. ${P.desc} The deed costs ${P.price} gold. No premium currency required.`]],null,[['View available properties',()=>setTimeout(stHousingMenu,0)],['Leave',null]]);return true;}
      stEnterMap(P.id,...(it.h.start||[4,5]));return true;
    }
  }
  if(it.kind==='thieves'){stThievesMenu();return true;}
  if(it.kind==='heistcache'){
    const g=d.thieves;if(g&&g.active===it.H.id&&!g.recovered){g.recovered=true;stSave();stSay([['',`You recover the package for ${it.H.name}. Return to the Veiled Hand contract table to claim your reward.`]]);}return true;
  }
  if(it.kind==='homebed'){
    if(!it.owned){stSay([['','Someone lives here. Best not sleep in their bed.']]);return true;}
    stSay([['','Your own sheets, a warm quilt, and a door that locks. Rest until your strength returns?']],null,[['Rest at home',()=>{d.wounds=null;const s=stStats();d.hp=s.hp;d.mp=s.mp;d.shrine={map:d.map,x:d.x,y:d.y};stSave();sfx('respawn');stCallout('RESTED AT HOME','#dfc18b');}],['Stay awake',null]]);return true;
  }
  if(it.kind==='homehearth'){if(it.owned)stCraft('meal');else stSay([['','A kettle simmers over the family hearth. The room smells of bread and woodsmoke.']]);return true;}
  if(it.kind==='homeseat'){stSay([['','You pull out a chair and sit beside the table. Candlelight falls across a plate, a cup and a folded cloth. For a moment, the Vale can wait.']],null,[['Stand up',null]]);return true;}
  if(it.kind==='homeshelf'){stSay([['','Recipe books, dried flowers, letters and little keepsakes. This is a home, not another dungeon.']]);return true;}
  if(it.kind==='homestore'){
    d.properties=d.properties||{};const p=d.properties[d.map]||(d.properties[d.map]={storedGold:0}),m=stSystemPanel('Your personal strongbox');
    m.append(el('p','',`Carried: ${d.gold} gold · Stored here: ${p.storedGold||0} gold. Stored gold is safe when you fall in battle.`));
    for(const [label,amount]of [['Deposit 100 gold',100],['Withdraw 100 gold',-100]]){
      const b=el('button','',label);b.disabled=amount>0?d.gold<amount:(p.storedGold||0)<-amount;
      b.addEventListener('click',()=>{if(amount>0&&d.gold<amount||amount<0&&(p.storedGold||0)<-amount)return;d.gold-=amount;p.storedGold=(p.storedGold||0)+amount;stSave();stHomeInteract(it,d);});m.append(b);
    }stPanelBack(m);return true;
  }
  if(it.kind==='wardrobe'){
    const m=stSystemPanel('Home furnishings');m.append(el('p','','Choose a quilt and rug color. Furnishings belong to this home and are saved with its deed.'));
    for(const [name,color]of [['Moss linen','#6c855e'],['Wine velvet','#93545d'],['Harbor blue','#537f9a'],['Golden flax','#b99b60']]){
      const b=el('button','',name);b.addEventListener('click',()=>{d.homeColors=d.homeColors||{};d.homeColors[d.map]=color;delete ST.dunC[d.map];stDrawDungeonCanvas(d.map);stSave();stCallout('FURNISHINGS UPDATED',color);stCloseMenu();});m.append(b);
    }stPanelBack(m);return true;
  }return false;
}
function stDrawHomeExteriors(g){
  const residents=ST_HOUSES.filter(h=>ST_DUNGEONS[h.key]?.home&&!ST_PROPERTIES.some(p=>p.id===h.key)&&!['veiledhand','guildhall','jail'].includes(h.key))
    .map((h,i)=>({...h,id:h.key,name:ST_DUNGEONS[h.key].name,roof:['#775346','#65715b','#586f7b'][i%3],wall:'#c8b493'}));
  for(const P of [...ST_PROPERTIES,...residents]){
    const x=P.x*64,y=P.y*64;
    g.save();g.fillStyle=P.wall;g.fillRect(x+12,y+27,104,81);g.strokeStyle='#493a2b';g.lineWidth=4;g.strokeRect(x+12,y+27,104,81);
    for(const dx of [21,88]){
      g.fillStyle='#ffd79a';g.fillRect(x+dx,y+42,18,23);g.strokeStyle='#574c38';g.lineWidth=2;g.strokeRect(x+dx,y+42,18,23);
      g.beginPath();g.moveTo(x+dx+9,y+42);g.lineTo(x+dx+9,y+65);g.moveTo(x+dx,y+53);g.lineTo(x+dx+18,y+53);g.stroke();
      g.fillStyle=P.roof;g.fillRect(x+dx-5,y+42,4,24);g.fillRect(x+dx+19,y+42,4,24);
      g.fillStyle='#674b32';g.fillRect(x+dx-2,y+66,22,7);g.fillStyle='#718b4b';g.fillRect(x+dx-1,y+62,20,5);
      for(let i=0;i<3;i++){g.fillStyle=['#e7ac87','#dbcd93','#b49bb7'][i];g.beginPath();g.arc(x+dx+3+i*6,y+62,2.5,0,7);g.fill();}
    }
    g.fillStyle=P.roof;g.beginPath();g.moveTo(x-8,y+28);g.lineTo(x+64,y-66);g.lineTo(x+136,y+28);g.closePath();g.fill();
    g.strokeStyle='rgba(30,24,24,.4)';g.lineWidth=3;for(let i=0;i<6;i++){g.beginPath();g.moveTo(x+7+i*8,y+20-i*13);g.lineTo(x+121-i*8,y+20-i*13);g.stroke();}
    g.fillStyle='#f1d0a2';g.beginPath();g.arc(x+64,y-6,10,0,7);g.fill();g.strokeStyle='#493a2b';g.stroke();
    g.fillStyle='#60432e';g.fillRect(x+50,y+65,28,44);g.fillStyle='#c6a666';g.beginPath();g.arc(x+72,y+87,2,0,7);g.fill();
    g.fillStyle='#9a917b';g.fillRect(x+43,y+109,43,8);g.fillRect(x+38,y+117,53,7);
    if(P.estate){g.fillStyle='#a4a591';for(const dx of [-7,128]){g.fillRect(x+dx,y+47,7,70);g.fillRect(x+dx-3,y+43,13,6);}g.strokeStyle='#d4c6a1';g.lineWidth=2;g.strokeRect(x+24,y+31,80,76);}
    g.fillStyle='#26342b';g.fillRect(x-11,y+132,150,23);g.fillStyle='#f0dfb6';g.font='12px sans-serif';g.textAlign='center';g.fillText(P.name,x+64,y+148);g.restore();
  }
  const tx=ST_THIEVES_HOME.x*64,ty=ST_THIEVES_HOME.y*64;
  g.fillStyle='#263b38';g.fillRect(tx+8,ty+34,112,73);g.fillStyle='#9ab9a2';g.font='bold 12px sans-serif';g.textAlign='center';g.fillText('THE VEILED HAND',tx+64,ty+53);g.fillStyle='#241e1c';g.fillRect(tx+64-14,ty+128-47,28,39);g.textAlign='left';
}
const stBaseHomeCanvas=stDrawDungeonCanvas;
stDrawDungeonCanvas=function(key){
  stBaseHomeCanvas(key);const D=ST_DUNGEONS[key];if(!D.home)return;
  const g=ST.dunC[key].getContext('2d'),accent=stData()?.homeColors?.[key]||'#7c6156';
  if(D.garden){stDrawGarden(g,D);return;}
  D.rows.forEach((row,y)=>[...row].forEach((t,x)=>{
    const px=x*64,py=y*64;
    if(t==='.'){
      g.fillStyle=D.theme.floor;g.fillRect(px,py,64,64);g.strokeStyle='rgba(45,27,16,.3)';g.lineWidth=1;
      for(let i=0;i<4;i++){g.beginPath();g.moveTo(px,py+i*16);g.lineTo(px+64,py+i*16);g.stroke();}
      g.beginPath();g.moveTo(px+(y%2?18:45),py);g.lineTo(px+(y%2?18:45),py+64);g.stroke();
      if(y>=4&&y<=7&&x>=6&&x<=9){g.fillStyle=accent;g.fillRect(px,py,64,64);}
    }
    if(t==='b'){g.fillStyle=accent;g.fillRect(px+9,py+25,46,32);g.strokeStyle='#d0b995';g.strokeRect(px+14,py+30,36,21);}
    if(t==='k'){for(let i=0;i<4;i++){g.fillStyle=['#8e5852','#789078','#ac9864','#688795'][i];g.fillRect(px+14+i*9,py+14,6,17);g.fillRect(px+14+i*9,py+36,6,16);}}
    if(t==='t'){
      g.fillStyle='#765135';g.fillRect(px,py,64,64);g.strokeStyle='#bb9563';g.lineWidth=3;
      for(const [dx,dy,x1,y1,x2,y2]of [[-1,0,2,0,2,64],[1,0,62,0,62,64],[0,-1,0,2,64,2],[0,1,0,62,64,62]])if(D.rows[y+dy]?.[x+dx]!=='t'){g.beginPath();g.moveTo(px+x1,py+y1);g.lineTo(px+x2,py+y2);g.stroke();}
      g.fillStyle='#d9d0b5';g.beginPath();g.arc(px+22,py+26,9,0,7);g.fill();g.fillStyle='#766647';g.beginPath();g.arc(px+22,py+26,5,0,7);g.fill();g.fillStyle='#dfbe79';g.fillRect(px+43,py+16,4,13);
    }
    if(t==='#'&&y===0&&x%3===1){g.fillStyle='#739394';g.fillRect(px+12,py+20,40,28);g.strokeStyle='#ead6ac';g.lineWidth=3;g.strokeRect(px+12,py+20,40,28);g.beginPath();g.moveTo(px+32,py+20);g.lineTo(px+32,py+48);g.stroke();}
  }));
  if(D.rows.length>=10&&D.rows[0].length>=14){
    g.strokeStyle='#cbb289';g.lineWidth=3;g.strokeRect(6*64+7,4*64+7,4*64-14,4*64-14);g.lineWidth=1;g.strokeRect(6*64+14,4*64+14,4*64-28,4*64-28);
    g.save();g.translate(8*64,6*64);g.rotate(Math.PI/4);g.strokeStyle='#cbb289';g.lineWidth=3;g.strokeRect(-32,-32,64,64);g.strokeRect(-19,-19,38,38);g.restore();
  }
  if(ST_PROPERTIES.some(p=>p.id===key)){
    // A strongbox, an actual wardrobe and a kitchen counter, not loot crates.
    g.fillStyle=D.theme.floor;g.fillRect(2*64,2*64,64,64);
    g.fillStyle='#3b2a20';g.fillRect(2*64+8,2*64+20,48,34);g.strokeStyle='#c9a66e';g.strokeRect(2*64+8,2*64+20,48,34);g.fillStyle='#e5c278';g.fillRect(2*64+29,2*64+29,6,12);
    const wx=(D.rows[0].length-5)*64;
    g.fillStyle=D.theme.floor;g.fillRect(wx,2*64,64,64);g.fillStyle='#63472f';g.fillRect(wx+5,2*64+4,54,55);g.strokeStyle='#bd9e6f';g.lineWidth=2;g.strokeRect(wx+8,2*64+7,48,49);g.beginPath();g.moveTo(wx+32,2*64+7);g.lineTo(wx+32,2*64+56);g.stroke();g.fillStyle='#dcc38b';g.fillRect(wx+26,2*64+29,3,6);g.fillRect(wx+35,2*64+29,3,6);
    if(key!=='homestead'){
      const kx=(D.rows[0].length-3)*64,ky=2*64;
      g.fillStyle='#856144';g.fillRect(kx+2,ky+8,60,48);g.fillStyle='#c0b79a';g.fillRect(kx,ky+3,64,18);g.strokeStyle='#523b28';g.strokeRect(kx+7,ky+28,49,22);
      g.fillStyle='#ead9ac';g.beginPath();g.ellipse(kx+18,ky+12,10,6,0,0,7);g.fill();g.fillStyle='#4a6570';g.beginPath();g.arc(kx+46,ky+11,8,0,7);g.fill();g.fillStyle='#d4d0b2';g.fillRect(kx+44,ky+2,4,3);
    }
  }
  if(ST_PROPERTIES.some(p=>p.id===key&&p.estate)){
    const x=(D.rows[0].length-3)*64,y=(D.rows.length-2)*64;
    g.fillStyle='#254b3f';g.fillRect(x+8,y+3,48,58);g.strokeStyle='#dbc89d';g.lineWidth=3;g.strokeRect(x+8,y+3,48,58);g.fillStyle='#ecd8a4';g.font='12px sans-serif';g.textAlign='center';g.fillText('GARDEN',x+32,y+35);g.textAlign='left';
  }
};
const stBaseWorldCanvas=stDrawMapCanvas;
stDrawMapCanvas=function(){stBaseWorldCanvas();stDrawHomeExteriors(ST.mapC.getContext('2d'));};
const stBaseNearby=stNearby;
stNearby=function(){
  const d=stData(),base=stBaseNearby(),near=(x,y)=>Math.hypot(d.x-(x*64+32),d.y-(y*64+32))<80,home=stHomeNearby(d,near);
  if(home?.kind==='house')return home;
  if(base&&['exit','door','npc','player','spouse','kid','guild','board','shrine'].includes(base.kind))return base;
  return home||base;
};
const stBaseInteract=stInteract;
stInteract=function(pre){const it=pre||stNearby();if(it&&!stHomeInteract(it,stData()))stBaseInteract(it);};
const stBaseHomeEnter=stEnterMap;
stEnterMap=function(key,...args){
  if(stData().map!==key){ST.announcements=[];STFX.callout=null;ST.noticeRegion=null;}
  return stBaseHomeEnter(key,...args);
};
const stBaseHomeCraft=stCraft;
stCraft=function(station){
  stBaseHomeCraft(station);
  if(station==='meal'&&stPropertyOwned(stData(),stData().map))$('stMenu').querySelector('h3').textContent='Your home kitchen';
};
for(const P of ST_PROPERTIES.filter(p=>p.estate)){
  const rows=Array.from({length:11},(_,y)=>Array.from({length:16},(_,x)=>x===0||y===0||x===15||y===10?'#':'.'));
  rows[10][7]='E';rows[4][7]='#';rows[4][8]='#';rows[5][7]='#';rows[5][8]='#';
  ST_DUNGEONS[P.id+'_garden']={name:P.name+' · Private garden',parent:P.id,garden:true,home:true,lit:true,pool:[],theme:{floor:'#688252',wall:'#8d967c',glow:'#ffe6af'},exit:[P.x,P.y+1],rows:rows.map(r=>r.join(''))};
}
function stDrawGarden(g,D){
  D.rows.forEach((r,y)=>[...r].forEach((t,x)=>{
    const px=x*64,py=y*64;g.fillStyle=t==='#'?'#849078':(x+y)%2?'#648452':'#6f8c5a';g.fillRect(px,py,64,64);
    if(t==='#'){g.fillStyle='#a6ad91';g.fillRect(px,py,64,9);g.strokeStyle='#5a6b54';g.strokeRect(px+3,py+3,58,58);}
    if(x===7||x===8||y===7){g.fillStyle='#b2a98b';if(t!== '#')g.fillRect(px,py,64,64);}
    if(t==='.'&&y>0&&y<9&&(x===2||x===13)){g.fillStyle='#3b6947';g.fillRect(px+5,py+4,54,55);for(let i=0;i<6;i++){g.fillStyle=['#ddbd83','#bda4c4','#e3b8a2'][i%3];g.beginPath();g.arc(px+14+(i%2)*27,py+12+Math.floor(i/2)*18,5,0,7);g.fill();}}
    if(y===7&&(x===4||x===11)){g.fillStyle='#75583c';g.fillRect(px,py+10,62,22);g.fillRect(px+4,py+32,6,15);g.fillRect(px+50,py+32,6,15);}
    if(t==='E'){g.fillStyle='#584531';g.fillRect(px+6,py+2,52,60);g.fillStyle='#f1d09b';g.font='12px sans-serif';g.fillText('HOME',px+12,py+35);}
  }));
  g.fillStyle='#b5b8a1';g.beginPath();g.ellipse(8*64,5*64,76,52,0,0,7);g.fill();g.fillStyle='#76afb3';g.beginPath();g.ellipse(8*64,5*64,63,40,0,0,7);g.fill();g.fillStyle='#d8d6bb';g.fillRect(8*64-8,4*64+10,16,54);g.beginPath();g.ellipse(8*64,4*64+12,32,13,0,0,7);g.fill();
}
// Mark active world caches with the actual renderer, not just menu coordinates.
const stBaseWorldNotices=stWorldNotices;
stWorldNotices=function(dt){
  stBaseWorldNotices(dt);
  const d=stData(),H=ST_HEISTS.find(h=>h.id===d.thieves?.active);
  if(d.map==='world'&&H&&!d.thieves.recovered){
    // World coordinates are transformed by the exploration renderer.
    ST.heistMarker=H;
  }else ST.heistMarker=null;
};
const stBaseTextState=window.render_game_to_text;
window.render_game_to_text=()=>{
  const data=JSON.parse(stBaseTextState()),d=stData();
  if(d&&ST.on){data.player.class=d.cls;data.skills=d.skills;data.housing=ST_PROPERTIES.filter(p=>stPropertyOwned(d,p.id)).map(p=>p.name);data.thieves=d.thieves?{rank:stThiefRank(d.thieves),active:d.thieves.active,recovered:!!d.thieves.recovered,completed:d.thieves.done}:null;data.interaction=stNearby()?.label||stNearby()?.kind||null;}
  return JSON.stringify(data);
};
