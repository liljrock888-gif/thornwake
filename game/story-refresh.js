// Story-only visual/world refresh. Existing coordinates, doors and save IDs stay valid.
const SR_PALETTES={
  world:{name:'Ashen Vale',grass:'#82a94e',grass2:'#7da24a',road:'#d3bd88',roof:'#a8513d',wall:'#ebd6a6',tree:'#437844',water:'#4b9cba',leaf:'#66974a'},
  isles:{name:'Brightwater',grass:'#8dbf64',grass2:'#86b65f',road:'#eddaa0',roof:'#4b9ca0',wall:'#f4e1b1',tree:'#389878',water:'#4cbed1',leaf:'#71c18b'},
  rouge:{name:'Rougemarais',grass:'#607862',grass2:'#5a715f',road:'#aaa39c',roof:'#735274',wall:'#bdb7b0',tree:'#415c58',water:'#42767d',leaf:'#6b8a78'},
  land2:{name:'Valdris',grass:'#8ca25a',grass2:'#839b53',road:'#c8bb9c',roof:'#8c4741',wall:'#dbcfb5',tree:'#365e4c',water:'#6397ba',leaf:'#668568'},
  land3:{name:'Aetherfall',grass:'#929cc2',grass2:'#8b94b8',road:'#e3dceb',roof:'#7d83b3',wall:'#f1e7e6',tree:'#7b8fad',water:'#414d7c',leaf:'#b8bddb'},
  lumenreach:{name:'Crystal Coast',grass:'#83b697',grass2:'#7dad90',road:'#ddcfab',roof:'#4f8e9a',wall:'#e8dfc4',tree:'#4c8970',water:'#60b4c3',leaf:'#91c5a3'},
  cinderward:{name:'Brass March',grass:'#a3a16a',grass2:'#9a9862',road:'#c9ab84',roof:'#a45a43',wall:'#d7bd8e',tree:'#767a48',water:'#739090',leaf:'#b5ac63'},
  veilwood:{name:'Whispering Frontier',grass:'#769b80',grass2:'#70947a',road:'#bdc2a0',roof:'#79759c',wall:'#d6d6b8',tree:'#3c6c60',water:'#5b8d98',leaf:'#91b18b'},
  hearthward:{name:'Lantern Neighborhood',grass:'#a3b96a',grass2:'#9bb164',road:'#dfca9f',roof:'#b47b73',wall:'#f1dfbe',tree:'#678b59',water:'#74a9a5',leaf:'#aac17b'}
};
function srPalette(key){
  if(SR_PALETTES[key])return SR_PALETTES[key];
  const terrain=FW_LANDS.find(l=>l.id===key)?.terrain;
  if(terrain==='desert')return {...SR_PALETTES.cinderward,grass:'#d7b27c',grass2:'#cfaa74',road:'#ead3a3',tree:'#8b9659'};
  if(terrain==='snow')return {...SR_PALETTES.land3,grass:'#dce8e6',grass2:'#d3e1df',road:'#afc1ca',tree:'#678c92'};
  if(terrain==='jungle')return {...SR_PALETTES.veilwood,grass:'#5e9e6a',grass2:'#599663',tree:'#2f725c',roof:'#bc945a'};
  return SR_PALETTES.world;
}
// Widen existing paths only onto empty ground. Never replace doors, resources or quests.
{
  const roads=[];
  ST_MAP.forEach((r,y)=>r.forEach((t,x)=>{if(t==='=')roads.push([x,y]);}));
  for(const [x,y]of roads)for(const [dx,dy]of [[1,0],[0,1]])if(['.','v'].includes(ST_MAP[y+dy]?.[x+dx]))ST_MAP[y+dy][x+dx]='=';
  for(let x=39;x<ST_W-3;x++)if(ST_MAP[11][x]==='.')ST_MAP[11][x]='=';
  for(let y=28;y<ST_H-3;y++)if(ST_MAP[y][30]==='.')ST_MAP[y][30]='=';
  for(let x=19;x<=30;x++)if(ST_MAP[30][x]==='.')ST_MAP[30][x]='=';
}
// Larger frontier meadows, fewer decorative cottages, generous roads between blocks.
// Interactive anchors (NPCs, crystals, exits and stronghold doors) are not moved.
for(const L of FW_LANDS){
  const D=ST_DUNGEONS[L.id],old=D.rows,w=48,h=40;
  const rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>{
    if(x===0||y===0||x===w-1||y===h-1)return '#';
    if(y<old.length-1&&x<old[0].length-1){
      const t=old[y][x];
      if(t==='H')return '.';
      if(t==='='&&!([7,8,18,19,29,30].includes(x)||[8,9,17,18,26,27].includes(y)))return '.';
      if(t==='T'&&(x%3!==0||y%3!==0))return '.';
      return t;
    }
    return '.';
  }));
  for(const [x,y]of [[3,4],[13,4],[24,4],[36,4],[3,13],[13,13],[29,13],[38,14],[3,23],[13,23],[29,23],[39,24],[7,32],[20,32],[33,32]]){
    if(rows[y][x]==='.'&&rows[y+1][x]==='.')rows[y][x]='H';
    for(let yy=y+1;yy<=y+3;yy++)if(rows[yy][x]==='.')rows[yy][x]='=';
  }
  for(let x=2;x<w-2;x++)if(['.','='].includes(rows[29][x]))rows[29][x]='=';
  for(let y=1;y<h-1;y++)for(const x of [7,18,29,40])if(['.','='].includes(rows[y][x]))rows[y][x]='=';
  // Keep a clear interaction radius around every fixed anchor.
  for(const n of ST_NPCS.filter(n=>n.map===L.id))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
    if(['H','T'].includes(rows[Math.floor(n.y)+dy]?.[Math.floor(n.x)+dx]))rows[Math.floor(n.y)+dy][Math.floor(n.x)+dx]='.';
  D.rows=rows.map(r=>r.join(''));D.srExpanded=true;
}
function srBuilding(g,x,y,w,h,P,kind='H',theme='world'){
  const px=x*64,py=y*64,bw=w*64-12,bh=h*64-16;
  g.fillStyle='#24392f40';g.fillRect(px+12,py+bh+5,bw,10);
  g.fillStyle='#4b4938';g.fillRect(px+4,py+6,bw+4,bh);
  g.fillStyle=P.wall;g.fillRect(px+8,py+10,bw-4,bh-8);
  g.fillStyle='#b8a078';g.fillRect(px+8,py+bh-4,bw-4,6);
  // Stepped roof stays inside its own footprint so neighbors never overlap.
  for(let r=0;r<7;r++){g.fillStyle=r%2?shade(P.roof,-.07):P.roof;g.fillRect(px+4+r*3,py+2+r*4,bw+4-r*6,4);}
  if(theme==='isles'||theme==='lumenreach'){
    g.fillStyle='#426e71';g.fillRect(px+6,py+bh-2,6,12);g.fillRect(px+bw-3,py+bh-2,6,12);
    g.fillStyle=shade(P.roof,.22);g.fillRect(px+7,py+24,bw-2,5);
    g.fillStyle='#f4e5bb';g.fillRect(px+bw/2-3,py+12,10,10);g.fillStyle='#72bec5';g.fillRect(px+bw/2,py+14,4,6);
  }else if(theme==='rouge'){
    g.fillStyle='#5c514b';g.fillRect(px+9,py+28,4,bh-25);g.fillRect(px+bw-5,py+28,4,bh-25);g.fillRect(px+9,py+56,bw-10,4);
    g.fillStyle='#929764';g.fillRect(px+12,py+26,12,4);g.fillRect(px+bw-16,py+22,13,5);
  }else if(theme==='land2'){
    g.fillStyle='#e4efea';g.fillRect(px+6,py+26,bw,6);g.fillRect(px+18,py+19,bw-24,5);
    g.fillStyle='#687b7a';g.fillRect(px+bw-18,py+4,8,20);g.fillStyle='#e2e5d8';g.fillRect(px+bw-20,py+2,12,5);
  }else if(theme==='land3'){
    g.fillStyle='#9ca4cb';g.fillRect(px+6,py+bh,bw,5);
    g.fillStyle='#dceaf2';for(let i=0;i<4;i++)g.fillRect(px+13+i*(bw-22)/4,py+26,5,8);
    g.fillStyle='#6d93c0';g.fillRect(px+bw/2,py+7,5,15);g.fillStyle='#cae6f4';g.fillRect(px+bw/2+1,py+9,2,9);
  }else if(theme==='cinderward'){
    g.fillStyle='#5e645c';g.fillRect(px+6,py+5,bw,16);
    g.fillStyle='#b89d64';for(let i=0;i<Math.floor(bw/12);i++)g.fillRect(px+7+i*12,py+2,7,8);
    g.fillStyle='#755c42';g.fillRect(px+bw-16,py+3,9,27);g.fillStyle='#d5af65';g.fillRect(px+bw-18,py+3,13,4);
  }else if(theme==='veilwood'){
    g.fillStyle='#79915a';g.fillRect(px+8,py+22,bw-2,7);g.fillStyle='#b4c37c';g.fillRect(px+12,py+22,bw-12,3);
    g.fillStyle='#725c45';g.fillRect(px+9,py+32,4,bh-30);g.fillRect(px+bw-5,py+32,4,bh-30);
    g.fillStyle='#a2bd84';g.fillRect(px+10,py+bh-13,4,11);g.fillRect(px+12,py+bh-17,4,7);
  }else if(theme==='hearthward'){
    g.fillStyle='#e9d1a0';g.fillRect(px+bw/2-8,py+14,22,15);g.fillStyle='#718b89';g.fillRect(px+bw/2-3,py+17,12,9);
    g.fillStyle='#9b6a58';g.fillRect(px+bw-14,py+8,8,20);
  }
  for(const xx of [px+14,px+bw-13]){g.fillStyle='#66593f';g.fillRect(xx,py+38,12,16);g.fillStyle='#ffe7a0';g.fillRect(xx+2,py+40,8,12);g.fillStyle=P.wall;g.fillRect(xx+5,py+40,2,12);}
  const dx=px+bw/2-4;g.fillStyle='#493f35';g.fillRect(dx,py+bh-26,16,30);
  g.fillStyle='#d7b666';g.fillRect(dx+11,py+bh-13,2,3);
  if(kind!=='H'){g.fillStyle='#403e32';g.fillRect(px+15,py+30,bw-25,14);g.fillStyle='#f6e8be';g.font='bold 12px sans-serif';g.textAlign='center';g.fillText(({I:'INN',U:'GUILD',K:'SMITH',J:'HOME'})[kind]||kind,px+bw/2+2,py+41);g.textAlign='left';}
}
function srMapCanvas(key){
  const world=key==='world',D=ST_DUNGEONS[key],rows=world?ST_MAP:D.rows,P=srPalette(key);
  const c=document.createElement('canvas');c.width=rows[0].length*32;c.height=rows.length*32;c._worldScale=2;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.scale(.5,.5);
  const trees=[];ST.treesBy[key]=trees;
  const at=(x,y)=>rows[y]?.[x],grass=t=>'.vQSTgbaf:XcB'.includes(t);
  for(let y=0;y<rows.length;y++)for(let x=0;x<rows[0].length;x++){
    const t=at(x,y),px=x*64,py=y*64,seed=(x*37+y*71)%97;
    let Q=P;
    if(world){if(t==='*')Q={...P,grass:'#d7e3dd',grass2:'#cfddd6',tree:'#6c9692'};else if('a#'.includes(t))Q={...P,grass:'#cbb07f',grass2:'#c2a575'};else if(t==='b')Q={...P,grass:'#7e8e66',grass2:'#78885f'};else if(t==='g')Q={...P,grass:'#5d845f',grass2:'#587d59'};}
    const water=t==='~'||!world&&t==='#',road='=vZEO'.includes(t);
    g.fillStyle=water?Q.water:road?Q.road:(x+y)%2?Q.grass:Q.grass2;g.fillRect(px,py,64,64);
    if(water){g.fillStyle='#c6efec70';g.fillRect(px+8+(seed%12),py+20,16,2);g.fillRect(px+30,py+44,18,2);continue;}
    if(road){
      g.fillStyle=shade(Q.road,-.14);for(let i=0;i<3;i++)g.fillRect(px+8+(seed+i*17)%48,py+10+i*18,4,2);
      g.fillStyle=shade(Q.road,.12);if(!'=vZEO'.includes(at(x-1,y)||''))g.fillRect(px,py,3,64);if(!'=vZEO'.includes(at(x,y-1)||''))g.fillRect(px,py,64,3);
      if('ZE'.includes(t)){g.fillStyle='#ad885c';for(let i=0;i<7;i++)g.fillRect(px+2,py+4+i*8,60,6);}
    }else if(grass(t)){
      g.fillStyle=shade(Q.grass,-.08);for(let i=0;i<3;i++){const xx=px+6+(seed+i*19)%50,yy=py+8+(seed+i*23)%46;g.fillRect(xx,yy,2,4);g.fillRect(xx-2,yy+2,6,2);}
      if(seed<13){g.fillStyle=key==='land3'?'#eee6ff':key==='rouge'?'#c8afd4':'#f8e8a9';g.fillRect(px+24,py+28,2,6);g.fillRect(px+22,py+30,6,2);}
    }
    if(t==='T'&&(x+y)%3===0)trees.push({x:px+32,y:py+48,s:.85,pine:key==='land2',crystal:key==='land3',palm:key==='isles',ph:seed});
    if(t==='^'){g.fillStyle='#667c76';for(let i=0;i<6;i++)g.fillRect(px+4+i*4,py+52-i*8,56-i*8,10);g.fillStyle='#e2e8d7';g.fillRect(px+24,py+9,16,8);}
    if(t==='S'){g.fillStyle='#667e7b';g.fillRect(px+20,py+24,24,28);g.fillStyle='#a7dcd7';g.fillRect(px+27,py+14,10,24);}
    if(t==='L'){g.fillStyle='#655e46';g.fillRect(px+30,py+4,4,52);g.fillStyle='#ffdf99';g.fillRect(px+25,py,14,12);}
    // Every collision tile needs a visible matching obstacle.
    if(t==='W'||world&&t==='#'){
      g.fillStyle='#617273';g.fillRect(px+2,py+4,60,58);
      for(let r=0;r<4;r++){g.fillStyle=r%2?'#8b9a8d':'#7d8e85';for(let i=0;i<3;i++)g.fillRect(px+3+i*21-(r%2?8:0),py+6+r*14,18,11);}
    }
    if(t==='Q'){g.fillStyle='#3f726f';g.fillRect(px+17,py+50,30,8);for(let i=0;i<6;i++){g.fillStyle=i%2?'#b6f3ee':'#70cbd5';g.fillRect(px+29-i*2,py+6+i*7,6+i*4,8);}g.fillStyle='#e5ffff';g.fillRect(px+28,py+15,4,25);}
    if(!world&&'AaY'.includes(t)){
      g.fillStyle='#887b69';g.fillRect(px+6,py+16,52,44);g.fillStyle='#c6baa1';g.fillRect(px+10,py+10,44,8);
      g.fillStyle='#403d38';g.fillRect(px+24,py+32,16,28);g.fillStyle='#bcaa83';g.fillRect(px+7,py+22,8,36);g.fillRect(px+49,py+22,8,36);
    }
    if(t==='O'){g.fillStyle='#776045';g.fillRect(px+29,py+10,6,48);g.fillStyle='#dbc196';g.fillRect(px+6,py+12,52,18);g.fillStyle='#383c30';g.font='bold 10px sans-serif';g.textAlign='center';g.fillText('COACH',px+32,py+25);g.textAlign='left';}
    if(world&&'BP'.includes(t)){g.fillStyle='#654d37';g.fillRect(px,py+2,64,60);g.fillStyle='#ad9063';for(let i=0;i<7;i++)g.fillRect(px+2,py+4+i*8,60,6);}
    if('DGM'.includes(t)||world&&'CWB'.includes(t)){g.fillStyle='#6d7470';g.fillRect(px+6,py+8,52,52);g.fillStyle='#343e3c';g.fillRect(px+22,py+28,20,32);}
    if('pF'.includes(t)){g.fillStyle='#9c8051';for(let i=0;i<4;i++)g.fillRect(px+4,py+6+i*14,56,5);}
  }
  // Buildings are drawn after terrain, with no roof spill into roads or lawns.
  for(let y=0;y<rows.length;y++)for(let x=0;x<rows[0].length;x++){
    const t=at(x,y);if(!'HIUKJ'.includes(t))continue;
    if(!world&&t==='H'&&(at(x-1,y)==='H'||at(x,y-1)==='H'))continue;
    const multi=world&&at(x+1,y)==='h'||!world&&t==='H'&&at(x+1,y)==='H';
    srBuilding(g,x,y,multi?2:1,multi?2:1,P,t,key);
  }
  if(world){stDrawCastleExterior(g);ST.mapC=c;}else ST.dunC[key]=c;
}
stDrawMapCanvas=function(){srMapCanvas('world');};
const srOldOutdoor=stDrawOutdoorCanvas;
stDrawOutdoorCanvas=function(key){
  const D=ST_DUNGEONS[key];if(D?.outdoor&&!D.castle){srMapCanvas(key);return;}
  srOldOutdoor(key);
};
// Square-pixel foliage, with small stepped animation rather than smooth-vector blobs.
stDrawTree=function(t,now){
  const P=srPalette(stData()?.map||'world'),g=ctx,s=t.s||1;
  g.save();g.translate(Math.round(t.x),Math.round(t.y));g.scale(s,s);
  g.fillStyle='#243b2f36';g.fillRect(-21,-3,42,8);g.fillStyle='#715640';g.fillRect(-4,-27,8,28);
  if(t.crystal){for(let i=0;i<5;i++){g.fillStyle=i%2?'#b4d0db':'#859fbb';g.fillRect(-20+i*8,-35-i%3*10,8,28+i%3*10);}}
  else{for(let i=0;i<5;i++){g.fillStyle=i%2?P.tree:shade(P.tree,.08);const w=t.pine?46-i*7:48-Math.abs(i-2)*8;g.fillRect(-w/2+Math.round(Math.sin(now+t.ph)*.6),-24-i*8,w,10);}g.fillStyle=P.leaf;g.fillRect(-10,-54,16,4);g.fillRect(-19,-40,10,4);}
  g.restore();
};
// Pixelate the existing animation at sprite resolution, preserving all social/combat poses.
const srChibi=fwChibi,srSprite=document.createElement('canvas');srSprite.width=52;srSprite.height=68;
fwChibi=function(g,u,now,k=1){
  const q=srSprite.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,52,68);
  q.setTransform(.6,0,0,.6,26,54);
  srChibi(q,{...u,x:0,y:0},now,1);
  g.save();g.imageSmoothingEnabled=false;g.drawImage(srSprite,0,0,52,68,Math.round(u.x-26/.6*k),Math.round(u.y-54/.6*k),52/.6*k,68/.6*k);g.restore();
};
// Keep detailed wardrobe choices available, but show a small set of essentials first.
const srOutfitUI=stOutfitUI,srDetailsOpen=new WeakMap();
let srWardrobeDetails=false;
ST_HATS.splice(1,0,['none','No headwear']);
stOutfitUI=function(box,O,onChange,cls){
  const wardrobe=ST.on&&ST.mode==='menu',expanded=box.querySelector('.srMore')?.open??(wardrobe?srWardrobeDetails:(srDetailsOpen.get(O)??false));
  srOutfitUI(box,O,onChange,cls);
  const more=el('details','srMore'),summary=el('summary','','More appearance options');
  more.open=expanded;
  more.addEventListener('toggle',()=>{srDetailsOpen.set(O,more.open);if(wardrobe)srWardrobeDetails=more.open;});
  more.appendChild(summary);
  const basics=new Set(['Hair','Hair color','Skin','Shirt','Pants color','Headwear']);
  for(const row of [...box.children])if(!basics.has(row.querySelector('.olab')?.textContent))more.appendChild(row);
  box.appendChild(more);
};
const srCreator=renderCreator;
renderCreator=function(){
  srCreator();
  if(!$('srRecommended')){
    const b=el('button','chip','Use recommended abilities');b.id='srRecommended';
    b.addEventListener('click',()=>{
      crSel.skills=Object.keys(ST_SKILLS).filter(id=>ST_SKILLS[id].owner===crSel.cls&&ST_SKILLS[id].level<=1&&!ST_SKILLS[id].gift).slice(0,3);
      renderCreator();
    });$('crStep2').insertBefore(b,$('crSkills'));
  }
};
// A connected world overview supplements, rather than replaces, the detailed area atlas.
const srMapPanel=stMapPanel;
stMapPanel=function(){
  if(ST.on&&ST.mode==='menu')ST.mode='walk';
  srMapPanel();if(!ST.on||ST.mode!=='menu')return;
  const m=$('stMenu'),b=el('button','fwButton','World map · regions & levels');b.id='srWorldMap';
  b.addEventListener('click',srWorldMap);m.insertBefore(b,m.children[1]||null);
};
function srWorldMap(){
  const m=stSystemPanel('World map'),d=stData();m.appendChild(el('p','','Follow roads through the Vale; use the harbor or Captain Aster for distant regions. Level ranges are recommendations. Existing travel gates still apply.'));
  const grid=el('div','srWorldGrid');
  for(const [id,title,level,route]of [
    ['world','The Ashen Vale','1–15','Thornwake → Ravenhollow → Saltmere'],
    ['isles','Brightwater Isles','15–25','Ship from Saltmere'],
    ['rouge','Rougemarais','20–30','Ship from Saltmere'],
    ['land2','Valdris','26–40','Ship from Saltmere'],
    ['land3','Aetherfall','43–60','Ship from Saltmere'],
    ...FW_LANDS.map(L=>[L.id,L.name,String(L.level)+'+', 'Captain Aster / Lands & stories']),
    ['hearthward','Hearthward','1+','Housing menu · peaceful district']
  ]){
    const card=el('article','srRegion'),P=srPalette(id);card.style.setProperty('--region',P.grass);
    card.append(el('strong','',title+(id===d.map?' · You are here':'')),el('span','','Level '+level),el('p','',route));
    grid.appendChild(card);
  }
  m.appendChild(grid);const back=el('button','fwButton','Back to area map');back.addEventListener('click',()=>stMapPanel());m.appendChild(back);
}
// Basic attacks select a live nearby enemy, not a stale distant target.
const srAttack=rtAttack;
rtAttack=function(){
  if(!rtCanAct())return false;
  const d=stData(),b=ST.battle,alive=b.foes.filter(f=>f.hp>0);
  alive.sort((a,z)=>Math.hypot(a.x-d.x,a.y-d.y)-Math.hypot(z.x-d.x,z.y-d.y));
  const selected=rtTarget(),weapon=fwWorn('weapon'),ranged=weapon?weapon.range>200:['mage','ranger','gunner','necromancer','warlock','druid','chronomancer'].includes(d.cls);
  if(alive.length&&(!selected||Math.hypot(selected.x-d.x,selected.y-d.y)>(weapon?.range||(ranged?430:110))))RT.target=alive[0].id;
  return srAttack();
};
// Dodge must follow a collision-safe segment, not teleport through a wall.
rtSafePoint=function(x,y,fallback){
  const dx=x-fallback[0],dy=y-fallback[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/12));
  let safe=fallback;
  for(let i=1;i<=n;i++){const xx=fallback[0]+dx*i/n,yy=fallback[1]+dy*i/n;if(stBlocked(xx,yy+14))break;safe=[xx,yy];}
  return safe;
};
const srHud=stHud;
stHud=function(){
  srHud();const d=stData();if(!ST.on||!d)return;
  let xp=$('srLevel');if(!xp){xp=el('div');xp.id='srLevel';$('stHud').appendChild(xp);}
  xp.textContent=`Level ${d.lv} · ${Math.floor(d.xp)} / ${stXpNeed(d.lv)} XP`;
};
// Original ability IDs, class ownership, mastery and effects remain compatible.
for(const S of Object.values(ST_SKILLS)){
  const melee=['warrior','rogue','paladin','monk','berserker','blademaster','runeknight','spellblade'].includes(S.owner);
  S.rtRange=S.kind==='phys'&&melee?(S.all?190:155):440;
  S.rtCooldown=S.summon?9:S.kind==='heal'?6:S.kind==='buff'?7:S.all?4.5:S.twice?3.2:2;
}
function srDash(){
  if(!rtCanAct()||RT.cd.dash>RT.time)return false;
  const d=stData(),dx=(ST.keys.right?1:0)-(ST.keys.left?1:0)+(ST.touchMove?.[0]||0),dy=(ST.keys.down?1:0)-(ST.keys.up?1:0)+(ST.touchMove?.[1]||0);
  const a=Math.hypot(dx,dy)>.1?Math.atan2(dy,dx):(ST.facing??0)+Math.PI;
  [d.x,d.y]=rtSafePoint(d.x+Math.cos(a)*110,d.y+Math.sin(a)*110,[d.x,d.y]);
  RT.cd.dash=RT.time+3;RT.global=RT.time+.18;RT.dodgeUntil=RT.time+.3;RT.evade=RT.time+.3;
  RT.action={kind:'dodge',at:RT.time,until:RT.time+.3,angle:a};return true;
}
addEventListener('keydown',e=>{
  if(e.code==='ShiftLeft'&&rtActive()&&ST.mode==='battle'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();if(!e.repeat)srDash();}
});
let srUtilities=false;
rtToolbar=function(force=false){
  if(!rtActive())return;
  const d=stData(),f=fwData(),ids=d.skills.filter(id=>stOwnsSkill(d,id)).concat(f.equipped),pages=Math.max(1,Math.ceil(ids.length/3));
  RT.modePage%=pages;
  const view=ids.slice(RT.modePage*3,RT.modePage*3+3),key=[d.cls,RT.modePage,ids.join(','),f.eye,srUtilities].join('|');
  if(force||rtBar.dataset.key!==key){
    rtBar.dataset.key=key;rtBar.replaceChildren();
    const primary=el('div','srPrimary'),extra=el('div','srUtility');rtBar.append(primary,extra);
    const add=(box,label,key,fn,S)=>{
      const b=el('button','fwButton');b.type='button';b.dataset.cooldown=key;b.dataset.label=label;
      b.title=S?`${S.desc} Mana: ${S.owner?stSkCost(S):S.mp}. Cooldown: ${S.rtCooldown||S.cooldown}s. Range: ${S.rtRange||440}.`:label;
      b.addEventListener('click',fn);box.appendChild(b);return b;
    };
    add(primary,'Attack · Space','attack',rtAttack);
    view.forEach((id,i)=>{const S=FW_SPELLS[id]||FW_FUSIONS[id]||ST_SKILLS[id];const b=add(primary,`${i+1} · ${S.name}`,id,()=>FW_SPELLS[id]||FW_FUSIONS[id]?rtArchive(id):rtClassCast(id),S);b.dataset.mana=FW_SPELLS[id]||FW_FUSIONS[id]?S.mp:stSkCost(S);});
    add(primary,'Dodge · Shift','dash',srDash);add(primary,'Guard · G','guard',rtGuard);
    const more=el('button','fwButton',srUtilities?'Less':'Items & more');more.setAttribute('aria-expanded',String(srUtilities));more.addEventListener('click',()=>{srUtilities=!srUtilities;rtToolbar(true);});primary.appendChild(more);
    extra.hidden=!srUtilities;
    if(f.eye!=='none')add(extra,'Eye · Q','eye',rtEye);
    add(extra,'Potion · F','potion',rtPotion);add(extra,'Ether · T','ether',rtEther);
    add(extra,'Race power','race',()=>{if(rtCanAct()&&!ST.battle.racial){stRacePower();RT.global=RT.time+.7;}});
    if(pages>1){const b=el('button','fwButton',`Abilities ${RT.modePage+1}/${pages}`);b.addEventListener('click',()=>{RT.modePage=(RT.modePage+1)%pages;rtToolbar(true);});primary.appendChild(b);}
    const flee=el('button','fwButton','Flee');flee.addEventListener('click',()=>{if(ST.battle?.bossId)return stCallout('A guardian bars your retreat.','#e7b388');if(rtCanAct())stEndBattle('fled');});extra.appendChild(flee);
  }
  for(const b of rtBar.querySelectorAll('[data-cooldown]')){
    const id=b.dataset.cooldown,S=FW_SPELLS[id]||FW_FUSIONS[id]||ST_SKILLS[id],left=Math.max(0,(RT.cd[id]||0)-RT.time);
    b.textContent=b.dataset.label+(left>0?' · '+left.toFixed(1)+'s':S?' · '+(b.dataset.mana||0)+' MP':'');
    b.disabled=left>0||RT.global>RT.time||!!S&&d.mp<Number(b.dataset.mana)||(id==='potion'&&!d.items.potion)||(id==='ether'&&!d.items.ether)||(id==='race'&&ST.battle.racial)||(id==='eye'&&(d.hr||d.lv<5));
    b.style.setProperty('--cooldown',left>0?'#907c52':'#506e60');
  }
};
// Three original handheld-RPG arrangements. No borrowed franchise melodies.
function srChipSong(start,kind='route'){
  const battle=kind==='battle',port=kind==='port',beat=60/(battle?152:port?126:136),bar=beat*4;
  const roots=battle?[45,41,48,43,45,41,40,43]:port?[50,55,57,54,50,55,52,57]:[48,53,55,52,57,53,50,55];
  const motifs=battle?[[0,7,3,10,7,12,10,7],[3,0,7,10,12,7,3,0],[0,3,7,12,10,7,3,7],[2,7,5,2,10,7,5,2]]:
    [[0,4,7,12,9,7,4,7],[7,9,7,4,2,4,7,11],[4,7,12,11,9,7,4,2],[2,4,7,9,7,4,2,0]];
  for(let b=0;b<16;b++){
    const root=roots[b%8],bt=start+b*bar,third=battle?3:4,mel=motifs[b%4];
    for(let q=0;q<8;q++){
      const t=bt+q*beat/2,n=root+24+mel[q]+(b>=8&&b%4===2?12:0);
      tone(t,n,beat*.32,'square',.018,4200);
      tone(t+beat*.05,root+12+[0,third,7,third][q%4],beat*.24,'square',.007,2700);
      tone(t,root-12+(q%4===2?7:0),beat*.36,'triangle',.055,1800);
      if(q%2===0)noiseHit(t,.018,.035,'highpass',6500);
    }
    for(const q of [1,3])noiseHit(bt+q*beat,.028,.06,'bandpass',3400);
    for(const q of [0,2])kick(bt+q*beat,.07);
  }
  return start+16*bar;
}
for(const i of [SONG_WAYFARER,SONG_VALE,SONG_BAYOU,SONG_HORIZON,SONG_STEEL,SONG_CROWN]){
  const old=SONGS[i];SONGS[i]=start=>ST.on?srChipSong(start,[SONG_STEEL,SONG_CROWN].includes(i)?'battle':i===SONG_HORIZON?'port':'route'):old(start);
}
// A shared integer-pixel final pass covers creatures, interiors, spell effects,
// mounts, castles and older scenery as well as the redesigned outdoor tiles.
const srFrame=storyFrame,srScene=document.createElement('canvas');
storyFrame=function(now,dt){
  srFrame(now,dt);if(!ST.on)return;
  const w=Math.ceil(cv.width/2),h=Math.ceil(cv.height/2);
  if(srScene.width!==w||srScene.height!==h){srScene.width=w;srScene.height=h;}
  const q=srScene.getContext('2d');q.imageSmoothingEnabled=false;q.drawImage(cv,0,0,w,h);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(srScene,0,0,cv.width,cv.height);ctx.restore();
};
// All existing Story system panels share this side-drawer shell, not replacements
// for their save/economy/quest functions. The rail is local, cosmetic UI state.
const srDock=el('nav');srDock.id='srDock';srDock.setAttribute('aria-label','Story side menu');
const srDrawerTools=el('div');srDrawerTools.id='srDrawerTools';srDrawerTools.hidden=true;
const srReturn=el('button','','Back to menu'),srMin=el('button','','Minimize'),srClose=el('button','','Resume');
srClose.setAttribute('aria-label','Resume gameplay');
srDrawerTools.append(srReturn,srMin,srClose);$('story').append(srDock,srDrawerTools);
let srMinimized=false,srCompact=false;
function srShowPanel(fn){
  if(!ST.on||!['walk','battle','menu'].includes(ST.mode))return;
  srMinimized=false;
  ST.keys={};
  if(ST.mode==='battle'||ST.mode==='menu')ST.mode='walk';
  fn();srSyncDrawer();
}
for(const [label,fn]of [
  ['Menu',()=>stOpenMenu()],['Map',stMapPanel],['Journal',()=>stJournal()],
  ['Wardrobe',()=>stWardrobe()],['Stats',()=>stStatsMenu()]
]){
  const b=el('button','',label);b.title=label;b.setAttribute('aria-label','Open '+label.toLowerCase());b.dataset.label=label;
  b.addEventListener('click',()=>{if(srMinimized&&label==='Menu'){srMinimized=false;ST.mode='menu';ST.keys={};$('stMenu').hidden=false;srSyncDrawer();}else srShowPanel(fn);});srDock.appendChild(b);
}
const srFold=el('button','','Collapse');srFold.setAttribute('aria-label','Collapse side menu');
srFold.addEventListener('click',()=>{
  srCompact=!srCompact;srDock.classList.toggle('compact',srCompact);
  srFold.textContent=srCompact?'+':'Collapse';srFold.setAttribute('aria-label',srCompact?'Expand side menu':'Collapse side menu');srFold.setAttribute('aria-expanded',String(!srCompact));
});srDock.appendChild(srFold);
srReturn.addEventListener('click',()=>srShowPanel(()=>stOpenMenu()));
srClose.addEventListener('click',()=>{srMinimized=false;stCloseMenu();srSyncDrawer();});
srMin.addEventListener('click',()=>{
  srMinimized=true;$('stMenu').hidden=true;ST.keys={};ST.mode=rtActive()?'battle':'walk';
  srSyncDrawer();
});
function srSyncDrawer(){
  if(!ST.on)srMinimized=false;
  const open=ST.on&&!$('stMenu').hidden;
  srDrawerTools.hidden=!open;srDock.hidden=!ST.on;
  $('story').classList.toggle('srDrawerOpen',open);
  srDock.querySelector('button').textContent=srMinimized?'Restore menu':'Menu';
}
new MutationObserver(srSyncDrawer).observe($('stMenu'),{attributes:true,attributeFilter:['hidden']});
new MutationObserver(srSyncDrawer).observe($('story'),{attributes:true,attributeFilter:['hidden']});
// Searchable categories organize the original menu without dropping any actions.
const srOpenMenu=stOpenMenu;
stOpenMenu=function(){
  if(!ST.on||!['walk','battle','menu'].includes(ST.mode))return;
  ST.keys={};
  if(ST.mode==='menu')ST.mode='walk';
  srOpenMenu();if(ST.mode!=='menu')return;
  srMinimized=false;
  const m=$('stMenu'),search=el('input');search.id='srMenuSearch';search.placeholder='Find a menu option…';search.setAttribute('aria-label','Search Story menu');
  const tabs=el('div','srMenuTabs');
  let category='All';const filter=()=>{
    const term=search.value.toLowerCase();
    for(const b of m.querySelectorAll('button:not(.srMenuTabs button)')){
      const text=b.textContent.toLowerCase();
      const kind=/stat|class|spell|skill|build|blood|soul|wardrobe|armor|equip|grimoire|confluence|inventory/.test(text)?'Character':
        /home|hous|estate|furn|hearth|mount|stable|breed|pet|familiar|companion/.test(text)?'Life':
        /map|atlas|world|land|quest|journal|guide|boss|hunt|guild|hold|civic|job|justice|dominion/.test(text)?'World':'Other';
      b.hidden=!text.includes(term)||(category!=='All'&&kind!==category);
    }
  };
  for(const cat of ['All','Character','World','Life','Other']){
    const b=el('button','',cat);b.setAttribute('aria-pressed',String(cat==='All'));
    b.addEventListener('click',()=>{category=cat;for(const q of tabs.children)q.setAttribute('aria-pressed',String(q===b));filter();});tabs.appendChild(b);
  }
  search.addEventListener('input',filter);m.insertBefore(tabs,m.children[1]||null);m.insertBefore(search,tabs);srSyncDrawer();
  requestAnimationFrame(()=>{m.scrollTop=0;});
};
addEventListener('keydown',e=>{
  if(ST.on&&ST.mode==='menu'&&e.key==='Escape'&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){
    e.preventDefault();e.stopImmediatePropagation();srMinimized=false;stCloseMenu();srSyncDrawer();
  }
},true);
const srStyle=el('style');srStyle.textContent=`
.srMore{margin:12px 0;padding:12px;border:1px solid #627266}.srMore summary{cursor:pointer;color:#ecddb7;font-size:16px;min-height:32px}
.srWorldGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}
.srRegion{border:1px solid #657369;border-left:8px solid var(--region);padding:16px;background:#1c2a26}.srRegion strong,.srRegion span{display:block}.srRegion span{color:#e9cf8c;margin-top:8px}.srRegion p{font-size:14px;color:#d6dfcf}
#srLevel{font-size:12px;color:#ebdfb9;margin-top:8px}#srRecommended{margin-bottom:12px;min-height:44px}
body.story canvas{image-rendering:pixelated}
.rtBar{box-sizing:border-box;width:min(860px,96%);padding:12px;display:block!important;background:#1b2b26f5;border:2px solid #adbf96;box-shadow:0 4px 0 #101d18}
.rtBar[hidden]{display:none!important}.srPrimary,.srUtility{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.srUtility{padding-top:8px;border-top:1px solid #617260;margin-top:8px}.srUtility[hidden]{display:none}
.rtBar .fwButton{border:1px solid var(--cooldown,#607b68);border-bottom-width:4px;min-height:52px!important;font-size:14px!important;color:#f1ead1;background:#30473b;flex:1 1 90px;max-width:190px!important}
.rtBar .fwButton:first-child{background:#657d46;color:#fff8db}.rtBar .fwButton:disabled{color:#c5c7b7;background:#273b31;opacity:.8}
body.story #stMenu,body.story #stDialog,body.story #stHud,body.story #stObj{border-radius:2px;box-shadow:0 0 0 2px #182820,0 0 0 4px #829775}
body.story button{border-radius:2px!important}
#srDock{position:absolute;left:8px;top:210px;display:flex;flex-direction:column;gap:4px;width:92px;z-index:65}
#srDock button,#srDrawerTools button{font:600 14px sans-serif;color:#f1e9c9;background:#243c30;border:1px solid #91a681;border-bottom:3px solid #516e4d;min-height:44px;cursor:pointer}
#srDock.compact{width:40px}#srDock.compact button:not(:last-child){display:none}
body.story #stMenu,body.story #stMenu.atlas,body.story #stMenu.journal{position:absolute!important;left:108px!important;top:54px!important;bottom:12px!important;transform:none!important;width:min(460px,calc(100vw - 128px))!important;max-width:calc(100vw - 128px)!important;max-height:calc(100dvh - 72px)!important;height:auto!important;box-sizing:border-box!important;overflow:auto;padding:16px!important;z-index:64}
#srDrawerTools{position:absolute;left:108px;top:8px;width:min(460px,calc(100vw - 128px));display:flex;gap:4px;z-index:66}
#srDrawerTools[hidden],#srDock[hidden]{display:none}#srDrawerTools button{flex:1;min-width:0}
#srMenuSearch{box-sizing:border-box;width:100%;min-height:44px;border:1px solid #819775;background:#15291d;color:#f1e9c9;font:16px sans-serif;padding:8px;margin:8px 0}
.srMenuTabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px}.srMenuTabs button{flex:1;font-size:13px!important;padding:8px!important}.srMenuTabs button[aria-pressed=true]{background:#6d8452!important;color:#fff!important}
body.story #stMenuBtn,body.story #stJournalBtn{display:none!important}
body.story #stMenu>button{width:100%;text-align:left;box-sizing:border-box;margin:4px 0;min-height:44px}
body.story #stMenu button[hidden]{display:none!important}
.srDrawerOpen #stHud,.srDrawerOpen #stQuest{visibility:hidden}
@media(max-width:480px){.srWorldGrid{grid-template-columns:1fr}.srMore{padding:8px}}
@media(max-width:640px){.rtBar{width:calc(100% - 144px);right:8px;left:auto;bottom:12px;padding:8px}.srPrimary,.srUtility{gap:4px}.rtBar .fwButton{min-width:52px;flex:1 1 42%;font-size:12px!important;min-height:46px!important}.rtOn #stHud{max-width:160px}}
@media(max-width:640px){#srDock{top:230px;width:64px;left:4px;max-height:calc(100dvh - 400px);overflow-y:auto}#srDock button{font-size:12px;min-height:44px;flex-shrink:0}body.story #stMenu,body.story #stMenu.atlas,body.story #stMenu.journal{left:76px!important;top:50px!important;width:calc(100vw - 84px)!important;max-width:calc(100vw - 84px)!important;max-height:calc(100dvh - 62px)!important;padding:12px!important}#srDrawerTools{left:76px;width:calc(100vw - 84px)}#srDrawerTools button{font-size:12px}.srMenuTabs button{font-size:12px!important}body.story #stMenu .fwCards{grid-template-columns:1fr}}
`;document.head.appendChild(srStyle);
