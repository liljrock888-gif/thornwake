import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
mkdirSync('test-results',{recursive:true});
function frontierChecks(){
  const d=stData(),old=structuredClone(d),oldMode=ST.mode,results=[];
  const check=(value,label)=>{if(!value)throw Error(label);results.push(label);};
  try{
    check(Object.keys(FW_SPELLS).length===200,'exactly 200 archive spells');
    check(FW_FORMS.length===20&&FW_SCHOOLS.length===10,'twenty distinct targeting/timing forms across ten school effects');
    check(new Set(Object.values(FW_SPELLS).map(s=>s.name)).size===200,'200 unique spell names and school/form pairs');
    check(FW_CATALOG.length===800&&new Set(FW_CATALOG.map(i=>i.id)).size===800,'800 unique catalog item IDs');
    for(const family of ['weapon','armor','clothing','accessory'])check(FW_CATALOG.filter(i=>i.family===family).length===200,'200 '+family+' items');
    check(FW_RARITIES.every(r=>FW_CATALOG.some(i=>i.rarity===r)),'all five rarity tiers represented');
    for(const it of FW_CATALOG)check(it.level>=1&&it.level<=60&&it.price>0&&Object.values(it.stats).every(n=>Number.isFinite(n)&&n>0),'valid level/price/stats: '+it.id);
    check(FW_LANDS.length===6&&new Set(FW_LANDS.map(l=>ST_DUNGEONS[l.id].rows.join(''))).size===6,'six geometrically distinct new lands');
    for(const terrain of ['jungle','desert','snow'])check(FW_LANDS.some(l=>l.terrain===terrain),'playable '+terrain+' region');
    const maps=Object.values(ST_DUNGEONS).filter(m=>m.fwFloor);
    check(maps.length===200&&new Set(maps.map(m=>m.rows.join(''))).size===200,'200 distinct labyrinth floor layouts');
    for(const M of maps){
      const seen=new Set(['1,1']),queue=[[1,1]];let i=0;
      while(i<queue.length){const [x,y]=queue[i++];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(M.rows[b]?.[a]&&M.rows[b][a]!=='#'&&!seen.has(key)){seen.add(key);queue.push([a,b]);}}}
      check(seen.has('23,21')&&seen.has('23,23'),'connected guardian and stairs: floor '+M.fwFloor);
    }
    check(FW_MYTHS.length===12&&FW_MYTHS.some(m=>m[0]==='minotaur')&&FW_MYTHS.some(m=>m[0]==='leviathan'),'twelve actual mythological enemy definitions');
    check(FW_LANDS.every(l=>ST_FOES[ST_DUNGEONS[l.id].boss]?.myth),'all six lands have optional myth guardians');
    const f=fwData();d.lv=60;d.gold=1000000;d.hr=false;f.loot=[];f.worn={};f.clan='none';f.eye='none';f.eyeToken=false;
    check(!fwChooseEye('mana'),'eye cannot be chosen without a secret reward');
    f.eyeToken=true;check(fwChooseEye('mana')&&f.eye==='mana'&&!f.eyeToken,'secret reward allows one chosen eye');
    f.eyeToken=true;check(!fwChooseEye('mirror')&&f.eye==='mana','even a second token cannot replace or stack the permanent eye');
    f.eyeToken=false;f.eye='none';
    for(const family of ['weapon','armor','clothing','accessory']){
      const it=FW_CATALOG.find(i=>i.family===family);
      check(fwBuy(it.id),'buy earned-gold '+family);
      const gold=d.gold;check(!fwBuy(it.id)&&d.gold===gold,'duplicate '+family+' purchase rejected without cost');
      const before=stStats();check(fwEquip(it.id)&&f.worn[it.slot]===it.id,'equip '+family+' in correct slot');
      check(Object.keys(it.stats).every(k=>stStats()[k]>=before[k]),'equipped '+family+' contributes actual stats');
    }
    const blocked=FW_CATALOG.find(i=>i.level>1);d.lv=1;
    check(!fwBuy(blocked.id),'shop enforces item level');
    d.lv=60;f.learned=[];f.equipped=[];d.gold=1000000;
    check(fwLearn('archive_ember_bolt'),'learn archive spell with gold');
    const paid=d.gold;check(!fwLearn('archive_ember_bolt')&&d.gold===paid,'duplicate learning cannot charge twice');
    d.hr=true;check(!fwLearn('archive_tide_bolt'),'restriction seals archive learning');d.hr=false;
    d.lv=1;check(!fwLearn('archive_ember_nova'),'archive spell level gate');d.lv=60;
    f.quests.lanterns='active';for(let i=0;i<3;i++)f.nodes['lumenreach_'+i]=true;
    check(fwQuestClaim('lanterns'),'complete an actual three-crystal quest');
    const claimedGold=d.gold;check(!fwQuestClaim('lanterns')&&d.gold===claimedGold,'quest reward replay rejected');
    d.tabletop={scores:[10,14,14,14,10,10],background:'scholar',ideal:'Remember the forgotten.'};
    check(ttValid(d.tabletop)&&ttCost(d.tabletop.scores)===27,'valid 27-point tabletop origin');
    check(!ttValid({...d.tabletop,scores:[15,15,15,15,15,15]}),'over-budget tabletop build rejected');
    const roll=ttRoll('arcana',12);check(roll.die>=1&&roll.die<=20&&roll.mod===2&&roll.proficiency===6&&roll.total===roll.die+8,'d20 + ability + level-scaled trained proficiency');
    check(ttRoll('athletics',12).proficiency===0,'untrained checks omit proficiency');
    const og=d.gold;f.chips=100;fwCasinoRoll('low');check(d.gold===og&&f.chips>=90&&f.chips<=110,'casino changes free chips, never game gold');
    for(const C of TT_NEW_CLASSES)check(ST_CLASS_PATHS[C.id].length===8&&ST_CLASS_MILESTONES[C.id].length===5&&ST_CLASSES[C.id].skills.every(id=>stOwnsSkill({...d,cls:C.id},id)),'new owned class path: '+C.name);
    d.map='lumenreach';d.x=18*64+32;d.y=16*64+32;d.cls='mage';d.skills=['mage_0','mage_1','mage_2'];d.hp=stStats().hp;d.mp=stStats().mp;
    stStartBattle(['wolf','goblin','bandit'],null,'=');
    check(ST.battle.realtime&&ST.mode==='battle','Story starts real-time combat on the world map');
    const battle=ST.battle;
    for(const S of Object.values(FW_SPELLS)){
      d.x=18*64+32;d.y=16*64+32;d.hp=stStats().hp*.8;d.mp=stStats().mp;f.learned=[S.id];f.equipped=[S.id];
      RT.global=0;RT.cd={};RT.barrier=0;RT.hazards=[];RT.traps=[];RT.attunement=null;RT.phase=RT.time+100;
      battle.foes.forEach((foe,i)=>Object.assign(foe,{hp:10000000,maxHp:10000000,x:d.x+70+i*20,y:d.y+i*5,next:Infinity,root:Infinity,windup:null,rtBurnUntil:0,mark:0,chill:0,burn:0,hex:0,poison:0}));
      const before=battle.foes.reduce((n,foe)=>n+foe.hp,0);
      check(rtArchive(S.id),'cast executable spell: '+S.name);
      for(let i=0;i<110;i++){rtUpdate(.06);stFxDraw(.06);}
      const after=battle.foes.reduce((n,foe)=>n+foe.hp,0);
      check(S.form==='ward'?RT.barrier>0&&RT.attunement?.school===S.school:after<before,'actual effect: '+S.name);
      RT.global=0;d.mp=0;check(!rtArchive(S.id),'mana/cooldown gate: '+S.name);
    }
    d.mp=stStats().mp;RT.global=0;RT.cd={};f.eye='binding';const target=rtTarget();target.root=0;
    check(rtEye()&&target.root>RT.time,'awakened binding eye actually roots a target');
    check(!rtEye(),'eye cannot double-cast through cooldown');
    const beforeMap=d.map;stEnterMap('veilwood',7,25);check(d.map===beforeMap,'cannot travel out of an active encounter');
    ST.battle=null;ST.mode='walk';RT.global=0;
    f.deepest=0;stEnterMap(fwFloorKey(3),1,2);check(d.map===beforeMap,'cannot skip locked labyrinth floors');
    $('stDialog').hidden=true;ST.dlg=null;ST.mode='walk';
    for(const land of FW_LANDS){
      stEnterMap(land.id,7,25);check(d.map===land.id&&f.visits[land.id],'enter and save visit: '+land.name);
      const n=ST_NPCS.find(n=>n.map===land.id&&n.fwKey);d.x=7*64+32;d.y=25*64+32;
      const x=n.x,y=n.y;for(let i=0;i<200;i++)rtResidents(.06);
      check(n.x!==x||n.y!==y,'real-time NPC patrol: '+land.name);
    }
  }finally{
    for(const key of Object.keys(d))delete d[key];Object.assign(d,old);ST.battle=null;ST.mode=oldMode;ST.foes=[];ST.dlg=null;
    $('stDialog').hidden=true;$('stBattle').hidden=true;RT.hazards=[];RT.traps=[];RT.pulses=[];RT.action=null;RT.global=0;RT.cd={};RT.poisonUntil=0;RT.playerRoot=0;
    stEnterMap(d.map,Math.floor(d.x/64),Math.floor(d.y/64));stHud();stSave();
  }
  return results;
}
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace("reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
    `window.__FRONTIER_RUN=(${frontierChecks.toString()});window.__FW={data:stData,state:ST,fw:fwData,rt:RT,start:stStartBattle,enter:stEnterMap,save:stSave,stats:stStats,foes:ST_FOES,choose:fwChooseEye,npcs:ST_NPCS,near:stNearby,interact:stInteract};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);`);
  await route.fulfill({response,body});
});
const dismiss=async()=>{
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<80&&await page.locator('#stDialog').isVisible();i++){
    const bs=page.locator('#stChoices button:visible'),ts=await bs.allTextContents();
    let n=ts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));if(n<0)n=ts.findIndex(t=>/skip|own way|later|not now/i.test(t));if(n<0)n=ts.length-1;
    if(n<0)break;await bs.nth(n).click();
  }
};
try{
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#m-story').click();await page.locator('#stNew').click();
  await page.locator('#crName').fill('Lantern Sage');await page.locator('#crClass').getByRole('button',{name:'Mage',exact:true}).click();
  await page.locator('#ttToggle').click();await page.getByLabel('Character background').selectOption('scholar');
  await page.screenshot({path:'test-results/frontier-studio-desktop.png'});
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();await page.locator('#crStart').click();await dismiss();
  const results=await page.evaluate(()=>__FRONTIER_RUN());for(const label of results)console.log('ok',label);
  await page.evaluate(()=>{const q=__FW,d=q.data();d.gold=5000;d.lv=25;d.hp=q.stats().hp;d.mp=q.stats().mp;q.enter('lumenreach',17,16);});
  await dismiss();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Living grimoire · 200 spells',exact:true}).click();
  assert.equal(await page.locator('.fwCount').innerText(),'200 of 200 spells shown');
  await page.getByLabel('Search the 200 spells').fill('ember');assert.equal(await page.locator('.fwCount').innerText(),'20 of 200 spells shown');
  await page.locator('.fwCard').filter({has:page.getByRole('heading',{name:'Ember Bolt',exact:true})}).getByRole('button',{name:/Learn/}).click();
  await page.screenshot({path:'test-results/frontier-spells-desktop.png'});
  await page.getByRole('button',{name:'Back to Story menu',exact:true}).click();await page.getByRole('button',{name:'Weapons & equipment shop',exact:true}).click();
  await page.getByLabel('Equipment category').selectOption('clothing');assert.match(await page.locator('.fwCount').innerText(),/^200 matching clothing/);
  await page.getByLabel('Equipment rarity').selectOption('Legendary');assert.match(await page.locator('.fwCount').innerText(),/^40 matching clothing/);
  await page.screenshot({path:'test-results/frontier-armory-desktop.png'});
  await page.getByRole('button',{name:'Resume exploring',exact:true}).click();
  await page.evaluate(()=>{const q=__FW,d=q.data();q.start(['myth_minotaur'],null,'=');const f=q.state.battle.foes[0];Object.assign(f,{hp:100000,maxHp:100000,x:d.x+75,y:d.y,next:q.rt.time+10});q.rt.global=0;});
  const startX=await page.evaluate(()=>__FW.data().x);await page.keyboard.down('d');await page.waitForFunction(x=>__FW.data().x>x+20,startX);await page.keyboard.up('d');
  const hp=await page.evaluate(()=>__FW.state.battle.foes[0].hp);await page.keyboard.press('Space');await page.waitForFunction(hp=>__FW.state.battle.foes[0].hp<hp,hp);
  await page.screenshot({path:'test-results/frontier-free-combat-desktop.png'});
  await page.keyboard.press('Escape');assert(await page.locator('#stMenu').isVisible());await page.getByRole('button',{name:'Resume',exact:true}).click();
  assert.equal(await page.evaluate(()=>__FW.state.mode),'battle');
  await page.evaluate(()=>{__FW.state.battle=null;__FW.state.mode='walk';__FW.enter('veilwood',31,6);__FW.fw().eye='none';__FW.fw().eyeToken=false;});
  await dismiss();await page.keyboard.press('e');await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'To understand, not to own',exact:true}).click();
  await page.getByRole('button',{name:'Choose Glimpse Eye',exact:true}).click();await page.getByRole('button',{name:'Go back and choose a different eye',exact:true}).click();
  await page.getByRole('button',{name:'Choose Aether Eye',exact:true}).click();await page.getByRole('button',{name:'Confirm my one eye',exact:true}).click();
  assert.equal(await page.evaluate(()=>__FW.fw().eye),'mana');assert.equal(await page.getByRole('button',{name:/^Choose .* Eye$/}).count(),0);
  await page.screenshot({path:'test-results/frontier-secret-eye-desktop.png'});
  await page.getByRole('button',{name:'Resume exploring',exact:true}).click();
  await page.evaluate(()=>__FW.enter('jadecanopy',17,16));await dismiss();await page.screenshot({path:'test-results/frontier-jungle-desktop.png'});
  assert.deepEqual(errors,[]);console.log(`${results.length} rule/simulation checks and desktop UI/combat/secret-eye flows passed; no runtime errors`);
}catch(e){await page.screenshot({path:'test-results/frontier-failure.png'});console.error('Runtime errors',errors);throw e;}
finally{await context.close();await browser.close();}
