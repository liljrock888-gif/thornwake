// Casual, consent-only peer-hosted duels. Never writes combat results to a save.
const SDUEL={offer:null,reply:null,match:null,input:{},seq:0,sendAt:0,remoteSeq:-1,remoteAt:0,seen:{},quit:null};
{
  const rows=Array.from({length:17},(_,y)=>Array.from({length:23},(_,x)=>x===0||y===0||x===22||y===16?'#':'.'));
  for(let y=3;y<14;y++)for(let x=3;x<20;x++)rows[y][x]='=';rows[14][11]='E';
  ST_DUNGEONS.duelyard={name:'Silver Accord · Consensual Dueling Grounds',outdoor:true,land:true,lit:true,pal:{sea:'#526e73',grass:'#7d9163',grass2:'#83996a',road:'#ada187',mount:'#7c8377',hut:'#d4c59b',roof:'#756e9a'},pool:[],zones:[{r:[1,1,21,15],lv:1,name:'Safe until both players accept'}],exit:[16,14],rows:rows.map(r=>r.join(''))};
}
function pvLoadout(){
  const d=stData(),s=stStats(),r=fwTalentData(),ratio=s.atk/Math.max(1,s.atk+s.mag),school=(FW_SPELLS[fwData().equipped[0]]||FW_FUSIONS[fwData().equipped[0]])?.school||'prism';
  return {name:stCleanName(d.name),look:ST_CLASSES[d.cls].look,color:d.color,outfit:d.outfit,school,ranged:fwWorn('weapon')?fwWorn('weapon').range>200:ratio<.5,
    hp:Math.round(300*(1+r.vitality*.04-r.reservoir*.02-r.siphon*.01)),mp:Math.round(100*(1+r.reservoir*.05-r.vitality*.02)),
    atk:(22+ratio*14)*(1+r.force*.04-r.focus*.02-r.tempo*.01),mag:(22+(1-ratio)*14)*(1+r.focus*.04-r.force*.02),
    def:10+r.bastion*1.5-r.fleet*.3,speed:170*(1+r.fleet*.03-r.bastion*.02),delay:.7*(1-r.tempo*.03),siphon:r.siphon*.01};
}
function pvCleanLoadout(raw={}){
  const n=(k,a,b,def)=>Number.isFinite(raw[k])?clamp(raw[k],a,b):def;
  return {name:stCleanName(String(raw.name||'Adventurer').slice(0,24)),look:Object.values(ST_CLASSES).some(c=>c.look===raw.look)?raw.look:'knight',color:/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:'#91b2a3',outfit:raw.outfit&&typeof raw.outfit==='object'?raw.outfit:null,
    school:FW_SCHOOLS.some(s=>s.id===raw.school)?raw.school:'prism',ranged:!!raw.ranged,hp:n('hp',270,336,300),mp:n('mp',94,115,100),atk:n('atk',18,41,28),mag:n('mag',18,41,28),def:n('def',9,15,10),speed:n('speed',155,186,170),delay:n('delay',.62,.7,.7),siphon:n('siphon',0,.03,0)};
}
function pvValidState(s){
  return s&&Number.isFinite(s.t)&&s.t>=0&&s.t<=91&&Array.isArray(s.players)&&s.players.length===2&&
    s.players.every(p=>p&&['x','y','hp','mp','maxHp','maxMp'].every(k=>Number.isFinite(p[k]))&&p.x>=0&&p.x<=700&&p.y>=0&&p.y<=440&&p.hp>=0&&p.maxHp>=270&&p.maxHp<=336)&&
    Array.isArray(s.shots)&&s.shots.length<=64&&s.shots.every(b=>b&&['x','y','vx','vy','damage','until'].every(k=>Number.isFinite(b[k]))&&(b.owner===0||b.owner===1));
}
function pvSend(){
  if(!SW.room)return;SW.room.presence({duel:{offer:SDUEL.offer,reply:SDUEL.reply,quit:SDUEL.quit,input:SDUEL.match?{id:SDUEL.match.id,seq:++SDUEL.seq,...SDUEL.input}:null,
    state:SDUEL.match?.host===SW.me?SDUEL.match:null}}).catch(()=>{});
}
function pvChallenge(peer){
  const d=stData();if(!SW.room||!SW.me||SDUEL.match||ST.battle||d.map!=='duelyard'||peer.presence?.sw?.m!=='duelyard')return false;
  SDUEL.offer={id:crypto.randomUUID(),to:peer.peer,at:Date.now(),loadout:pvLoadout()};SDUEL.reply=null;SDUEL.quit=null;pvSend();stCallout('Challenge sent. Both players must agree.','#d5c18e');return true;
}
const pvNotice=el('aside','pvNotice');pvNotice.hidden=true;$('story').appendChild(pvNotice);
function pvReceive(){
  const others=stOthers(),now=Date.now(),d=stData();
  if(SDUEL.offer&&now-SDUEL.offer.at>30000)SDUEL.offer=null;
  for(const peer of others){
    const msg=peer.presence.duel;if(!msg)continue;
    const offer=msg.offer;
    if(offer&&offer.to===SW.me&&typeof offer.id==='string'&&!SDUEL.seen[offer.id]&&Math.abs(now-offer.at)<30000&&!SDUEL.match&&!ST.battle&&d.map==='duelyard'&&peer.presence.sw.m==='duelyard'){
      SDUEL.seen[offer.id]=true;pvNotice.replaceChildren();pvNotice.hidden=false;
      pvNotice.appendChild(el('p','',stCleanName(peer.presence.sw.n)+' invites you to a casual duel. No gear loss, rewards, wagers or ranking. Both players use normalized combat stats.'));
      fwButton(pvNotice,'Accept duel',()=>{
        pvNotice.hidden=true;if(SDUEL.match||ST.battle||stData().map!=='duelyard'||Date.now()-offer.at>30000)return;
        SDUEL.reply={id:offer.id,to:peer.peer,at:Date.now(),loadout:pvLoadout()};SDUEL.quit=null;pvSend();
      });
      fwButton(pvNotice,'Decline duel',()=>{pvNotice.hidden=true;SDUEL.reply=null;});
    }
    if(SDUEL.offer&&msg.reply?.id===SDUEL.offer.id&&msg.reply.to===SW.me&&!SDUEL.match&&!ST.battle&&d.map==='duelyard'&&peer.presence.sw.m==='duelyard'&&now-SDUEL.offer.at<30000){
      const players=[pvCleanLoadout(SDUEL.offer.loadout),pvCleanLoadout(msg.reply.loadout)].map((p,i)=>({...p,id:i?peer.peer:SW.me,x:i?520:180,y:220,maxHp:p.hp,maxMp:p.mp,attackAt:0,spellAt:0,guardAt:0,dashAt:0,guardUntil:0,slowUntil:0,markUntil:0,burnUntil:0,actionAt:0}));
      pvBegin({id:SDUEL.offer.id,host:SW.me,guest:peer.peer,t:0,players,shots:[],over:null});SDUEL.offer=null;pvSend();
    }
    if(SDUEL.reply?.to===peer.peer&&msg.state?.id===SDUEL.reply.id&&msg.state.host===peer.peer&&msg.state.guest===SW.me&&pvValidState(msg.state)){
      if(!SDUEL.match)pvBegin(structuredClone(msg.state));else if(SDUEL.match.host!==SW.me)SDUEL.match=structuredClone(msg.state);
      SDUEL.remoteAt=now;
    }
    if(SDUEL.match?.host===SW.me&&peer.peer===SDUEL.match.guest){
      if(msg.quit===SDUEL.match.id)SDUEL.match.over='Opponent left the duel.';
      if(msg.input?.id===SDUEL.match.id&&Number.isSafeInteger(msg.input.seq)&&msg.input.seq>SDUEL.remoteSeq){
        SDUEL.remoteSeq=msg.input.seq;SDUEL.remoteAt=now;SDUEL.remoteInput=SDUEL.remoteInput||{};
        for(const k of ['up','down','left','right'])SDUEL.remoteInput[k]=msg.input[k]===true;
        for(const k of ['attack','spell','guard','dash'])if(msg.input[k]===true)SDUEL.remoteInput[k]=true;
      }
    }
    if(SDUEL.match?.host===peer.peer&&msg.quit===SDUEL.match.id)SDUEL.match.over='Host left the duel.';
  }
}
const pvRead=stNetRead;
stNetRead=function(){pvRead();pvReceive();};
const pvOverlay=el('section','pvOverlay');pvOverlay.id='pvOverlay';pvOverlay.hidden=true;pvOverlay.setAttribute('aria-label','Consensual Story PvP duel');
const pvTitle=el('h3','','Silver Accord · Casual Duel'),pvStatus=el('p','',''),pvCanvas=el('canvas'),pvActions=el('div','pvActions');pvCanvas.width=700;pvCanvas.height=440;pvCanvas.setAttribute('aria-label','Live dueling court');
pvStatus.setAttribute('aria-live','polite');pvStatus.id='pvStatus';pvOverlay.append(pvTitle,pvStatus,pvCanvas,pvActions);$('story').appendChild(pvOverlay);
const pvMove=el('div','pvMove');pvOverlay.appendChild(pvMove);
for(const [label,key]of [['↑','up'],['←','left'],['↓','down'],['→','right']]){
  const b=el('button','',label);b.setAttribute('aria-label','Duel move '+key);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);SDUEL.input[key]=true;});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>{SDUEL.input[key]=false;});pvMove.appendChild(b);
}
for(const [label,key]of [['Attack [Space]','attack'],['Confluence bolt [1]','spell'],['Guard [2]','guard'],['Dash [3]','dash']]){
  const b=fwButton(pvActions,label,()=>{SDUEL.input[key]=true;pvSend();});b.dataset.pvAction=key;
}
fwButton(pvActions,'Leave duel safely',pvClose);
function pvBegin(match){
  if(ST.battle||stData().map!=='duelyard')return;
  SDUEL.match=match;SDUEL.input={};SDUEL.seq=0;SDUEL.remoteSeq=-1;SDUEL.remoteAt=Date.now();SDUEL.lastTick=Date.now();SDUEL.sendAt=0;ST.keys={};ST.touchMove=null;ST.padMove=null;ST.mode='duel';
  $('stMenu').hidden=true;pvNotice.hidden=true;pvOverlay.hidden=false;
}
function pvClose(){
  if(SDUEL.match){SDUEL.quit=SDUEL.match.id;SDUEL.match.over='Opponent left the duel.';pvSend();}
  SDUEL.match=null;SDUEL.reply=null;SDUEL.offer=null;SDUEL.input={};SDUEL.remoteInput={};pvOverlay.hidden=true;pvNotice.hidden=true;ST.mode='walk';ST.keys={};pvSend();stHud();
}
function pvHurt(target,damage,source,m,school){
  let dealt=Math.max(1,damage-target.def*.3);if(target.guardUntil>m.t)dealt*=.5;if(target.markUntil>m.t)dealt*=1.08;
  dealt=Math.min(target.hp,Math.round(dealt));target.hp=Math.max(0,target.hp-dealt);source.hp=Math.min(source.maxHp,source.hp+dealt*source.siphon);
  if(school==='ember')target.burnUntil=m.t+3;if(school==='frost')target.slowUntil=m.t+1.5;if(school==='shade')target.markUntil=m.t+3;
  if(school==='tide')source.mp=Math.min(source.maxMp,source.mp+5);if(school==='bloom')source.hp=Math.min(source.maxHp,source.hp+Math.round(dealt*.1));
}
function pvStep(m,inputs,dt){
  if(m.over)return;dt=clamp(dt,0,.05);m.t+=dt;
  for(let i=0;i<2;i++){
    const p=m.players[i],o=m.players[1-i],input=inputs[i]||{},dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),len=Math.hypot(dx,dy),a=Math.atan2(o.y-p.y,o.x-p.x);
    p.mp=Math.min(p.maxMp,p.mp+6*dt);if(p.burnUntil>m.t)p.hp=Math.max(0,p.hp-2*dt);
    p.moving=!!len;
    if(len){const speed=p.speed*(p.slowUntil>m.t?.65:1)*dt/len;p.x=clamp(p.x+dx*speed,35,665);p.y=clamp(p.y+dy*speed,55,405);p.walk=(p.walk||0)+speed*len;p.facing=Math.atan2(dy,dx);}
    if(input.dash&&p.dashAt<=m.t){const da=len?Math.atan2(dy,dx):a+Math.PI;p.x=clamp(p.x+Math.cos(da)*95,35,665);p.y=clamp(p.y+Math.sin(da)*95,55,405);p.dashAt=m.t+5;}
    if(input.guard&&p.guardAt<=m.t){p.guardUntil=m.t+1.5;p.guardAt=m.t+6;}
    const shot=(damage,school,speed)=>m.shots.push({owner:i,x:p.x,y:p.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage,school,until:m.t+1.6});
    if(input.attack&&p.attackAt<=m.t){p.attackAt=m.t+p.delay;p.actionAt=m.t;p.actionKind=p.ranged?'shoot':'slash';p.actionAngle=a;if(p.ranged)shot(p.atk,null,340);else if(Math.hypot(o.x-p.x,o.y-p.y)<95)pvHurt(o,p.atk,p,m);}
    if(input.spell&&p.spellAt<=m.t&&p.mp>=22){p.mp-=22;p.spellAt=m.t+3.8;p.actionAt=m.t;p.actionKind='cast';p.actionAngle=a;shot(p.mag*1.2,p.school,275);}
  }
  for(const b of m.shots){b.x+=b.vx*dt;b.y+=b.vy*dt;const target=m.players[1-b.owner];if(b.until>m.t&&Math.hypot(b.x-target.x,b.y-target.y)<24){pvHurt(target,b.damage,m.players[b.owner],m,b.school);b.until=0;}}
  m.shots=m.shots.filter(b=>b.until>m.t&&b.x>10&&b.x<690&&b.y>10&&b.y<430);
  const [a,b]=m.players;
  if(a.hp<=0||b.hp<=0||m.t>=90){const ra=a.hp/a.maxHp,rb=b.hp/b.maxHp;m.over=Math.abs(ra-rb)<.005?'Draw. Honor to both adventurers.':(ra>rb?a.name:b.name)+' wins the friendly duel.';}
}
function pvDraw(){
  const m=SDUEL.match;if(!m)return;const g=pvCanvas.getContext('2d');
  g.fillStyle='#819276';g.fillRect(0,0,700,440);g.fillStyle='#b9ae92';g.fillRect(25,35,650,380);g.strokeStyle='#ede0b5';g.lineWidth=3;g.strokeRect(35,45,630,360);
  g.beginPath();g.arc(350,225,115,0,7);g.stroke();g.beginPath();g.moveTo(350,45);g.lineTo(350,405);g.stroke();
  for(const [i,p]of m.players.entries()){
    const active=m.t-p.actionAt<.35;fwChibi(g,{...p,walk:p.moving?p.walk:0,face:i?Math.PI:0,guard:p.guardUntil>m.t,poseTime:m.t,pose:active?{kind:p.actionKind||'slash',at:p.actionAt,until:p.actionAt+.35,angle:p.actionAngle??(i?Math.PI:0)}:null},performance.now()/1000,1.4);
    g.fillStyle='#26392e';g.fillRect(p.x-45,p.y-85,90,8);g.fillStyle=i?'#b77b81':'#679ea0';g.fillRect(p.x-45,p.y-85,90*Math.max(0,p.hp/p.maxHp),8);
    g.font='bold 13px sans-serif';g.textAlign='center';g.fillStyle='#26372d';g.fillText(p.name,p.x,p.y-95);
    if(p.guardUntil>m.t){g.strokeStyle='#c5ded1';g.beginPath();g.arc(p.x,p.y-22,33,0,7);g.stroke();}
    if(active){g.strokeStyle='#fff1b3';g.lineWidth=5;g.beginPath();g.arc(p.x,p.y-20,39,-1,1.6);g.stroke();}
  }
  for(const b of m.shots){g.fillStyle=FW_SCHOOLS.find(s=>s.id===b.school)?.color||'#eee3b9';g.beginPath();g.arc(b.x,b.y-15,b.school?10:6,0,7);g.fill();}
  const me=m.players.find(p=>p.id===SW.me);
  pvStatus.textContent=m.over||`${Math.ceil(90-m.t)}s · ${Math.ceil(me?.hp||0)} HP · ${Math.floor(me?.mp||0)} mana · move with WASD/arrows or touch`;
  for(const b of pvActions.querySelectorAll('[data-pv-action]')){const k=b.dataset.pvAction;b.disabled=!!m.over||(k==='spell'?(me?.spellAt>m.t||me?.mp<22):k==='guard'?me?.guardAt>m.t:k==='dash'?me?.dashAt>m.t:me?.attackAt>m.t);}
}
function pvTick(dt){
  if(!SDUEL.match)return;const now=Date.now(),elapsed=Math.min(2,Math.max(0,(now-(SDUEL.lastTick||now))/1000));SDUEL.lastTick=now;
  if(SDUEL.match.host===SW.me){
    const steps=Math.max(1,Math.ceil(elapsed/.05));
    for(let i=0;i<steps;i++){
      pvStep(SDUEL.match,[SDUEL.input,now-SDUEL.remoteAt<1600?SDUEL.remoteInput:{}],elapsed/steps);
      for(const k of ['attack','spell','guard','dash']){SDUEL.input[k]=false;if(SDUEL.remoteInput)SDUEL.remoteInput[k]=false;}
    }
    if(now-SDUEL.remoteAt>12000&&!SDUEL.match.over)SDUEL.match.over='Connection lost. Duel ended safely.';
  }else if(now-SDUEL.remoteAt>12000&&!SDUEL.match.over)SDUEL.match.over='Connection lost. Duel ended safely.';
  if(now>SDUEL.sendAt){SDUEL.sendAt=now+120;pvSend();if(SDUEL.match.host!==SW.me)for(const k of ['attack','spell','guard','dash'])SDUEL.input[k]=false;}pvDraw();
}
const pvFrame=storyFrame;
storyFrame=function(now,dt){pvFrame(now,dt);pvTick(dt);};
for(const evt of ['keydown','keyup'])window.addEventListener(evt,e=>{
  if(!SDUEL.match||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  const map={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right',' ':'attack','1':'spell','2':'guard','3':'dash'},key=map[e.key.toLowerCase()];
  if(key){e.preventDefault();e.stopImmediatePropagation();if(evt==='keydown'||['up','down','left','right'].includes(key))SDUEL.input[key]=evt==='keydown';pvSend();}
  if(e.key==='Escape'&&evt==='keydown'){e.preventDefault();e.stopImmediatePropagation();pvClose();}
},true);
window.addEventListener('blur',()=>{SDUEL.input={};pvSend();});
function pvMenu(){
  const m=fwPanel('Silver Accord','STORY PVP / MUTUAL CONSENT / CASUAL', 'Travel to the dedicated dueling grounds with another online player. Send a challenge and wait for acceptance. Health, mana and combat stats are normalized; talents retain small bounded tradeoffs, weapon range and your first equipped school shape your moves. Ninety-second rounds, no potions, no gold, no gear loss, no prizes and no ranking. Casual duels are peer-hosted, not anti-cheat-secure ranked matches. Arena remains separate.');
  fwButton(m,'Travel to the dueling grounds',()=>{if(ST.battle)return;stCloseMenu();stEnterMap('duelyard',11,13);},!!ST.battle);
  if(!SW.room)m.appendChild(el('p','','Online rooms are not connected here. PvP needs the game’s existing online service and a second real player; no bot is presented as a player.'));
  const peers=stOthers().filter(p=>p.presence.sw.m==='duelyard');
  if(!peers.length)m.appendChild(el('p','','No other adventurers are in the dueling grounds yet. Ask a friend to join online and travel here.'));
  for(const peer of peers)fwButton(m,'Challenge '+stCleanName(peer.presence.sw.n),()=>pvChallenge(peer),!!ST.battle||stData().map!=='duelyard'||!SW.room||!!SDUEL.offer);
  fwButton(m,'Refresh players',pvMenu);fwBack(m);
}
const pvMenuBase=stOpenMenu;
stOpenMenu=function(){pvMenuBase();if(ST.mode==='menu')fwButton($('stMenu'),'Silver Accord · consensual PvP',pvMenu);};
const pvStyle=el('style');pvStyle.textContent=`
.pvOverlay{position:absolute;inset:0;z-index:100;background:#182d25f7;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#eadcb9;overflow:auto}
.pvOverlay[hidden],.pvNotice[hidden]{display:none}.pvOverlay h3,.pvOverlay p{margin:0;text-align:center}.pvOverlay canvas{width:min(100%,900px);height:auto;max-height:60vh;object-fit:contain;border:2px solid #c4ba8b}
.pvActions{display:flex;flex-wrap:wrap;justify-content:center;gap:5px}.pvMove{display:grid;grid-template-columns:repeat(4,48px);gap:5px}.pvMove button{width:48px;height:48px;touch-action:none}
.pvNotice{position:absolute;right:14px;top:180px;z-index:95;width:min(320px,90%);padding:16px;background:#223d31;border:1px solid #d7c287;color:#ecdfbd}
@media(max-width:640px){.pvOverlay{padding:8px;gap:8px}.pvOverlay canvas{max-height:45vh}.pvOverlay h3{font-size:20px}.pvOverlay p{font-size:13px}.pvActions .fwButton{font-size:12px!important;min-width:100px}}
`;document.head.appendChild(pvStyle);
ST_GUIDE.push(['Story PvP: Silver Accord','Optional mutual-consent duels in a separate safe zone. Both online players must travel there and accept a challenge. Normalized stats, bounded talents, basic attack, school bolt, guard and dash. A round ends after ninety seconds, knockout, departure or a connection timeout; Story health, inventory, deaths and gold are unchanged. The existing online rooms must be configured. This is casual peer-hosted PvP with no rewards or rankings, not an authoritative anti-cheat server. Arena is unchanged.']);
