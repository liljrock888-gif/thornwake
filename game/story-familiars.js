// One small Story animal companion; account pets, mounts and undead stay intact.
const FW_FAMILIARS=[
  ['fox','Ember Fox','fox','#ce9b70',1,0,.18,'A light bite; every third action adds a brief ember mark.'],
  ['owl','Moon Owl','owl','#b8b0cb',5,180,.16,'Small spirit bolts; every third action empowers one basic hit.'],
  ['wolf','Vale Wolf Cub','wolf','#a7b1b1',4,150,.24,'Steady physical support with no mana dependence.'],
  ['cat','Lantern Cat','cat','#cbb28b',4,150,.18,'Every third action gives a brief chance to evade.'],
  ['frog','Moss Frog','frog','#94b686',8,240,.12,'Restores up to two mana with each small supporting strike.'],
  ['drake','Pocket Drake','drake','#a1bda8',12,400,.24,'A modest ranged magic strike. Compact enough for any street.'],
  ['hare','Cloud Hare','hare','#dfd7bc',6,200,.16,'A quick nibble; grants 4% combat movement speed.'],
  ['deer','Dawn Fawn','deer','#c8ae8a',10,320,.10,'A gentle strike and a heal of 0.6% maximum health per action.']
].map(([id,name,shape,color,level,price,power,desc])=>({id,name,shape,color,level,price,power,desc}));
const FP={map:null,x:0,y:0,walk:0};
function fwFamiliarData(){
  const f=fwData();if(!Array.isArray(f.familiars))f.familiars=[];
  f.familiars=[...new Set(f.familiars.filter(id=>FW_FAMILIARS.some(p=>p.id===id)))];
  if(!f.familiars.includes(f.familiar))f.familiar=null;return f;
}
function fwFamiliarAdopt(id){
  const P=FW_FAMILIARS.find(p=>p.id===id),f=fwFamiliarData(),d=stData();
  if(ST.battle||!P||f.familiars.includes(id)||d.lv<P.level||d.gold<P.price)return false;
  d.gold-=P.price;f.familiars.push(id);if(!f.familiar)f.familiar=id;stSave();return true;
}
function fwFamiliarSelect(id){
  const f=fwFamiliarData();if(ST.battle||id&&!f.familiars.includes(id))return false;f.familiar=id||null;FP.map=null;stSave();return true;
}
function fwFamiliarMenu(){
  const d=stData(),f=fwFamiliarData(),m=fwPanel('Little companions','ANIMAL FAMILIARS / ONE ACTIVE PAL',`${d.gold} earned gold. Adopt an Ember Fox freely, or meet the level and gold requirement for another animal. Keep your collection, select one follower. Small support actions happen every two seconds in real-time Story combat. They cannot replace your main attacks; if knocked out, they retreat until the next encounter. Original account pets, mounts, recruited companions and undead collections are untouched.`);
  const list=el('div','fwCards');m.appendChild(list);
  for(const P of FW_FAMILIARS){
    const owned=f.familiars.includes(P.id),active=f.familiar===P.id,c=el('article','fwCard');c.append(el('small','fwKicker',`LEVEL ${P.level} / ${P.price?P.price+' GOLD':'FREE ADOPTION'}`),el('h4','',P.name),el('p','',P.desc));
    fwButton(c,owned?(active?'Your active pal':'Travel with '+P.name):'Adopt '+P.name,()=>{if(owned)fwFamiliarSelect(P.id);else fwFamiliarAdopt(P.id);fwFamiliarMenu();},!!ST.battle||active||!owned&&(d.lv<P.level||d.gold<P.price));list.appendChild(c);
  }
  fwButton(m,'Let my familiar rest at home',()=>{fwFamiliarSelect(null);fwFamiliarMenu();},!!ST.battle||!f.familiar);fwBack(m);
}
const fwFamiliarStart=stStartBattle;
stStartBattle=function(...args){
  fwFamiliarStart(...args);const b=ST.battle,P=FW_FAMILIARS.find(p=>p.id===fwFamiliarData().familiar);
  if(b?.realtime&&P){const hp=Math.round(stStats().hp*.25+15);b.familiar={id:P.id,hp,maxHp:hp,turn:0};}
};
function fwFamiliarTurn(b){
  const pet=b.familiar,P=FW_FAMILIARS.find(p=>p.id===pet?.id),foe=rtTarget(),d=stData(),s=stStats();
  if(!P||pet.hp<=0||!foe)return;pet.turn++;pet.supportUntil=RT.time+.35;
  rtDamage(foe,Math.max(s.atk,s.mag)*P.power,P.color,d.hr||['wolf','fox','cat','hare'].includes(P.id)?'phys':'mag',P.id==='fox'&&pet.turn%3===0&&!d.hr?'ember':null);
  if(P.id==='frog')d.mp=Math.min(s.mp,d.mp+Math.min(2,Math.max(1,Math.round(s.mp*.006))));
  if(P.id==='deer')d.hp=Math.min(s.hp,d.hp+Math.round(s.hp*.006));
  if(P.id==='owl'&&pet.turn%3===0){RT.eyeHits=Math.min(3,RT.eyeHits+1);RT.eyeUntil=Math.max(RT.eyeUntil,RT.time+2);}
  if(P.id==='cat'&&pet.turn%3===0)RT.evade=Math.max(RT.evade,RT.time+.35);
  rtFx('wisp',foe.x,foe.y,P.color,.45,24);
}
const fwFamiliarMove=rtMove;
rtMove=function(dt){return fwFamiliarMove(dt*(ST.battle?.familiar?.id==='hare'&&ST.battle.familiar.hp>0?1.04:1));};
const fwFamiliarResidents=rtResidents;
rtResidents=function(dt){
  fwFamiliarResidents(dt);if(!ST.on||!['walk','battle'].includes(ST.mode))return;const d=stData();
  if(FP.map!==d.map||Math.hypot(FP.x-d.x,FP.y-d.y)>500){FP.map=d.map;FP.x=d.x-35;FP.y=d.y+30;}
  const a=Math.atan2(FP.y-d.y,FP.x-d.x),dist=Math.hypot(FP.x-d.x,FP.y-d.y);
  if(dist>43){const step=Math.min(dist-43,Math.min(dt,.06)*240);FP.x-=Math.cos(a)*step;FP.y-=Math.sin(a)*step;FP.walk+=step;}
};
function fwDrawFamiliar(g,P,x,y,now){
  g.save();g.translate(x,y+Math.sin(FP.walk*.15)*1.3);g.fillStyle='#172b2340';g.beginPath();g.ellipse(0,3,13,4,0,0,7);g.fill();g.strokeStyle='#343b34';g.lineWidth=1.5;g.fillStyle=P.color;
  const oval=(x,y,rx,ry)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();g.stroke();};
  const stride=Math.sin(FP.walk*.18)*2;
  if(!['owl','frog'].includes(P.shape)){oval(-6,3+stride,3,3);oval(6,3-stride,3,3);}
  if(P.shape==='owl'){oval(0,-9,10,13);g.fillStyle='#e2dac3';oval(-4,-13,5,6);oval(4,-13,5,6);}
  else if(P.shape==='frog'){oval(0,-5,13,8);oval(-7,-12,5,5);oval(7,-12,5,5);}
  else{
    oval(0,-6,13,8);oval(2,-17,10,9);
    for(const sx of [-1,1]){g.beginPath();g.moveTo(sx*5,-22);g.lineTo(sx*(P.shape==='hare'?7:12),P.shape==='hare'?-40:-33);g.lineTo(sx*11,-20);g.closePath();g.fill();g.stroke();}
    if(['fox','wolf','cat','drake'].includes(P.shape)){g.beginPath();g.moveTo(-10,-3);g.quadraticCurveTo(-28,-13,-19,-24);g.quadraticCurveTo(-13,-13,-8,-10);g.fill();g.stroke();}
    if(P.shape==='drake'){g.beginPath();g.moveTo(8,-11);g.lineTo(23,-24+Math.sin(now*8)*4);g.lineTo(20,-6);g.closePath();g.fill();g.stroke();}
  }
  if(ST.battle?.familiar?.supportUntil>RT.time){g.strokeStyle=P.color;g.globalAlpha=.7;g.beginPath();g.arc(0,-8,19+(RT.time-ST.battle.familiar.supportUntil+.35)*18,0,7);g.stroke();g.globalAlpha=1;}
  g.fillStyle='#242d2b';for(const sx of [-1,1]){g.beginPath();g.arc(sx*4+2,-17,1.8,0,7);g.fill();}g.fillStyle='#efdbb9';g.fillRect(1,-12,3,2);g.restore();
}
const fwFamiliarOverlay=rtWorldOverlay;
rtWorldOverlay=function(now,dt){
  fwFamiliarOverlay(now,dt);const P=FW_FAMILIARS.find(p=>p.id===fwFamiliarData().familiar);
  if(!P||ST.battle?.familiar?.hp<=0)return;const z=Math.max(.7,Math.min(1.2,Math.min(cw,ch)/700));ctx.save();ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(cw/2-ST.cam.x*z),dpr*(ch/2-ST.cam.y*z));fwDrawFamiliar(ctx,P,FP.x,FP.y,now);ctx.restore();
};
const fwFamiliarOpen=stOpenMenu;
stOpenMenu=function(){fwFamiliarOpen();if(ST.mode==='menu')fwButton($('stMenu'),'Familiars · little animal companions',fwFamiliarMenu);};
ST_GUIDE.push(['Compact animal familiars','Eight small original animal companions: fox, owl, wolf cub, cat, frog, pocket drake, hare and fawn. One active familiar, saved per character; free fox adoption, earned-gold and level gates for others. They follow on maps and provide a small supporting combat action every two seconds, with modest damage, recovery, scouting or movement utility. Enemy impacts can knock the familiar out for that encounter. Existing mounts, paid account pets, recruited companions and Necromancer summons remain separate.']);
