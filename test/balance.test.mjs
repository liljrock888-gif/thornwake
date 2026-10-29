import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// This function is injected only into the disposable test response, never shipped.
function runBalanceChecks(){
  const results=[],check=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  const original=structuredClone(stData()),d=stData();
  Object.assign(d,{race:'human',raceStage:0,attr:{},gear:{},traits:[],bonds:{},spouse:null,family:null,hr:false,pact:false,were:false,vamp:false,guild:null,weapon:0,items:{},align:0,silver:false,blessed:false,hollowPower:false,signet:false,charm:false,seraphBless:false});
  const baseline=()=>({turn:'player',buffs:{},foes:[{id:'f0',name:'Test foe',hp:10000,maxHp:10000,atk:1,def:0,spd:0}],log:'',rage:0});
  const matrix=[];
  for(const lv of [1,10,25,45,60]){
    const rows={};
    for(const [cls,T]of Object.entries(ST_CLASS_TUNING)){
      Object.assign(d,{cls,lv,mastery:{},skills:[cls+'_0']});
      const s=stStats(),b=baseline(),S=ST_SKILLS[cls+'_0'];
      check(s.hp===Math.round(T.base.hp+T.growth.hp*(lv-1))&&s.mp===Math.round(T.base.mp+T.growth.mp*(lv-1)),`${cls} level ${lv}: health and mana growth`);
      check(Math.abs(s.mag-(T.base.mag+T.growth.mag*(lv-1)))<1e-8&&Math.abs(s.def-(T.base.def+T.growth.def*(lv-1)))<1e-8,`${cls} level ${lv}: magic and armor growth`);
      const casts=Math.floor(s.mp/stSkCost(S)),power=stAbilityPower(S,s,b,0)*(S.twice?1.7:1);
      check(casts>=3&&casts<=25&&power>0&&power<s.hp*2,`${cls} level ${lv}: starter damage/mana regression envelope`);
      check(Object.entries(ST_SKILLS).filter(([,A])=>A.owner===cls).every(([id,A])=>stOwnsSkill(d,id)===(lv>=A.level)),`${cls} level ${lv}: class level gates`);
      rows[cls]={hp:s.hp,mp:s.mp,atk:s.atk,mag:s.mag,def:s.def,casts,power};
    }
    check(rows.berserker.atk>rows.warrior.atk&&rows.warrior.def>rows.berserker.def&&rows.mage.mag>rows.druid.mag&&rows.mage.hp<rows.warrior.hp,`level ${lv}: specialist tradeoffs`);
    matrix.push({lv,classes:rows});
  }
  check(ST_PROPERTIES.map(P=>P.price).sort((a,b)=>a-b).join(',')==='250,600,900,1800,4800,10000','six-property price ladder');
  check(30+40+160-50+60+ST_FOES.bandit.gold>=250&&4210<4800,'starter quest/contract/chest plus one bandit reaches cottage; guild alone does not buy estate');
  Object.assign(d,{cls:'monk',lv:25});
  for(const id of ['monk_3','monk_6']){
    const S=ST_SKILLS[id],b=baseline(),s=stStats(),p=stAbilityPower(S,s,b,0);
    check(stAbilityPower(S,{...s,atk:s.atk*2},b,0)===p*2&&stAbilityPower(S,{...s,mag:s.mag*2},b,0)===p,id+' scales with attack, not magic');
  }
  check(ST_SKILLS.druid_2.kind==='mag','Rootquake uses magic');
  d.hp=20;d.mp=2;stSyncProgress(false);check(d.hp===20&&d.mp===2,'save normalization does not give free healing');
  d.hp=99999;d.mp=99999;stSyncProgress(false);check(d.hp===stStats().hp&&d.mp===stStats().mp,'older health/mana clamped to new maxima');
  const visual=[stShot,stEffect,stAnim,stBurst,stNum,stCallout,stRenderBattle,stLog,stGore,stWound,stRageAdd,Math.random,window.setTimeout];
  let shots=[],timers=[];
  try{
    stShot=(a,b,c,e,fn)=>shots.push(fn);
    stEffect=stAnim=stBurst=stNum=stCallout=stRenderBattle=stLog=stGore=stWound=stRageAdd=()=>{};
    Math.random=()=>.5;window.setTimeout=(fn,ms)=>{timers.push({fn,ms});return 0;};
    const setup=(cls,id,count=1)=>{
      Object.assign(d,{cls,lv:60,mastery:{},skills:[id],hp:10,mp:9999});
      ST.battle=baseline();if(count===2)ST.battle.foes.push({...ST.battle.foes[0],id:'f1'});
      ST.curSkill=null;shots=[];timers=[];
    };
    const flushShots=()=>{while(shots.length)shots.shift()();};
    const flushLand=()=>{const t=timers.find(x=>x.ms===160);if(t)t.fn();flushShots();};
    for(const [cls,id,effect]of [['mage','cindertempest','burn'],['rogue','rogue_6','poison'],['mage','mage_5','frozen']]){
      setup(cls,id,2);if(effect==='frozen')Math.random=()=>.2;else Math.random=()=>.5;
      stUseSkill(id);flushShots();
      check(ST.battle.foes.every(f=>f[effect]>0),id+' applies '+effect+' to both actual area hits');
    }
    setup('necromancer','necromancer_6',2);Math.random=()=>.5;
    ST.battle.foes.forEach(f=>f.hp=2);stUseSkill('necromancer_6');flushShots();
    check(d.hp===12,'area drain heals only actual damage, including lethal hits');
    setup('necromancer','necromancer_1');ST.battle.foes[0].hp=2;stUseSkill('necromancer_1');flushLand();
    check(d.hp===11,'single-target drain cannot heal from overkill');
    setup('rogue','rogue_6',2);Math.random=()=>0;stUseSkill('rogue_6');flushShots();
    check(ST.battle.foes.every(f=>!f.poison&&f.hp===10000),'dodged area attacks cannot apply poison');
    Math.random=()=>.5;
    setup('blademaster','blademaster_0');
    const guarded=ST.battle.foes[0];guarded.def=40;guarded.guard=true;
    const followPower=stAbilityPower(ST_SKILLS.blademaster_0,stStats(),ST.battle,0)*.7;
    stUseSkill('blademaster_0');flushLand();const first=guarded.hp;timers.find(t=>t.ms===140).fn();
    check(first-guarded.hp===Math.round(stDmg(followPower,guarded.def)/2),'follow-up strike respects enemy guard');
    for(const [cls,id]of [['monk','monk_3'],['warrior','warrior_1'],['mage','mage_2']]){
      setup(cls,id);const before=d.mp,cost=stSkCost(ST_SKILLS[id]);
      stUseSkill(id);stUseSkill(id);
      check(before-d.mp===cost&&ST.battle.turn==='anim',id+' rapid cast spends one mana charge and locks action');
    }
    for(const [key,id,totals]of [['rally','warrior_2',[1.25,1.4,1.5]],['guard','warrior_1',[1.4,1.65,1.8]]]){
      setup('warrior',id);
      const b=ST.battle;
      for(let n=1;n<=3;n++){
        b.turn='player';const before=d.mp,cost=stSkCost(ST_SKILLS[id]);stUseSkill(id);
        check(stBuffStacks(b,key)===n&&stBuffMultiplier(b,key)===totals[n-1],key+' stack '+n+' has diminishing cumulative power');
        check(before-d.mp===cost&&b.buffs[key]===4&&b.turn==='anim',key+' stack '+n+' costs mana/action and refreshes four enemy turns');
      }
      b.buffs[key]=1;b.turn='player';const before=d.mp;stUseSkill(id);
      check(stBuffStacks(b,key)===3&&b.buffs[key]===4&&d.mp===before-stSkCost(ST_SKILLS[id]),key+' fourth cast refreshes only; no free mana or fourth stack');
      const other=key==='rally'?'guard':'rally';stApplyStackBuff(b,other);
      check(stBuffStacks(b,key)===3&&stBuffStacks(b,other)===1,key+' and '+other+' have separate pools');
      for(let n=0;n<4;n++)stTickCombatBuffs(b);
      check(stBuffStacks(b,key)===0&&stBuffMultiplier(b,key)===1&&b.buffStacks[key]===0,key+' expiry clears stacks and all bonus power');
      stApplyStackBuff(b,key);check(stBuffStacks(b,key)===1,key+' reapplication after expiry starts at one');
      b.buffs[key]=0;stApplyStackBuff(b,key);
      check(stBuffStacks(b,key)===1,key+' reapplication after dispel cannot recover stale stacks');
    }
    setup('warrior','warrior_0');
    const buffBattle=ST.battle,s0=stStats(),S0=ST_SKILLS.warrior_0;
    const unbuffed=stAbilityPower(S0,s0,buffBattle,0);
    for(let n=0;n<3;n++)stApplyStackBuff(buffBattle,'rally');
    check(stAtkMul(buffBattle)===1.5&&stAbilityPower(S0,s0,buffBattle,0)===unbuffed*1.5,'three attack stacks affect real weapon-skill power without multiplying three times');
    for(const [key,random,mult,kind]of [['wolf',.5,1,'basic'],['king',.1,1.9,'named'],['king',.4,1.3,'area']]){
      setup('warrior','warrior_1');d.hp=9999;d.wounds=null;
      const b=ST.battle;b.foes[0].key=key;b.foes[0].atk=200;b.foes[0].spd=999;
      for(let n=0;n<3;n++)stApplyStackBuff(b,'guard');
      Math.random=()=>random;
      const hp=d.hp,expected=stDmg(200*mult,stStats().def*1.8);
      stEnemyPhase();timers.find(t=>t.ms===0).fn();
      if(kind!=='basic')timers.find(t=>t.ms===650).fn();
      check(hp-d.hp===expected,kind+' enemy attack uses the actual stacked-defense multiplier');
    }
    Math.random=()=>.5;
    setup('mage','mage_0',2);const before=d.mp;stUseSkill('mage_0');
    check(d.mp===before&&ST.battle.turn==='player','target selection/cancellation costs no mana');
    setup('warrior','mage_0');stUseSkill('mage_0');
    check(d.mp===9999&&ST.battle.turn==='player','cross-class cast rejected');
    Object.assign(d,{lv:1});check(stDotDamage({hp:100000,maxHp:100000,boss:true})===15,'starter boss DoT capped by player level');
    check(stDotDamage({hp:100,maxHp:100,boss:false})===6,'normal DoT remains six percent');
    check(stDotDamage({hp:100000,maxHp:100000,boss:true},.05,3)===15&&stDotDamage({hp:100,maxHp:100,boss:false},.05,3)===5,'boss bleeding resisted; ordinary bleeding retained');
    Math.random=()=>.25;const boss={id:'f0',hp:100,boss:true},mob={id:'f1',hp:100};
    stAbilityEffects({slow:true,slowP:.5},boss,1,stStats());stAbilityEffects({slow:true,slowP:.5},mob,1,stStats());
    check(!boss.frozen&&mob.frozen===1,'boss interrupt resistance enforced');
  }finally{
    [stShot,stEffect,stAnim,stBurst,stNum,stCallout,stRenderBattle,stLog,stGore,stWound,stRageAdd,Math.random,window.setTimeout]=visual;
    ST.battle=null;ST.curSkill=null;PROF.story=original;
  }
  return {results,matrix};
}

const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace("reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",`window.__TW_BALANCE_RUN=(${runBalanceChecks.toString()});reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);`);
  await route.fulfill({response,body});
});
try{
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:3000',{waitUntil:'networkidle'});
  await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stNew').click();
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();
  const {results,matrix}=await page.evaluate(()=>__TW_BALANCE_RUN());
  for(const label of results)console.log('ok',label);
  console.log('Level/class matrix:',JSON.stringify(matrix));
  assert.deepEqual(errors,[]);
  console.log(results.length+' economy/class balance checks passed; no runtime errors');
}finally{await context.close();await browser.close();}
