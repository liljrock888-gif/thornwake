import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Script(m[1]);
assert(!html.includes('__CASTLE_QA'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(15000);
mkdirSync('test-results',{recursive:true});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace('window.render_game_to_text=()=>{',
    'window.__CASTLE_QA={data:stData,state:ST,maps:ST_DUNGEONS,enter:stEnterMap,near:stNearby,sync:stSyncProgress,profile:PROF};window.render_game_to_text=()=>{');
  await route.fulfill({response,body});
});
let checks=0;const ok=(v,label)=>{assert(v,label);console.log('ok',++checks,label);};
const dismiss=async()=>{
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<65;i++){
    if(!await page.locator('#stDialog').isVisible())return;
    const buttons=page.locator('#stChoices button:visible'),texts=await buttons.allTextContents();
    let idx=texts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(idx<0)idx=texts.findIndex(t=>/skip|own way|not now|later/i.test(t));
    if(idx<0)idx=texts.length-1;
    if(idx<0)return;
    await buttons.nth(idx).click();
  }
  throw Error('Dialogue stuck');
};
const stage=async(map,x,y,extra={})=>{
  await page.evaluate(({map,x,y,extra})=>{
    const q=__CASTLE_QA;Object.assign(q.data(),extra);q.enter(map,x,y);q.state.safe=1000;q.state.foes=[];q.state.cam.x=q.data().x;q.state.cam.y=q.data().y;
  },{map,x,y,extra});
  await dismiss();
};
const engage=async()=>{
  for(let i=0;i<10&&await page.locator('#stDialog').isVisible();i++){
    const buttons=page.locator('#stChoices button:visible'),texts=await buttons.allTextContents();
    const idx=texts.findIndex(t=>/^(Next|Done|Draw steel|Face the guardian)$/.test(t.trim()));
    if(idx<0)throw Error('Unexpected boss choice: '+texts.join(', '));
    await buttons.nth(idx).click();
  }
};
const shot=async name=>page.screenshot({path:`test-results/castle-${name}.png`});
// Navigate by real keyboard inputs through a shortest tile path, not teleports.
const walk=async(tx,ty)=>{
  const path=await page.evaluate(([tx,ty])=>{
    const d=__CASTLE_QA.data(),rows=__CASTLE_QA.maps.keep.rows,s=[Math.floor(d.x/64),Math.floor(d.y/64)],q=[s],prev=new Map([[s.join(','),null]]);
    for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(rows[b]?.[a]&&rows[b][a]!=='#'&&!prev.has(k)){prev.set(k,[x,y]);q.push([a,b]);}}}
    if(!prev.has(tx+','+ty))throw Error('No route');
    const path=[];let p=[tx,ty];while(p){path.unshift(p);p=prev.get(p.join(','));}return path.slice(1);
  },[tx,ty]);
  for(const [x,y]of path){
    for(const [axis,target,positive,negative]of [['x',x*64+32,'ArrowRight','ArrowLeft'],['y',y*64+32,'ArrowDown','ArrowUp']]){
      const at=await page.evaluate(axis=>__CASTLE_QA.data()[axis],axis);
      if(Math.abs(at-target)<6)continue;
      const sign=target>at?1:-1,key=sign>0?positive:negative;
      await page.keyboard.down(key);
      try{await page.waitForFunction(({axis,target,sign})=>(__CASTLE_QA.data()[axis]-target)*sign>=-5,{axis,target,sign},{timeout:2500,polling:'raf'});}
      finally{await page.keyboard.up(key);}
    }
  }
};
try{
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill('Castle Tester');
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
  ok(await page.evaluate(()=>!!__CASTLE_QA.data()),'new story still starts');
  const shape=await page.evaluate(()=>{
    const rows=__CASTLE_QA.maps.keep.rows,q=[[1,1]],seen=new Set(['1,1']);
    for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(rows[b]?.[a]&&rows[b][a]!=='#'&&!seen.has(k)){seen.add(k);q.push([a,b]);}}}
    return {rect:rows.every(r=>r.length===22),reachable:seen.size,total:rows.join('').replaceAll('#','').length,legacy:rows[1][1]==='E'&&rows[1][20]==='c'&&rows[9][1]==='c'&&rows[10][11]==='B',boss:__CASTLE_QA.maps.keep.boss};
  });
  ok(shape.rect&&shape.reachable===shape.total,'every castle floor tile is reachable');
  ok(shape.legacy&&shape.boss==='king','legacy entrance, treasure IDs, throne and boss preserved');
  await stage('world',24,7,{ch:1});await shot('exterior-desktop');
  await page.keyboard.press('e');
  ok((await page.locator('#stDialog').innerText()).includes('Two shards'),'locked castle still requires both shards');
  await dismiss();await page.evaluate(()=>__CASTLE_QA.data().ch=3);await page.keyboard.press('e');
  await page.getByRole('button',{name:'Not yet',exact:true}).click();
  ok(await page.evaluate(()=>__CASTLE_QA.data().map==='world'),'declining entry leaves player outside');
  await page.keyboard.press('e');await page.getByRole('button',{name:'Enter the castle',exact:true}).click();await dismiss();
  await page.evaluate(()=>{__CASTLE_QA.state.foes=[];__CASTLE_QA.state.safe=1000;});
  ok(await page.evaluate(()=>__CASTLE_QA.data().map==='keep'),'real gate entry reaches Hollow Castle');
  await walk(19,3);await walk(20,2);await page.keyboard.press('e');
  ok((await page.locator('#stDialog').innerText()).includes('open the chest'),'east treasury reachable and opens');
  await dismiss();const gold=await page.evaluate(()=>__CASTLE_QA.data().gold);
  await page.keyboard.press('e');ok(await page.evaluate(()=>__CASTLE_QA.data().gold)===gold,'treasure cannot be collected twice');
  await walk(1,10);await page.keyboard.press('e');await dismiss();
  ok(await page.evaluate(()=>__CASTLE_QA.data().chests.includes('keep1_9')),'west treasury reachable and opens');
  await walk(11,9);await shot('throne-desktop');
  await page.keyboard.press('e');
  await engage();
  ok(await page.evaluate(()=>__CASTLE_QA.state.mode==='walk'),'low-level boss gate still enforced');
  await page.setViewportSize({width:375,height:812});await shot('throne-phone');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone has no page overflow');
  await page.setViewportSize({width:1440,height:900});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save and quit',exact:true}).click();
  await page.locator('#m-story').click();await page.locator('#stContinue').click();await dismiss();
  await page.evaluate(()=>{__CASTLE_QA.state.foes=[];__CASTLE_QA.state.safe=1000;});
  ok(await page.evaluate(()=>__CASTLE_QA.data().map==='keep'&&__CASTLE_QA.data().chests.includes('keep1_9')),'save and continue preserves castle progress');
  await page.evaluate(()=>{const q=__CASTLE_QA,d=q.data();d.lv=60;d.hp=9999;d.mp=9999;q.sync(false);});
  await page.keyboard.press('e');
  await engage();
  ok(await page.evaluate(()=>__CASTLE_QA.state.mode==='battle'&&__CASTLE_QA.state.battle.bossId==='king'),'throne starts the actual Hollow King battle');
  await shot('boss-desktop');
  // A test-only one-hit fixture verifies the unchanged victory path, not balance.
  await page.evaluate(()=>{for(const f of __CASTLE_QA.state.battle.foes)f.hp=1;});
  await page.locator('#stActions button[title^="Basic attack."]').click();
  await page.waitForFunction(()=>__CASTLE_QA.data().flags.king===true);
  await dismiss();
  ok(await page.evaluate(()=>__CASTLE_QA.data().ch>=4&&__CASTLE_QA.data().rewarded),'Hollow King victory still advances Act I and grants its reward once');
  await stage('keep',2,2);await walk(1,2);await page.keyboard.press('e');
  await page.getByRole('button',{name:'Leave the castle',exact:true}).click();await dismiss();
  ok(await page.evaluate(()=>{const d=__CASTLE_QA.data();return d.map==='world'&&Math.floor(d.x/64)===24&&Math.floor(d.y/64)===7;}),'castle exit returns to safe Castle Road');
  ok(errors.length===0,'no browser runtime errors');
  console.log(`${checks} castle checks passed`);
}finally{await browser.close();}
