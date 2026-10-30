import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
let confirmMode='dismiss',dialogs=[],checks=0;
page.on('dialog',async d=>{dialogs.push(d.message());await d[confirmMode==='accept'?'accept':'dismiss']();});
const ok=(v,label)=>{assert(v,label);console.log('ok',++checks,label);};
mkdirSync('test-results',{recursive:true});
await page.route('**/*',async route=>{
  if(route.request().resourceType()!=='document')return route.continue();
  const response=await route.fetch(),body=(await response.text()).replace(
    "reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);",
    "window.__SLOT_QA={data:stData,state:ST,save:stSave,sync:stSyncProgress,ensure:stEnsureStorySlots,select:stSelectCharacterSlot,start:stStartBattle};reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);"
  );await route.fulfill({response,body});
});
const dismiss=async()=>{
  await page.locator('#stLoad').waitFor({state:'hidden'});
  for(let i=0;i<70&&await page.locator('#stDialog').isVisible();i++){
    const bs=page.locator('#stChoices button:visible'),ts=await bs.allTextContents();
    let n=ts.findIndex(t=>/^(Next|Done)$/.test(t.trim()));if(n<0)n=ts.findIndex(t=>/skip|own way|later|not now/i.test(t));if(n<0)n=ts.length-1;
    if(n<0)break;await bs.nth(n).click();
  }
};
const launch=async()=>{await page.locator('#startBtn').click();await page.locator('#startScreen').waitFor({state:'hidden'});await page.locator('#m-story').click();};
const create=async(name,cls)=>{
  await page.locator('#stNew').click();await page.locator('#crName').fill(name);
  await page.locator('#crClass').getByRole('button',{name:cls,exact:true}).click();
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  await page.locator('#crStart').click();await dismiss();
};
const quit=async()=>{await page.keyboard.press('Escape');await page.getByRole('button',{name:'Save and quit',exact:true}).click();await page.locator('#m-story').click();};
const select=async n=>page.getByRole('button',{name:new RegExp('^Select character slot '+n)}).click();
const profile=()=>page.evaluate(()=>Thornwake.getProfile());
try{
  await page.goto(base);await launch();
  ok(await page.locator('.storySlotCard').count()===2,'story screen has exactly two selectable creation slots');
  ok(await page.locator('#stContinue').isHidden(),'empty selected slot cannot be continued');
  await page.screenshot({path:'test-results/slots-empty-desktop.png'});
  await create('Grave Keeper','Necromancer');
  ok(await page.evaluate(()=>__SLOT_QA.data().cls==='necromancer'&&__SLOT_QA.data().skills.includes('necromancer_tier0')),'first slot creates a real playable Necromancer');
  await page.evaluate(()=>{
    const q=__SLOT_QA,d=q.data();d.gold=321;d.flags.slotOneQuest=true;d.items.potion=7;
    d.soulBook.entries.wolf={copies:2,attempts:3};d.soulBook.selected='wolf';
    d.mounts=['mare'];d.mount='mare';d.riding=true;
    d.properties={willowhome:{bought:1,pricePaid:450,storedGold:42}};
    q.save();
  });
  ok(await page.evaluate(()=>!__SLOT_QA.select(1)&&__SLOT_QA.data().name==='Grave Keeper'),'slot switching is refused during active gameplay');
  await quit();
  let p=await profile(),first=structuredClone(p.storySlots[0]);
  ok(p.storySlot===0&&p.storySlots[0].name==='Grave Keeper'&&p.storySlots[1]===null,'first hero saved in slot 1 and slot 2 remains empty');
  await page.screenshot({path:'test-results/slots-one-hero-desktop.png'});
  await page.locator('#stNew').click();
  ok(dialogs.length===0,'creating in available second slot never asks to overwrite the first');
  ok((await profile()).storySlot===1,'New story automatically chooses the available second slot');
  await page.locator('#crBack').click();
  ok(JSON.stringify((await profile()).storySlots[0])===JSON.stringify(first),'cancelling second creation leaves the original hero unchanged');
  ok(await page.locator('#stContinue').isHidden(),'cancelled empty slot does not start the other character accidentally');
  await create('Ember Pact','Warlock');await quit();p=await profile();
  ok(p.storySlot===1&&p.storySlots[1].cls==='warlock'&&p.storySlots[1].skills.includes('warlock_tier0'),'second slot independently creates and saves a playable Warlock');
  ok(JSON.stringify(p.storySlots[0])===JSON.stringify(first),'creating Warlock does not alter any original Necromancer save fields');
  ok(!p.storySlots[1].flags.slotOneQuest&&!p.storySlots[1].soulBook&&p.storySlots[1].gold!==321,'quest, gold and soul collection are not copied into the second hero');
  ok(!p.storySlots[1].riding&&!p.storySlots[1].properties?.willowhome,'mount and house ownership remain per hero');
  await page.screenshot({path:'test-results/slots-two-heroes-desktop.png'});
  await select(1);
  ok((await page.locator('#stSummary').innerText()).includes('Grave Keeper')&&await page.locator('.storySlotCard[data-slot="1"]').getAttribute('aria-pressed')==='true','selecting first slot updates summary and selected state');
  await page.locator('#stContinue').click();await dismiss();
  ok(await page.evaluate(()=>{const d=__SLOT_QA.data();return d.gold===321&&d.flags.slotOneQuest&&d.soulBook.selected==='wolf'&&d.soulBook.entries.wolf.copies===2&&d.mount==='mare'&&d.properties.willowhome.storedGold===42;}),'continuing first hero restores gold, quest, collection, mount and house data');
  await page.evaluate(()=>{__SLOT_QA.data().gold=333;__SLOT_QA.save();});await quit();
  await select(2);await page.locator('#stContinue').click();await dismiss();
  ok(await page.evaluate(()=>__SLOT_QA.data().cls==='warlock'&&__SLOT_QA.data().gold===30&&!__SLOT_QA.state.battle),'switching back to Warlock does not inherit gold or transient combat state');
  await quit();p=await profile();
  ok(p.storySlots[0].gold===333&&p.storySlots[1].gold===30,'saving the second hero does not overwrite first-slot changes');
  const exported=structuredClone(p),unaffected=JSON.stringify(p.storySlots[0]);
  await page.reload();await launch();
  p=await profile();ok(p.storySlot===1&&p.storySlots[0].gold===333&&p.storySlots[1].cls==='warlock','both heroes and selected slot survive a full page reload');
  await select(1);await page.reload();await launch();
  ok((await profile()).storySlot===0&&!(await page.locator('#stContinue').isHidden()),'slot selection itself persists across reload');
  await select(2);
  const originalSecond=JSON.stringify((await profile()).storySlots[1]);
  await page.locator('#stNew').click();
  ok(dialogs.length===1&&dialogs[0].includes('Ember Pact')&&dialogs[0].includes('slot 2'),'occupied-slot replacement names the hero and exact slot in its confirmation');
  ok(await page.locator('#scr-story').isVisible()&&JSON.stringify((await profile()).storySlots[1])===originalSecond,'declining replacement preserves the selected hero');
  confirmMode='accept';await page.locator('#stNew').click();await page.locator('#crBack').click();
  ok(JSON.stringify((await profile()).storySlots[1])===originalSecond,'accepting replacement then cancelling creation still preserves the old hero');
  confirmMode='dismiss';
  confirmMode='accept';await page.locator('#stNew').click();
  await page.locator('#crName').fill('Do Not Overwrite Cloud Hero');
  await page.locator('#crNext').click();await page.locator('#crNext').click();
  for(let i=0;i<3;i++)await page.locator('#crSkills button').nth(i).click();
  const incoming=structuredClone(exported);incoming.story.name='Incoming Cloud Hero';incoming.storySlots[1]=structuredClone(incoming.story);
  await page.evaluate(p=>Thornwake.replaceProfile(p),incoming);
  confirmMode='dismiss';await page.locator('#crStart').click();
  ok(dialogs.at(-1).includes('Incoming Cloud Hero'),'a cloud import changing an open creator target requires a fresh named confirmation');
  ok(await page.locator('#scr-create').isVisible()&&(await profile()).storySlots[1].name==='Incoming Cloud Hero','declining the late confirmation preserves the imported hero and keeps creation uncommitted');
  ok(JSON.stringify((await profile()).storySlots[0])===unaffected,'late cloud/creator conflict leaves the other character slot untouched');
  await page.locator('#crBack').click();
  // Cloud-facing bridge uses the full same profile, without making real account writes.
  await page.evaluate(p=>Thornwake.replaceProfile(p),exported);await page.reload();await launch();p=await profile();
  ok(p.storySlots.length===2&&p.storySlots[0].gold===333&&p.storySlots[1].name==='Ember Pact'&&p.storySlot===1,'cloud-facing profile export/import preserves both heroes and active slot');
  const legacy=structuredClone(exported);legacy.story=structuredClone(exported.storySlots[0]);delete legacy.storySlots;delete legacy.storySlot;
  await page.evaluate(p=>Thornwake.replaceProfile(p),legacy);await page.reload();await launch();p=await profile();
  ok(p.storySlot===0&&p.storySlots[1]===null&&p.storySlots[0].name==='Grave Keeper'&&p.storySlots[0].gold===333,'legacy single-hero cloud/local data safely migrates into slot 1');
  ok(p.epoch===exported.epoch&&p.crowns===exported.crowns&&JSON.stringify(p.paid||[])===JSON.stringify(exported.paid||[]),'slot migration does not reset the data epoch, Crowns or purchase history');
  await select(2);await page.reload();await launch();p=await profile();
  ok(p.story===null&&p.storySlot===1&&p.storySlots[0].name==='Grave Keeper','empty active slot and occupied inactive slot both survive reload');
  // Updated legacy clients may change only the `story` field. Its progress must win.
  const stale=structuredClone(exported);stale.story.gold=777;
  await page.evaluate(p=>Thornwake.replaceProfile(p),stale);p=await profile();
  ok(p.storySlots[1].gold===777&&JSON.stringify(p.storySlots[0])===unaffected,'legacy active-field updates win without damaging the other slot');
  const normalization=await page.evaluate(()=>{
    const q=__SLOT_QA,hero={name:'A',cls:'warrior',lv:1};
    const p={story:hero,storySlot:99,storySlots:'bad'};q.ensure(p);
    const a=p.storySlot===0&&p.storySlots.length===2&&p.storySlots[0]===hero&&p.storySlots[1]===null;
    const p2={storySlot:1,storySlots:[hero,{name:'B',cls:'mage',lv:1}]};q.ensure(p2);
    return a&&p2.story.name==='B';
  });
  ok(normalization,'invalid slot metadata normalizes safely while inactive saves remain readable');
  await page.evaluate(p=>Thornwake.replaceProfile(p),exported);await page.reload();await launch();await select(1);
  await page.screenshot({path:'test-results/slots-final-desktop.png'});
  ok(errors.length===0,'no character-slot JavaScript runtime errors: '+errors.join('; '));
  console.log(checks+' character-slot checks passed');
}catch(error){console.log('Page errors:',errors);await page.screenshot({path:'test-results/slots-failure.png'}).catch(()=>{});throw error;}
finally{await context.close();await browser.close();}
