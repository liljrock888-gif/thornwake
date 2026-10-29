import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new Script(m[1]);
assert(!html.includes('__MOUNT_QA'));
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage(),errors=[];
page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
mkdirSync('test-results',{recursive:true});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace('window.render_game_to_text=()=>{',
    'const __mountDraws={};const __baseMountDraw=stDrawMount;stDrawMount=function(...args){__mountDraws[stData().map]=(__mountDraws[stData().map]||0)+1;return __baseMountDraw(...args);};window.__MOUNT_QA={data:stData,state:ST,maps:ST_DUNGEONS,enter:stEnterMap,ports:ST_PORTS,blocked:stBlocked,mounts:ST_MOUNTS,draws:__mountDraws};window.render_game_to_text=()=>{');
  await route.fulfill({response,body});
});
let checks=0;const ok=(v,label)=>{assert(v,label);console.log('ok',++checks,label);};
const dismiss=async()=>{
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<65&&await page.locator('#stDialog').isVisible();i++){
    const buttons=page.locator('#stChoices button:visible'),texts=await buttons.allTextContents();
    let idx=texts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));
    if(idx<0)idx=texts.findIndex(t=>/skip|own way|not now|later/i.test(t));
    if(idx<0)idx=texts.length-1;
    if(idx<0)break;
    await buttons.nth(idx).click();
  }
};
const stage=async(map,x,y,values={})=>{
  await page.evaluate(({map,x,y,values})=>{
    const q=__MOUNT_QA;Object.assign(q.data(),values);q.enter(map,x,y);
    q.state.foes=[];q.state.safe=1000;q.state.cam.x=q.data().x;q.state.cam.y=q.data().y;
  },{map,x,y,values});
  await dismiss();
};
const port=async()=>{
  const p=await page.evaluate(()=>__MOUNT_QA.ports[__MOUNT_QA.data().map].at);
  const map=await page.evaluate(()=>__MOUNT_QA.data().map);
  await stage(map,...p);
};
const shipChoice=async(name)=>{
  await page.keyboard.press('e');
  for(let i=0;i<5&&await page.getByRole('button',{name:'Next',exact:true}).isVisible();i++)await page.getByRole('button',{name:'Next',exact:true}).click();
  return page.getByRole('button',{name:new RegExp('^Sail to '+name+' \\(')});
};
try{
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});
  await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill('Island Rider');
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
  await stage('world',37,16,{lv:1,gold:0,mounts:[],riding:false});
  await page.keyboard.press('r');
  ok(!await page.locator('#stRide').isVisible(),'players without mounts do not get a Ride button');
  await page.evaluate(()=>Object.assign(__MOUNT_QA.data(),{mounts:['mare'],mount:'mare',gold:10000}));
  await page.keyboard.press('r');
  ok(await page.evaluate(()=>__MOUNT_QA.data().riding===true),'owned horse can be mounted at Saltmere');
  const denied=await shipChoice('Valdris, the Guild Commonwealth');await denied.click();
  ok((await page.locator('#stDialog').innerText()).includes('level 26'),'ship level requirements remain enforced');
  ok(await page.evaluate(()=>__MOUNT_QA.data().riding&&__MOUNT_QA.data().gold===10000),'denied passage preserves mount and gold');
  await dismiss();await page.evaluate(()=>{__MOUNT_QA.data().lv=60;});
  for(const [key,name]of [['isles','the Brightwater Isles'],['rouge','Rougemarais'],['land2','Valdris, the Guild Commonwealth'],['land3','Aetherfall, the Shattered Heavens'],['world','Saltmere']]){
    await port();const button=await shipChoice(name),label=await button.innerText();
    const fare=Number(label.match(/\((\d+) gold\)/)[1]),before=await page.evaluate(()=>__MOUNT_QA.data().gold);
    await button.click();
    await page.waitForFunction(key=>__MOUNT_QA.data().map===key&&__MOUNT_QA.state.mode==='walk',key);
    await dismiss();await page.evaluate(()=>{__MOUNT_QA.state.foes=[];__MOUNT_QA.state.safe=1000;});
    ok(await page.evaluate(()=>{const d=__MOUNT_QA.data();return d.riding&&d.mount==='mare'&&d.mounts.length===1;}),name+' preserves the selected, owned and mounted horse');
    ok(await page.evaluate(()=>__MOUNT_QA.data().gold)===before-fare,name+' charges only the displayed ship fare');
    await page.waitForFunction(key=>__MOUNT_QA.draws[key]>0,key);
    ok(await page.locator('#stRide').isVisible()&&(await page.locator('#stRide').innerText())==='Dismount',name+' draws the horse and exposes Dismount');
    await page.locator('#stRide').click();
    ok(await page.evaluate(()=>!__MOUNT_QA.data().riding),name+' allows dismounting');
    await page.locator('#stRide').click();
    ok(await page.evaluate(()=>__MOUNT_QA.data().riding),name+' allows remounting');
    if(key==='isles'){
      await stage('isles',8,10);const start=await page.evaluate(()=>__MOUNT_QA.data().x);
      await page.keyboard.down('ArrowRight');
      try{await page.waitForFunction(x=>__MOUNT_QA.data().x>x+50,start);}finally{await page.keyboard.up('ArrowRight');}
      ok(await page.evaluate(()=>__MOUNT_QA.data().riding),'real movement works while riding on Brightwater');
      await page.screenshot({path:'test-results/mounts-isles-desktop.png'});
      await page.setViewportSize({width:375,height:812});
      ok(await page.locator('#stRide').isVisible()&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone island riding control fits the viewport');
      await page.screenshot({path:'test-results/mounts-isles-phone.png'});
      await page.setViewportSize({width:1440,height:900});
      await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save and quit',exact:true}).click();
      await page.locator('#m-story').click();await page.locator('#stContinue').click();await dismiss();
      ok(await page.evaluate(()=>{const d=__MOUNT_QA.data();return d.map==='isles'&&d.riding&&d.mount==='mare';}),'island save and continue preserves riding');
    }
  }
  await stage('keep',2,2);
  ok(await page.evaluate(()=>!__MOUNT_QA.data().riding)&&!await page.locator('#stRide').isVisible(),'indoor castle still dismounts and hides Ride');
  await page.keyboard.press('r');
  ok(await page.evaluate(()=>!__MOUNT_QA.data().riding&&__MOUNT_QA.data().mount==='mare'),'mount waits outside without losing ownership or selection');
  await stage('isles',8,10);await page.keyboard.press('r');
  ok(await page.evaluate(()=>__MOUNT_QA.data().riding),'mount remains available after an indoor visit');
  await page.evaluate(()=>{const d=__MOUNT_QA.data();d.mounts.push('drake');d.mount='drake';});
  const collision=await page.evaluate(()=>{
    const q=__MOUNT_QA,rows=q.maps.isles.rows;let building;
    for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]==='H')building=[x*64+32,y*64+32];
    return {bounds:q.blocked(-10,100)&&q.blocked(rows[0].length*64+10,100),building:q.blocked(...building)};
  });
  ok(collision.bounds&&collision.building,'flying mounts cannot escape island boundaries or fly through buildings');
  // Use one interior sea tile to verify unsafe dismounting does not strand the player.
  await stage('isles',2,2,{riding:true});
  const sea=await page.evaluate(()=>{
    const q=__MOUNT_QA,rows=q.maps.isles.rows;
    for(let y=2;y<rows.length-2;y++)for(let x=2;x<rows[y].length-2;x++)if(rows[y][x]==='#'){q.data().x=x*64+32;q.data().y=y*64+32;return [x,y];}
  });
  assert(sea);await page.keyboard.press('r');
  ok(await page.evaluate(()=>__MOUNT_QA.data().riding),'flying mount refuses an unsafe sea dismount');
  ok(errors.length===0,'no browser runtime errors');
  console.log(`${checks} island mount checks passed`);
}finally{await browser.close();}
