import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

// All mutable QA access and controlled rolls are injected into test responses only.
function soulRuleChecks(){
  const d=stData(),original=structuredClone(d),live=ST.battle,results=[];
  const check=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  const roll=(b,value)=>{const random=Math.random;Math.random=()=>value;try{const lines=[];stSoulCollectVictory(b,lines);return lines;}finally{Math.random=random;}};
  const encounter=(key='wolf',hp=0)=>({foes:[{...ST_FOES[key],key,hp}],over:true});
  try{
    check(Object.keys(ST_CLASSES).length===12&&ST_CLASSES.warlock.name==='Warlock','Warlock is an actual twelfth playable class');
    for(const cls of ['necromancer','warlock']){
      check(ST_CLASS_PATHS[cls].length===8&&ST_CLASS_MILESTONES[cls].length===5,cls+' has eight trainable skills and five milestones');
      check(Object.entries(ST_SKILLS).filter(([,S])=>S.owner===cls).every(([id,S])=>stOwnsSkill({cls,lv:60},id)&&!stOwnsSkill({cls:cls==='warlock'?'necromancer':'warlock',lv:60},id)),cls+' enforces class-exclusive ownership');
      check(!stOwnsSkill({cls,lv:60,hr:true},cls+'_tier0'),cls+' summon is sealed by Heavenly Restriction');
    }
    Object.assign(d,{cls:'necromancer',lv:25,hr:false,mastery:{necromancer_1:17},skills:['necromancer_0','necromancer_1','necromancer_6'],soulBook:undefined});
    stSyncProgress(false);
    check(d.skills.includes('necromancer_tier0')&&d.skills.includes('necromancer_6')&&d.mastery.necromancer_1===17,'old Necromancer gains Raise Dead without losing skills or mastery');
    check(stSoulBook().selected==='bone_thrall'&&stSoulBook().entries.bone_thrall.copies===1,'old save receives a usable starter binding');
    const b=encounter();const lines=roll(b,.349999);
    check(d.soulBook.entries.wolf.copies===1&&lines[0][1].includes('bound'),'ordinary soul binds below 35% threshold with receipt');
    roll(b,0);
    check(d.soulBook.entries.wolf.copies===1&&d.soulBook.entries.wolf.attempts===1,'same encounter cannot roll a second soul');
    roll(encounter(),.35);
    check(d.soulBook.entries.wolf.copies===1&&d.soulBook.entries.wolf.attempts===2&&!d.soulBook.last[0].bound,'35% boundary fails and preserves previous binding');
    roll(encounter('golem'),.07999);
    check(d.soulBook.entries.golem.copies===1&&d.soulBook.last[0].chance===.08,'boss soul uses 8% chance');
    roll(encounter('golem'),.08);
    check(d.soulBook.entries.golem.copies===1&&!d.soulBook.last[0].bound,'8% boss boundary fails');
    for(let i=0;i<6;i++)roll(encounter(),0);
    check(d.soulBook.entries.wolf.copies===7,'duplicate souls are retained instead of replacing or consuming entries');
    const attempts=d.soulBook.entries.wolf.attempts;
    roll(encounter('wolf',5),0);
    check(d.soulBook.entries.wolf.attempts===attempts,'living foes do not roll collection');
    d.cls='warlock';roll(encounter(),0);
    check(d.soulBook.entries.wolf.attempts===attempts,'Warlock cannot collect Necromancer souls');
    d.cls='necromancer';d.hr=true;roll(encounter(),0);
    check(d.soulBook.entries.wolf.attempts===attempts,'sealed Necromancer preserves book but cannot bind');
    d.hr=false;d.soulBook.selected='wolf';
    check(stSoulBook().selected==='wolf','valid selected bound soul survives migration');
    d.soulBook.selected='unmaker';
    check(stSoulBook().selected==='bone_thrall','unowned selection falls back to starter binding');
    d.soulBook.entries.bandit={copies:NaN,attempts:-3};stSoulBook();
    check(d.soulBook.entries.bandit.copies===0&&d.soulBook.entries.bandit.attempts===0,'malformed numeric collection data is normalized safely');
    const target={hp:1000,hex:3,id:0};
    d.cls='warlock';
    check(stHexPower(100,target,'mag')===120&&stHexPower(100,target,'phys')===100,'Hex amplifies Warlock magic by 20%, not physical damage');
    d.cls='mage';check(stHexPower(100,target,'mag')===100,'Hex does not buff another class');
    d.cls='warlock';target.hex=0;stAbilityEffects(ST_SKILLS.warlock_2,target,0,stStats());
    check(target.hex===3,'Binding Hex applies a real three-turn status');
    const tb={foes:[{...ST_FOES.wolf,key:'wolf',id:0,hp:10000,maxHp:10000}],summon:{key:'imp',name:'Test Imp',hp:50,maxHp:50,atk:15,def:2,turns:5,attacks:0,burn:true},buffs:{}};
    ST.battle=tb;stSoulSummonTurn(tb);
    check(tb.foes[0].hp<10000&&tb.foes[0].burn===2&&tb.summon.attacks===1,'imp independently damages and burns its enemy');
    const random=Math.random;Math.random=()=>0;try{stSoulIntercept(tb,{id:1,name:'Attacker',atk:10});}finally{Math.random=random;}
    check(tb.summon.hp<50,'enemy basic attacks can damage the summon');
    for(let i=0;i<5;i++)stSoulSummonTick(tb);
    check(tb.summon.hp===0&&tb.summon.turns===0,'summon expires after five allied turns');
    const hp=tb.foes[0].hp;stSoulSummonTurn(tb);
    check(tb.foes[0].hp===hp,'fallen or expired summon cannot attack');
    check(stSoulSkillLocked({bloodOffering:true},{bloodOffering:true},d),'Blood Offering is limited to once per battle');
    const stats=stStats();
    check(stSoulSkillLocked({bloodOffering:true},{},{hp:stats.hp,mp:stats.mp}),'Blood Offering cannot waste health at full mana');
    check(stSoulSkillLocked({bloodOffering:true},{},{hp:Math.ceil(stats.hp*.12),mp:0}),'Blood Offering cannot kill the caster');
    check(stSoulSkillLocked({summon:'undead'},{summon:{hp:1}},d),'a living summon locks additional summoning');
    check(!stSoulSkillLocked({summon:'undead'},{summon:{hp:0}},d),'a fallen summon allows a fresh cast');
    return results;
  }finally{
    for(const k of Object.keys(d))delete d[k];Object.assign(d,original);ST.battle=live;stSave();
  }
}

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
mkdirSync('test-results',{recursive:true});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace(
    "reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
    `window.__SOUL_QA={data:stData,state:ST,start:stStartBattle,finish:stEndBattle,cast:stUseSkill,sync:stSyncProgress,stats:stStats,book:stSoulBook,save:stSave,skills:ST_SKILLS,status:stStatus,stacks:stBuffStacks,mult:stBuffMultiplier,render:stRenderBattle,rules:${soulRuleChecks.toString()},collect:stSoulCollectVictory};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);`
  );
  await route.fulfill({response,body});
});
let checks=0;
const ok=(value,label)=>{assert(value,label);console.log('ok',++checks,label);};
const dismiss=async()=>{
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<70&&await page.locator('#stDialog').isVisible();i++){
    const buttons=page.locator('#stChoices button:visible'),texts=await buttons.allTextContents();
    let idx=texts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(idx<0)idx=texts.findIndex(t=>/skip|own way|not now|later/i.test(t));
    if(idx<0)idx=texts.length-1;
    if(idx<0)break;await buttons.nth(idx).click();
  }
};
const close=async()=>{if(await page.locator('#stMenu').isVisible())await page.keyboard.press('Escape');await dismiss();};
const battle=async(keys=['wolf','goblin'])=>{
  await close();await page.evaluate(keys=>{
    const q=__SOUL_QA,d=q.data();q.state.foes=[];q.state.safe=1000;
    d.hp=q.stats().hp;d.mp=q.stats().mp;d.wounds=null;
    q.start(keys);for(const f of q.state.battle.foes){f.hp=1000;f.maxHp=1000;f.atk=1;f.spd=0;}
  },keys);
  await page.waitForFunction(()=>__SOUL_QA.state.battle?.turn==='player');
};
const cast=async(name)=>{
  await page.locator('#stActions').getByRole('button',{name:/Skills/}).click();
  await page.locator('#stActions').getByRole('button',{name:new RegExp('^'+name+' ')}).click();
};
const nextTurn=()=>page.waitForFunction(()=>__SOUL_QA.state.battle?.turn==='player');
const end=async(result='fled')=>{
  await page.evaluate(result=>__SOUL_QA.finish(result),result);
  if(result==='fled')await page.waitForFunction(()=>!__SOUL_QA.state.battle);
  else {await page.waitForFunction(()=>__SOUL_QA.state.mode==='talk');await dismiss();}
};
const menu=async()=>{await close();await page.keyboard.press('Escape');};
try{
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill('Soul Keeper');
  await page.locator('#crClass').getByRole('button',{name:'Warlock',exact:true}).click();
  ok(await page.locator('#crSkills button').count()===4,'creator offers four exclusive Warlock starter choices');
  await page.locator('#crNext').click();
  ok((await page.locator('#crOutfit').innerText()).includes('Infernal velvet'),'Warlock has its own creator wardrobe');
  await page.locator('#crPrev').click();
  await page.locator('#crClass').getByRole('button',{name:'Necromancer',exact:true}).click();
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
  ok(await page.evaluate(()=>__SOUL_QA.data().skills.includes('necromancer_tier0')),'new Necromancer automatically learns Raise Dead at level 1');
  await battle();
  for(const result of await page.evaluate(()=>__SOUL_QA.rules()))ok(true,result);
  ok(await page.evaluate(()=>{const q=__SOUL_QA,d=q.data(),mp=d.mp;d.mp=0;q.cast('necromancer_tier0');const denied=!q.state.battle.summon&&d.mp===0&&q.state.battle.turn==='player';d.mp=mp;return denied;}),'Raise Dead rejects insufficient mana without consuming the turn');
  ok(await page.evaluate(()=>{const q=__SOUL_QA,d=q.data();d.skills.push('warlock_tier0');const mp=d.mp;q.cast('warlock_tier0');d.skills=d.skills.filter(id=>id!=='warlock_tier0');return d.mp===mp&&!q.state.battle.summon;}),'Necromancer cannot use an injected Warlock summon');
  await cast('Raise Dead');
  ok(await page.evaluate(()=>{const q=__SOUL_QA,mp=q.data().mp,summon=q.state.battle.summon;q.cast('necromancer_tier0');return q.data().mp===mp&&q.state.battle.summon===summon;}),'rapid repeated summon cast cannot spend mana twice');
  await nextTurn();
  ok(await page.evaluate(()=>{const q=__SOUL_QA,b=q.state.battle;return b.summon?.key==='bone_thrall'&&b.summon.attacks===1&&b.foes[0].hp<1000&&q.data().mp<q.stats().mp;}),'real Raise Dead cast spends mana and creates an attacking skeleton');
  ok((await page.locator('#stParty').innerText()).includes('Gravebound Skeleton'),'summon has a visible health/turn row');
  ok(await page.evaluate(()=>JSON.parse(render_game_to_text()).summon.key==='bone_thrall'),'text state reports visible summon');
  await page.locator('#stActions').getByRole('button',{name:/Skills/}).click();
  ok(await page.locator('#stActions').getByRole('button',{name:/^Raise Dead /}).isDisabled(),'Raise Dead button disables while summon is alive');
  await page.locator('#stActions').getByRole('button',{name:'Back',exact:true}).click();
  await page.screenshot({path:'test-results/necromancer-summon-desktop.png'});
  const before=await page.evaluate(()=>JSON.stringify(__SOUL_QA.data().soulBook));
  await end('fled');
  ok(await page.evaluate(()=>JSON.stringify(__SOUL_QA.data().soulBook))===before,'fleeing does not grant a captured soul');
  await battle();await end('lost');
  ok(await page.evaluate(()=>JSON.stringify(__SOUL_QA.data().soulBook))===before,'defeat does not grant or remove captured souls');
  await battle();
  await page.evaluate(()=>{__SOUL_QA.state.battle.foes[0].hp=0;});
  await cast('Raise Dead');await nextTurn();
  ok(await page.evaluate(()=>{const b=__SOUL_QA.state.battle;return b.summon.key==='wolf'&&b.summon.source==='fallen'&&b.foes[0].raised;}),'a fallen enemy actually rises as the matching allied creature');
  await end('fled');
  await battle();
  await page.evaluate(()=>{
    const q=__SOUL_QA,b=q.state.battle,random=Math.random;
    for(const f of b.foes)f.hp=0;
    Math.random=()=>.1;
    try{q.finish('won');q.finish('won');}finally{Math.random=random;}
  });
  await page.waitForFunction(()=>__SOUL_QA.state.mode==='talk');await dismiss();
  ok(await page.evaluate(()=>{const e=__SOUL_QA.data().soulBook.entries;return e.wolf.copies===1&&e.goblin.copies===1&&e.wolf.attempts===1;}),'actual victory binds each defeated enemy exactly once, including repeated finish call');
  await menu();await page.getByRole('button',{name:'Grimoire of the Fallen',exact:true}).click();
  ok((await page.locator('.soulBook').innerText()).includes('35%')&&(await page.locator('.soulBook').innerText()).includes('8%'),'grimoire explains ordinary and boss odds');
  await page.getByLabel('Soul filter',{exact:true}).selectOption('bound');
  ok(await page.locator('.soulCard').count()===3,'Bound filter shows starter and both captured enemies');
  await page.getByLabel('Search souls',{exact:true}).fill('Thornwolf');
  ok(await page.locator('.soulCard').count()===1,'search filters the collection by enemy name');
  await page.getByRole('button',{name:'Select soul',exact:true}).click();
  ok(await page.evaluate(()=>__SOUL_QA.data().soulBook.selected==='wolf'),'selecting a captured soul updates the saved summoning choice');
  await page.getByLabel('Search souls',{exact:true}).fill('no such soul');
  ok((await page.locator('.soulEmpty').innerText()).includes('No matching souls'),'collection has a useful empty-search state');
  await page.getByLabel('Search souls',{exact:true}).fill('');
  await page.screenshot({path:'test-results/grimoire-desktop.png'});
  await page.getByRole('button',{name:'Resume exploring',exact:true}).click();
  await battle();
  await cast('Raise Dead');await nextTurn();
  ok(await page.evaluate(()=>__SOUL_QA.state.battle.summon.key==='wolf'&&__SOUL_QA.state.battle.summon.source==='bound'),'selected captured soul can be raised in a later battle without a corpse');
  await end('fled');
  await menu();await page.getByRole('button',{name:'Save and quit',exact:true}).click();
  await page.reload();await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stContinue').click();await dismiss();
  ok(await page.evaluate(()=>{const b=__SOUL_QA.data().soulBook;return b.selected==='wolf'&&b.entries.wolf.copies===1&&b.entries.goblin.copies===1;}),'collection and selected soul survive save, quit and reload');
  await page.evaluate(()=>{
    const q=__SOUL_QA,d=q.data();Object.assign(d,{cls:'warlock',lv:10,hr:false,skills:['warlock_0','warlock_1','warlock_2','warlock_3','warlock_4'],mastery:{}});q.sync(false);
  });
  await battle();
  await cast('Call Imp');await nextTurn();
  ok(await page.evaluate(()=>{const b=__SOUL_QA.state.battle;return b.summon.key==='imp'&&!b.summon.undead&&b.summon.attacks===1&&b.foes[0].hp<1000;}),'Warlock Call Imp creates its own fighting demon rather than undead');
  await page.screenshot({path:'test-results/warlock-imp-desktop.png'});
  await end('fled');
  await battle(['wolf']);
  await page.evaluate(()=>{__SOUL_QA.skills.warlock_2.sure=true;});
  await cast('Binding Hex');await nextTurn();
  ok(await page.evaluate(()=>__SOUL_QA.state.battle.foes[0].hex===2),'real Hex cast applies and counts down its combat debuff');
  ok(await page.evaluate(()=>__SOUL_QA.status(__SOUL_QA.state.battle.foes[0]).some(s=>s.label==='Hex')),'Hex is included in the enemy status badges');
  await page.screenshot({path:'test-results/warlock-hex-desktop.png'});
  await page.evaluate(()=>{__SOUL_QA.skills.warlock_1.sure=true;});
  await cast('Hellfire');await nextTurn();
  ok(await page.evaluate(()=>__SOUL_QA.state.battle.foes[0].burn>0),'Warlock Hellfire applies actual burning damage over time');
  await page.evaluate(()=>{const q=__SOUL_QA;q.data().mp=0;});
  const resources=await page.evaluate(()=>({hp:__SOUL_QA.data().hp,mp:__SOUL_QA.data().mp,max:__SOUL_QA.stats()}));
  await cast('Blood Offering');
  ok(await page.evaluate(r=>{const d=__SOUL_QA.data();return d.hp===r.hp-Math.ceil(r.max.hp*.12)&&d.mp===Math.ceil(r.max.mp*.25);},resources),'Blood Offering trades the displayed health fraction for mana');
  await nextTurn();await page.locator('#stActions').getByRole('button',{name:/Skills/}).click();
  ok(await page.locator('#stActions').getByRole('button',{name:/^Blood Offering /}).isDisabled(),'Blood Offering cannot be recast in the same battle');
  await end('fled');
  await page.evaluate(()=>{const q=__SOUL_QA,d=q.data();d.cls='necromancer';d.lv=45;d.skills=['necromancer_0','necromancer_1','necromancer_2'];d.companions=['liora'];d.companion='liora';d.flags.liora=true;q.sync(false);});
  await battle();
  await cast('Raise Dead');await nextTurn();
  ok(await page.evaluate(()=>__SOUL_QA.state.battle.ally?.hp>0&&__SOUL_QA.state.battle.summon?.hp>0),'undead and a recruited companion coexist in the same battle');
  await end('fled');
  await page.evaluate(()=>{const q=__SOUL_QA,d=q.data();d.cls='warrior';d.skills=['warrior_0','warrior_1','warrior_2'];d.companion=null;q.sync(false);});
  await battle(['wolf']);
  for(let i=1;i<=3;i++){
    await cast('Iron Guard');await nextTurn();
    ok(await page.evaluate(i=>__SOUL_QA.stacks(__SOUL_QA.state.battle,'guard')===i,i),'real defense cast reaches stack '+i);
    await cast('Battle Cry');await nextTurn();
    ok(await page.evaluate(i=>__SOUL_QA.stacks(__SOUL_QA.state.battle,'rally')===i,i),'real attack cast reaches stack '+i);
  }
  ok(await page.evaluate(()=>{const q=__SOUL_QA,b=q.state.battle;return q.stacks(b,'rally')===3&&q.stacks(b,'guard')===3&&q.mult(b,'rally')===1.5&&q.mult(b,'guard')===1.8;}),'both buffs coexist at three stacks with capped +50% attack and +80% defense');
  ok((await page.locator('#stParty').innerText()).includes('ATK 3/3')&&(await page.locator('#stParty').innerText()).includes('DEF 3/3'),'combat status UI shows both three-stack counts');
  await page.screenshot({path:'test-results/buff-stacks-desktop.png'});
  await cast('Battle Cry');await nextTurn();
  ok(await page.evaluate(()=>{const q=__SOUL_QA,b=q.state.battle;return q.stacks(b,'rally')===3&&b.buffs.rally===3;}),'fourth real cast refreshes duration without adding power');
  for(let i=0;i<3;i++){await page.locator('#stActions').getByRole('button',{name:/Defend/}).click();await nextTurn();}
  ok(await page.evaluate(()=>{const q=__SOUL_QA,b=q.state.battle;return q.stacks(b,'rally')===0&&q.stacks(b,'guard')===0;}),'both real combat buffs expire after waiting out their timers');
  await end('fled');await battle(['wolf']);
  ok(await page.evaluate(()=>{const q=__SOUL_QA,b=q.state.battle;return q.stacks(b,'rally')===0&&q.stacks(b,'guard')===0;}),'fresh battle cannot retain previous attack or defense stacks');
  await end('fled');
  ok(errors.length===0,'no page runtime errors: '+errors.join('; '));
  console.log(checks+' soul/class checks passed');
}catch(error){
  console.log('Runtime errors:',errors);console.log('Game state:',await page.evaluate(()=>window.render_game_to_text?.()).catch(()=>null));
  await page.screenshot({path:'test-results/souls-failure.png'}).catch(()=>{});throw error;
}finally{await context.close();await browser.close();}
