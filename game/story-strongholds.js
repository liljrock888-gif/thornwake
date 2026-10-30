// High-level facilities extend the existing optional Adventurers' Guild.
const FW_STRONGHOLDS=[
  {id:'watchhold',name:'Lantern Watchhold',level:10,rank:'D',city:'lumenreach',color:'#9eab81',reward:250,xp:150,standing:20},
  {id:'starcitadel',name:'The Astral Citadel',level:25,rank:'C',city:'cinderward',color:'#a4a6c9',reward:800,xp:500,standing:40},
  {id:'crownspire',name:'Crownspire Bastion',level:40,rank:'A',city:'frostcrag',color:'#b7caad',reward:1800,xp:1000,standing:70}
];
function fwHoldAccess(H){
  const d=stData();return !!(H&&d.lv>=H.level&&d.guild&&ST_RANKS.indexOf(d.guild.rank)>=ST_RANKS.indexOf(H.rank));
}
for(const H of FW_STRONGHOLDS){
  const rows=Array.from({length:18},(_,y)=>Array.from({length:23},(_,x)=>x===0||y===0||x===22||y===17?'#':'.'));
  rows[17][11]='E';for(const x of [3,19])for(let y=2;y<15;y+=4)rows[y][x]='#';
  for(const x of [5,6,16,17])rows[7][x]='t';rows[2][11]='f';
  ST_DUNGEONS[H.id]={name:H.name,home:true,lit:true,pool:[],rows:rows.map(r=>r.join('')),theme:{floor:'#8e8575',wall:'#59675c',glow:H.color},exit:[28,9],stronghold:H.id};
  ST_FOES['hold_trial_'+H.id]={...ST_FOES.knight,name:H.name+' Trial Guardian',boss:true,lv:H.level+2,hp:240+H.level*24,atk:9+Math.round(H.level*.65),mag:8+Math.round(H.level*.55),def:4+Math.round(H.level*.45),xp:60+H.level*6,gold:50+H.level*4,look:'knight',color:H.color,pattern:'charge',rtPattern:'charge',rtRole:'elite',role:'Guild trial guardian'};
  for(const [role,x,y]of [['steward',11,12],['trainer',14,9],['quartermaster',8,9],['captain',11,4]])ST_NPCS.push({id:H.id+'_'+role,fwKey:'hold_'+role,hold:H.id,name:role==='captain'?'Trial Captain':role==='trainer'?'Class Mentor':role==='quartermaster'?'Stronghold Quartermaster':'Guild Steward',map:H.id,x,y,look:role==='trainer'?'mage':'paladin',color:H.color});
  const D=ST_DUNGEONS[H.city];for(let y=6;y<=7;y++){const row=[...D.rows[y]];for(let x=27;x<=29;x++)row[x]='#';D.rows[y]=row.join('');}
}
function fwHoldData(){const f=fwData();if(!f.holdClears||typeof f.holdClears!=='object')f.holdClears={};return f;}
function fwHoldChallenge(id){
  const H=FW_STRONGHOLDS.find(h=>h.id===id),f=fwHoldData();
  if(ST.battle||!fwHoldAccess(H)||stData().map!==id||f.holdClears[id])return false;
  stCloseMenu();stStartBattle(['hold_trial_'+id],'hold_trial_'+id,'=');if(ST.battle)ST.battle.fwHold=id;return !!ST.battle;
}
function fwHoldDesk(id){
  const H=FW_STRONGHOLDS.find(h=>h.id===id),d=stData(),f=fwHoldData();if(!H)return;
  const m=fwPanel(H.name,'GUILD STRONGHOLD / LEVEL '+H.level+' / '+H.rank+'-RANK',`A walkable fortress with a steward, class mentor, quartermaster and trial captain. Requires level ${H.level} and ${H.rank}-Rank Guild membership. Joining remains optional for the campaign, other lands, housing, jobs, the labyrinth and independent contracts.`);
  fwButton(m,'Enter '+H.name,()=>{if(!fwHoldAccess(H)||ST.battle)return;stCloseMenu();stEnterMap(H.id,11,15);},!!ST.battle||!fwHoldAccess(H));
  if(!d.guild)fwButton(m,'Speak with a Guild recruiter',()=>stGuildDesk('Compact Recruiter'));
  if(d.map===id&&fwHoldAccess(H)){
    fwButton(m,'Guild contracts & standing',stGuildBoard);fwButton(m,'Class mentor · owned techniques',stClassMenu);
    fwButton(m,'Stronghold infirmary · free care',()=>{if(ST.battle)return;const s=stStats();d.hp=s.hp;d.mp=s.mp;stSave();stHud();stCallout('GUILD INFIRMARY','#c4dfb5');});
    for(const [key,price]of [['potion',20],['ether',18]])fwButton(m,'Buy '+key+' · '+price+' gold',()=>{if(ST.battle||d.gold<price||(d.items[key]||0)>=99)return;d.gold-=price;d.items[key]=(d.items[key]||0)+1;stSave();fwHoldDesk(id);},!!ST.battle||d.gold<price||(d.items[key]||0)>=99);
    fwButton(m,f.holdClears[id]?'Trial already completed':'Begin one-time guardian trial',()=>fwHoldChallenge(id),!!ST.battle||!!f.holdClears[id]);
    m.appendChild(el('p','',`First-clear reward: ${H.reward} gold, ${H.xp} XP and ${H.standing} Guild standing, in addition to normal combat rewards. One clear per hero. The trial never changes your class or grants another class’s abilities.`));
  }fwBack(m);
}
function fwProgressionMenu(){
  const d=stData(),m=fwPanel('Beyond the first road','LEVELS / ACCESS / GUILD STRONGHOLDS',`Your level: ${d.lv}. New access is earned, not purchased with real money. Class milestones, spell level requirements, material-tier equipment, familiar adoptions and these optional guild facilities provide long-term goals. Talent points arrive every five levels, capped at twelve.`);
  for(const H of FW_STRONGHOLDS){const c=el('article','fwCard');c.append(el('h4','',H.name),el('p','',`Level ${H.level} · ${H.rank}-Rank Guild · ${ST_DUNGEONS[H.city].name}`),el('p','',fwHoldAccess(H)?'Access earned. Visit the stronghold and challenge its captain.':'Locked until both level and Guild rank requirements are met.'));fwButton(c,'Inspect '+H.name,()=>fwHoldDesk(H.id));m.appendChild(c);}
  m.appendChild(el('p','','Other milestones: level 5 lets a secret-earned eye be chosen, never grants one for free. Levels 4–12 unlock more familiars. Learned spells retain their individual level requirements. Rare material tiers rise through levels 50–58. Late labyrinth floors and original story bosses retain their own difficulty. Membership never blocks the main campaign.'));
  fwButton(m,'Class milestones',stClassMenu);fwButton(m,'Level-gated equipment',fwShop);fwButton(m,'Animal familiars',fwFamiliarMenu);fwBack(m);
}
const fwHoldEnter=stEnterMap;
stEnterMap=function(key,...args){
  const H=FW_STRONGHOLDS.find(h=>h.id===key);
  if(H&&!fwHoldAccess(H)){stSay([['Stronghold gatekeeper',`Access requires level ${H.level} and ${H.rank}-Rank Guild membership. Independent adventure and the main campaign remain open.`]]);return;}
  const old=FW_STRONGHOLDS.find(h=>h.id===stData().map);if(old&&key==='world')return fwHoldEnter(old.city,28,9);
  return fwHoldEnter(key,...args);
};
const fwHoldNear=stNearby;
stNearby=function(){const d=stData(),H=FW_STRONGHOLDS.find(h=>h.city===d.map&&Math.hypot(d.x-28*64-32,d.y-8*64-32)<75);if(H)return{kind:'holdgate',label:'Inspect '+H.name,H};return fwHoldNear();};
const fwHoldInteract=stInteract;
stInteract=function(pre){const it=pre||stNearby();if(it?.kind==='holdgate')return fwHoldDesk(it.H.id);return fwHoldInteract(it);};
const fwHoldTalk=stTalk;
stTalk=function(id){const n=ST_NPCS.find(n=>n.id===id);if(n?.hold)return fwHoldDesk(n.hold);return fwHoldTalk(id);};
const fwHoldEnd=stEndBattle;
stEndBattle=function(result){
  const b=ST.battle,H=FW_STRONGHOLDS.find(h=>h.id===b?.fwHold),d=stData(),f=fwHoldData();
  if(result==='won'&&H&&!f.holdClears[H.id]){
    f.holdClears[H.id]=true;d.gold+=H.reward;d.xp+=H.xp;if(d.guild)d.guild.pts=(d.guild.pts||0)+H.standing;stSave();
  }return fwHoldEnd(result);
};
const fwHoldDraw=stDrawDungeonCanvas;
stDrawDungeonCanvas=function(key){
  fwHoldDraw(key);const g=ST.dunC[key]?.getContext('2d');if(!g)return;
  const H=FW_STRONGHOLDS.find(h=>h.city===key);
  if(H){const x=27*64,y=6*64;g.fillStyle='#7e897b';g.fillRect(x-8,y,208,128);g.fillStyle='#4b5e54';for(let i=0;i<8;i++)g.fillRect(x-12+i*28,y-17,18,29);g.fillStyle='#2f3e35';g.fillRect(x+68,y+59,56,69);g.fillStyle=H.color;g.fillRect(x+20,y+25,23,49);g.fillRect(x+151,y+25,23,49);g.font='bold 15px sans-serif';g.textAlign='center';g.fillStyle='#efe0b5';g.strokeStyle='#28372b';g.lineWidth=4;g.strokeText(H.name,x+96,y+157);g.fillText(H.name,x+96,y+157);}
  const own=FW_STRONGHOLDS.find(h=>h.id===key);
  if(own){g.fillStyle=own.color+'55';g.fillRect(10*64,3*64,3*64,12*64);for(const x of [64,21*64])for(let y=3*64;y<16*64;y+=4*64){g.fillStyle=own.color;g.fillRect(x+12,y,40,90);g.strokeStyle='#e6d7ae';g.lineWidth=3;g.strokeRect(x+18,y+6,28,69);}}
};
const fwHoldAmbient=stAmbientOver;
stAmbientOver=function(...args){const D=ST_DUNGEONS[stData().map];if(D?.stronghold||D?.clinicCity)return;return fwHoldAmbient(...args);};
const fwHoldOpen=stOpenMenu;
stOpenMenu=function(){fwHoldOpen();if(ST.mode==='menu')fwButton($('stMenu'),'Progression · levels & guild strongholds',fwProgressionMenu);};
ST_GUIDE.push(['High-level access & guild strongholds','Three walkable strongholds extend the existing optional Guild: Lantern Watchhold at level 10/D-Rank, Astral Citadel at level 25/C-Rank, Crownspire Bastion at level 40/A-Rank. Each has a steward, class mentor, quartermaster, free infirmary and one-time guardian trial. Membership, level and rank gates are checked at the actual entrance, not just the menu. Trials grant one bounded gold/XP/standing reward and cannot be farmed. Main-story access and independent contracts remain available without joining.']);
