// A separate, peaceful housing district. Existing deeds and world doors remain.
const FW_PLOTS=ST_PROPERTIES.map((p,i)=>({id:p.id,x:3+(i%3)*7,y:i<3?4:12}));
{
  const rows=Array.from({length:23},(_,y)=>Array.from({length:26},(_,x)=>x===0||y===0||x===25||y===22?'#':'.'));
  for(let y=1;y<22;y++)for(let x=1;x<25;x++)if([7,8,15,16,20].includes(y)||[12,13].includes(x))rows[y][x]='=';
  for(const P of FW_PLOTS)for(let y=P.y;y<P.y+2;y++)for(let x=P.x;x<P.x+2;x++)rows[y][x]='H';
  rows[20][13]='E';
  const pal={sea:'#426f75',grass:'#64894e',grass2:'#6b9055',road:'#b2a486',mount:'#74846c',hut:'#dac6a0',roof:'#9d6452'};
  ST_DUNGEONS.hearthward={name:'Hearthward · The Lantern Neighborhood',outdoor:true,land:true,lit:true,pal,trees:'crystal',pool:[],zones:[{r:[1,1,24,21],lv:1,name:'Peaceful residential ward'}],exit:[16,14],rows:rows.map(r=>r.join('')),neighborhood:true};
}
ST_NPCS.push({id:'fw_hearthward_carpenter',fwKey:'furnisher',name:'Juniper the Furnisher',map:'hearthward',x:6,y:19,look:'ranger',color:'#beaa7a'},
  {id:'fw_hearthward_steward',fwKey:'steward',name:'Steward Moss',map:'hearthward',x:19,y:19,look:'paladin',color:'#9bb99a'});
