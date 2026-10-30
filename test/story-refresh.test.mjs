// Local-only QA injection. The shipped build never exposes mutable test hooks.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const out='test-results/story-refresh/';
mkdirSync(out,{recursive:true});
const html=readFileSync('public/index.html','utf8');
assert(!html.includes('window.__SR_QA'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[],checks=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
await page.route('**/*',async r=>{
  if(r.request().resourceType()!=='document')return r.continue();
  const response=await r.fetch();
  const body=(await response.text()).replace('window.render_game_to_text=()=>{','window.__SR_QA=code=>eval(code);window.render_game_to_text=()=>{');
  await r.fulfill({response,body});
});
const q=code=>page.evaluate(code=>__SR_QA(code),code);
const ok=(value,label)=>{assert(value,label);checks.push(label);console.log('ok',label);};
const shot=name=>page.screenshot({path:out+name+'.png'});
async function dismiss(){
  for(let i=0;i<70&&await page.locator('#stDialog').isVisible();i++){
    const bs=page.locator('#stChoices button:visible'),ts=await bs.allTextContents();
    let j=ts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(j<0)j=ts.findIndex(t=>/skip|own way|later|not now/i.test(t));
    if(j<0)j=ts.length-1;
    if(j<0)break;
    await bs.nth(j).click();
  }
}
const dock=label=>page.locator('#srDock').getByRole('button',{name:'Open '+label.toLowerCase(),exact:true});
const tool=label=>page.locator('#srDrawerTools').getByRole('button',{name:label==='Resume'?'Resume gameplay':label,exact:true});
async function stage(map,x=18,y=16){
  await q(`(()=>{
    if(ST.battle)stEndBattle('fled');
    $('stMenu').hidden=true;$('stDialog').hidden=true;ST.dlg=null;ST.mode='walk';ST.keys={};
    const d=stData();d.lv=60;d.gold=100000;d.hp=stStats().hp;d.mp=stStats().mp;
    stEnterMap(${JSON.stringify(map)},${x},${y});
  })()`);
  await page.locator('#stLoad').waitFor({state:'hidden'});
  await dismiss();
}
try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#startBtn').click();
  await page.locator('#m-story').click();
  await page.locator('#stNew').click();
  await page.locator('#crName').fill('Pixel Tester');
  await page.locator('#crNext').click();
  ok(await page.locator('#crOutfit .srMore').count()===1,'simple appearance essentials plus expandable details');
  await page.getByLabel('Headwear',{exact:true}).selectOption('none');
  await page.getByLabel('Hair',{exact:true}).selectOption('braids');
  await page.locator('#crOutfit .srMore summary').click();
  await page.getByLabel('Expression',{exact:true}).selectOption('grin');
  await shot('character-desktop');
  await page.setViewportSize({width:375,height:812});await shot('character-phone');
  ok(await page.locator('#card').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'character customization has no phone overflow');
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#crNext').click();await page.locator('#srRecommended').click();
  ok(await page.locator('#crBuild').innerText()==='Adventurer · 3/3 abilities','recommended abilities chooses three starter abilities');
  await page.locator('#crStart').click();await page.locator('#stLoad').waitFor({state:'hidden',timeout:20000});await dismiss();
  ok(await q("stData().name==='Pixel Tester'&&stData().outfit.hat==='none'&&stData().outfit.hairType==='braids'"),'created look and hero are saved');
  await shot('world-desktop');
  ok(await q('ST_W===64&&ST_H===44&&ST_MAP.length===44&&ST_MAP[0].length===64'),'larger 64 by 44 overworld');
  ok(await q('FW_LANDS.every(l=>ST_DUNGEONS[l.id].rows.length===40&&ST_DUNGEONS[l.id].rows[0].length===48)'),'six frontier regions expanded to 48 by 40');
  ok(/^Level 1 · 0 \/ \d+ XP$/.test(await page.locator('#srLevel').innerText()),'earned XP and level visible on Story HUD');
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(180);await page.keyboard.up('ArrowDown');
  ok(await q('stData().y>712'),'normal keyboard movement works');
  await dock('menu').click();
  await page.waitForFunction(()=>document.querySelector('#stMenu').scrollTop===0);
  ok(await page.locator('#stMenu').evaluate(e=>e.getBoundingClientRect().left<120),'menu is a left side drawer');
  await shot('side-menu-desktop');
  await page.locator('.srMenuTabs').getByRole('button',{name:'World',exact:true}).click();
  ok(await page.locator('.srMenuTabs button[aria-pressed=true]').innerText()==='World','menu category can be selected');
  await page.locator('.srMenuTabs').getByRole('button',{name:'All',exact:true}).click();
  await page.locator('#srMenuSearch').fill('housing');
  ok((await page.locator('#stMenu button:visible').allTextContents()).some(t=>/Housing/.test(t)),'menu search returns housing');
  ok(!(await page.locator('#stMenu button:visible').allTextContents()).some(t=>/World bosses/.test(t)),'menu search hides unrelated actions');
  await tool('Minimize').click();
  ok(await q("ST.mode==='walk'&&$('stMenu').hidden"),'minimizing drawer resumes gameplay');
  await dock('menu').click();
  ok(await page.locator('#srMenuSearch').inputValue()==='housing','restoring minimized panel preserves contents');
  await tool('Back to menu').click();
  ok(await page.locator('#srMenuSearch').count()===1&&await page.locator('.srMenuTabs').count()===1,'back-to-menu does not duplicate controls');
  await tool('Resume').click();
  await page.locator('#srDock').getByRole('button',{name:'Collapse side menu'}).click();
  ok(await page.locator('#srDock button:visible').count()===1,'rail collapses to one expand button');
  await page.locator('#srDock').getByRole('button',{name:'Expand side menu'}).click();
  ok(await page.locator('#srDock button:visible').count()===6,'rail expands all five sections');
  for(const label of ['journal','wardrobe','stats','map']){
    await dock(label).click();
    ok(await page.locator('#stMenu').isVisible(),label+' opens in drawer');
    await tool('Back to menu').click();await tool('Resume').click();
  }
  await dock('map').click();
  await page.locator('#srWorldMap').click();
  ok(await page.locator('.srRegion').count()===12,'world atlas shows original regions, all six frontier regions and housing');
  ok((await page.locator('#stMenu').innerText()).includes('Level 43–60'),'world atlas shows level ranges');
  await shot('world-atlas-desktop');
  await page.getByRole('button',{name:'Back to area map',exact:true}).click();
  ok(await page.locator('#srWorldMap').isVisible(),'world atlas returns to area map');
  await tool('Resume').click();
  await page.setViewportSize({width:375,height:812});
  await shot('world-phone');
  await dock('menu').click();await shot('side-menu-phone');
  ok(await page.locator('#stMenu').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+2;}),'phone side drawer fits horizontally');
  await tool('Resume').click();await dock('map').click();
  await page.locator('#srWorldMap').click();await shot('world-atlas-phone');
  ok(await page.locator('#stMenu').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone world atlas fits width');
  await tool('Resume').click();
  await page.setViewportSize({width:1280,height:600});await dock('menu').click();await shot('side-menu-short');
  ok(await page.locator('#stMenu').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),'short-window drawer fits height');
  await tool('Resume').click();await page.setViewportSize({width:1440,height:900});
  // Sprite data checks verify settings actually change pixels, not just the dropdown.
  const spriteChecks=await q(`(()=>{
    const c=document.createElement('canvas');c.width=120;c.height=130;const g=c.getContext('2d');
    const sig=O=>{g.clearRect(0,0,120,130);fwChibi(g,{x:60,y:100,cls:'mage',id:1,look:'mage',outfit:O},2,1);return c.toDataURL();};
    const base={hairType:'crop',hairColor:'#442211',hat:'none',shirtColor:'#ff2233',skinColor:'#eed0a4'};
    return {hat:sig(base)!==sig({...base,hat:'hood'}),hair:sig(base)!==sig({...base,hairType:'spikes'}),braids:sig(base)!==sig({...base,hairType:'braids'}),skin:sig(base)!==sig({...base,skinColor:'#734929'}),pants:sig(base)!==sig({...base,pantsColor:'#00ff00'}),eyes:sig(base)!==sig({...base,eyeColor:'#ff0000'}),outfit:sig(base)!==sig({...base,outfitStyle:'suit'}),accessory:sig(base)!==sig({...base,accessory:'earrings'}),expression:sig(base)!==sig({...base,expression:'faceless'}),neckwear:sig(base)!==sig({...base,neckwear:'tie'})};
  })()`);
  for(const [k,v]of Object.entries(spriteChecks))ok(v,k+' customization changes rendered pixels');
  ok(await q('SG.renderCount>0&&SG.sheets.size>0&&SG.sheets.size<=SG.maxSheets'),'GANI playback drives game characters with bounded sprite cache');
  await dock('menu').click();
  await page.getByRole('button',{name:'Animations · GANI',exact:true}).click();
  ok((await page.locator('#stMenu').innerText()).includes('Original GANI animations active'),'GANI pack manager opens in side drawer');
  const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=32;c.height=16;const g=c.getContext('2d');g.fillStyle='#ff2050';g.fillRect(0,0,16,16);g.fillStyle='#20dd70';g.fillRect(16,0,16,16);return c.toDataURL().split(',')[1];
  });
  const importedGani='GANI0001\nSINGLEDIRECTION\nLOOP\nSPRITE 0 tester.png 0 0 16 16 original-test\nSPRITE 1 tester.png 16 0 16 16 original-test\nANI\n0 -8 -16\nWAIT 2\n1 -8 -16\nWAIT 2\nANIEND';
  await page.getByLabel('GANI files and sprite sheets').setInputFiles([
    {name:'idle.gani',mimeType:'text/plain',buffer:Buffer.from(importedGani)},
    {name:'tester.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}
  ]);
  await page.locator('.sgStatus').filter({hasText:'Loaded 1 local GANI action.'}).waitFor();
  ok(await q("SG.imported.get('idle').frames.length===2&&SG.images['tester.png'].width===32"),'real GANI file and PNG sheet import and decode');
  await tool('Resume').click();
  await q('ST.moving=false;ST.keys={};');await page.waitForTimeout(160);
  ok(await q("SG.imported.has('idle')&&SG.renderCount>0"),'imported action available to player renderer');
  await dock('menu').click();await page.getByRole('button',{name:'Animations · GANI',exact:true}).click();
  await page.getByLabel('GANI files and sprite sheets').setInputFiles({name:'idle.gani',mimeType:'text/plain',buffer:Buffer.from(importedGani)});
  await page.locator('.sgStatus[role=alert]').waitFor();
  ok(await q("SG.imported.has('idle')"),'invalid pack does not replace working animations');
  await page.getByRole('button',{name:'Restore original animations',exact:true}).click();
  ok(await q('SG.imported.size===0'),'restore original GANI animation pack');
  await tool('Resume').click();
  // Region anchors and walkable connection checks on the real collision function.
  const topology=await q(`(()=>{
    const d=stData(),map=d.map,result=[];d.riding=false;
    for(const L of FW_LANDS){
      d.map=L.id;const rows=ST_DUNGEONS[L.id].rows,seen=new Set(),queue=[[6,26]];let i=0;
      seen.add('6,26');
      while(i<queue.length){const [x,y]=queue[i++];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
        const a=x+dx,b=y+dy,key=a+','+b;if(a<0||b<0||a>=rows[0].length||b>=rows.length||seen.has(key)||stBlocked(a*64+32,b*64+46))continue;seen.add(key);queue.push([a,b]);
      }}
      const anchors=[...ST_NPCS.filter(n=>n.map===L.id),...FW_NODES.filter(n=>n.map===L.id)];
      result.push({id:L.id,reachable:anchors.every(n=>[[-1,0],[1,0],[0,-1],[0,1],[0,0]].some(([x,y])=>seen.has((Math.floor(n.x)+x)+','+(Math.floor(n.y)+y)))),meadow:seen.has('40,35'),cells:seen.size});
    }d.map=map;return result;
  })()`);
  for(const r of topology){ok(r.reachable,'reachable NPC/crystal anchors: '+r.id);ok(r.meadow,'connected new meadow: '+r.id);}
  writeFileSync(out+'topology.json',JSON.stringify(topology,null,2));
  for(const id of await q("FW_LANDS.map(l=>l.id)")){
    await stage(id);await shot('region-'+id);
    ok(await q("!!ST.dunC[stData().map]&&ST.dunC[stData().map].width*(ST.dunC[stData().map]._worldScale||1)===48*64"),'expanded region renders at correct world scale: '+id);
  }
  await stage('world',13,11);
  await q(`(()=>{
    const d=stData();d.cls='warrior';d.skills=['warrior_0','warrior_1','warrior_2'];d.hp=stStats().hp;d.mp=stStats().mp;
    stStartBattle(['wolf','goblin'],null,'=');
    ST.battle.foes.forEach((f,i)=>Object.assign(f,{x:d.x+(i===0?75:300),y:d.y,hp:5000,maxHp:5000,next:Infinity,windup:null,root:Infinity}));
    RT.target=ST.battle.foes[1].id;RT.global=0;RT.cd={};RT.phase=RT.time+1000;rtToolbar(true);
  })()`);
  ok(await page.locator('#rtBar .srPrimary button:visible').count()>=7,'primary combat bar contains essential actions');
  await page.locator('#rtBar').getByRole('button',{name:'Attack · Space',exact:true}).click();
  ok(await q('RT.target===ST.battle.foes[0].id'),'basic attack switches from distant to nearby enemy');
  await page.waitForTimeout(450);
  ok(await q('ST.battle.foes[0].hp<5000'),'basic attack actually deals damage');
  await page.waitForFunction(()=>!document.querySelector('#rtBar [data-cooldown=warrior_0]').disabled);
  await page.keyboard.press('1');await page.waitForTimeout(160);
  ok(await q("RT.cd.warrior_0>RT.time"),'keyboard 1 casts current first ability');
  const mp=await q('stData().mp');await page.keyboard.press('1');
  ok(await q('stData().mp')===mp,'repeat cast on cooldown spends no extra mana');
  await page.locator('#rtBar').getByRole('button',{name:'Items & more',exact:true}).click();
  ok(await page.locator('#rtBar .srUtility').isVisible(),'secondary combat controls expand');
  await shot('combat-desktop');
  await page.setViewportSize({width:375,height:812});await shot('combat-phone');
  ok(await page.locator('#rtBar').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&b.top>=0&&b.bottom<=innerHeight+1;}),'expanded phone combat bar fits viewport');
  await page.setViewportSize({width:1440,height:900});
  await dock('menu').click();const clock=await q('RT.time');await page.waitForTimeout(180);
  ok(await q('RT.time')===clock,'side menu pauses active encounter');
  await tool('Minimize').click();
  ok(await q("ST.mode==='battle'"),'minimizing menu resumes active encounter');
  await page.waitForTimeout(160);
  ok(await q('RT.time')>clock,'encounter clock resumes');
  await q('RT.global=0;RT.cd.dash=0;ST.keys={right:true}');
  const start=await q('({x:stData().x,y:stData().y})');await page.keyboard.press('Shift');
  ok(await q('RT.cd.dash>RT.time'),'Shift activates dodge cooldown');
  ok(await q(`!stBlocked(stData().x,stData().y+14)`),'dodge leaves player on walkable ground');
  await q("ST.keys={};stEndBattle('fled')");
  const music=await q(`(async()=>{
    const oldCtx=music.ctx,oldBus=music.bus,oldOn=ST.on;
    const off=new OfflineAudioContext(1,Math.ceil(85*22050),22050);music.ctx=off;music.bus=off.createGain();music.bus.gain.value=.6;music.bus.connect(off.destination);ST.on=true;
    let cursor=.05;const spans=[];
    try{for(const kind of ['route','port','battle']){const start=cursor;cursor=srChipSong(start,kind);spans.push({kind,start,end:cursor});cursor+=.2;}}finally{music.ctx=oldCtx;music.bus=oldBus;ST.on=oldOn;}
    const a=(await off.startRendering()).getChannelData(0);
    return spans.map(s=>{let energy=0,peak=0,finite=true,n=0;for(let i=Math.ceil(s.start*22050);i<Math.min(a.length,s.end*22050);i++){const v=a[i];finite=finite&&Number.isFinite(v);energy+=v*v;peak=Math.max(peak,Math.abs(v));n++;}return {...s,rms:Math.sqrt(energy/n),peak,finite};});
  })()`);
  for(const track of music)ok(track.rms>.002&&track.peak<1&&track.finite,'original '+track.kind+' score renders non-silent finite unclipped audio');
  writeFileSync(out+'music.json',JSON.stringify(music,null,2));
  await q('stSave()');await page.reload({waitUntil:'domcontentloaded'});await page.locator('#startBtn').click();await page.locator('#m-story').click();
  ok((await page.locator('#scr-story').innerText()).includes('Pixel Tester'),'saved hero survives reload');
  await page.locator('#stContinue').click();await page.locator('#stLoad').waitFor({state:'hidden'});await dismiss();
  ok(await q("stData().outfit.hat==='none'"),'no-headwear setting persists across save/continue');
  ok(errors.length===0,'zero browser runtime errors');
  writeFileSync(out+'result.json',JSON.stringify({checks:checks.length,passed:checks,errors},null,2));
  console.log(checks.length+' Story refresh checks passed');
}catch(e){
  await shot('failure');writeFileSync(out+'failure.json',JSON.stringify({passed:checks,errors,error:e.stack},null,2));throw e;
}finally{await browser.close();}
