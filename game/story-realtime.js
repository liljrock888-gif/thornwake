// Story-only real-time simulation. Reuses legacy battle rewards, ownership and souls.
const RT={time:0,global:0,cd:{},cast:0,target:null,pulses:[],hazards:[],lastDamage:0,eyeUntil:0,eyeHits:0,barrier:0,phase:0,modePage:0};
let rtTownTime=0;
const RT_CHATTER={lamplighter:'The lanterns remember every traveler.',postmaster:'A letter for a future that has not happened…',smith:'Good steel, fair coin. Have a look.',ferryman:'New coasts beyond the silver edge!',warden:'Watch the ground when a guardian winds up.',casino:'Free festival chips. Nothing to buy or cash out.',botanist:'Listen. Even the vines have a story.',pathfinder:'The stars outlast every road.',frostwarden:'A warm cloak is worth a second sword.',seer:'Not every gift is found on a familiar road.',librarian:'Two hundred stairs. Eight lost histories.'};
function rtResidents(dt){
  if(!ST.on||!['walk','battle'].includes(ST.mode))return;rtTownTime+=Math.min(dt,.08);
  const d=stData();
  for(const n of ST_NPCS)if(n.fwKey&&(n.map||'world')===d.map){
    if(!stNpcShown(n,d)||n._panicUntil>rtTownTime)continue;
    if(n._homeX==null){n._homeX=n.x;n._homeY=n.y;n._step=0;n._wait=rtTownTime+(n.x%4);n._chat=rtTownTime+(n.y%7);}
    n._moving=false;
    if(Math.hypot(d.x-(n.x*64+32),d.y-(n.y*64+30))<95){n._face=d.x<n.x*64+32?Math.PI:0;continue;}
    if(n._wait>rtTownTime)continue;
    const points=[[0,0],[1,0],[1,1],[0,1]],p=points[n._step%4],tx=n._homeX+p[0],ty=n._homeY+p[1],dx=tx-n.x,dy=ty-n.y,m=Math.hypot(dx,dy),step=.5*Math.min(dt,.08);
    if(m<.025){n.x=tx;n.y=ty;n._step++;n._wait=rtTownTime+2+(n._step%3);continue;}
    const x=n.x+dx/m*step,y=n.y+dy/m*step;
    if(!stBlocked(x*64+32,y*64+44)){n.x=x;n.y=y;n._moving=true;n._walk=(n._walk||0)+step*64;n._face=dx<0?Math.PI:0;n._facing=Math.atan2(dy,dx);}
    else{n._step=(n._step+2)%4;n._wait=rtTownTime+2;}
    if(n._chat<rtTownTime){n._chatUntil=rtTownTime+3.5;n._chat=rtTownTime+17+(n.x%5);}
  }
}
function rtActive(){return !!(ST.on&&ST.battle?.realtime&&!ST.battle.over);}
function rtCanAct(){return rtActive()&&ST.mode==='battle'&&RT.global<=RT.time;}
function rtTarget(){const b=ST.battle;return b?.foes.find(f=>f.id===RT.target&&f.hp>0)||b?.foes.find(f=>f.hp>0);}
function rtSafePoint(x,y,fallback){
  return !stBlocked(x,y+14)?[x,y]:fallback;
}
function rtMove(dt){
  if(RT.playerRoot>RT.time){ST.moving=false;return;}
  const d=stData();let dx=(ST.keys.right?1:0)-(ST.keys.left?1:0),dy=(ST.keys.down?1:0)-(ST.keys.up?1:0);
  if(ST.padMove){dx+=ST.padMove[0];dy+=ST.padMove[1];}if(ST.touchMove){dx+=ST.touchMove[0];dy+=ST.touchMove[1];}
  const m=Math.hypot(dx,dy);ST.moving=m>.1;if(!ST.moving)return;
  const speed=210*(RT.haste>RT.time?1.2:1)*dt/Math.max(1,m),x=d.x+dx*speed,y=d.y+dy*speed;
  if(!stBlocked(x,d.y+14))d.x=x;if(!stBlocked(d.x,y+14))d.y=y;
  ST.face=dx<0?Math.PI:dx>0?0:ST.face||0;ST.facing=Math.atan2(dy,dx);ST.walk=(ST.walk||0)+speed*m;
}
function rtDamage(f,power,color,kind='mag',school){
  const b=ST.battle;if(!b||b.over||f.hp<=0)return 0;
  const d=stData();
  const def=f.def*(kind==='mag'?.5:1)*(f.seam>RT.time?.75:1);
  const boosted=power*(f.mark>RT.time?1.12:1)*(f.hex>0&&kind==='mag'&&d.cls==='warlock'?1.2:1);
  const dm=Math.min(f.hp,stDmg(boosted,def));f.hp=Math.max(0,f.hp-dm);f.flash=.2;
  stNum(f.id,dm,color);stBurst(f.id,color,5,70);
  const s=stStats();
  if(school==='ember')f.rtBurnUntil=RT.time+4;
  if(school==='tide')d.mp=Math.min(s.mp,d.mp+Math.max(1,Math.round(dm*.035)));
  if(school==='frost')f.chill=RT.time+3;
  if(school==='storm'&&!RT.chaining){
    const other=b.foes.find(o=>o!==f&&o.hp>0&&Math.hypot(o.x-f.x,o.y-f.y)<180);
    if(other){RT.chaining=true;rtDamage(other,power*.22,color,'mag');RT.chaining=false;}
  }
  if(school==='stone'){
    const a=Math.atan2(f.y-d.y,f.x-d.x),p=rtSafePoint(f.x+Math.cos(a)*28,f.y+Math.sin(a)*28,[f.x,f.y]);[f.x,f.y]=p;
  }
  if(school==='bloom')d.hp=Math.min(s.hp,d.hp+Math.round(dm*.12));
  if(school==='shade')f.mark=RT.time+6;
  if(school==='dawn'&&(!f.boss||!f.interruptLock||f.interruptLock<RT.time)){f.windup=null;f.next=Math.max(f.next||0,RT.time+(f.boss?.4:1));f.interruptLock=RT.time+4;}
  if(school==='prism')RT.barrier=Math.min(s.hp*.18,RT.barrier+dm*.08);
  if(d.cls==='runeknight'&&kind==='mag')RT.barrier=Math.min(s.hp*.15,RT.barrier+dm*.1);
  return dm;
}
function rtFx(form,x,y,color,dur=.65,r=60){
  RT.pulses.push({form,x,y,fromX:stData().x,fromY:stData().y,color,t:RT.time,dur,r});RT.cast=RT.time+.65;RT.color=color;
}
function rtSchedule(delay,fn){RT.hazards.push({at:RT.time+delay,b:ST.battle,fn});}
function rtNear(x,y,r){return ST.battle.foes.filter(f=>f.hp>0&&Math.hypot(f.x-x,f.y-y)<r);}
function rtArchive(id){
  const S=FW_SPELLS[id]||FW_FUSIONS[id],d=stData(),f=fwData(),b=ST.battle;
  if(!S||!rtCanAct()||d.hr||!f.learned.includes(id)||!f.equipped.includes(id)||d.lv<S.level||d.mp<S.mp||RT.cd[id]>RT.time)return false;
  const target=rtTarget(),form=S.form;if(!target)return false;
  if(!['ward','blink','aura','ring','nova','orb','trap'].includes(form)&&Math.hypot(target.x-d.x,target.y-d.y)>(form==='spear'?520:450))return false;
  const s=stStats(),blood=S.school==='blood',hpCost=Math.ceil(s.hp*.025);
  if(blood&&d.hp<=hpCost)return false;
  d.mp-=S.mp;if(blood)d.hp-=hpCost;
  RT.cd[id]=RT.time+S.cooldown*(d.cls==='chronomancer'?.9:1);RT.global=RT.time+.65;
  const p=Math.max(s.mag,s.atk*.55)*S.power*(blood?1.18:1),color=S.color,tx=target.x,ty=target.y,px=d.x,py=d.y;
  RT.action={kind:'cast',at:RT.time,until:RT.time+.65,angle:Math.atan2(ty-py,tx-px)};
  let attuned=0;
  const hit=(foe,mul=1)=>{const n=rtDamage(foe,p*mul,color,'mag',S.school);if(n>0)attuned++;if(S.fusion)fwFusionEffect(foe,n,S);return n;};
  const area=(x,y,r,mul=1)=>{rtFx(form,x,y,color,.7,r);for(const foe of rtNear(x,y,r))hit(foe,mul);};
  rtFx(form,px,py,color,.55,42);
  if(form==='ward'){
    RT.barrier=Math.min(s.hp*.3,RT.barrier+s.mag*.65+S.power*10);
    RT.attunement={school:S.school,until:RT.time+6};
    if(S.fusion)RT.defend=RT.time+1;
  }else if(form==='blink'){
    area(px,py,95);const a=Math.atan2(py-ty,px-tx);
    [d.x,d.y]=rtSafePoint(px+Math.cos(a)*150,py+Math.sin(a)*150,[px,py]);RT.evade=RT.time+.6;
  }else if(form==='ring'||form==='nova')area(px,py,form==='nova'?230:115);
  else if(form==='burst')area(tx,ty,125);
  else if(form==='well'||form==='aura'){
    const x=form==='aura'?px:tx,y=form==='aura'?py:ty,n=form==='aura'?3:4;
    for(let i=0;i<n;i++)rtSchedule(i*.9,()=>{
      area(x,y,form==='aura'?145:110);
      if(form==='aura'&&Math.hypot(d.x-x,d.y-y)<145)d.hp=Math.min(stStats().hp,d.hp+Math.round(s.mag*.3));
    });
  }else if(form==='orb'){
    for(let i=0;i<3;i++)rtSchedule(i*.65,()=>area(d.x,d.y,145));
  }else if(form==='rain'){
    for(let i=0;i<5;i++){const a=i*2.399,x=tx+Math.cos(a)*i*13,y=ty+Math.sin(a)*i*13;rtSchedule(i*.25,()=>area(x,y,90));}
  }else if(form==='chain'){
    const chain=[target],left=b.foes.filter(o=>o!==target&&o.hp>0);
    while(chain.length<4&&left.length){const prev=chain.at(-1);left.sort((a,z)=>Math.hypot(a.x-prev.x,a.y-prev.y)-Math.hypot(z.x-prev.x,z.y-prev.y));if(Math.hypot(left[0].x-prev.x,left[0].y-prev.y)>220)break;chain.push(left.shift());}
    chain.forEach((foe,i)=>rtSchedule(i*.12,()=>{hit(foe,1-i*.12);rtFx('beam',foe.x,foe.y,color,.35,45);}));
  }else if(form==='trap'){
    const a=Math.atan2(ty-py,tx-px),x=px+Math.cos(a)*65,y=py+Math.sin(a)*65;
    RT.traps=RT.traps||[];RT.traps.push({x,y,r:65,until:RT.time+8,b,hit:foe=>{foe.root=RT.time+(foe.boss?.5:2);hit(foe);}});rtFx('trap',x,y,color,8,50);
  }else if(form==='familiar'){
    for(let i=0;i<4;i++)rtSchedule(.6+i*1.1,()=>{const foe=rtTarget();if(foe){hit(foe);rtFx('wisp',foe.x,foe.y,color,.8,35);}});
  }else if(form==='echo'){
    hit(target);rtSchedule(1,()=>{hit(target);rtFx('echo',target.x,target.y,color,.5,50);});
  }else if(form==='drain'){const dealt=hit(target);d.hp=Math.min(s.hp,d.hp+Math.round(dealt*.3));}
  else if(form==='hex'){hit(target);target.weak=RT.time+6;rtFx('seal',tx,ty,color,1,55);}
  else if(['lance','beam','fan'].includes(form)){
    const a=Math.atan2(ty-py,tx-px),range=form==='lance'?480:form==='beam'?390:290;
    for(const foe of b.foes.filter(o=>o.hp>0)){
      const dx=foe.x-px,dy=foe.y-py,along=dx*Math.cos(a)+dy*Math.sin(a),cross=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
      if(along>0&&along<range&&(form==='fan'?cross<along*.55:cross<(form==='beam'?48:24)))hit(foe);
    }
    rtFx(form,tx,ty,color,.65,90);
  }else{
    stShot('p',target.id,color,form==='spear'?9:7,()=>{if(ST.battle===b&&!b.over)hit(target);},form==='spear'?'ice':S.school==='ember'?'fire':S.school==='shade'?'dark':'holy');
  }
  // All variants carry a school-specific trait, including non-damaging wards.
  if(form==='ward'){
    if(S.school==='bloom')d.hp=Math.min(s.hp,d.hp+s.mag*.3);
    if(S.school==='tide')d.mp=Math.min(s.mp,d.mp+2);
    if(S.school==='blood')RT.barrier=Math.min(s.hp*.3,RT.barrier+hpCost);
  }
  sfx('zap');stHud();return true;
}
const rtBaseStart=stStartBattle,rtBaseEndTurn=stEndTurn,rtBaseDrawBattle=stDrawBattle,rtBaseFrame=storyFrame,rtBaseRender=stRenderBattle;
stStartBattle=function(foes,bossId,tile){
  rtBaseStart(foes,bossId,tile);
  const d=stData(),b=ST.battle;if(d.storyCombat==='classic')return;
  b.realtime=true;b.turn='player';RT.global=RT.time+.7;RT.cd={};RT.target=b.foes[0]?.id;RT.pulses=[];RT.hazards=[];RT.traps=[];RT.barrier=0;RT.phase=RT.time+2;RT.lastDamage=0;RT.eyeHits=0;RT.eyeUntil=0;RT.evade=0;RT.reflect=0;RT.haste=0;RT.attunement=null;RT.modePage=0;
  RT.action=null;RT.playerRoot=0;RT.poisonUntil=0;RT.defend=0;
  b.foes.forEach((f,i)=>{
    const a=(i/Math.max(1,b.foes.length))*Math.PI*2;
    [f.x,f.y]=rtSafePoint(d.x+Math.cos(a)*(130+i*20),d.y+Math.sin(a)*(100+i*20),[d.x+36,d.y-80]);
    f.next=RT.time+1.8+i*.7;f.windup=null;
  });
  $('stBattle').hidden=true;$('story').classList.add('rtOn');rtToolbar(true);
};
stEndTurn=function(){
  if(!ST.battle?.realtime)return rtBaseEndTurn();
  const b=ST.battle;if(b.over)return;
  if(b.foes.every(f=>f.hp<=0))return stEndBattle('won');
  b.turn='player';ST.sub=null;stHud();
};
stRenderBattle=function(){if(ST.battle?.realtime){$('stBattle').hidden=true;return;}return rtBaseRender(...arguments);};
function rtClassCast(id){
  const d=stData(),b=ST.battle,S=ST_SKILLS[id];
  if(!rtCanAct()||!S||!stOwnsSkill(d,id)||!d.skills.includes(id)||d.mp<stSkCost(S)||RT.cd[id]>RT.time)return false;
  const target=rtTarget();if(!target)return false;
  const cost=stSkCost(S),s=stStats(),power=stAbilityPower(S,s,b,stRank(id)),color=SK_COLOR[id]||'#e6c58c';
  RT.action={kind:S.kind==='phys'?'slash':'cast',at:RT.time,until:RT.time+.6,angle:Math.atan2(target.y-d.y,target.x-d.x)};
  if(S.summon||S.bloodOffering){
    const before=d.mp;stUseSkill(id);if(d.mp===before&&!S.bloodOffering)return false;
  }else{
    d.mp-=cost;
    if(S.kind==='heal'){d.hp=Math.min(s.hp,d.hp+Math.round(power+10));if(b.ally)b.ally.hp=Math.min(b.ally.maxHp,b.ally.hp+power*.7);rtFx('aura',d.x,d.y,'#a6d9a0',1,85);}
    else if(S.kind==='buff'){
      if(!stApplyStackBuff(b,S.buff))b.buffs[S.buff]=S.buff==='ward'?2:3;
      rtFx('ward',d.x,d.y,color,.9,75);
    }else{
      const targets=S.all?b.foes.filter(f=>f.hp>0):[target];
      for(const foe of targets){
        const dealt=rtDamage(foe,power,color,S.kind);
        stAbilityEffects(S,foe,dealt,s);
        if(S.twice)rtSchedule(.16,()=>rtDamage(foe,power*.7,color,S.kind));
        if(S.hex)foe.mark=RT.time+6;
        if(S.rtSpecial==='rune')RT.barrier=Math.min(s.hp*.2,RT.barrier+s.mag*.4);
        if(S.rtSpecial==='haste')RT.haste=RT.time+5;
        if(S.rtSpecial==='rewind'){if(RT.time-(RT.lastDamageAt||0)<8)d.hp=Math.min(s.hp,d.hp+Math.min(RT.lastDamage,s.hp*.15));RT.lastDamage=0;}
        if(S.rtSpecial==='blink'){const a=Math.atan2(d.y-foe.y,d.x-foe.x);[d.x,d.y]=rtSafePoint(d.x+Math.cos(a)*100,d.y+Math.sin(a)*100,[d.x,d.y]);}
        if(S.rtSpecial==='slow')foe.chill=RT.time+4;
        if(S.rtSpecial==='edge'){RT.eyeHits=Math.min(3,RT.eyeHits+2);RT.eyeUntil=RT.time+8;}
        rtFx(S.all?'ring':'slash',foe.x,foe.y,color,.5,S.all?130:45);
      }
    }
    stMaster(id);sfx(S.kind==='mag'?'zap':'swing');
  }
  RT.global=RT.time+.65;RT.cd[id]=RT.time+(S.summon?9:S.kind==='buff'?2.5:S.kind==='heal'?5:2.4)*(d.cls==='chronomancer'?.9:1);
  RT.cast=RT.time+.6;RT.color=color;stHud();return true;
}
function rtAttack(){
  if(!rtCanAct()||RT.cd.attack>RT.time)return false;
  const d=stData(),b=ST.battle,f=rtTarget();if(!f)return false;
  const weapon=fwWorn('weapon'),ranged=weapon?weapon.range>200:['mage','ranger','gunner','necromancer','warlock','druid','chronomancer'].includes(d.cls);
  const distance=Math.hypot(f.x-d.x,f.y-d.y);if(distance>(weapon?.range||(ranged?430:110))){stCallout('Move closer to your target.','#d9cc9e');return false;}
  const s=stStats(),eyeBonus=RT.eyeHits>0&&RT.eyeUntil>RT.time?1.25:1;
  const kind=weapon?.kind||'phys',power=(kind==='mag'?s.mag*.65:s.atk*stAtkMul(b))*eyeBonus;RT.eyeHits=Math.max(0,RT.eyeHits-1);
  RT.cd.attack=RT.time+(weapon?.delay||(d.cls==='rogue'?.5:.72));RT.global=RT.time+.28;RT.cast=RT.time+.3;RT.color='#e9d5a2';
  RT.action={kind:ranged?'shoot':'slash',at:RT.time,until:RT.time+.4,angle:Math.atan2(f.y-d.y,f.x-d.x)};
  const hit=()=>{if(ST.battle!==b||b.over)return;const dealt=rtDamage(f,power,'#e8d7b0',kind,RT.attunement?.until>RT.time?RT.attunement.school:null);d.hp=Math.min(stStats().hp,d.hp+Math.round(dealt*fwTalent('siphon')*.01));stMaster('attack');};
  RT.cd.attack=RT.time+(RT.cd.attack-RT.time)*(1-fwTalent('tempo')*.03);
  if(ranged)stShot('p',f.id,'#e8d7b0',6,hit,['ranger','gunner'].includes(d.cls)?'arrow':'holy');else rtSchedule(.15,hit);
  rtFx('slash',f.x,f.y,'#f3ddb0',.35,35);sfx('swing');return true;
}
function rtEye(){
  const d=stData(),f=fwData(),E=FW_EYES.find(e=>e.id===f.eye),target=rtTarget();
  if(!rtCanAct()||!E||E.id==='none'||d.hr||d.lv<5||d.mp<E.mp||RT.cd.eye>RT.time||!target)return false;
  const s=stStats();d.mp-=E.mp;RT.global=RT.time+.5;RT.cd.eye=RT.time+E.cd;
  if(E.id==='foresight')RT.evade=RT.time+4;
  if(E.id==='mana')target.seam=RT.time+8;
  if(E.id==='binding')for(const foe of ST.battle.foes)foe.root=RT.time+(foe.boss?.6:3);
  if(E.id==='mirror')RT.reflect=RT.time+5;
  if(E.id==='hunter'){RT.eyeHits=3;RT.eyeUntil=RT.time+8;}
  if(E.id==='mending')d.hp=Math.min(s.hp,d.hp+Math.round(s.hp*.18));
  if(E.id==='rift'){const a=Math.atan2(d.y-target.y,d.x-target.x);[d.x,d.y]=rtSafePoint(d.x+Math.cos(a)*150,d.y+Math.sin(a)*150,[d.x,d.y]);RT.barrier=Math.min(s.hp*.2,RT.barrier+s.hp*.08);}
  rtFx('eye',d.x,d.y,'#cfbaec',1,75);stHud();return true;
}
function rtPotion(){
  const d=stData();if(!rtCanAct()||!d.items.potion||RT.cd.potion>RT.time)return;
  d.items.potion--;d.hp=Math.min(stStats().hp,d.hp+Math.round(stStats().hp*.4*(1-fwTalent('execution')*.03)));RT.cd.potion=RT.time+10;RT.global=RT.time+.5;stHud();
}
function rtEther(){
  const d=stData();if(!rtCanAct()||!d.items.ether||RT.cd.ether>RT.time)return;
  d.items.ether--;d.mp=Math.min(stStats().mp,d.mp+Math.round(stStats().mp*.4));RT.cd.ether=RT.time+10;RT.global=RT.time+.5;stHud();
}
function rtGuard(){
  if(!rtCanAct()||RT.cd.guard>RT.time)return;
  RT.defend=RT.time+2;RT.cd.guard=RT.time+8;RT.global=RT.time+.3;
}
function rtUpdate(dt){
  if(!rtActive()||ST.mode!=='battle')return;
  dt=Math.min(dt,.06);RT.time+=dt;rtMove(dt);
  const b=ST.battle,d=stData(),s=stStats();
  if(RT.poisonUntil>RT.time)d.hp=Math.max(0,d.hp-s.hp*.008*dt);
  STFX.pos.p=[d.x,d.y];for(const f of b.foes)STFX.pos[f.id]=[f.x,f.y];
  const due=RT.hazards.filter(h=>h.at<=RT.time);RT.hazards=RT.hazards.filter(h=>h.at>RT.time);for(const h of due)if(h.b===b&&!b.over)h.fn();
  for(const trap of RT.traps||[]){
    if(trap.b!==b||trap.until<RT.time)continue;const foe=rtNear(trap.x,trap.y,trap.r)[0];
    if(foe){trap.hit(foe);trap.until=0;}
  }
  RT.traps=(RT.traps||[]).filter(t=>t.until>RT.time);
  if(RT.phase<=RT.time){
    RT.phase=RT.time+2;stTickCombatBuffs(b);stSoulSummonTurn(b);
    if(b.ally?.hp>0){const foe=rtTarget();if(foe)rtDamage(foe,b.ally.atk*.75,'#b9cda0','phys');}
    fwFamiliarTurn(b);
    for(const foe of b.foes)if(foe.hp>0){
      if(foe.burn>0){rtDamage(foe,Math.max(2,s.mag*.16),'#eaa074');foe.burn--;}
      if(foe.poison>0){rtDamage(foe,Math.max(2,s.mag*.12),'#bbd58d');foe.poison--;}
      if(foe.frozen){foe.root=RT.time+(foe.boss?.35:1);foe.frozen=0;}
      if(foe.hex>0)foe.hex--;
    }
  }
  for(const foe of b.foes){
    if(foe.hp<=0)continue;foe.flash=Math.max(0,(foe.flash||0)-dt);
    if(foe.rtBurnUntil>RT.time){foe.hp=Math.max(0,foe.hp-s.mag*.035*dt);}
    const distance=Math.hypot(foe.x-d.x,foe.y-d.y),range=foe.pattern==='charge'?260:foe.pattern==='tide'?280:foe.boss?125:80;
    if(!foe.windup&&distance>range&&!(foe.root>RT.time)){
      const speed=(foe.pattern==='swoop'?150:foe.boss?95:110)*(foe.chill>RT.time?.5:1)*dt,a=Math.atan2(d.y-foe.y,d.x-foe.x);
      const x=foe.x+Math.cos(a)*speed,y=foe.y+Math.sin(a)*speed;
      if(!stBlocked(x,foe.y+14))foe.x=x;if(!stBlocked(foe.x,y+14))foe.y=y;
    }
    if(!foe.windup&&foe.next<=RT.time&&distance<range+15&&!(foe.root>RT.time))foe.windup={at:RT.time+(foe.pattern==='charge'?1.3:foe.boss?1:.65),x:d.x,y:d.y,r:foe.pattern==='tide'?145:foe.pattern==='heads'?125:foe.boss?105:65};
    if(foe.windup&&foe.windup.at<=RT.time){
      const w=foe.windup;foe.windup=null;foe.next=RT.time+(foe.boss?2:2.6);
      if(foe.pattern==='charge')[foe.x,foe.y]=rtSafePoint(w.x,w.y,[foe.x,foe.y]);
      if(Math.hypot(d.x-w.x,d.y-w.y)>w.r)continue;
      if(RT.evade>RT.time&&Math.random()<.55){stNum('p','Foreseen','#c3b8df');continue;}
      if(stSoulIntercept(b,foe))continue;
      let damage=stDmg(foe.atk*(foe.weak>RT.time?.8:1),s.def*stBuffMultiplier(b,'guard'));
      if(RT.defend>RT.time)damage=Math.round(damage*.5);
      if(b.buffs.ward)damage=Math.round(damage*.4);
      const absorbed=Math.min(RT.barrier,damage);RT.barrier-=absorbed;damage=Math.max(0,Math.round(damage-absorbed));RT.lastDamage=damage;
      d.hp=Math.max(0,d.hp-damage);stNum('p',damage,'#eb998b');ST.hurt=.15;
      if(b.familiar?.hp>0)b.familiar.hp=Math.max(0,b.familiar.hp-Math.round(damage*.3));
      RT.lastDamageAt=RT.time;
      if(foe.pattern==='gaze')RT.playerRoot=RT.time+.6;
      if(foe.pattern==='riddle')d.mp=Math.max(0,d.mp-Math.round(s.mp*.035));
      if(foe.pattern==='venom'||foe.pattern==='flame')RT.poisonUntil=RT.time+3;
      if(foe.pattern==='frost')RT.playerRoot=RT.time+.35;
      if(RT.reflect>RT.time)rtDamage(foe,damage*.3,'#c9bce8');
      rtFx('impact',d.x,d.y,'#e89c7f',.4,45);
    }
  }
  if(d.hp<=0)return stEndBattle('lost');
  if(b.foes.every(f=>f.hp<=0))return stEndBattle('won');
  if((RT.hudAt||0)<RT.time){RT.hudAt=RT.time+.2;rtToolbar();stHud();}
}
function fwAnimationFrame(u,now=0){
  const time=u.poseTime??(rtActive()?RT.time:rtTownTime),pose=u.pose?.until>time?u.pose:null;
  const mode=pose?.kind||(u.emote?.id&&FW_EMOTES.some(e=>e.id===u.emote.id)?u.emote.id:u.dodge?'dodge':u.guard?'guard':u.hitFlash>0?'hit':u.walk?'walk':'idle');
  const frame=mode==='walk'?Math.floor(Math.abs(u.walk)/6)%8:Math.floor(now*6)%4;
  const angle=pose?.angle??u.facing??u.face??0;
  return {mode,frame,angle,mirror:Math.cos(angle)<-.3?-1:1,back:Math.sin(angle)<-.6,
    progress:pose?clamp((time-pose.at)/Math.max(.1,pose.until-pose.at),0,1):0,
    stride:mode==='walk'?Math.sin(frame*Math.PI/4)*2.7:0,
    lift:mode==='walk'?Math.max(0,Math.sin(frame*Math.PI/4))*1.7:0};
}
function fwChibi(g,u,now,k=1){
  const anim=fwAnimationFrame(u,now),acting=['slash','shoot','cast'].includes(anim.mode);
  const et=u.emote?.elapsed||0,dancing=['dance','spin'].includes(anim.mode),beat=Math.sin(et*6),social=!!u.emote;
  const O=u.outfit||{},look=u.look||'knight',magic=/mage|witch|shaman|warlock|necromancer|magic/.test(look),
    hair=O.hairColor||'#393541',skin=O.skin||O.skinColor||'#eed0a4',cloth=O.frontierCloth||O.shirtColor||u.color||'#7c9e9a',edge='#24222b',walk=dancing?beat*4:anim.stride,bob=dancing?Math.abs(beat)*3:u.walk?Math.abs(walk)*.45:Math.sin(now*2+(Number.isFinite(u.id)?u.id:0))*.35;
  g.save();g.translate(u.x,u.y-bob);g.scale(k*anim.mirror,k);
  if(dancing){g.translate(Math.sin(et*3)*3,0);g.rotate(beat*.1);}
  if(anim.mode==='spin')g.scale(Math.cos(et*3),1);
  if(anim.mode==='bow')g.rotate(Math.sin(Math.min(1,et/3)*Math.PI)*.28);
  if(anim.mode==='sit')g.translate(0,9);
  if(anim.mode==='nod')g.translate(0,Math.sin(et*5)*1.8);
  if(anim.mode==='dodge'){g.rotate(.2);g.globalAlpha=.7;}
  if(anim.mode==='hit')g.translate(-3,Math.sin(now*35)*1.2);
  if(acting)g.rotate(Math.sin(anim.progress*Math.PI)*(anim.mode==='slash'?.09:-.045));
  g.lineWidth=1.5;g.lineJoin='round';g.strokeStyle=edge;
  const path=(points,fill)=>{g.fillStyle=fill;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.stroke();};
  const oval=(x,y,rx,ry,fill)=>{g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();g.stroke();};
  g.globalAlpha=.25;oval(0,2,13,4,'#111c1a');g.globalAlpha=1;
  if(['long','braids','locs','wavy','twintails'].includes(O.hairType)){
    path([[-12,-39],[-19,-31],[-17,-7],[-11,-10],[-8,-30]],hair);
    path([[12,-39],[19,-31],[17,-7],[11,-10],[8,-30]],hair);
  }
  path([[-9,-23],[-15-walk*.35,-2],[-7,-5],[walk*.4,0],[7,-5],[15-walk*.35,-2],[9,-23]],magic?'#393447':'#374348');
  oval(anim.mode==='sit'?-8:-5,anim.mode==='sit'?-11:-2+walk-anim.lift,4,3,'#34313c');oval(anim.mode==='sit'?8:5,anim.mode==='sit'?-11:-2-walk-Math.max(0,-walk)*.6,4,3,'#34313c');
  path([[-9,-24],[9,-24],[10,-7],[-10,-7]],cloth);
  g.fillStyle='#dacbb1';g.fillRect(-9,-11,18,3);g.fillStyle='#c2aa72';g.fillRect(-2,-12,4,5);
  const handLift=acting?Math.sin(anim.progress*Math.PI)*(anim.mode==='cast'?12:7):social?anim.mode==='wave'?14+Math.sin(et*10)*3:['cheer','dance','spin'].includes(anim.mode)?10+beat*4:anim.mode==='clap'?5:0:0;
  oval(-11+(anim.mode==='clap'?7+beat*3:0),-15-walk*.5-(anim.mode==='cast'||['cheer','dance','spin'].includes(anim.mode)?handLift*.8:0),3,5,skin);
  oval(11+(u.walk?Math.cos(anim.frame*Math.PI/4)*.8:0)-(anim.mode==='clap'?7+beat*3:0),-15+walk*.5-handLift,3,5,skin);
  oval(0,-34,15,14,skin);
  path([[-15,-29],[-17,-38],[-12,-44],[-5,-46],[-9,-49],[1,-48],[9,-46],[15,-40],[17,-30],[11,-33],[8,-39],[4,-32],[-2,-37],[-7,-31],[-10,-36]],hair);
  if(anim.back&&!acting){oval(0,-35,14,12,hair);}
  else{
    const blink=now%4.5>4.36&&!acting;g.fillStyle=edge;g.fillRect(-7,-33,3,blink?1:6);g.fillRect(5,-33,3,blink?1:6);
    if(!blink){g.fillStyle='#fff1cf';g.fillRect(-7,-33,1,2);g.fillRect(5,-33,1,2);}
    g.fillStyle='#c59982';g.fillRect(-1,-24,3,1);
  }
  if(magic||O.hat==='hood'){
    path([[-17,-38],[-12,-49],[0,-52],[13,-47],[18,-37],[10,-41],[0,-45],[-10,-41]],magic?'#45414f':cloth);
    g.fillStyle='#d7c28e';g.fillRect(-13,-42,26,2);oval(0,-43,2,3,u.color||'#a5d6be');
  }else if(/knight|paladin|samurai/.test(look)){
    path([[-16,-38],[-15,-46],[-8,-49],[0,-48],[8,-49],[15,-46],[16,-38],[7,-40],[0,-38],[-7,-40]],'#6e7c83');
    g.strokeStyle='#b3bfc1';g.beginPath();g.moveTo(0,-48);g.lineTo(0,-39);g.stroke();g.strokeStyle=edge;
  }else if(/pirate|hunter|rogue/.test(look)){path([[-16,-39],[-13,-47],[5,-49],[15,-43],[16,-38]],cloth);}
  if(/warlock|necromancer/.test(look)){
    path([[-13,-41],[-20,-48],[-18,-35],[-12,-33]],'#8a716d');path([[13,-41],[20,-48],[18,-35],[12,-33]],'#8a716d');
  }
  if(O.hat==='crown'){path([[-12,-44],[-13,-53],[-5,-48],[0,-56],[5,-48],[13,-53],[12,-44]],'#d9bd73');}
  if(O.hat==='flowers'){for(let i=0;i<5;i++)oval(-12+i*6,-44-Math.sin(i)*2,3,3,['#e6a0b6','#f2d68f','#c0d899'][i%3]);}
  if(O.hat==='cap'){path([[-15,-40],[-12,-49],[7,-49],[15,-42],[21,-40]],cloth);}
  if(O.hat==='horns'){path([[-13,-42],[-20,-51],[-18,-37]],'#cbbda5');path([[13,-42],[20,-51],[18,-37]],'#cbbda5');}
  if(O.glasses&&O.glasses!=='none'){g.strokeStyle='#4d3e39';g.strokeRect(-10,-35,8,8);g.strokeRect(2,-35,8,8);g.beginPath();g.moveTo(-2,-32);g.lineTo(2,-32);g.stroke();}
  const pose=u.pose,poseTime=u.poseTime??(rtActive()?RT.time:rtTownTime),phase=anim.progress;
  if(pose&&pose.until>poseTime&&pose.kind==='cast'){
    g.strokeStyle=RT.color||'#a2d8c1';g.lineWidth=1.6;
    for(let i=0;i<3;i++){g.beginPath();g.arc(14,-16,7+i*4,now*5+i,now*5+i+1.8);g.stroke();}
    oval(16,-19,3,4,RT.color||'#a2d8c1');
  }else if(!magic&&!social){
    g.save();g.translate(13,-14);g.rotate(pose&&pose.until>poseTime?(Math.sin(phase*Math.PI)*2.2-1):-.35);
    if(pose?.kind==='shoot'||/ranger|hunter/.test(look)){
      g.strokeStyle='#b29c6e';g.lineWidth=2;g.beginPath();g.arc(6,-10,13,-1.5,1.5);g.stroke();g.strokeStyle='#e0d4b5';g.beginPath();g.moveTo(7,-23);g.lineTo(7,3);g.stroke();
    }else{
      path([[-2,0],[-3,-21],[0,-27],[3,-21],[2,0]],'#c5d1cc');g.fillStyle='#bf9d61';g.fillRect(-6,-2,12,3);g.fillStyle='#6c5741';g.fillRect(-2,1,4,7);
    }g.restore();
  }
  if(anim.mode==='guard'){path([[-16,-24],[-6,-23],[-6,-12],[-11,-6],[-17,-13]],'#799b9b');g.strokeStyle='#d9cf9f';g.beginPath();g.moveTo(-12,-21);g.lineTo(-12,-10);g.stroke();}
  g.restore();
}
const rtBaseDrawCh=stDrawCh;
stDrawCh=function(u,now,k=1){
  if(u.id!==30){
    const d=stData(),n=ST_NPCS.find(n=>n.fwKey&&(n.map||'world')===d.map&&Math.hypot(u.x-n.x*64-32,u.y-n.y*64-30)<4);
    if(n)u={...u,walk:n._moving?n._walk:0,face:n._face||0,facing:n._facing??n._face??0};
  }
  if(u.id===30){const clothing=fwWorn('clothing');u={...u,facing:ST.facing??ST.face,walk:ST.moving?u.walk:0,guard:rtActive()&&RT.defend>RT.time,dodge:rtActive()&&RT.evade>RT.time,hitFlash:ST.hurt||u.hitFlash,pose:rtActive()?RT.action:CR.swingUntil>rtTownTime?CR.action:null,outfit:{...u.outfit,...(clothing?{frontierCloth:clothing.color}:{})}};}
  fwChibi(ctx,u,now,k*1.25);
};
function rtWorldOverlay(now,dt){
  const d=stData(),z=Math.max(.7,Math.min(1.2,Math.min(cw,ch)/700));
  ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(cw/2-ST.cam.x*z),dpr*(ch/2-ST.cam.y*z));
  for(const N of FW_NODES)if(N.map===d.map){
    const x=N.x*64+32,y=N.y*64+16+Math.sin(now*2+N.x)*5;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(now*.7)*.2);
    ctx.shadowColor=N.color;ctx.shadowBlur=18;ctx.fillStyle=fwData().nodes[N.id]?N.color:'#6a8c82';ctx.strokeStyle='#e5eed1';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(12,0);ctx.lineTo(0,20);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  for(const S of FW_SECRETS)if(S.map===d.map&&Math.hypot(d.x-S.x*64-32,d.y-S.y*64-32)<220){
    const x=S.x*64+32,y=S.y*64+32;ctx.save();ctx.strokeStyle='#c4bce1';ctx.globalAlpha=.45+Math.sin(now*2)*.15;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,22,9,0,0,7);ctx.stroke();ctx.fillStyle='#cfcae3';ctx.fillRect(x-2,y-25-Math.sin(now*3)*3,4,4);ctx.restore();
  }
  for(const n of ST_NPCS)if((n.fwKey||n._panicUntil>rtTownTime)&&(n.map||'world')===d.map&&stNpcShown(n,d)&&n._chatUntil>rtTownTime){
    const text=n._panicUntil>rtTownTime?n._crimeText||'Guards! Help!':RT_CHATTER[n.fwKey]||'Every road has a story.',x=n.x*64+32,y=n.y*64-48;
    ctx.save();ctx.font='14px "Barlow Semi Condensed",sans-serif';const width=ctx.measureText(text).width+20;
    ctx.fillStyle='#172a22eb';ctx.strokeStyle='#9caa83';ctx.lineWidth=1;ctx.fillRect(x-width/2,y-22,width,27);ctx.strokeRect(x-width/2,y-22,width,27);
    ctx.fillStyle='#e8dfbf';ctx.textAlign='center';ctx.fillText(text,x,y-4);ctx.restore();
  }
  const b=ST.battle;
  if(b?.realtime){
    STFX.pos.p=[d.x,d.y];
    for(const foe of b.foes){
      STFX.pos[foe.id]=[foe.x,foe.y];if(foe.hp<=0)continue;
      if(foe.windup){
        const w=foe.windup;ctx.fillStyle='#d865453d';ctx.strokeStyle='#f5a07b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
      stDrawFoe(foe.key,foe.x,foe.y+7,now,.43,foe.x>d.x?Math.PI:0,foe.flash);
      ctx.fillStyle='#17251f';ctx.fillRect(foe.x-30,foe.y-57,60,5);ctx.fillStyle=foe.id===RT.target?'#e6c878':'#d78c78';ctx.fillRect(foe.x-30,foe.y-57,60*foe.hp/foe.maxHp,5);
      if(foe.id===RT.target){ctx.strokeStyle='#e6c878';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(foe.x,foe.y+6,27,10,0,0,7);ctx.stroke();}
    }
    if(b.ally?.hp>0){STFX.pos.a=[d.x-55,d.y+30];fwChibi(ctx,{...b.ally,x:d.x-55,y:d.y+30},now,1.1);}
    stDrawSoulSummon(b,d.x+60,d.y+30,now,.65);
    stEffectsDraw(dt);stFxDraw(dt);
  }
  RT.pulses=RT.pulses.filter(p=>RT.time-p.t<p.dur);
  for(const p of RT.pulses){
    const k=(RT.time-p.t)/p.dur;ctx.save();ctx.globalAlpha=Math.max(0,1-k);ctx.strokeStyle=p.color;ctx.fillStyle=p.color+'22';ctx.lineWidth=2.5;
    if(p.form==='slash'){ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y-20,20+k*35,-1.2+k,1.2+k);ctx.stroke();}
    else if(['beam','lance','fan'].includes(p.form)){
      ctx.lineWidth=p.form==='beam'?10*(1-k)+2:3;ctx.beginPath();ctx.moveTo(p.fromX,p.fromY-24);ctx.lineTo(p.x,p.y-24);ctx.stroke();
      if(p.form==='fan')for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(p.fromX,p.fromY-24);ctx.lineTo(p.x,p.y-24+side*50);ctx.stroke();}
    }
    else{ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*(.3+k*.7),p.r*(.2+k*.25),0,0,7);ctx.fill();ctx.stroke();
      if(['seal','eye','trap','ward'].includes(p.form)){for(let i=0;i<6;i++){const a=i*Math.PI/3+now;ctx.fillRect(p.x+Math.cos(a)*p.r*.65-2,p.y+Math.sin(a)*p.r*.3-2,4,4);}}}
    ctx.restore();
  }
  if(RT.action?.until>RT.time&&RT.action.kind==='slash'&&b?.realtime){
    const a=RT.action.angle,k=(RT.time-RT.action.at)/(RT.action.until-RT.action.at);
    ctx.save();ctx.strokeStyle='#efdfb2';ctx.globalAlpha=1-k;ctx.lineWidth=4;ctx.beginPath();ctx.arc(d.x,d.y-15,40+k*22,a-1.2+k*.8,a+.3+k*.8);ctx.stroke();ctx.restore();
  }
  if(['mage','warlock','necromancer','druid','paladin','chronomancer','spellblade','runeknight'].includes(d.cls)){
    const cast=RT.cast>RT.time&&b?.realtime,x=d.x+30,y=d.y-35+Math.sin(now*3)*3;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(now*2)*.1);ctx.shadowColor=RT.color||'#b0dcc6';ctx.shadowBlur=cast?18:5;
    ctx.fillStyle='#355d50';ctx.strokeStyle='#dbc58a';ctx.lineWidth=1.5;ctx.fillRect(-12,-9,24,18);ctx.strokeRect(-12,-9,24,18);
    ctx.fillStyle='#eee1b9';ctx.beginPath();ctx.moveTo(0,-7);ctx.quadraticCurveTo(-9,-11,-12,-7);ctx.lineTo(-12,7);ctx.quadraticCurveTo(-5,3,0,7);ctx.quadraticCurveTo(6,3,12,7);ctx.lineTo(12,-7);ctx.quadraticCurveTo(4,-11,0,-7);ctx.fill();
    ctx.strokeStyle='#8a8767';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();
    if(cast){ctx.strokeStyle=RT.color||'#b0dcc6';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,19+i*6,now*3+i,now*3+i+1.5);ctx.stroke();}}
    ctx.restore();
  }
  ctx.setTransform(1,0,0,1,0,0);
}
const rtBaseWorld=stDrawWorld;
stDrawWorld=function(now,dt=1/60){rtBaseWorld(now,dt);rtWorldOverlay(now,dt);};
stDrawBattle=function(now,dt){if(!ST.battle?.realtime)return rtBaseDrawBattle(now,dt);stDrawWorld(now,dt);};
storyFrame=function(now,dt){
  rtResidents(dt);rtUpdate(dt);rtBaseFrame(now,dt);
  const rt=!!ST.battle?.realtime;$('story').classList.toggle('rtOn',rt);
  $('rtBar').hidden=!(ST.on&&(rt&&ST.mode==='battle'));
  if(rt&&ST.mode==='battle'){$('stJoyZone').hidden=!touchUI.on;$('story').dataset.mode='walk';}
};
const rtBar=el('section','rtBar');rtBar.id='rtBar';rtBar.hidden=true;rtBar.setAttribute('aria-label','Real-time Story combat');$('story').appendChild(rtBar);
function rtToolbar(force=false){
  if(!rtActive())return;const d=stData(),f=fwData(),ids=d.skills.filter(id=>stOwnsSkill(d,id)).concat(f.equipped),per=3;
  const pageCount=Math.max(1,Math.ceil(ids.length/per));RT.modePage%=pageCount;
  const view=ids.slice(RT.modePage*per,RT.modePage*per+per),key=[d.cls,RT.modePage,ids.join(','),f.eye,d.items.potion].join('|');
  if(force||rtBar.dataset.key!==key){
    rtBar.dataset.key=key;rtBar.replaceChildren();
    const add=(label,id,fn)=>{const btn=fwButton(rtBar,label,fn);btn.dataset.cooldown=id;btn.dataset.label=label;};
    add('Attack [Space]','attack',rtAttack);
    view.forEach((id,i)=>add((FW_SPELLS[id]?.name||FW_FUSIONS[id]?.name||ST_SKILLS[id]?.name)+' ['+(i+1)+']',id,()=>FW_SPELLS[id]||FW_FUSIONS[id]?rtArchive(id):rtClassCast(id)));
    add('Eye [Q]','eye',rtEye);add('Potion [F]','potion',rtPotion);add('Ether [T]','ether',rtEther);add('Guard [G]','guard',rtGuard);
    add('Race power','race',()=>{if(!rtCanAct()||ST.battle.racial)return;stRacePower();RT.global=RT.time+.7;});
    fwButton(rtBar,`${RT.modePage+1}/${pageCount} · More`,()=>{RT.modePage=(RT.modePage+1)%pageCount;rtToolbar(true);});
    fwButton(rtBar,'Flee',()=>{if(ST.battle?.bossId)return stCallout('A guardian bars your retreat.','#e7b388');if(rtCanAct())stEndBattle('fled');});
  }
  for(const btn of rtBar.querySelectorAll('[data-cooldown]')){
    const id=btn.dataset.cooldown,left=Math.max(0,(RT.cd[id]||0)-RT.time),S=FW_SPELLS[id]||FW_FUSIONS[id]||ST_SKILLS[id];
    btn.textContent=btn.dataset.label+(left>0?' · '+left.toFixed(1)+'s':'');
    btn.disabled=left>0||RT.global>RT.time||(S&&d.mp<(FW_SPELLS[id]||FW_FUSIONS[id]?S.mp:stSkCost(S)))||(id==='eye'&&(f.eye==='none'||d.hr||d.lv<5))||(id==='potion'&&!d.items.potion)||(id==='ether'&&!d.items.ether)||(id==='race'&&!!ST.battle.racial);
  }
}
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(!rtActive()||ST.mode!=='battle'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(ST_KEYS[k]){ST.keys[ST_KEYS[k]]=true;e.preventDefault();return;}
  if(!rtCanAct()||e.repeat)return;
  if(k===' '){e.preventDefault();e.stopImmediatePropagation();rtAttack();}
  else if(k==='q'){e.preventDefault();e.stopImmediatePropagation();rtEye();}
  else if(k==='f'){e.preventDefault();e.stopImmediatePropagation();rtPotion();}
  else if(k==='t'){e.preventDefault();e.stopImmediatePropagation();rtEther();}
  else if(k==='g'){e.preventDefault();e.stopImmediatePropagation();rtGuard();}
  else if(['1','2','3'].includes(k)){
    e.preventDefault();e.stopImmediatePropagation();
    const d=stData(),f=fwData(),ids=d.skills.filter(id=>stOwnsSkill(d,id)).concat(f.equipped),id=ids[RT.modePage*3+Number(k)-1];
    if(id)(FW_SPELLS[id]||FW_FUSIONS[id]?rtArchive:rtClassCast)(id);
  }
},true);
cv.addEventListener('pointerdown',e=>{
  if(!ST.on||!['walk','battle'].includes(ST.mode)||e.button!==0)return;
  const box=cv.getBoundingClientRect(),z=Math.max(.7,Math.min(1.2,Math.min(cw,ch)/700));
  const x=(e.clientX-box.left-box.width/2)/z+ST.cam.x,y=(e.clientY-box.top-box.height/2)/z+ST.cam.y,d=stData();
  if(Math.hypot(x-d.x,y-(d.y-25))<32){e.preventDefault();e.stopImmediatePropagation();fwInspect();return;}
  for(const p of stOthers()){
    const v=SW.vis[p.peer];if(p.presence.sw.m===d.map&&v&&Math.hypot(x-v.x,y-(v.y-25))<32){e.preventDefault();e.stopImmediatePropagation();fwInspect(p);return;}
  }
  if(ST.mode==='walk'){
    const n=ST_NPCS.find(n=>n.fwKey&&(n.map||'world')===d.map&&Math.hypot(x-n.x*64-32,y-(n.y*64+5))<38);
    if(n){e.preventDefault();e.stopImmediatePropagation();if(Math.hypot(d.x-n.x*64-32,d.y-n.y*64-32)<115)stTalk(n.id);else stCallout('Move closer to speak to '+n.name+'.','#dfd3aa');return;}
  }
  if(rtActive()){
    const foe=ST.battle.foes.find(f=>f.hp>0&&Math.hypot(x-f.x,y-(f.y-20))<45);if(foe){RT.target=foe.id;e.preventDefault();e.stopImmediatePropagation();}
  }
},true);
const rtBaseOpenMenu=stOpenMenu,rtBaseCloseMenu=stCloseMenu;
stOpenMenu=function(){if(rtActive()&&ST.mode==='battle')ST.mode='walk';return rtBaseOpenMenu();};
stCloseMenu=function(){rtBaseCloseMenu();$('stMenu').classList.remove('fwPanel');if(rtActive())ST.mode='battle';};
const rtBasePoll=stPollPad;
stPollPad=function(){
  if(!rtActive()||ST.mode!=='battle')return rtBasePoll();
  const gp=readPad();if(!gp){ST.padMove=null;return;}const down=i=>!!gp.buttons[i]?.pressed,hit=i=>down(i)&&!ST.pad.prev[i],dz=v=>Math.abs(v||0)<.25?0:v;
  ST.padMove=[dz(gp.axes[0])+(down(15)?1:0)-(down(14)?1:0),dz(gp.axes[1])+(down(13)?1:0)-(down(12)?1:0)];
  if(hit(0))rtAttack();if(hit(3))rtEye();if(hit(2)){const id=stData().skills[0];if(id)rtClassCast(id);}if(hit(9))stOpenMenu();
  ST.pad.prev=gp.buttons.map(b=>b.pressed);
};
const rtStyle=el('style');rtStyle.textContent=`
.rtBar{position:absolute;z-index:35;bottom:18px;left:50%;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:4px;width:min(760px,96%);padding:8px;background:#14231ef2;border:2px solid #8c9c78;box-shadow:0 0 0 2px #17281f;border-radius:3px}
.rtBar[hidden]{display:none}.rtBar .fwButton{min-width:70px;max-width:160px;min-height:44px!important;font:600 13px/1.3 'Barlow Semi Condensed',sans-serif!important;margin:0!important;padding:8px!important}
.rtOn #stBattle{display:none!important}.rtOn #stPrompt,.rtOn #stRide{display:none!important}
@media(max-width:640px){.rtBar{left:auto;right:6px;transform:none;bottom:14px;width:min(240px,64%);padding:5px;gap:4px}.rtBar .fwButton{flex:1 1 30%;min-width:54px;max-width:112px;font-size:12px!important;padding:7px 4px!important}.rtOn #stJoyZone{display:block}.rtOn #stHud{max-width:180px}}
`;document.head.appendChild(rtStyle);
ST_GUIDE.push(['Real-time Story combat','Story encounters now take place on the walking map. Move with WASD, arrows or the touch stick. Click an enemy to select it. Space attacks; 1–3 use the current hotbar page; More changes page; Q activates an awakened eye; F uses a potion. Enemy orange circles show where the strike will land: move out before the windup completes. Skills consume mana and have cooldowns; eye powers have longer cooldowns. Attack/defense buffs remain capped at three stacks and expire on timed enemy phases. Menus pause your local Story encounter. Online chat/presence remain, but combat is local to this hero, not an authoritative shared MMO simulation.']);
