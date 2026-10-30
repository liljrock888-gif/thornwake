import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const errors=[];mkdirSync('test-results',{recursive:true});
function checks(){
  const d=stData(),old=structuredClone(d),results=[],check=(v,s)=>{if(!v)throw Error(s);results.push(s);};
  try{
    const f=fwData();d.lv=1;d.gold=100000;d.hr=false;f.talents={};
    const walkFrames=Array.from({length:8},(_,i)=>fwAnimationFrame({walk:i*6+1,face:0},1));
    check(new Set(walkFrames.map(a=>a.frame)).size===8&&walkFrames.every(a=>a.mode==='walk'),'eight readable 2D walk frames');
    check(fwAnimationFrame({face:Math.PI},1).mirror===-1&&fwAnimationFrame({facing:-Math.PI/2},1).back,'2D facing mirrors left and shows back view upward');
    for(const kind of ['slash','cast','shoot'])check(fwAnimationFrame({poseTime:1,pose:{kind,at:.8,until:1.4,angle:Math.PI}},1).mode===kind,'2D action pose: '+kind);
    check(fwAnimationFrame({guard:true},1).mode==='guard'&&fwAnimationFrame({dodge:true},1).mode==='dodge'&&fwAnimationFrame({hitFlash:1},1).mode==='hit','2D guard, dodge and hit states');
    const art=document.createElement('canvas');art.width=80;art.height=100;const ag=art.getContext('2d');fwChibi(ag,{x:40,y:80,id:'online-peer-id',look:'knight',color:'#96ae98'},1,1);
    check(ag.getImageData(20,20,40,70).data.some((v,i)=>i%4===3&&v>0),'online string-ID characters render at their actual position');
    ST.mode='walk';const socialStats=JSON.stringify([d.gold,d.xp,d.hp,d.mp]);
    for(const E of FW_EMOTES){check(fwEmoteStart(E.id)&&ST.emote.id===E.id,'cosmetic emote starts: '+E.id);check(fwAnimationFrame({emote:{id:E.id,elapsed:1}},1).mode===E.id,'2D social pose: '+E.id);}
    check(JSON.stringify([d.gold,d.xp,d.hp,d.mp])===socialStats,'emotes grant no healing, XP, gold or mana');
    check(fwRemoteEmote({id:'dance',stamp:Date.now()})?.id==='dance'&&!fwRemoteEmote({id:'unknown',stamp:Date.now()})&&!fwRemoteEmote({id:'wave',stamp:0}),'online emotes validate IDs and expiry');
    d.riding=true;check(!fwEmoteStart('dance'),'mounted dancing is refused');d.riding=false;ST.battle={};check(!fwEmoteStart('dance'),'combat dancing is refused');ST.battle=null;fwEmoteStop();
    check(fwTalentBudget()===1&&fwTalentBuy('force'),'one initial talent point is usable');
    check(!fwTalentBuy('force')&&fwTalentSpent()===1,'low-level talent overspend rejected');
    d.lv=60;f.talents={};const before=stStats();for(let i=0;i<3;i++)check(fwTalentBuy('force'),'train attack rank '+(i+1));
    const after=stStats();check(after.atk>before.atk&&after.mag<=before.mag,'attack talent improves actual attack with magic tradeoff');
    check(!fwTalentBuy('force'),'fourth rank rejected');
    for(const id of ['focus','bastion','fleet'])for(let i=0;i<3;i++)fwTalentBuy(id);
    check(fwTalentSpent()===12&&!fwTalentBuy('vitality'),'twelve-point total cap enforced');
    const gold=d.gold;check(fwTalentRespec()&&fwTalentSpent()===0&&d.gold===gold-700,'earned-gold reset refunds talent allocation, not its cost');
    ST.battle={over:false};check(!fwTalentBuy('focus')&&!fwTalentRespec(),'talent edits blocked during combat');ST.battle=null;
    d.properties=d.properties||{};d.properties.willowhome={storedGold:123};d.map='willowhome';d.x=7*64+32;d.y=8*64+32;ST.mode='walk';
    const p=fwHomeRecord('willowhome');
    check(fwFurnitureBuy('willowhome','rug')&&p.furniture.rug===1,'buy furniture for an owned deed');
    check(!fwFurnitureBuy('harborhome','rug'),'unowned-home furniture purchase rejected');
    check(fwFurniturePlace('rug')&&p.placed.length===1&&p.furniture.rug===0,'place actual room furnishing at feet');
    check(!fwFurniturePlace('rug'),'unowned/used furnishing cannot be duplicated');
    check(fwFurnitureRemove(0)&&p.placed.length===0&&p.furniture.rug===1,'picking up returns the furniture');
    f.loot=[{id:'qa_storage',name:'Keepsake Blade',slot:'weapon',family:'weapon',stats:{atk:3},level:1,rarity:'Common'}];f.worn={weapon:'qa_storage'};
    check(!fwHomeStore('willowhome','qa_storage'),'equipped equipment cannot enter storage');
    f.worn={};check(fwHomeStore('willowhome','qa_storage')&&f.loot.length===0&&p.storedItems.length===1,'storage moves equipment without copying');
    check(!fwHomeStore('willowhome','qa_storage'),'repeat deposit cannot duplicate');
    check(fwHomeStore('willowhome','qa_storage',true)&&f.loot.length===1&&p.storedItems.length===0,'withdrawal restores original item');
    d.items.potion=3;check(fwHomeSupply('willowhome','potion')&&d.items.potion===2&&p.supplies.potion===1,'deposit an actual consumable');
    check(fwHomeSupply('willowhome','potion',true)&&d.items.potion===3&&p.supplies.potion===0,'withdraw actual consumable without duplication');
    check(p.storedGold===123,'existing stored gold is preserved');
    d.map='world';check(!fwHomeStore('willowhome','qa_storage'),'remote storage access rejected');
    d.map='willowhome';d.homeWardReturn='willowhome';stEnterMap('world',1,1);check(d.map==='hearthward','district-entered home exits back into neighborhood');
    d.map='world';stEnterMap('willowhome',7,8);check(!d.homeWardReturn,'original world entrance keeps original world return');
    ST.mode='walk';$('stLoad').hidden=true;$('stDialog').hidden=true;ST.dlg=null;
    d.lv=60;d.gold=100000;f.shards=100;f.learned=[];f.equipped=[];
    check(!fwFuse('fusion_steamveil'),'fusion needs learned ingredients');
    for(const S of Object.values(FW_FUSIONS)){
      f.learned.push(S.a);if(!S.b.startsWith('class:'))f.learned.push(S.b);
      else{const entry=Object.entries(ST_SKILLS).find(([id,k])=>k.owner&&k.base===S.b.slice(6));d.cls=entry[1].owner;d.skills=[entry[0]];}
      check(fwFusionReady(S)&&fwFuse(S.id),'forge valid magic/ability recipe: '+S.name);
      const paid=d.gold;check(!fwFuse(S.id)&&d.gold===paid,'repeat forge cannot charge again: '+S.name);
      check(fwData().learned.includes(S.id),'fusion survives save normalization: '+S.name);
    }
    d.cls='mage';d.skills=['mage_0'];d.map='lumenreach';d.x=1100;d.y=1056;ST.mode='walk';$('stLoad').hidden=true;
    stStartBattle(['wolf','goblin'],null,'=');const b=ST.battle;
    for(const S of Object.values(FW_FUSIONS)){
      d.x=1100;d.y=1056;d.mp=stStats().mp;d.hp=stStats().hp*.5;f.equipped=[S.id];RT.cd={};RT.global=0;RT.barrier=0;RT.hazards=[];RT.traps=[];RT.phase=RT.time+100;
      b.foes.forEach((foe,i)=>Object.assign(foe,{hp:100000,maxHp:100000,x:d.x+65+i*20,y:d.y,next:Infinity,windup:null,root:Infinity}));
      check(rtArchive(S.id),'cast fusion: '+S.name);for(let i=0;i<100;i++){rtUpdate(.06);stFxDraw(.06);}
      check(S.form==='ward'?RT.barrier>0:b.foes.some(foe=>foe.hp<100000),'fusion has actual combat effect: '+S.name);
      RT.global=0;d.mp=0;check(!rtArchive(S.id),'fusion mana gate: '+S.name);
    }
    ST.battle=null;ST.mode='walk';f.equipped=Object.keys(FW_FUSIONS).slice(0,5);check(fwData().equipped.length===4,'fusions share the four archive slots');
    const l=pvCleanLoadout({hp:100000,atk:100000,speed:100000,delay:0,siphon:1});
    check(l.hp===336&&l.atk===41&&l.speed===186&&l.delay===.62&&l.siphon===.03,'remote duel loadouts are bounded');
    const player=(id,x)=>({...pvCleanLoadout({name:id,ranged:false,hp:300,atk:30,mag:30,mp:100}),id,x,y:220,maxHp:300,maxMp:100,attackAt:0,spellAt:0,guardAt:0,dashAt:0,guardUntil:0,slowUntil:0,burnUntil:0,markUntil:0});
    const match={t:0,players:[player('one',330),player('two',380)],shots:[],over:null},storyHP=d.hp,goldBefore=d.gold;
    pvStep(match,[{attack:true},{}],.05);check(match.players[1].hp<300,'PvP melee hits the other actual player state');
    const hp=match.players[1].hp;pvStep(match,[{attack:true},{}],.05);check(match.players[1].hp===hp,'PvP attack cooldown prevents click spam');
    match.players[0].attackAt=0;match.players[1].guardUntil=10;pvStep(match,[{attack:true},{}],.05);check(hp-match.players[1].hp<300-hp,'PvP guard reduces real damage');
    const x=match.players[1].x;pvStep(match,[{},{right:true,dash:true}],.05);check(match.players[1].x>x+90,'PvP movement and dash are simulated');
    match.players[1].hp=0;pvStep(match,[{},{}],.05);check(!!match.over,'PvP knockout ends the round');
    check(d.hp===storyHP&&d.gold===goldBefore,'duel simulation never damages Story health or economy');
    check(!pvChallenge({peer:'absent',presence:{sw:{m:'world'}}}),'non-zone/unconnected challenge is refused');
    check(!pvValidState({t:0,players:[],shots:[]})&&!pvValidState({t:NaN,players:match.players,shots:[]}), 'malformed remote match snapshots rejected');
    f.familiars=[];f.familiar=null;d.lv=1;d.gold=1000;
    check(fwFamiliarAdopt('fox')&&f.familiar==='fox'&&d.gold===1000,'free fox requires explicit adoption');
    check(!fwFamiliarAdopt('fox')&&!fwFamiliarAdopt('drake'),'duplicate and low-level familiar adoptions refused');
    d.lv=12;check(fwFamiliarAdopt('frog')&&d.gold===760,'higher-level familiar charges earned gold once');
    check(fwFamiliarSelect('frog')&&f.familiar==='frog'&&!fwFamiliarSelect('drake'),'one owned active familiar');
    d.map='lumenreach';d.x=1100;d.y=1056;d.hp=stStats().hp;d.mp=stStats().mp;
    stStartBattle(['wolf'],null,'=');
    check(ST.battle.familiar?.id==='frog'&&ST.battle.familiar.hp>0,'active familiar joins real-time encounter');
    check(!fwFamiliarSelect('fox')&&!fwFamiliarAdopt('owl'),'familiar swap and purchase blocked in combat');
    const foe=ST.battle.foes[0];foe.hp=foe.maxHp=100000;const foeHp=foe.hp;d.mp=0;
    fwFamiliarTurn(ST.battle);check(foe.hp<foeHp&&d.mp>0&&d.mp<=2,'frog has bounded real damage and mana support');
    ST.battle.familiar.hp=0;const down=foe.hp;fwFamiliarTurn(ST.battle);check(foe.hp===down,'knocked-out familiar stops support');
    ST.battle=null;ST.mode='walk';f.job=null;f.service=false;f.jobCooldowns={};f.ballots={};f.cases=[];
    d.lv=1;d.crime=0;d.map='lumenreach';
    check(!fwJobAccept('lumenreach','warden')&&fwJobAccept('lumenreach','courier'),'job access respects level');
    check(!fwJobAccept('lumenreach','archivist')&&!fwJobClaim(),'cannot stack shifts or claim incomplete work');
    d.map='clinic_lumenreach';stTalk('civic_lumenreach_nurse');check(f.job.progress.includes('parcel'),'actual nurse interaction completes delivery');
    check(!fwJobClaim(),'completed delivery cannot be claimed remotely');
    d.map='lumenreach';const registrar=ST_NPCS.find(n=>n.id==='civic_lumenreach_registrar');d.x=registrar.x*64+32;d.y=registrar.y*64+30;
    const wages=d.gold;d.xp=stXpNeed(d.lv)-1;
    check(fwJobClaim()&&d.gold>wages&&d.lv===2&&!f.job,'registrar pays completed shift and handles a real level-up');
    check(!fwJobClaim()&&!fwJobAccept('lumenreach','courier'),'repeated payment and cooldown bypass refused');
    check(fwCivicVote('lumenreach','trade')&&!fwCivicVote('lumenreach','watch'),'one saved local ballot per day');
    const civilian=ST_NPCS.find(n=>n.id==='civilian_lumenreach_0');d.x=civilian.x*64+32;d.y=civilian.y*64+30;
    const pockets=d.gold;check(fwCrimeAction('theft',civilian.id)&&d.gold===pockets+15&&d.crime>=40,'theft gives bounded coin and records a larger bounty');
    check(!fwCrimeAction('theft',civilian.id)&&f.cases.some(c=>c.charge==='theft'),'repeat pocket farming refused and court charge recorded');
    check(civilian._panicUntil>rtTownTime&&civilian._recoilUntil>rtTownTime,'victim has fleeing and recoil animation state');
    const hearing=fwJusticeHearing();check(hearing&&hearing.die>=1&&hearing.die<=20&&fwJusticeHearing()===null,'one actual d20 court hearing per charge set');
    d.gold=10000;check(fwJusticePay()&&!d.crime&&f.cases.every(c=>c.status==='fine paid'),'paying settlement closes charges');
    const killXp=d.xp,killGold=d.gold;check(fwCrimeAction('murder',civilian.id),'optional adult civilian can be permanently slain');
    check(!stNpcShown(civilian,d)&&d.xp===killXp&&d.gold===killGold&&f.civilianDeaths[civilian.id],'civilian death persists and grants no loot, gold or XP');
    const essential=ST_NPCS.find(n=>n.id==='civic_lumenreach_politician');d.x=essential.x*64+32;d.y=essential.y*64+30;
    check(!fwCrimeAction('murder',essential.id),'essential government/story NPC is protected from murder');
    d.crime=0;CR.nextGuard=Infinity;d.lv=60;d.guild=null;
    for(const H of FW_STRONGHOLDS){
      check(!fwHoldAccess(H),'nonmember stronghold gate: '+H.id);d.guild={rank:'D',pts:0,quests:[],done:[]};
      d.lv=H.level-1;check(!fwHoldAccess(H),'actual level gate: '+H.id);
      d.lv=H.level;d.guild.rank=H.rank;check(fwHoldAccess(H),'earned level and rank grant access: '+H.id);
      stEnterMap(H.id,11,15);check(d.map===H.id&&ST_NPCS.filter(n=>n.hold===H.id).length===4,'walkable staffed stronghold: '+H.id);
      stEnterMap('world',1,1);check(d.map===H.city,'stronghold exits back into its own city: '+H.id);
      d.guild=null;
    }
    d.lv=10;d.guild={rank:'D',pts:0,quests:[],done:[]};f.holdClears={};d.hp=stStats().hp;d.mp=stStats().mp;
    stEnterMap('watchhold',11,15);check(fwHoldChallenge('watchhold'),'eligible hero starts actual guardian trial');
    ST.battle.foes.forEach(x=>x.hp=0);const trialGold=d.gold;stEndBattle('won');
    check(f.holdClears.watchhold&&d.gold>=trialGold+250&&d.guild.pts===20,'first guardian clear awards bounded bonus and standing');
    const paidTrial=d.gold;stEndBattle('won');check(d.gold===paidTrial&&!fwHoldChallenge('watchhold'),'repeat guardian bonus cannot be farmed');
  }finally{
    for(const k of Object.keys(d))delete d[k];Object.assign(d,old);ST.battle=null;ST.mode='walk';ST.dlg=null;ST.foes=[];$('stDialog').hidden=true;$('stMenu').hidden=true;RT.hazards=[];RT.traps=[];RT.pulses=[];RT.cd={};RT.global=0;
    stEnterMap(d.map,Math.floor(d.x/64),Math.floor(d.y/64));stSave();
  }return results;
}
async function instrument(page,unit=false){
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  await page.route('**/*',async route=>{
    if(route.request().resourceType()!=='document')return route.continue();
    const response=await route.fetch(),body=(await response.text()).replace("reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
      `window.__ADV=(${checks.toString()});window.__QA={draw:fwChibi,emote:fwEmoteStart,d:stData,s:ST,f:fwData,enter:stEnterMap,stats:stStats,save:stSave,start:stStartBattle,rt:RT,pv:SDUEL,sw:SW,home:fwHomeRecord,furniture:fwFurnitureMenu,fusion:fwFusionMenu,build:fwBuildMenu,holds:fwProgressionMenu,hold:fwHoldDesk,familiars:fwFamiliarMenu,jobs:fwJobsMenu,talk:stTalk};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);`);
    await route.fulfill({response,body});
  });
}
async function dismiss(page){
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<70&&await page.locator('#stDialog').isVisible();i++){
    const bs=page.locator('#stChoices button:visible'),ts=await bs.allTextContents();let n=ts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));if(n<0)n=ts.findIndex(t=>/skip|own way|later|not now/i.test(t));if(n<0)n=ts.length-1;if(n<0)break;await bs.nth(n).click();
  }
}
async function create(page,name){
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill(name);
  await page.locator('#crNext').click();await page.locator('#crNext').click();for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();await page.locator('#crStart').click();await dismiss(page);
}
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
try{
  await instrument(page);await create(page,'Build Keeper');const results=await page.evaluate(()=>__ADV());for(const s of results)console.log('ok',s);
  await page.evaluate(()=>{
    const c=document.createElement('canvas');c.id='qaAnimationSheet';c.width=1200;c.height=620;c.style='position:fixed;inset:0;z-index:999999;width:1200px;height:620px';document.body.appendChild(c);const g=c.getContext('2d');
    g.fillStyle='#182820';g.fillRect(0,0,1200,620);
    const poses=[...Array.from({length:8},(_,i)=>({label:'Walk '+(i+1),walk:i*6+1})),
      ...['slash','slash','cast','shoot','guard','dodge','hit','back'].map((kind,i)=>({label:['Slash right','Slash left','Cast','Bow','Guard','Dodge','Hit','Walk north'][i],kind,angle:i===1?Math.PI:0})),
      ...['dance','spin','wave','bow','cheer','clap','sit','nod'].map(kind=>({label:kind,emote:{id:kind,elapsed:.8}}))];
    for(const [i,p]of poses.entries()){const x=75+(i%8)*150,y=160+Math.floor(i/8)*200,u={x,y,id:1,look:p.kind==='cast'?'mage':p.kind==='shoot'?'hunter':'knight',color:'#9ab8a5',walk:p.walk||0,poseTime:1,face:0,emote:p.emote};
      if(['slash','cast','shoot'].includes(p.kind))u.pose={kind:p.kind,at:.8,until:1.4,angle:p.angle};if(p.kind==='guard')u.guard=true;if(p.kind==='dodge')u.dodge=true;if(p.kind==='hit')u.hitFlash=1;if(p.kind==='back'){u.facing=-Math.PI/2;u.walk=15;}
      __QA.draw(g,u,1,2);g.fillStyle='#ead7a8';g.font='14px sans-serif';g.textAlign='center';g.fillText(p.label,x,y+25);}
  });
  await page.locator('#qaAnimationSheet').screenshot({path:'test-results/story-2d-animation-sheet.png'});await page.locator('#qaAnimationSheet').evaluate(e=>e.remove());
  await dismiss(page);await page.evaluate(()=>{const q=__QA,d=q.d();d.lv=25;d.gold=10000;d.properties={...(d.properties||{}),willowhome:{storedGold:125}};q.enter('hearthward',13,19);});await dismiss(page);
  await page.screenshot({path:'test-results/hearthward-desktop.png'});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Buildcraft · talents & synergies',exact:true}).click();await page.getByRole('button',{name:'Train · 1 point',exact:true}).first().click();
  assert.match(await page.locator('#stMenu').innerText(),/Blade Discipline 1/);await page.screenshot({path:'test-results/buildcraft-desktop.png'});
  await page.getByRole('button',{name:'Back to Story menu',exact:true}).click();await page.getByRole('button',{name:'Confluence · combine spells & abilities',exact:true}).click();assert.equal(await page.locator('#stMenu .fwCard').count(),12);await page.screenshot({path:'test-results/confluence-desktop.png'});
  await page.getByRole('button',{name:'Resume exploring',exact:true}).click();
  await page.evaluate(()=>__QA.enter('willowhome',7,8));await dismiss(page);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Hearthward · homes, furniture & storage',exact:true}).click();await page.getByRole('button',{name:'Juniper’s furniture shop',exact:true}).click();
  await page.getByLabel('Furnish a home').selectOption('willowhome');await page.getByRole('button',{name:'Buy Mossweave Rug',exact:true}).click();
  await page.locator('.fwCard').filter({has:page.getByRole('heading',{name:'Mossweave Rug',exact:true})}).getByRole('button',{name:'Place at my feet',exact:true}).click();
  assert.equal(await page.evaluate(()=>__QA.home('willowhome').placed.length),1);
  await page.getByRole('button',{name:'Resume exploring',exact:true}).click();await page.screenshot({path:'test-results/furnished-home-desktop.png'});
  await page.evaluate(()=>__QA.save());await page.reload();await page.locator('#startBtn').click();await page.locator('#m-story').click();await page.locator('#stContinue').click();await dismiss(page);
  assert.equal(await page.evaluate(()=>__QA.home('willowhome').placed.length),1);assert.equal(await page.evaluate(()=>__QA.f().talents.force),1);console.log('Desktop talent, workshop, furniture and persisted hero flows passed');
  await context.close();
  const mobile=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true}),mp=await mobile.newPage();await instrument(mp);await create(mp,'Touch Wanderer');
  await mp.evaluate(()=>{const q=__QA,d=q.d();d.gold=10000;d.lv=25;d.properties={willowhome:{storedGold:0}};q.enter('hearthward',13,19);});await dismiss(mp);
  await mp.screenshot({path:'test-results/hearthward-phone.png'});await mp.locator('#stMenuBtn').tap();await mp.getByRole('button',{name:'Emotes · dance & gestures',exact:true}).tap();await mp.screenshot({path:'test-results/emotes-phone.png'});
  await mp.getByRole('button',{name:'Lantern Dance · 12s',exact:true}).tap();assert.equal(await mp.evaluate(()=>__QA.s.emote.id),'dance');await mp.screenshot({path:'test-results/dance-phone-a.png'});await mp.waitForTimeout(350);await mp.screenshot({path:'test-results/dance-phone-b.png'});
  await mp.locator('#stMenuBtn').tap();await mp.getByRole('button',{name:'Emotes · dance & gestures',exact:true}).tap();await mp.getByRole('button',{name:'Stop current emote',exact:true}).tap();assert.equal(await mp.evaluate(()=>__QA.s.emote),null);
  await mp.locator('#stMenuBtn').tap();await mp.getByRole('button',{name:'Buildcraft · talents & synergies',exact:true}).tap();await mp.getByRole('button',{name:'Train · 1 point',exact:true}).first().tap();await mp.screenshot({path:'test-results/buildcraft-phone.png'});
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mp.getByRole('button',{name:'Back to Story menu',exact:true}).tap();await mp.getByRole('button',{name:'Confluence · combine spells & abilities',exact:true}).tap();await mp.screenshot({path:'test-results/confluence-phone.png'});
  await mp.getByRole('button',{name:'Back to Story menu',exact:true}).tap();await mp.getByRole('button',{name:'Familiars · little animal companions',exact:true}).tap();
  await mp.getByRole('button',{name:'Adopt Ember Fox',exact:true}).tap();assert.equal(await mp.evaluate(()=>__QA.f().familiar),'fox');await mp.screenshot({path:'test-results/familiars-phone.png'});
  await mp.getByRole('button',{name:'Back to Story menu',exact:true}).tap();await mp.getByRole('button',{name:'Progression · levels & guild strongholds',exact:true}).tap();await mp.screenshot({path:'test-results/strongholds-locked-phone.png'});
  await mp.getByRole('button',{name:'Inspect Lantern Watchhold',exact:true}).tap();assert.equal(await mp.getByRole('button',{name:'Enter Lantern Watchhold',exact:true}).isDisabled(),true);
  await mp.evaluate(()=>{__QA.d().guild={rank:'D',pts:0,quests:[],done:[]};__QA.hold('watchhold');});
  await mp.getByRole('button',{name:'Enter Lantern Watchhold',exact:true}).tap();await dismiss(mp);assert.equal(await mp.evaluate(()=>__QA.d().map),'watchhold');await mp.screenshot({path:'test-results/stronghold-interior-phone.png'});
  await mp.locator('#stMenuBtn').tap();await mp.getByRole('button',{name:'Jobs · civilian employment',exact:true}).tap();await mp.getByRole('button',{name:'Take Ward Courier shift',exact:true}).tap();
  await mp.screenshot({path:'test-results/jobs-phone.png'});await mp.getByRole('button',{name:'Resume exploring',exact:true}).tap();
  await mp.evaluate(()=>{const q=__QA,d=q.d();q.enter('clinic_lumenreach',7,5);d.hp=1;d.mp=0;q.talk('civic_lumenreach_nurse');});await mp.locator('#stLoad').waitFor({state:'hidden'});
  while(await mp.getByRole('button',{name:'Next',exact:true}).isVisible())await mp.getByRole('button',{name:'Next',exact:true}).tap();
  await mp.screenshot({path:'test-results/nurse-phone.png'});await mp.getByRole('button',{name:'Receive free nursing care',exact:true}).tap();assert.equal(await mp.evaluate(()=>__QA.d().hp),await mp.evaluate(()=>__QA.stats().hp));
  await dismiss(mp);await mp.evaluate(()=>{const q=__QA,d=q.d();q.enter('lumenreach',24,16);q.jobs('lumenreach');});await mp.locator('#stLoad').waitFor({state:'hidden'});
  await mp.getByRole('button',{name:'Claim completed shift',exact:true}).tap();assert.equal(await mp.evaluate(()=>__QA.f().job),null);
  await mp.getByRole('button',{name:'Resume exploring',exact:true}).tap();
  await mp.evaluate(()=>{const q=__QA;q.enter('lumenreach',9,18);q.talk('civilian_lumenreach_0');});await mp.locator('#stLoad').waitFor({state:'hidden'});
  await mp.getByRole('button',{name:'Hostile actions · crime',exact:true}).tap();await mp.screenshot({path:'test-results/crime-phone.png'});
  await mp.getByRole('button',{name:'Attempt murder · permanent consequence',exact:true}).tap();await mp.screenshot({path:'test-results/crime-confirm-phone.png'});
  await mp.getByRole('button',{name:'Lower my weapon',exact:true}).tap();assert.equal(await mp.evaluate(()=>Object.keys(__QA.f().civilianDeaths).length),0);
  await mp.evaluate(()=>{const q=__QA,d=q.d();q.enter('lumenreach',18,16);d.hp=q.stats().hp;d.mp=q.stats().mp;});await dismiss(mp);
  await mp.evaluate(()=>{__QA.s.keys={};});await mp.locator('#stMenuBtn').tap();await mp.getByRole('button',{name:'Justice · courts & wanted level',exact:true}).tap();await mp.screenshot({path:'test-results/justice-phone.png'});
  await mp.getByRole('button',{name:'Resume exploring',exact:true}).tap();
  await mp.evaluate(()=>{const q=__QA,d=q.d();q.start(['wolf'],null,'=');for(const foe of q.s.battle.foes)Object.assign(foe,{hp:1000000,maxHp:1000000,next:Infinity,root:Infinity,x:d.x+55,y:d.y});});
  await mp.locator('#rtBar').waitFor({state:'visible'});
  const touch=await mobile.newCDPSession(mp);
  for(const [axis,sign,dx,dy]of [['x',1,55,0],['x',-1,-55,0],['y',-1,0,-55],['y',1,0,55]]){
    const before=await mp.evaluate(a=>__QA.d()[a],axis);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:530}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:70+dx,y:530+dy}]});
    await mp.waitForFunction(({a,s,b})=>(__QA.d()[a]-b)*s>5,{a:axis,s:sign,b:before});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await mp.evaluate(()=>{const d=__QA.d(),foe=__QA.s.battle.foes[0];foe.x=d.x+50;foe.y=d.y;__QA.rt.attackAt=0;__QA.rt.global=0;});
  const hpBefore=await mp.evaluate(()=>__QA.s.battle.foes[0].hp);
  await mp.getByRole('button',{name:/^Attack \[Space\]/}).tap();await mp.waitForFunction(hp=>__QA.s.battle.foes[0].hp<hp,hpBefore);
  await mp.screenshot({path:'test-results/realtime-combat-phone.png'});
  assert.equal(await mp.evaluate(()=>__QA.s.touchMove),null);
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await mobile.close();console.log(`${results.length} advanced rules plus desktop/native-touch flows passed`);
  assert.deepEqual(errors,[]);
}catch(e){if(!page.isClosed())await page.screenshot({path:'test-results/advanced-failure.png'});console.error('Runtime errors',errors);throw e;}
finally{await browser.close();}
