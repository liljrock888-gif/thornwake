// 800 catalog entries: 200 in each requested equipment family, all earnable.
const FW_RARITIES=['Common','Uncommon','Rare','Epic','Legendary'];
const FW_TIER_RARITY=[0,0,1,1,2,2,3,3,4,4];
const FW_TIER_LEVEL=[1,5,10,16,22,28,35,42,50,58];
const FW_MATERIALS=['Wayfarer','Copperleaf','Ironbound','Silverthread','Runewoven','Moonlit','Stormglass','Sunsealed','Starforged','Worldroot'];
const FW_ITEM_COLORS=['#8c9986','#a29a75','#7d99a2','#b3b8c2','#86b8a8','#aaa1c3','#83baca','#d6bc7d','#bda6cd','#bed4a4'];
const FW_ARCHETYPES={
  weapon:['Dagger','Sabre','Longsword','Greatsword','Battleaxe','Warhammer','Spear','Halberd','Longbow','Crossbow','Runelock','Wand','Staff','Grimoire','Scepter','Focus Orb','Twin Blades','Glaive','Mace','Gauntlets'],
  armor:['Padded Vest','Leather Jerkin','Scout Harness','Scale Coat','Chain Shirt','Lamellar Vest','Brigandine','Knight Cuirass','Warden Plate','Runic Hauberk','Hide Armor','Boneguard','Crystal Mail','Ranger Coat','Sage Robe','Battle Cassock','Wyrmcoat','Mirrorplate','Duelist Guard','Bastion Shell'],
  clothing:['Traveler Tunic','Linen Shirt','Velvet Coat','Pilgrim Cloak','Forest Cape','Scholar Gown','Harbor Jacket','Festival Dress','Noble Doublet','Monastic Wrap','Desert Mantle','Snowbound Parka','Witch Shawl','Court Attire','Ranger Poncho','Smith Apron','Sage Vestments','Moonlit Kimono','Silk Sash','Lantern Uniform'],
  accessory:['Signet','Band','Loop','Seal Ring','Prism Ring','Oath Ring','Tide Ring','Hawk Ring','Sage Ring','Warden Ring','Pendant','Brooch','Charm','Locket','Rosary','Talisman','Medallion','Rune Bead','Compass','Heartstone']
};
const FW_CATALOG=[];
for(const [family,names]of Object.entries(FW_ARCHETYPES))for(let tier=0;tier<10;tier++)names.forEach((name,index)=>{
  const level=FW_TIER_LEVEL[tier],rarity=FW_RARITIES[FW_TIER_RARITY[tier]],power=Math.round(3+level*.43+(index%5)*.7);
  let slot=family,stats={},kind='phys',range=100,delay=.72;
  if(family==='weapon'){
    slot='weapon';kind=index>=11&&index<=15?'mag':'phys';range=index>=8&&index<=15?430:index===6||index===7||index===17?135:100;
    delay=[0,16,19].includes(index)?.56:[3,4,5,7].includes(index)?.94:.72;
    stats={[kind==='mag'?'mag':'atk']:power+([3,4,5,7].includes(index)?3:0)};
  }else if(family==='armor'){
    slot='armor';stats={def:Math.max(2,Math.round(power*.65))};
    stats[index%4===0?'hp':index%4===1?'mp':index%4===2?'atk':'mag']=Math.max(1,Math.round(power*(index%4<2?1.1:.16)));
  }else if(family==='clothing'){
    slot='clothing';stats={[index%2?'mp':'hp']:Math.round(4+level*.35)};
  }else{
    slot=index<10?'ring':'charm';const stat=['atk','mag','def','mp','hp'][index%5];stats[stat]=Math.max(1,Math.round(power*(stat==='mp'||stat==='hp'?1.5:.4)));
  }
  FW_CATALOG.push({id:`catalog_${family}_${tier}_${index}`,name:FW_MATERIALS[tier]+' '+name,family,slot,level,rarity,stats,
    price:Math.round((35+level*level*.75)*(1+FW_TIER_RARITY[tier]*.3)),kind,range,delay,color:FW_ITEM_COLORS[(tier+index)%10],style:index});
});
// Keep the earlier named shop stock and IDs without exceeding 200 per family.
for(const old of FW_WEAPONS){
  const family=old.slot==='weapon'?'weapon':old.slot==='armor'?'armor':'accessory';
  const index=FW_CATALOG.findIndex(it=>it.family===family&&!it.classic);
  FW_CATALOG[index]={...FW_CATALOG[index],...old,family,classic:true,kind:old.stats.mag?'mag':'phys',range:/Wand|Staff|Grimoire|bow|Pistol/.test(old.name)?430:110,delay:.72};
}
let fwCatalogSearch='',fwCatalogFamily='weapon',fwCatalogRarity='all',fwCatalogPage=0;
fwBuy=function(id){
  const d=stData(),f=fwData(),it=FW_CATALOG.find(x=>x.id===id);
  if(ST.battle||!it||d.lv<it.level||d.gold<it.price||f.loot.some(x=>x.id===id)||fwStoredOwn(id))return false;
  d.gold-=it.price;f.loot.push(structuredClone(it));stSave();return true;
};
fwShop=function(){
  const d=stData(),f=fwData(),m=fwPanel('The Lantern Armory','800 ITEMS / EARNED GOLD ONLY',`${d.gold} gold. 200 weapons, 200 armor pieces, 200 clothing pieces and 200 accessories. Five rarity tiers, level requirements and one item per slot. Clothing has a separate equipment slot. No Crowns or paid combat purchases.`);
  const tools=el('div','fwTools'),search=el('input'),family=el('select'),rarity=el('select'),summary=el('p','fwCount'),list=el('div','fwCards'),pager=el('div','fwPager');
  search.placeholder='Search equipment';search.value=fwCatalogSearch;search.setAttribute('aria-label','Search equipment shop');
  for(const [id,label]of [['weapon','Weapons · 200'],['armor','Armor · 200'],['clothing','Clothing · 200'],['accessory','Accessories · 200']]){
    const o=el('option','',label);o.value=id;o.selected=id===fwCatalogFamily;family.appendChild(o);
  }family.setAttribute('aria-label','Equipment category');
  for(const value of ['all',...FW_RARITIES]){
    const o=el('option','',value==='all'?'All rarities':value);o.value=value;o.selected=value===fwCatalogRarity;rarity.appendChild(o);
  }rarity.setAttribute('aria-label','Equipment rarity');
  const render=()=>{
    const items=FW_CATALOG.filter(it=>it.family===fwCatalogFamily&&(fwCatalogRarity==='all'||it.rarity===fwCatalogRarity)&&
      (it.name+' '+it.slot+' '+it.rarity).toLowerCase().includes(fwCatalogSearch.toLowerCase()));
    const pages=Math.max(1,Math.ceil(items.length/20));fwCatalogPage=Math.min(fwCatalogPage,pages-1);list.replaceChildren();pager.replaceChildren();
    summary.textContent=`${items.length} matching ${fwCatalogFamily} items · Page ${fwCatalogPage+1}/${pages}`;
    if(!items.length)list.appendChild(el('p','','No items match this search and rarity.'));
    for(const it of items.slice(fwCatalogPage*20,fwCatalogPage*20+20)){
      const card=el('article','fwCard rarity'+it.rarity),owned=f.loot.some(x=>x.id===it.id);
      card.append(el('small','fwKicker',it.rarity.toUpperCase()+' / LEVEL '+it.level),el('h4','',it.name),el('p','',Object.entries(it.stats).map(([k,v])=>'+'+v+' '+k.toUpperCase()).join(' · ')));
      if(it.slot==='weapon')card.appendChild(el('small','',`${it.kind==='mag'?'Magic':'Physical'} · ${it.range} range · ${it.delay}s basic cooldown`));
      fwButton(card,owned?'Owned':`Buy · ${it.price} gold`,()=>{if(fwBuy(it.id))fwShop();},!!ST.battle||owned||d.lv<it.level||d.gold<it.price);list.appendChild(card);
    }
    fwButton(pager,'Previous page',()=>{fwCatalogPage--;render();},fwCatalogPage===0);
    fwButton(pager,'Next page',()=>{fwCatalogPage++;render();},fwCatalogPage>=pages-1);
  };
  search.addEventListener('input',()=>{fwCatalogSearch=search.value;fwCatalogPage=0;render();});
  family.addEventListener('change',()=>{fwCatalogFamily=family.value;fwCatalogPage=0;render();});
  rarity.addEventListener('change',()=>{fwCatalogRarity=rarity.value;fwCatalogPage=0;render();});
  tools.append(search,family,rarity);m.append(tools,summary,list,pager);render();
  fwButton(m,'Open equipment',fwEquipment);fwBack(m);
};
let fwBagPage=0;
fwEquipment=function(){
  const d=stData(),f=fwData(),m=fwPanel('Adventurer’s equipment','WEAPON / ARMOR / CLOTHING / RING / CHARM',`${f.loot.length} items · ${f.shards} crystal shards. One item per slot. Existing crafted gear is preserved. Equipment changes are unavailable during an encounter.`);
  const worn=Object.entries(f.worn).map(([slot,id])=>slot+': '+(f.loot.find(x=>x.id===id)?.name||'Empty')).join(' · ');
  m.appendChild(el('p','',worn||'Nothing equipped from the new bag.'));
  const pages=Math.max(1,Math.ceil(f.loot.length/20));fwBagPage=clamp(fwBagPage,0,pages-1);const list=el('div','fwCards');m.appendChild(list);
  if(!f.loot.length)list.appendChild(el('p','','Visit an armorer or defeat enemies to find equipment.'));
  for(const it of f.loot.slice(fwBagPage*20,fwBagPage*20+20)){
    const card=el('article','fwCard rarity'+it.rarity);
    card.append(el('h4','',it.name),el('p','',`${it.rarity} · ${it.slot} · Level ${it.level} · `+Object.entries(it.stats).map(([k,v])=>'+'+v+' '+k.toUpperCase()).join(' · ')));
    fwButton(card,f.worn[it.slot]===it.id?'Unequip':'Equip',()=>{fwEquip(it.id);fwEquipment();},!!ST.battle||d.lv<it.level);list.appendChild(card);
  }
  m.appendChild(el('p','',`Page ${fwBagPage+1}/${pages}`));fwButton(m,'Previous page',()=>{fwBagPage--;fwEquipment();},fwBagPage===0);
  fwButton(m,'Next page',()=>{fwBagPage++;fwEquipment();},fwBagPage>=pages-1);fwButton(m,'Visit the armory',fwShop);fwBack(m);
};
function fwWorn(slot){const f=fwData();return f.loot.find(it=>it.id===f.worn[slot])||null;}
const fwCatalogEnd=stEndBattle;
stEndBattle=function(result){
  const b=ST.battle;if(b&&!b.ended&&!b.catalogRolled&&result==='won'){
    b.catalogRolled=true;const d=stData(),f=fwData();
    if(Math.random()<(b.bossId?.65:.25)){
      const eligible=FW_CATALOG.filter(it=>it.level<=d.lv+2&&!f.loot.some(x=>x.id===it.id)&&
        FW_RARITIES.indexOf(it.rarity)<=(b.bossId?4:d.lv>=35?3:d.lv>=15?2:1));
      const item=eligible[Math.floor(Math.random()*eligible.length)];
      if(item){f.loot.push(structuredClone(item));stLearnNotice(`${item.rarity} loot: ${item.name}`,item.color);}
    }
  }
  return fwCatalogEnd(result);
};
FW_RESIDENTS.push(
  ['botanist','Botanist Saela','These vines are older than the kingdoms. They remember the rain before the sea had a name. Restore the jungle crystals and the roots may trust us again.'],
  ['pathfinder','Pathfinder Rook','In the dunes, follow the stars, not the road. Roads were laid by people who expected the world to stay still.'],
  ['frostwarden','Frostwarden Eira','The mountain does not test strength alone. A warm cloak, a kept promise and a steady lantern have saved more lives than swords.']
);
FW_LANDS.push(
  {id:'jadecanopy',name:'Jadecanopy',sub:'The Verdant Expanse',terrain:'jungle',level:32,color:'#9cdb9e',lore:'An immense jungle of hanging vines, luminous flowers and river-cut trails. A canopy settlement guards the roots of the oldest crystal.',streets:['Vinewalk','Rainmarket Trail','Emerald Crossing','Rootkeeper’s Path'],residents:['botanist','historian','smith','warden','ferryman','seer'],palette:{sea:'#1c5251',grass:'#285d3c',grass2:'#326945',road:'#858566',roof:'#436c4f'}},
  {id:'duneglass',name:'Duneglass',sub:'The Saffron Wastes',terrain:'desert',level:42,color:'#ebd09c',lore:'Wind-carved dunes, sunken sandstone shrines and oasis roads. Caravans shelter beneath cloth awnings while crystals hold the memory of rain.',streets:['Caravan Crescent','Saffron Road','Oasis Steps','Starwatch Lane'],residents:['pathfinder','archivist','smith','warden','ferryman','casino'],palette:{sea:'#4e8990',grass:'#b7a66d',grass2:'#c3af77',road:'#c7b78a',mount:'#9b8067',hut:'#c8ac7b',roof:'#926e57'}},
  {id:'frostcrag',name:'Frostcrag',sub:'The Silver Highlands',terrain:'snow',level:52,color:'#b6d8e9',lore:'Pine forests, icy ridgelines and snow-covered keeps linked by lantern roads. The highland wardens guard the last crystal before the sky turns to silver.',streets:['Wintergate','Pinewatch Road','Silverpass','Hearthlight Circle'],residents:['frostwarden','librarian','smith','warden','ferryman','tidekeeper'],palette:{sea:'#355b6a',grass:'#c6d8cf',grass2:'#d6e2dc',road:'#9faeaa',mount:'#8fa2ab',hut:'#a7a191',roof:'#71868e'}}
);
for(let i=3;i<FW_LANDS.length;i++)fwBuildLand(FW_LANDS[i],i);
for(const [id,name,map,giver,gold,xp]of [
  ['jungle_roots','The heart of the canopy','jadecanopy','botanist',480,400],
  ['dune_rain','Rain held in glass','duneglass','pathfinder',650,560],
  ['winter_hearth','A hearth above the clouds','frostcrag','frostwarden',820,720]
])FW_QUESTS.push({id,name,map,giver,gold,xp,desc:`Restore the three street crystals in ${FW_LANDS.find(l=>l.id===map).name}, then return to the quest giver.`});
const fwOldQuestReady=fwQuestReady;
fwQuestReady=function(Q,f=fwData()){
  if(['jungle_roots','dune_rain','winter_hearth'].includes(Q.id))return [0,1,2].every(n=>f.nodes[Q.map+'_'+n]);
  return fwOldQuestReady(Q,f);
};
const fwWanderQuest=FW_QUESTS.find(q=>q.id==='wanderer');fwWanderQuest.name='Six distant hearths';fwWanderQuest.desc='Visit all six new frontier lands.';fwWanderQuest.gold=400;fwWanderQuest.xp=320;
const fwCatalogStyle=el('style');fwCatalogStyle.textContent=`
.rarityCommon{border-left-color:#a9b3a2}.rarityUncommon{border-left-color:#9bc994}.rarityRare{border-left-color:#8db5d9}.rarityEpic{border-left-color:#baa0d8}.rarityLegendary{border-left-color:#dfbd73;background:#302e20}
.fwPager{display:flex;justify-content:space-between;margin:12px 0}.fwTools:has([aria-label="Equipment category"]){flex-wrap:wrap}.fwTools:has([aria-label="Equipment category"]) input{flex-basis:100%}
`;document.head.appendChild(fwCatalogStyle);
ST_GUIDE.push(['Equipment rarities & wild terrains','The Lantern Armory has 800 original catalog items: 200 weapons, 200 armor pieces, 200 clothes and 200 accessories. Search by name and filter by category or rarity. Common, Uncommon, Rare, Epic and Legendary items have level gates. Weapons have actual attack type, range and speed; clothing has its own slot and color. Enemies can drop eligible equipment; first-clear 25-floor labyrinth seals guarantee a legendary relic. Visit Jadecanopy’s jungle rivers, Duneglass’s sand and oasis, and Frostcrag’s pine-covered snowy mountains through Lands & stories.']);
