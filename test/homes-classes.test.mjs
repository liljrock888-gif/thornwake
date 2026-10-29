import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
mkdirSync('test-results',{recursive:true});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace("reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
    "window.__TW_QA={data:stData,classes:ST_CLASSES,paths:ST_CLASS_PATHS,skills:ST_SKILLS,tier:stTierSkill,sync:stSyncProgress,owns:stOwnsSkill,stats:stStats,near:stNearby,enter:stEnterMap,props:ST_PROPERTIES,maps:ST_DUNGEONS,battle:()=>ST.battle,start:stStartBattle,end:stEndTurn,cast:stUseSkill,wound:stWound,fx:STFX,learn:stLearnSkill,state:()=>ST};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);");
  await route.fulfill({response,body});
});
let checks=0;const ok=(v,label)=>{assert(v,label);checks++;console.log('ok',label);};
const shot=async name=>{await page.locator('#stLoad').waitFor({state:'hidden'});await page.screenshot({path:'test-results/'+name+'.png'});};
const dismiss=async()=>{
  for(let i=0;i<60;i++){
    if(!await page.locator('#stDialog').isVisible())return;
    const buttons=page.locator('#stChoices button:visible'),texts=await buttons.allTextContents();
    if(!texts.length)return;
    let idx=texts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(idx<0)idx=texts.findIndex(t=>/skip|find my|own way|not now|later/i.test(t));
    if(idx<0)idx=texts.length-1;await buttons.nth(idx).click();
  }throw Error('Dialogue stuck');
};
const close=async()=>{if(await page.locator('#stMenu').isVisible())await page.keyboard.press('Escape');await dismiss();};
const menu=async()=>{await page.locator('#stLoad').waitFor({state:'hidden'});await close();await page.keyboard.press('Escape');};
const panel=async name=>{await menu();await page.getByRole('button',{name,exact:true}).click();};
const stage=async vals=>page.evaluate(v=>{Object.assign(__TW_QA.data(),v);__TW_QA.sync(false);},vals);
const pos=async(x,y)=>page.evaluate(([x,y])=>{const d=__TW_QA.data();d.x=x*64+32;d.y=y*64+32;__TW_QA.state().safe=100;},[x,y]);
const interact=async()=>{await page.locator('#stLoad').waitFor({state:'hidden'});await page.keyboard.press('e');};
try{
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill('Home Tester');
  const names=await page.locator('#crClass button').allTextContents();
  for(const name of names){
    await page.locator('#crClass').getByRole('button',{name,exact:true}).click();
    ok(await page.locator('#crSkills button').count()===4,name+' has four exclusive starter choices');
    const labels=await page.locator('#crSkills button').allTextContents();
    ok(name==='Mage'||!labels.some(x=>x.includes('Fireball')),name+' excludes Mage Fireball');
  }
  await page.locator('#crClass').getByRole('button',{name:'Warrior',exact:true}).click();
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
  ok(await page.evaluate(()=>__TW_QA.data().skills.every(id=>__TW_QA.skills[id].owner==='warrior')),'new hero receives only Warrior abilities');
  ok(await page.evaluate(()=>Object.keys(__TW_QA.classes).every(cls=>{
    const ids=Object.entries(__TW_QA.skills).filter(([,S])=>S.owner===cls).map(([id])=>id),d={cls,lv:60};
    return ids.length===(cls==='mage'?22:13)&&ids.every(id=>__TW_QA.owns(d,id)&&!__TW_QA.owns({...d,cls:cls==='mage'?'warrior':'mage'},id));
  })),'all 152 class techniques including dawn/dusk spells have exclusive ownership');
  await stage({gold:0});await panel('Housing & estates');
  ok(await page.locator('#stMenu .progressCard').count()===6,'six properties in catalog');
  ok(await page.getByRole('button',{name:/^Buy /}).evaluateAll(bs=>bs.every(b=>b.disabled)),'no-gold purchases disabled');
  await stage({gold:50000});await panel('Housing & estates');await shot('housing-desktop');
  for(const name of ['Harrowfield Homestead','Willowbank Cottage','Saltmere Harbor House','Thornwake Townhouse','Briarwood Manor','Suncrest Estate']){
    await page.getByRole('button',{name:new RegExp('^Buy '+name)}).click();
  }
  ok(await page.getByRole('button',{name:'Deed owned',exact:true}).count()===6,'all six deeds purchased once');
  ok(await page.evaluate(()=>__TW_QA.data().gold===50000-600-250-900-1800-4800-10000),'exact purchase total deducted');
  await page.setViewportSize({width:375,height:812});await shot('housing-phone');
  ok(await page.locator('#stMenu').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone catalog has no horizontal clipping');
  await page.setViewportSize({width:1440,height:900});
  for(const P of await page.evaluate(()=>__TW_QA.props)){
    await panel('Housing & estates');await page.getByRole('button',{name:'Visit '+P.name,exact:true}).click();
    await page.waitForFunction(()=>__TW_QA.state().mode==='walk');
    ok(await page.evaluate(id=>__TW_QA.near()?.h?.key===id,P.id),P.name+' exterior door is reachable');
    await interact();await page.waitForFunction(id=>__TW_QA.data().map===id,P.id);
    await page.waitForFunction(()=>__TW_QA.state().mode==='walk');
    ok(await page.evaluate(()=>__TW_QA.maps[__TW_QA.data().map].home),P.name+' furnished interior entered');
    await shot('home-'+P.id);
    const D=await page.evaluate(()=>__TW_QA.maps[__TW_QA.data().map]);
    const ey=D.rows.length-1,ex=D.rows[ey].indexOf('E');await pos(ex,ey-1);await interact();
    await page.waitForFunction(()=>__TW_QA.data().map==='world');await page.waitForFunction(()=>__TW_QA.state().mode==='walk');
    ok(true,P.name+' exits to world');
  }
  await panel('Housing & estates');await page.getByRole('button',{name:'Visit Willowbank Cottage',exact:true}).click();await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await page.waitForFunction(()=>__TW_QA.data().map==='willowhome'&&__TW_QA.state().mode==='walk');
  await pos(4,1);await stage({hp:10,mp:1,wounds:{bleed:3}});
  ok(await page.evaluate(()=>__TW_QA.near()?.kind==='homebed'),'bed has an interaction prompt');
  await interact();await page.getByRole('button',{name:'Rest at home',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().hp===__TW_QA.stats().hp&&!__TW_QA.data().wounds),'bed restores health and cures bleeding');
  await pos(2,3);await interact();
  await page.getByRole('button',{name:'Deposit 100 gold',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().properties.willowhome.storedGold===100),'strongbox deposit persists');
  await page.getByRole('button',{name:'Withdraw 100 gold',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().properties.willowhome.storedGold===0),'strongbox withdrawal reverses deposit');await close();
  await pos(10,2);await interact();await page.getByRole('button',{name:'Harbor blue',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().homeColors.willowhome==='#537f9a'),'furnishing color saved');
  await pos(12,1);await interact();
  ok((await page.locator('#stMenu').innerText()).includes('kitchen'),'cooking hearth opens meal crafting');await close();
  await pos(4,7);await interact();ok(await page.locator('#stDialog').isVisible(),'dining table has seating dialogue');await dismiss();
  await panel('Housing & estates');await page.getByRole('button',{name:'Visit Suncrest Estate',exact:true}).click();await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await page.waitForFunction(()=>__TW_QA.data().map==='suncrest'&&__TW_QA.state().mode==='walk');
  await pos(14,11);await interact();await page.waitForFunction(()=>__TW_QA.data().map==='suncrest_garden'&&__TW_QA.state().mode==='walk');await shot('estate-garden');
  ok(true,'estate private garden is walkable');await pos(7,9);await interact();await page.waitForFunction(()=>__TW_QA.data().map==='suncrest'&&__TW_QA.state().mode==='walk');ok(true,'garden returns to its estate');
  await panel('Class abilities');ok(await page.locator('#stMenu .progressCard').count()===13,'eight class moves and five milestones');
  ok(await page.getByRole('button',{name:/Learn Pommel Break/}).isDisabled(),'level-five move locked at level one');
  await stage({lv:10,gold:1000});await panel('Class abilities');await page.getByRole('button',{name:/Learn Pommel Break/}).click();
  ok(await page.evaluate(()=>__TW_QA.data().skills.includes('warrior_4')),'class training grants owned move');
  await shot('warrior-path');await page.setViewportSize({width:375,height:812});await shot('warrior-path-phone');await page.setViewportSize({width:1440,height:900});
  await stage({skills:['fireball','strike','guard','crownstars'],wounds:{maim:true,bleed:2},mastery:{strike:35}});
  ok(await page.evaluate(()=>!__TW_QA.data().skills.includes('fireball')&&!__TW_QA.data().skills.includes('crownstars')&&__TW_QA.data().mastery.warrior_0===35),'mixed old save migrates with matching mastery retained');
  ok(await page.evaluate(()=>!__TW_QA.data().wounds.maim&&__TW_QA.data().wounds.bleed===2),'old limb injury cleared without clearing bleeding');
  ok(await page.evaluate(()=>{const d=__TW_QA.data(),a=__TW_QA.stats().atk;d.wounds.maim=true;const b=__TW_QA.stats().atk;delete d.wounds.maim;return a===b;}),'legacy limb flag cannot reduce attack');
  ok(await page.evaluate(()=>{const orig=Math.random;Math.random=()=>0;const u={w:{},atk:123};for(let i=0;i<100;i++)__TW_QA.wound('p',u,'phys',true,3,false);Math.random=orig;return u.w.bleed===4&&!u.w.maim&&u.atk===123&&__TW_QA.fx.parts.length>0;}),'100 critical wounds cause bleeding and gore without limb loss');
  await stage({lv:30,gold:10000});await panel('Thieves Guild');await page.getByRole('button',{name:'Visit the guild hideout',exact:true}).click();await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await page.getByRole('button',{name:'Go inside',exact:true}).click();await page.waitForFunction(()=>__TW_QA.data().map==='veiledhand'&&__TW_QA.state().mode==='walk');
  await panel('Thieves Guild');await page.getByRole('button',{name:'Join the Veiled Hand (50 gold)',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().gold===9950),'guild membership charges once');
  await page.getByRole('button',{name:'Accept The Missing Ledger',exact:true}).click();
  ok(await page.getByRole('button',{name:'Accept The Harbor Seal',exact:true}).isDisabled(),'only one active contract allowed');
  await shot('thieves-guild');await page.getByRole('button',{name:'Travel to The Missing Ledger',exact:true}).click();await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await dismiss();
  ok(await page.evaluate(()=>__TW_QA.data().thieves.recovered),'contract cache recovered through E interaction');
  await panel('Thieves Guild');await page.getByRole('button',{name:'Visit the guild hideout',exact:true}).click();await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await page.getByRole('button',{name:'Go inside',exact:true}).click();await page.waitForFunction(()=>__TW_QA.data().map==='veiledhand'&&__TW_QA.state().mode==='walk');
  await panel('Thieves Guild');await page.getByRole('button',{name:'Claim 160 gold',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().gold===10110&&__TW_QA.data().thieves.done.length===1),'guild reward claimed exactly once');
  ok(await page.getByRole('button',{name:'Completed',exact:true}).isDisabled(),'claimed contract cannot replay');
  for(const name of ['The Harbor Seal','A Noble Secret','The Ashen Idol','The Unseen Hand']){
    await page.getByRole('button',{name:'Accept '+name,exact:true}).click();
    await page.getByRole('button',{name:'Travel to '+name,exact:true}).click();
    await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await dismiss();
    ok(await page.evaluate(()=>__TW_QA.data().thieves.recovered),name+' cache is reachable and recoverable');
    await panel('Thieves Guild');await page.getByRole('button',{name:'Visit the guild hideout',exact:true}).click();
    await page.waitForFunction(()=>__TW_QA.state().mode==='walk');await interact();await page.getByRole('button',{name:'Go inside',exact:true}).click();
    await page.waitForFunction(()=>__TW_QA.data().map==='veiledhand'&&__TW_QA.state().mode==='walk');
    await panel('Thieves Guild');await page.getByRole('button',{name:/^Claim .* gold$/}).click();
  }
  ok((await page.locator('#stMenu').innerText()).includes('Guildmaster'),'all five contracts award Guildmaster rank');
  ok(await page.evaluate(()=>__TW_QA.data().gold===14210&&__TW_QA.data().thieves.done.length===5),'all contract rewards reconcile');
  await page.setViewportSize({width:375,height:812});await shot('thieves-guild-phone');
  ok(await page.locator('#stMenu').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone guild fits');
  await page.setViewportSize({width:1440,height:900});
  await close();
  ok(await page.evaluate(()=>{
    const d=__TW_QA.data();__TW_QA.start(['wolf']);const b=__TW_QA.battle();b.turn='player';d.mp=__TW_QA.stats().mp;
    const before=d.mp;d.skills.push('mage_0');__TW_QA.cast('mage_0');d.skills=d.skills.filter(id=>id!=='mage_0');
    return d.mp===before&&b.turn==='player';
  }),'combat rejects another class ability even if injected into a stale skill list');
  ok(await page.evaluate(()=>{const d=__TW_QA.data(),before=d.mp;__TW_QA.cast('warrior_1');return d.mp<before&&__TW_QA.battle().buffs.guard>0;}),'owned Warrior ability consumes mana and applies its effect');
  await page.evaluate(()=>{for(const f of __TW_QA.battle().foes)f.hp=0;__TW_QA.end();});
  await page.waitForFunction(()=>__TW_QA.state().mode==='talk');await dismiss();
  await menu();await page.getByRole('button',{name:'Save and quit',exact:true}).click();
  await page.reload();await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stContinue').click();await page.waitForFunction(()=>__TW_QA.state().on);
  ok(await page.evaluate(()=>__TW_QA.data().thieves.done.length===5&&__TW_QA.data().properties.suncrest&&__TW_QA.data().homeColors.willowhome==='#537f9a'),'deeds, furnishings and guild completion survive reload on normal hosting');
  ok(errors.length===0,'no browser runtime errors: '+errors.join('; '));
  console.log(checks+' housing/class/guild checks passed');
}catch(e){
  console.log('Last game state:',await page.evaluate(()=>window.render_game_to_text?.()).catch(()=>null));
  console.log('Nearest interaction:',await page.evaluate(()=>__TW_QA.near()).catch(()=>null));
  await page.screenshot({path:'test-results/homes-failure.png'}).catch(()=>{});
  throw e;
}finally{await context.close();await browser.close();}
