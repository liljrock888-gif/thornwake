// Isolated browser tests. Instrumentation is injected into responses only;
// no mutable QA hook is shipped in game/thornwake.html or public/index.html.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const out = new URL('../test-results/', import.meta.url).pathname;
mkdirSync(out, {recursive:true});
const html = readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
for(const [i,m] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].entries())if(m[1].trim())new Script(m[1],{filename:`inline-${i}`});
assert(!html.includes('window.__TW_QA'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(), errors=[];
page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch();
  const body=(await response.text()).replace('window.render_game_to_text=()=>{',
    'window.__TW_QA={data:()=>stData(),stats:stStats,sync:stSyncProgress,boss:stBossFight,start:stStartBattle,battle:()=>ST.battle,foes:ST_FOES,races:ST_RACES,tiers:ST_MAGIC_TIERS,evolutions:ST_EVOLUTIONS,maps:ST_DUNGEONS,bosses:ST_BOSSES,rank:()=>stDominionRank(stData()),look:drawStorybookCharacter,creature:drawDreadCreature,drawFoe:stDrawFoe,near:stNearby,skill:ST_SKILLS};window.render_game_to_text=()=>{');
  await route.fulfill({response,body});
});
let checks=0;
const ok=(condition,label)=>{assert(condition,label);checks++;console.log('ok',label);};
const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
const shot=name=>page.screenshot({path:out+name+'.png'});
const dismiss=async()=>{
  for(let i=0;i<55;i++){
    if(!await page.locator('#stDialog').isVisible())return;
    const buttons=page.locator('#stChoices button:visible');
    const texts=await buttons.allTextContents();
    if(!texts.length)return;
    let idx=texts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(idx<0)idx=texts.findIndex(t=>/skip|find my|own way|not now|later/i.test(t));
    if(idx<0)idx=texts.length-1;
    await buttons.nth(idx).click();
  }
  throw Error('Dialogue did not finish');
};
const menu=async()=>{
  if(await page.locator('#stDialog').isVisible())await dismiss();
  if(!await page.locator('#stMenu').isVisible())await page.keyboard.press('Escape');
};
const resume=async()=>{
  if(await page.locator('#stMenu').isVisible())await page.keyboard.press('Escape');
};
const fixture=async values=>{
  await page.evaluate(values=>{
    const d=__TW_QA.data();Object.assign(d,values);__TW_QA.sync(false);
  },values);
};
const enterStory=async()=>{
  await page.locator('#m-story').click();await page.locator('#stContinue').click();await dismiss();
};
try{
  await page.goto(base,{waitUntil:'networkidle'});
  ok(await page.locator('#startScreen').isVisible(),'title visible');
  await shot('title-desktop');
  await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  ok(await page.locator('#m-story').isVisible(),'Enter the Vale launcher');
  await shot('launcher-desktop');
  await page.locator('#m-help').click();ok((await page.locator('button:visible').allTextContents()).includes('Back'),'How to Play opens');
  await page.locator('#scr-help .back').click();
  await page.locator('#m-store').click();ok(await page.locator('#scr-store').isVisible(),'store opens');await page.locator('#scr-store .back').click();
  await page.locator('#m-story').click();await page.locator('#stNew').click();
  ok(await page.locator('#crStep0').isVisible(),'Origin step visible');
  await page.locator('#crName').fill('Ash Tester');
  await page.locator('#crClass').getByRole('button',{name:'Mage',exact:true}).click();
  await page.locator('#crNext').click();
  await page.locator('#crOutfit select[aria-label=Hair]').selectOption('braids');
  await page.locator('#crOutfit select[aria-label=Expression]').selectOption('grin');
  await page.locator('#crOutfit select[aria-label=Headwear]').selectOption('');
  ok(await page.locator('#crStep1').isVisible(),'Appearance step visible');
  await shot('creator-desktop');
  await page.setViewportSize({width:375,height:812});await shot('creator-phone');
  ok(await page.locator('#card').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone creator has no horizontal clipping');
  await page.setViewportSize({width:1280,height:600});await shot('creator-short-desktop');
  ok(await page.locator('#card').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),'short-window creator stays in viewport');
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#crNext').click();
  ok(await page.locator('#crStart').isDisabled(),'Begin requires three abilities');
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
  ok((await state()).player?.name==='Ash Tester','creation reaches playable story');
  ok(await page.evaluate(()=>__TW_QA.data().skills.includes('emberspark')),'tier I spell granted');
  ok(await page.evaluate(()=>__TW_QA.data().outfit.hairType==='braids'),'appearance saved');
  await page.keyboard.press('d');await page.keyboard.press('a');
  await menu();ok(await page.locator('#overlay').isHidden(),'global overlay hidden during story menu');
  await shot('story-menu-desktop');
  await page.getByRole('button',{name:'Bloodlines & spellcraft',exact:true}).click();
  ok(await page.getByRole('button',{name:'Awaken as Ashbound',exact:true}).isDisabled(),'low-level evolution locked');
  await page.keyboard.press('Escape');await menu();
  await page.getByRole('button',{name:'World bosses',exact:true}).click();
  ok(await page.locator('.progressCard').count()===3,'three world boss rumors');
  await page.getByRole('button',{name:'Track this boss',exact:true}).first().click();
  ok((await state()).objective.text.includes('Briar Matriarch'),'boss tracking controls compass objective');
  await menu();await page.getByRole('button',{name:'Ashen Dominion',exact:true}).click();
  ok(await page.getByRole('button',{name:'Enter floor 1',exact:true}).isDisabled(),'low-level guardian floor locked');
  await page.getByRole('button',{name:'Enter the Ashen Sanctum',exact:true}).click();
  ok((await state()).player.map==='sanctum','stronghold hall is playable');
  await fixture({lv:60,gold:20000});
  await menu();await page.getByRole('button',{name:'Bloodlines & spellcraft',exact:true}).click();
  for(const name of ['Ashbound','Valeborn','Legend of Ash'])await page.getByRole('button',{name:'Awaken as '+name,exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().raceStage===3),'three ordered racial awakenings claimed');
  ok(await page.evaluate(()=>__TW_QA.data().skills.includes('crownstars')),'tier V spell unlocked');
  await shot('bloodlines-desktop');
  await page.keyboard.press('Escape');await menu();await page.getByRole('button',{name:'Ember Academy',exact:true}).click();
  const before=await page.evaluate(()=>({gold:__TW_QA.data().gold,uses:__TW_QA.data().mastery?.emberspark||0}));
  await page.getByRole('button',{name:'Study Ember Spark',exact:true}).click();
  ok(await page.evaluate(before=>__TW_QA.data().gold<before.gold&&__TW_QA.data().mastery.emberspark===before.uses+3,before),'lesson charges gold and grants mastery practice');
  await page.keyboard.press('Escape');await menu();await page.getByRole('button',{name:'Ashen Dominion',exact:true}).click();
  await page.getByRole('button',{name:'Enter floor 1',exact:true}).click();
  ok((await state()).player.map==='sanctum1','first guardian floor loads');
  // Stage an almost-defeated boss; normal combat input still drives victory/claim.
  await page.evaluate(()=>{__TW_QA.data().hp=5000;__TW_QA.data().mp=5000;__TW_QA.boss('cairntrial');__TW_QA.battle().foes[0].hp=1;});
  await page.getByRole('button',{name:/Strike/}).first().click();
  await page.waitForFunction(()=>__TW_QA.data().flags.cairntrial===true);
  await page.waitForFunction(()=>!document.querySelector('#stDialog').hidden);
  await dismiss();await page.getByRole('button',{name:'Claim rewards',exact:true}).click();
  ok(await page.evaluate(()=>__TW_QA.data().companions.includes('cairn')&&__TW_QA.rank()==='Warden'),'guardian victory grants companion and ruler rank');
  await dismiss();await menu();await page.getByRole('button',{name:'Ashen Dominion',exact:true}).click();
  ok(await page.getByRole('button',{name:'Enter floor 2',exact:true}).isEnabled(),'guardian victory unlocks next floor');
  for(const [floor,boss,companion,rank] of [[2,'vestrial','vesper','Regent'],[3,'soltrial','solenne','Sovereign']]){
    await page.getByRole('button',{name:'Enter floor '+floor,exact:true}).click();
    ok((await state()).player.map==='sanctum'+floor,'guardian floor '+floor+' loads');
    await page.evaluate(boss=>{const s=__TW_QA.stats();__TW_QA.data().hp=s.hp;__TW_QA.data().mp=s.mp;__TW_QA.boss(boss);__TW_QA.battle().foes[0].hp=1;},boss);
    await page.getByRole('button',{name:/Strike/}).first().click();
    await page.waitForFunction(boss=>__TW_QA.data().flags[boss]===true,boss);
    await page.waitForFunction(()=>!document.querySelector('#stDialog').hidden);
    await dismiss();await page.getByRole('button',{name:'Claim rewards',exact:true}).click();await dismiss();
    ok(await page.evaluate(({companion,rank})=>__TW_QA.data().companions.includes(companion)&&__TW_QA.rank()===rank,{companion,rank}),'guardian '+floor+' companion and rank awarded');
    await menu();await page.getByRole('button',{name:'Ashen Dominion',exact:true}).click();
  }
  await page.getByRole('button',{name:'Enter the Ashen Sanctum',exact:true}).click();
  ok(await page.evaluate(()=>Object.keys(__TW_QA.races).every(key=>__TW_QA.evolutions[key]?.length===3)),'all eight races have three evolution stages');
  for(const [boss,trophy] of [['briarmat','briarCrown'],['ossuary','ossuarySigil'],['vael','stormFang']]){
    await page.evaluate(boss=>{const s=__TW_QA.stats();__TW_QA.data().hp=s.hp;__TW_QA.data().mp=s.mp;__TW_QA.boss(boss);__TW_QA.battle().foes[0].hp=1;},boss);
    if(boss==='vael'){
      await page.getByRole('button',{name:/Skills/}).click();
      await shot('world-boss-battle-desktop');
      await page.setViewportSize({width:375,height:812});await shot('world-boss-battle-phone');
      await page.setViewportSize({width:1440,height:900});
      await page.getByRole('button',{name:/Crown of Stars/}).click();
      ok(await page.evaluate(()=>__TW_QA.data().mp<__TW_QA.stats().mp),'tier V spell consumes mana in combat');
    }else await page.getByRole('button',{name:/Strike/}).first().click();
    await page.waitForFunction(boss=>__TW_QA.data().flags[boss]===true,boss);
    await page.waitForFunction(()=>!document.querySelector('#stDialog').hidden);
    await dismiss();await page.getByRole('button',{name:'Claim rewards',exact:true}).click();await dismiss();
    ok(await page.evaluate(trophy=>!!__TW_QA.data().gear?.[trophy],trophy),'world boss '+boss+' awards unique trophy');
  }
  await menu();await page.getByRole('button',{name:'World bosses',exact:true}).click();
  ok(await page.getByRole('button',{name:'Defeated',exact:true}).count()===3,'world boss board records all three victories');
  ok(await page.evaluate(()=>!__TW_QA.data().trackBoss),'defeated tracked boss clears compass target');
  await page.setViewportSize({width:375,height:812});await shot('world-boss-board-phone');
  ok(await page.locator('#stMenu').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone boss board fits without overlap');
  await page.setViewportSize({width:1440,height:900});
  await page.keyboard.press('Escape');await menu();await page.getByRole('button',{name:'Save and quit',exact:true}).click();
  ok(await page.locator('#story').isHidden(),'Save and quit hides story root');
  ok(await page.locator('#stDialog').isHidden(),'Save and quit clears stale dialogue');
  await enterStory();await menu();await page.getByRole('button',{name:'Save and quit',exact:true}).click();
  // Real arena entry and pause/resume guard against the menu fix breaking the other game.
  await page.locator('#m-new').click();await page.locator('#mode-quick').click();await page.locator('#quickGo').click();
  await page.locator('#soloHeroes button').first().click();
  await page.locator('#loading').waitFor({state:'hidden'});
  ok(await page.locator('#overlay').isHidden(),'arena Quick Match starts');
  await page.keyboard.press('Escape');ok(await page.locator('#p-resume').isVisible(),'arena pause opens');
  await page.locator('#p-resume').click();ok(await page.locator('#overlay').isHidden(),'arena resumes');
  await page.keyboard.press('Escape');await page.locator('#p-quit').click();
  ok(await page.locator('#m-story').isVisible(),'arena quit returns to launcher');
  // Artist QA sheet uses the actual game renderers, not substitute mock assets.
  await page.evaluate(()=>{
    const cv=document.createElement('canvas');cv.width=1440;cv.height=900;cv.id='qa-art-sheet';
    cv.style='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;background:#132022';document.body.appendChild(cv);
    const g=cv.getContext('2d');g.fillStyle='#152024';g.fillRect(0,0,1440,900);
    const keys=['bandit','brigand','knight','fiend','wolf','briarmat','ossuary','vael'];
    keys.forEach((key,i)=>{const x=180+(i%4)*360,y=390+Math.floor(i/4)*420,F=__TW_QA.foes[key];g.save();g.translate(x,y);g.scale(2,2);
      const u={x:0,y:0,look:F.look||'rogue',outfit:{},color:F.color||'#9c805d',team:0,level:1,face:0,walk:0,_lw:0,id:i+1,atkT:0,atkCd:1,hitFlash:0,enemyKey:key,foe:F};
      if(['wolf','golem','drake'].includes(F.draw))__TW_QA.creature(g,F,u,1,key);else __TW_QA.look(g,u,1);g.restore();
      g.fillStyle='#e2d7be';g.font='20px Georgia';g.textAlign='center';g.fillText(F.name,x,y+46);
    });
  });
  await shot('enemy-art-sheet');
  await page.locator('#qa-art-sheet').evaluate(e=>e.remove());
  ok(errors.length===0,'no browser runtime errors: '+errors.join('; '));
  console.log(`${checks} browser checks passed. Screenshots: ${out}`);
}finally{await context.close();await browser.close();}
