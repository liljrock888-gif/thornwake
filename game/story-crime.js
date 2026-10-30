// Fictional Story crimes and consequences, saved privately per character.
const CR={nextGuard:Infinity,swingUntil:0,action:null};
const CR_MAPS=['lumenreach','cinderward','veilwood','jadecanopy','duneglass','frostcrag','hearthward'];
for(const [i,map]of CR_MAPS.entries())for(let j=0;j<3;j++){
  ST_NPCS.push({id:'civilian_'+map+'_'+j,fwKey:'civilian',fwCivilian:true,name:['Perrin the Weaver','Maren the Courier','Tobin the Potter'][j]+(i?' of '+ST_DUNGEONS[map].name.split(' · ')[0]:''),
    map,x:map==='hearthward'?[9,16,21][j]:[9,20,30][j],y:map==='hearthward'?18:18,look:['ranger','mage','rogue'][j],color:['#c3aa83','#a9bba0','#a7acc4'][j]});
}
RT_CHATTER.civilian='A quiet day is a gift worth keeping.';
function fwCrimeData(){
  const f=fwData();if(!f.civilianDeaths||typeof f.civilianDeaths!=='object')f.civilianDeaths={};
  if(!f.pickedPockets||typeof f.pickedPockets!=='object')f.pickedPockets={};return f;
}
function fwCrimeEligible(n){
  const d=stData();return !!(n&&!n.kid&&!ST.battle&&ST.on&&stNpcShown(n,d)&&(n.map||'world')===d.map&&Math.hypot(d.x-n.x*64-32,d.y-n.y*64-30)<110);
}
function fwCrimeAction(kind,id){
  const n=ST_NPCS.find(n=>n.id===id),d=stData(),f=fwCrimeData();
  if(!fwCrimeEligible(n)||!['theft','assault','murder'].includes(kind)||kind==='murder'&&!n.fwCivilian||kind==='theft'&&f.pickedPockets[id])return false;
  $('stMenu').hidden=true;$('stDialog').hidden=true;ST.dlg=null;ST.mode='walk';ST.keys={};
  const x=n.x,y=n.y,dead=kind==='murder',fee=dead?300:kind==='assault'?90:40;
  if(kind==='theft'){f.pickedPockets[id]=true;d.gold+=15;}
  if(dead)f.civilianDeaths[id]={at:Date.now(),map:d.map,x,y,name:n.name};
  stCrime(fee,dead?'murder':kind);CR.nextGuard=rtTownTime+5;
  CR.swingUntil=rtTownTime+.65;CR.action={kind:kind==='theft'?'shoot':'slash',at:rtTownTime,until:rtTownTime+.6,angle:Math.atan2(y*64+30-d.y,x*64+32-d.x)};
  for(const other of ST_NPCS)if((other.map||'world')===d.map&&!other.kid&&stNpcShown(other,d)&&Math.hypot(other.x-x,other.y-y)<6){
    other._crimeHome=other._crimeHome||[other.x,other.y];other._panicUntil=rtTownTime+10;other._recoilUntil=rtTownTime+.65;other._moving=true;
    other._crimeText=dead?'Someone has been slain! Call the watch!':kind==='theft'?'Thief! Stop them!':'Stay back! Guards!';other._chatUntil=rtTownTime+7;
  }
  stSave();stHud();return true;
}
function fwCrimeMenu(id){
  const n=ST_NPCS.find(n=>n.id===id);if(!fwCrimeEligible(n))return;
  $('stDialog').hidden=true;ST.dlg=null;
  const f=fwCrimeData(),d=stData(),m=fwPanel('A dangerous choice','NPC CRIMES / LASTING CONSEQUENCES',`${n.name}. Bounty: ${d.crime||0} gold. Crime lowers alignment, town reputation, relationships and guild standing. Nearby residents recoil and flee; the watch will respond. Theft yields only 15 gold once per target, never a profitable farming loop.`);
  fwButton(m,'Steal from '+n.name,()=>fwCrimeAction('theft',id),!!f.pickedPockets[id]);
  fwButton(m,'Assault '+n.name,()=>fwCrimeAction('assault',id));
  if(n.fwCivilian)fwButton(m,'Attempt murder · permanent consequence',()=>{
    const c=fwPanel('Kill '+n.name+'?','PERMANENT FOR THIS HERO', 'This optional adult resident will remain dead in this character’s save. Their death grants no XP, equipment, soul captures or loot. Witnesses flee and your bounty rises by at least 300 gold. Other character slots and players are not changed.');
    fwButton(c,'Confirm lethal attack',()=>fwCrimeAction('murder',id));fwButton(c,'Lower my weapon',()=>{stCloseMenu();});
  });
  else m.appendChild(el('p','','This is an essential story character. They can react to an assault, but cannot be permanently killed or prevent the campaign from continuing.'));
  fwButton(m,'Leave them in peace',stCloseMenu);
}
const fwCrimeTalk=stTalk;
stTalk=function(id){
  const n=ST_NPCS.find(n=>n.id===id);if(!n||n.kid)return fwCrimeTalk(id);
  if(!stNpcShown(n,stData()))return;
  if(n.fwCivilian)stSay([[n.name,n._panicUntil>rtTownTime?'Stay away. The watch has been called.':'The great quests belong to adventurers. I have deliveries, a kettle, and someone waiting for me at home.']],null,[['Leave',null]]);
  else fwCrimeTalk(id);
};
function fwCrimeTick(dt){
  if(!ST.on||!['walk','battle'].includes(ST.mode))return;
  const d=stData(),f=fwCrimeData();
  for(const n of ST_NPCS)if((n.map||'world')===d.map&&n._crimeHome){
    if(n._panicUntil<=rtTownTime){[n.x,n.y]=n._crimeHome;n._crimeHome=null;n._moving=false;n._crimeText=null;continue;}
    if(!stNpcShown(n,d))continue;
    const a=Math.atan2(n.y*64+30-d.y,n.x*64+32-d.x),step=Math.min(dt,.06)*1.1,x=n.x+Math.cos(a)*step,y=n.y+Math.sin(a)*step;
    if(!stBlocked(x*64+32,n.y*64+44))n.x=x;if(!stBlocked(n.x*64+32,y*64+44))n.y=y;
    n._walk=(n._walk||0)+step*64;n._moving=true;n._face=Math.cos(a)<0?Math.PI:0;
  }
  if(d.crime>0&&CR.nextGuard===Infinity&&CR_MAPS.includes(d.map))CR.nextGuard=rtTownTime+7;
  if(d.crime>0&&ST.mode==='walk'&&CR_MAPS.includes(d.map)&&rtTownTime>=CR.nextGuard&&!ST.guardCd){
    CR.nextGuard=rtTownTime+35;stArrest('Lantern Watch');
  }
}
const fwCrimeResidents=rtResidents;
rtResidents=function(dt){fwCrimeResidents(dt);fwCrimeTick(dt);};
const fwCrimeDraw=stDrawCh;
stDrawCh=function(u,now,k=1){
  const d=stData(),n=ST_NPCS.find(n=>(n.map||'world')===d.map&&n._recoilUntil>rtTownTime&&Math.hypot(u.x-n.x*64-32,u.y-n.y*64-30)<4);
  if(n)u={...u,x:u.x+Math.sin((n._recoilUntil-rtTownTime)*35)*5};return fwCrimeDraw(u,now,k);
};
const fwCrimeOverlay=rtWorldOverlay;
rtWorldOverlay=function(now,dt){
  fwCrimeOverlay(now,dt);const d=stData(),f=fwCrimeData();
  const z=Math.max(.7,Math.min(1.2,Math.min(cw,ch)/700));ctx.save();
  ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(cw/2-ST.cam.x*z),dpr*(ch/2-ST.cam.y*z));
  for(const dead of Object.values(f.civilianDeaths))if(dead.map===d.map){
    const x=dead.x*64+32,y=dead.y*64+30,age=(Date.now()-dead.at)/1000;ctx.save();ctx.translate(x,y);
    if(age<2){ctx.globalAlpha=Math.max(0,1-age/2);ctx.rotate(Math.min(Math.PI/2,age*2));fwChibi(ctx,{x:0,y:0,color:'#a7acc4',look:'ranger'},now,1.25);}
    else{ctx.fillStyle='#8e9b88';ctx.strokeStyle='#465344';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-14,-27,28,31,[12,12,2,2]);ctx.fill();ctx.stroke();ctx.fillStyle='#e5d9ae';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('✦',0,-8);}
    ctx.restore();
  }
  ctx.restore();
};
ST_GUIDE.push(['NPC crime & reactions','Talk to an adult NPC, then choose Hostile actions. Theft and assault raise your existing bounty and reduce alignment, reputation, relationships and guild standing. Residents recoil, flee and call the Lantern Watch; guards can fine, jail or fight you. Twenty-one optional adult civilians can be permanently slain per hero after a warning and confirmation. Essential story NPCs and children cannot be murdered. Civilian deaths grant no experience, loot or soul captures, do not affect other players, and persist in that character slot.']);
