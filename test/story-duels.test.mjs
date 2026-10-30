import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000',browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1280,height:900}}),errors=[];
// Test transport only: two actual tabs use the production room contract.
await context.addInitScript(()=>{
  localStorage.clear();
  const id=crypto.randomUUID();
  function room(name){
    const channel=new BroadcastChannel('tw-duel-fixture:'+name),states={},callbacks=[];let mine={};
    const send=()=>channel.postMessage({id,type:'state',state:mine});
    channel.onmessage=e=>{const p=e.data;if(p.id===id)return;if(p.type==='hello')send();if(p.type==='state'){states[p.id]=p.state;for(const cb of callbacks)cb();}if(p.type==='bye'){delete states[p.id];for(const cb of callbacks)cb();}};
    channel.postMessage({id,type:'hello'});
    return {peers:()=>[{peer:id,sameTab:true,presence:mine},...Object.entries(states).map(([peer,presence])=>({peer,sameTab:false,presence}))],
      presence:update=>{Object.assign(mine,update);send();return Promise.resolve();},onPeers:cb=>callbacks.push(cb),join:sub=>Promise.resolve(room(name+':'+sub)),leave:()=>{channel.postMessage({id,type:'bye'});channel.close();return Promise.resolve();}};
  }
  const lobby=room('lobby');window.claude={use:()=>Promise.resolve(lobby)};
});
async function setup(name){
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    if(route.request().resourceType()!=='document')return route.continue();
    const response=await route.fetch(),body=(await response.text()).replace("reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
      "window.__DUEL={d:stData,s:ST,pv:SDUEL,sw:SW,enter:stEnterMap,stats:stStats};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);");
    await route.fulfill({response,body});
  });
  await page.goto(base);await page.locator('#startBtn').click();await page.locator('#m-story').click();await page.locator('#stNew').click();await page.locator('#crName').fill(name);
  await page.locator('#crNext').click();await page.locator('#crNext').click();for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();await page.locator('#crStart').click();
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<80&&await page.locator('#stDialog').isVisible();i++){
    const bs=page.locator('#stChoices button:visible'),ts=await bs.allTextContents();let n=ts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));if(n<0)n=ts.findIndex(t=>/skip|own way|later|not now/i.test(t));if(n<0)n=ts.length-1;if(n<0)break;await bs.nth(n).click();
  }
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Silver Accord · consensual PvP',exact:true}).click();await page.getByRole('button',{name:'Travel to the dueling grounds',exact:true}).click();await page.locator('#stLoad').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!!__DUEL.sw.me);return page;
}
try{
  const a=await setup('Accord Rowan'),b=await setup('Accord Ash');
  await a.waitForFunction(()=>__DUEL.sw.peers.some(p=>!p.sameTab&&p.presence?.sw?.m==='duelyard'));
  const before=await a.evaluate(()=>{const d=__DUEL.d();return{hp:d.hp,mp:d.mp,gold:d.gold,kills:JSON.stringify(d.kills),items:JSON.stringify(d.items)};});
  await a.keyboard.press('Escape');await a.getByRole('button',{name:'Silver Accord · consensual PvP',exact:true}).click();await a.getByRole('button',{name:'Challenge Accord Ash',exact:true}).click();
  await b.getByRole('button',{name:'Accept duel',exact:true}).waitFor();
  assert.equal(await a.evaluate(()=>__DUEL.pv.match),null);assert.equal(await b.evaluate(()=>__DUEL.pv.match),null);console.log('Challenge does not start combat before opponent consents');
  await b.getByRole('button',{name:'Accept duel',exact:true}).click();await a.locator('#pvOverlay').waitFor({state:'visible'});await b.locator('#pvOverlay').waitFor({state:'visible'});
  await a.bringToFront();
  await a.waitForFunction(()=>__DUEL.pv.match?.t>.1);assert.equal(await a.evaluate(()=>__DUEL.pv.match.id),await b.evaluate(()=>__DUEL.pv.match.id));
  const x=await a.evaluate(()=>__DUEL.pv.match.players[0].x);await a.keyboard.down('d');await a.waitForFunction(x=>__DUEL.pv.match.players[0].x>x+160,x);await a.keyboard.up('d');
  await a.keyboard.press('3');await a.waitForFunction(()=>__DUEL.pv.match.players[0].dashAt>0);
  await a.keyboard.press('2');await a.waitForFunction(()=>__DUEL.pv.match.players[0].guardAt>0);
  const foeHP=await a.evaluate(()=>__DUEL.pv.match.players[1].hp);await a.keyboard.press('1');await a.waitForFunction(hp=>__DUEL.pv.match.players[1].hp<hp,foeHP);
  await b.waitForFunction(hp=>__DUEL.pv.match.players[1].hp<hp,foeHP);console.log('Both browser players see synchronized live damage, movement, dash and guard');
  await a.screenshot({path:'test-results/story-pvp-desktop.png'});
  await b.getByRole('button',{name:'Leave duel safely',exact:true}).click();await a.waitForFunction(()=>!!__DUEL.pv.match?.over);
  await a.getByRole('button',{name:'Leave duel safely',exact:true}).click();
  const after=await a.evaluate(()=>{const d=__DUEL.d();return{hp:d.hp,mp:d.mp,gold:d.gold,kills:JSON.stringify(d.kills),items:JSON.stringify(d.items)};});
  assert.deepEqual(after,before);assert.equal(await a.evaluate(()=>__DUEL.s.mode),'walk');
  console.log('Departure ends duel safely; Story health, mana, inventory, kills and gold unchanged');
  assert.deepEqual(errors,[]);console.log('Two-browser consent PvP flow passed using room-contract fixture; no runtime errors');
}catch(e){console.error('Runtime errors',errors);for(const [i,p]of context.pages().entries())await p.screenshot({path:`test-results/pvp-failure-${i}.png`});throw e;}
finally{await browser.close();}