RT_CHATTER.furnisher='A good room tells your own story.';RT_CHATTER.steward='Your old deeds are welcome in Hearthward.';
const FW_FURNITURE=[
  ['rug','Mossweave Rug',45,'rug','#8b9b68'],['wine_rug','Wine Velvet Rug',60,'rug','#a26878'],
  ['chair','Oak Chair',35,'chair','#bc9869'],['stool','Harbor Stool',30,'chair','#7fa6aa'],
  ['table','Round Supper Table',90,'table','#bd9566'],['desk','Scribe’s Desk',110,'table','#a37e62'],
  ['bed','Moonquilt Bed',140,'bed','#9299ba'],['plant','Fern in a Clay Pot',25,'plant','#77a174'],
  ['flowers','Sunpetal Planter',40,'plant','#d5b46e'],['books','Little Library',100,'books','#a57d58'],
  ['candle','Brass Candlestand',55,'candle','#d5b574'],['crystal','Floating Lantern Crystal',160,'crystal','#91dbcb'],
  ['banner','Knight’s Wall Banner',65,'banner','#a77272'],['barrel','Applewood Barrel',45,'barrel','#ad8b67'],
  ['chest','Carved Keepsake Chest',95,'chest','#ae895c'],['wardrobe','Cedar Wardrobe',125,'books','#bd9973'],
  ['blue_rug','Tideglass Rug',65,'rug','#79a4b5'],['rose_bed','Rose Linen Bed',145,'bed','#c28b95']
].map(([id,name,price,shape,color])=>({id,name,price,shape,color}));
function fwHomeRecord(id){
  const d=stData();if(!ST_PROPERTIES.some(p=>p.id===id)||!stPropertyOwned(d,id))return null;
  d.properties=d.properties||{};const p=d.properties[id]||(d.properties[id]={storedGold:0});
  if(!p.furniture)p.furniture={};if(!Array.isArray(p.placed))p.placed=[];if(!Array.isArray(p.storedItems))p.storedItems=[];if(!p.supplies)p.supplies={};return p;
}
function fwStoredOwn(id){return ST_PROPERTIES.some(P=>(stData().properties?.[P.id]?.storedItems||[]).some(it=>it.id===id));}
function fwFurnitureBuy(home,id){
  const p=fwHomeRecord(home),F=FW_FURNITURE.find(f=>f.id===id),d=stData();
  if(ST.battle||!p||!F||d.gold<F.price||(p.furniture[id]||0)>=30)return false;
  d.gold-=F.price;p.furniture[id]=(p.furniture[id]||0)+1;stSave();return true;
}
function fwFurniturePlace(id){
  const d=stData(),p=fwHomeRecord(d.map),F=FW_FURNITURE.find(f=>f.id===id),x=Math.floor(d.x/64),y=Math.floor(d.y/64),D=ST_DUNGEONS[d.map];
  if(ST.battle||!p||!F||!(p.furniture[id]>0)||p.placed.length>=40||D.rows[y]?.[x]!=='.'||p.placed.some(o=>o.x===x&&o.y===y))return false;
  p.furniture[id]--;p.placed.push({id,x,y});delete ST.dunC[d.map];stDrawDungeonCanvas(d.map);stSave();return true;
}
function fwFurnitureRemove(index){
  const d=stData(),p=fwHomeRecord(d.map),o=p?.placed[index];if(ST.battle||!o)return false;
  p.furniture[o.id]=(p.furniture[o.id]||0)+1;p.placed.splice(index,1);delete ST.dunC[d.map];stDrawDungeonCanvas(d.map);stSave();return true;
}
function fwHomeStore(home,id,withdraw=false){
  const p=fwHomeRecord(home),f=fwData(),d=stData();if(ST.battle||!p||d.map!==home)return false;
  const source=withdraw?p.storedItems:f.loot,target=withdraw?f.loot:p.storedItems,index=source.findIndex(it=>it.id===id);
  if(index<0||!withdraw&&(p.storedItems.length>=60||Object.values(f.worn).includes(id))||target.some(it=>it.id===id))return false;
  target.push(source.splice(index,1)[0]);stSave();return true;
}
function fwHomeSupply(home,key,withdraw=false){
  const p=fwHomeRecord(home),d=stData();if(ST.battle||!p||d.map!==home||!Object.hasOwn(d.items,key))return false;
  const from=withdraw?p.supplies:d.items,to=withdraw?d.items:p.supplies;
  if(!Number.isSafeInteger(from[key])||from[key]<=0||(to[key]||0)>=9999)return false;
  from[key]--;to[key]=(to[key]||0)+1;stSave();return true;
}
let fwSelectedHome='willowhome';
function fwFurnitureMenu(home=fwSelectedHome){
  if(ST_PROPERTIES.some(p=>p.id===home))fwSelectedHome=home;const d=stData(),p=fwHomeRecord(fwSelectedHome);
  const m=fwPanel('Juniper’s Furniture Atelier','HEARTHWARD / EARNED GOLD ONLY',`${d.gold} gold. Furniture belongs to one deed and never grants combat power. Buy for an owned home, enter it, stand on a clear floor tile, then place a piece at your feet. Decorations do not block walking or doorways. Up to 40 placed pieces per home.`);
  const sel=el('select','fwAffinity');sel.setAttribute('aria-label','Furnish a home');
  for(const P of ST_PROPERTIES){const o=el('option','',P.name+(stPropertyOwned(d,P.id)?'':' · deed needed'));o.value=P.id;o.selected=P.id===fwSelectedHome;sel.appendChild(o);}
  sel.addEventListener('change',()=>fwFurnitureMenu(sel.value));m.appendChild(sel);
  const list=el('div','fwCards');m.appendChild(list);
  for(const F of FW_FURNITURE){
    const c=el('article','fwCard');c.append(el('h4','',F.name),el('p','',`${F.price} gold · ${p?.furniture[F.id]||0} unplaced in this home`));
    fwButton(c,'Buy '+F.name,()=>{fwFurnitureBuy(fwSelectedHome,F.id);fwFurnitureMenu();},!p||!!ST.battle||d.gold<F.price);
    fwButton(c,'Place at my feet',()=>{if(fwFurniturePlace(F.id))fwFurnitureMenu();else stCallout('Stand on an empty floor tile inside this home.','#e2c59b');},!p||d.map!==fwSelectedHome||!p.furniture[F.id]||!!ST.battle);list.appendChild(c);
  }
  if(d.map===fwSelectedHome&&p){m.appendChild(el('h3','','Placed in this room'));for(const [i,o]of p.placed.entries())fwButton(m,'Pick up '+FW_FURNITURE.find(f=>f.id===o.id)?.name+` (${o.x}, ${o.y})`,()=>{fwFurnitureRemove(i);fwFurnitureMenu();});fwButton(m,'Open personal storage',()=>fwHomeStorage(d.map));}
  fwButton(m,'Housing deeds',stHousingMenu);fwBack(m);
}
let fwStoragePage=0;
function fwHomeStorage(home){
  const p=fwHomeRecord(home),d=stData(),f=fwData();if(!p||d.map!==home||ST.battle)return;
  const m=fwPanel('Personal household storage','PRIVATE / SAVED PER HERO AND DEED',`${f.loot.length} carried equipment pieces · ${p.storedItems.length}/60 stored here · ${p.storedGold||0} stored gold. Equipped pieces cannot be deposited. Storage never exposes inventory to other players.`);
  const select=el('select','fwAffinity');select.setAttribute('aria-label','Storage shelf');
  for(const [v,label]of [['deposit','Deposit equipment'],['withdraw','Withdraw equipment']]){const o=el('option','',label);o.value=v;select.appendChild(o);}
  const list=el('div','fwCards'),render=()=>{
    list.replaceChildren();const withdraw=select.value==='withdraw',items=withdraw?p.storedItems:f.loot,pages=Math.max(1,Math.ceil(items.length/12));fwStoragePage=clamp(fwStoragePage,0,pages-1);
    for(const it of items.slice(fwStoragePage*12,fwStoragePage*12+12)){const c=el('article','fwCard');c.append(el('h4','',it.name),el('p','',it.rarity+' · '+it.slot));fwButton(c,(withdraw?'Withdraw ':'Store ')+it.name,()=>{fwHomeStore(home,it.id,withdraw);render();},!withdraw&&(Object.values(f.worn).includes(it.id)||p.storedItems.length>=60));list.appendChild(c);}
    if(!items.length)list.appendChild(el('p','','This shelf is empty.'));
    fwButton(list,'Previous shelf',()=>{fwStoragePage--;render();},fwStoragePage===0);fwButton(list,'Next shelf',()=>{fwStoragePage++;render();},fwStoragePage>=pages-1);
  };select.addEventListener('change',()=>{fwStoragePage=0;render();});m.append(select,list);render();
  m.appendChild(el('h3','','Supplies'));for(const key of Object.keys(d.items)){
    m.appendChild(el('p','',`${key}: ${d.items[key]||0} carried / ${p.supplies[key]||0} stored`));
    fwButton(m,'Store one '+key,()=>{fwHomeSupply(home,key);fwHomeStorage(home);},!(d.items[key]>0));
    fwButton(m,'Withdraw one '+key,()=>{fwHomeSupply(home,key,true);fwHomeStorage(home);},!(p.supplies[key]>0));
  }
  for(const amount of [100,-100])fwButton(m,(amount>0?'Deposit':'Withdraw')+' 100 gold',()=>{if(amount>0&&d.gold<amount||amount<0&&(p.storedGold||0)<-amount)return;d.gold-=amount;p.storedGold=(p.storedGold||0)+amount;stSave();fwHomeStorage(home);},amount>0?d.gold<100:(p.storedGold||0)<100);
  fwButton(m,'Decorate this home',()=>fwFurnitureMenu(home));fwBack(m);
}
function fwNeighborhoodMenu(){
  const m=fwPanel('Hearthward','THE LANTERN NEIGHBORHOOD','A separate, peaceful district for your homes. Your existing deeds, original world doors, farm, gardens and stored gold remain. District doors lead to the same private interiors, not duplicate homes. Beds, cooking, furniture and household storage are all usable.');
  fwButton(m,'Travel to Hearthward',()=>{if(ST.battle)return;stCloseMenu();stEnterMap('hearthward',13,19);},!!ST.battle);
  fwButton(m,'Buy or inspect home deeds',stHousingMenu);fwButton(m,'Juniper’s furniture shop',()=>fwFurnitureMenu());
  if(stPropertyOwned(stData(),stData().map))fwButton(m,'Open this home’s storage',()=>fwHomeStorage(stData().map));fwBack(m);
}
const fwHousingNpc=stTalk;
stTalk=function(id){
  const n=ST_NPCS.find(n=>n.id===id);if(!n)return fwHousingNpc(id);
  if(n.fwKey==='furnisher'){stSay([[n.name,'No rent, no Crowns, no combat bonuses. Furnish your own home, one little story at a time.']],null,[['Browse furniture',()=>fwFurnitureMenu()],['Leave',null]]);return;}
  if(n.fwKey==='steward'){stSay([[n.name,'All six of the Vale’s property deeds are recognized here. Your old homes and original doors are safe.']],null,[['Housing deeds',stHousingMenu],['About Hearthward',fwNeighborhoodMenu],['Leave',null]]);return;}
  return fwHousingNpc(id);
};
const fwHousingNear=stNearby;
stNearby=function(){
  const d=stData();if(d.map==='hearthward'){const P=FW_PLOTS.find(p=>Math.hypot(d.x-(p.x+1)*64,d.y-(p.y+2)*64)<75);if(P)return{kind:'wardhome',label:'Visit '+ST_PROPERTIES.find(p=>p.id===P.id).name,P};}
  return fwHousingNear();
};
const fwHousingInteract=stInteract;
stInteract=function(pre){
  const it=pre||stNearby(),d=stData();
  if(it?.kind==='wardhome'){if(!stPropertyOwned(d,it.P.id))return stHousingMenu();d.homeWardReturn=it.P.id;return stEnterMap(it.P.id,Math.floor(ST_DUNGEONS[it.P.id].rows[0].length/2),ST_DUNGEONS[it.P.id].rows.length-2);}
  if(it?.kind==='homestore'&&stPropertyOwned(d,d.map))return fwHomeStorage(d.map);
  return fwHousingInteract(it);
};
const fwHousingEnter=stEnterMap;
stEnterMap=function(key,...args){
  const d=stData(),P=FW_PLOTS.find(p=>p.id===d.map);
  if(P&&key==='world'&&d.homeWardReturn===P.id){d.homeWardReturn=null;return fwHousingEnter('hearthward',P.x+.5,P.y+2);}
  if(ST_PROPERTIES.some(p=>p.id===key)&&d.map==='world')d.homeWardReturn=null;
  return fwHousingEnter(key,...args);
};
function fwDrawFurnishing(g,F,x,y){
  g.save();g.translate(x*64+32,y*64+32);g.fillStyle=F.color;g.strokeStyle='#4b4235';g.lineWidth=3;
  if(F.shape==='rug'){g.fillRect(-29,-23,58,46);g.strokeStyle='#e1d0a3';g.strokeRect(-24,-18,48,36);}
  else if(F.shape==='plant'){g.fillStyle='#9b7358';g.fillRect(-12,6,24,21);g.fillStyle=F.color;for(let i=0;i<5;i++){g.beginPath();g.ellipse(Math.sin(i*2.5)*12,-4+Math.cos(i*2.5)*9,10,18,i*.8,0,7);g.fill();}}
  else if(F.shape==='crystal'){g.fillStyle=F.color;g.shadowColor=F.color;g.shadowBlur=14;g.beginPath();g.moveTo(0,-29);g.lineTo(15,-6);g.lineTo(0,20);g.lineTo(-15,-6);g.closePath();g.fill();g.stroke();}
  else if(F.shape==='table'){g.beginPath();g.ellipse(0,0,28,22,0,0,7);g.fill();g.stroke();g.fillStyle='#eed8a3';g.beginPath();g.arc(0,-3,8,0,7);g.fill();}
  else if(F.shape==='bed'){g.fillStyle='#654a34';g.fillRect(-25,-29,50,58);g.fillStyle='#eee2c2';g.fillRect(-21,-25,42,17);g.fillStyle=F.color;g.fillRect(-21,-4,42,29);}
  else if(F.shape==='candle'){g.fillRect(-4,-14,8,39);g.fillRect(-17,23,34,5);g.fillStyle='#f3d389';g.beginPath();g.ellipse(0,-23,6,11,0,0,7);g.fill();}
  else if(F.shape==='banner'){g.beginPath();g.moveTo(-22,-25);g.lineTo(22,-25);g.lineTo(22,18);g.lineTo(0,29);g.lineTo(-22,18);g.closePath();g.fill();g.stroke();g.fillStyle='#edda98';g.fillRect(-4,-13,8,25);}
  else{g.fillRect(-23,-24,46,49);g.strokeRect(-23,-24,46,49);g.strokeStyle='#dfbd89';g.beginPath();g.moveTo(-20,0);g.lineTo(20,0);g.stroke();if(F.shape==='books')for(let i=0;i<7;i++){g.fillStyle=['#759d8a','#bc8d8a','#d7bf82'][i%3];g.fillRect(-18+i*5,-18,4,14);}if(F.shape==='chair'){g.fillStyle='#72513a';g.fillRect(-21,12,6,19);g.fillRect(15,12,6,19);}}
  g.restore();
}
const fwHousingDraw=stDrawDungeonCanvas;
stDrawDungeonCanvas=function(key){
  fwHousingDraw(key);const g=ST.dunC[key]?.getContext('2d');if(!g)return;
  if(key==='hearthward')for(const p of FW_PLOTS){const P=ST_PROPERTIES.find(P=>P.id===p.id),x=p.x*64,y=p.y*64;g.fillStyle=P.wall;g.fillRect(x+8,y+28,112,100);g.fillStyle=P.roof;g.beginPath();g.moveTo(x-6,y+35);g.lineTo(x+64,y-18);g.lineTo(x+134,y+35);g.closePath();g.fill();g.fillStyle='#ffe1a3';g.fillRect(x+19,y+53,24,26);g.fillRect(x+85,y+53,24,26);g.fillStyle='#654d37';g.fillRect(x+48,y+80,32,48);g.font='bold 15px sans-serif';g.textAlign='center';g.fillStyle='#fff0cb';g.strokeStyle='#2d3824';g.lineWidth=4;g.strokeText(P.name,x+64,y+158);g.fillText(P.name,x+64,y+158);}
  const p=stData()?.properties?.[key];for(const o of p?.placed||[]){const F=FW_FURNITURE.find(f=>f.id===o.id);if(F)fwDrawFurnishing(g,F,o.x,o.y);}
};
const fwHousingMenu=stOpenMenu;
stOpenMenu=function(){fwHousingMenu();if(ST.mode==='menu')fwButton($('stMenu'),'Hearthward · homes, furniture & storage',fwNeighborhoodMenu);};
ST_GUIDE.push(['Hearthward, furniture & storage','Use Menu → Hearthward for the peaceful neighborhood. The six existing deeds and original doors still work. Juniper sells eighteen furnishings for earned gold. Choose an owned home, walk to an empty indoor floor tile and place at your feet; pick up without losing the piece. Forty decorations and sixty stored equipment pieces per deed. Equipped items cannot be stored. Supplies and gold can also be deposited and withdrawn. Homes remain private per character slot; no player can access another save.']);
