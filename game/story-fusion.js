// Discoverable, bounded recipes combine learned archive spells and owned class moves.
const FW_FUSION_RECIPES=[
  ['steamveil','Steamveil','archive_ember_bolt','archive_tide_ward','well','ember','tide',.34,24,10,'A steaming field burns enemies while returning a little mana.'],
  ['thundergarden','Thundergarden','archive_bloom_well','archive_storm_bolt','trap','bloom','storm',1.1,24,11,'A living snare roots a foe and arcs to one nearby enemy.'],
  ['mirrorwinter','Mirrorwinter','archive_frost_lance','archive_prism_ward','beam','frost','prism',1.35,29,11,'A glacial beam slows enemies and builds a small barrier.'],
  ['eclipse','Eclipse Echo','archive_shade_bolt','archive_dawn_lance','echo','shade','dawn',.7,26,12,'Two twilight strikes mark enemies and interrupt their windup.'],
  ['gravemoss','Gravemoss Siphon','archive_bloom_bolt','class:drain','drain','bloom','shade',.9,25,12,'A life-stealing bloom technique that marks its target.'],
  ['steelstorm','Steelstorm','archive_storm_bolt','class:flurry','fan','storm','stone',.6,22,9,'A spreading storm of force drives enemies back.'],
  ['stoneoath','Stoneoath Aegis','archive_stone_ward','class:guard','ward','stone','prism',1,26,13,'A fortified ward with a brief defensive stance.'],
  ['phoenixrain','Phoenix Rain','archive_ember_rain','archive_bloom_ward','rain','ember','bloom',.34,33,15,'Five small ember impacts mend the caster for part of actual damage.'],
  ['undertow','Unwritten Undertow','archive_tide_lance','archive_shade_hex','well','tide','shade',.38,28,12,'A dark tidal field restores a little mana and marks its victims.'],
  ['northwind','Northwind Cut','archive_frost_bolt','class:frost','lance','frost','dawn',1.1,24,12,'A chilled lance interrupts a windup and slows movement.'],
  ['sunstrike','Sunsteel Lance','archive_dawn_bolt','class:strike','spear','dawn','stone',1.6,23,9,'Channel a martial strike through a radiant, knockback spear.'],
  ['voidstep','Veilstep','archive_shade_blink','class:ward','blink','shade','prism',.7,29,14,'A retreating burst marks nearby enemies and grants a small barrier.']
];
const FW_FUSIONS={};
for(const [key,name,a,b,form,school,secondary,power,mp,cooldown,desc]of FW_FUSION_RECIPES){
  const level=Math.max(FW_SPELLS[a]?.level||1,FW_SPELLS[b]?.level||5,8),id='fusion_'+key;
  FW_FUSIONS[id]={id,name,a,b,form,school,secondary,power,mp,cooldown,level,desc,color:FW_SCHOOLS.find(s=>s.id===school).color,fusion:true};
}
function fwFusionIngredient(id){
  const d=stData();return id.startsWith('class:')?d.skills.some(k=>stOwnsSkill(d,k)&&ST_SKILLS[k]?.base===id.slice(6)):fwData().learned.includes(id);
}
function fwFusionReady(S){return !stData().hr&&stData().lv>=S.level&&fwFusionIngredient(S.a)&&fwFusionIngredient(S.b);}
function fwFuse(id){
  const S=FW_FUSIONS[id],d=stData(),f=fwData();if(ST.battle||!S||!fwFusionReady(S)||f.learned.includes(id)||f.shards<3||d.gold<120)return false;
  f.shards-=3;d.gold-=120;f.learned.push(id);stSave();return true;
}
function fwFusionEffect(foe,dealt,S){
  if(!dealt)return;const d=stData(),s=stStats(),school=S.secondary;
  if(school==='tide')d.mp=Math.min(s.mp,d.mp+Math.max(1,Math.round(dealt*.025)));
  if(school==='bloom')d.hp=Math.min(s.hp,d.hp+Math.round(dealt*.10));
  if(school==='prism')RT.barrier=Math.min(s.hp*.18,RT.barrier+dealt*.06);
  if(school==='shade')foe.mark=RT.time+4;
  if(school==='stone'){const a=Math.atan2(foe.y-d.y,foe.x-d.x);[foe.x,foe.y]=rtSafePoint(foe.x+Math.cos(a)*18,foe.y+Math.sin(a)*18,[foe.x,foe.y]);}
  if(school==='dawn'&&(!foe.boss||!foe.interruptLock||foe.interruptLock<RT.time)){foe.windup=null;foe.next=Math.max(foe.next||0,RT.time+(foe.boss?.25:.7));foe.interruptLock=RT.time+5;}
  if(school==='storm'&&!RT.chaining){const other=ST.battle.foes.find(f=>f!==foe&&f.hp>0&&Math.hypot(f.x-foe.x,f.y-foe.y)<170);if(other){RT.chaining=true;rtDamage(other,dealt*.18,FW_SCHOOLS.find(s=>s.id===school).color,'mag');RT.chaining=false;}}
  rtFx('ring',foe.x,foe.y,FW_SCHOOLS.find(s=>s.id===school).color,.35,28);
}
function fwFusionMenu(){
  const d=stData(),f=fwData(),m=fwPanel('The Confluence Workshop','MAGIC + MAGIC / MAGIC + CLASS ABILITY',`${f.shards} crystal shards · ${d.gold} gold. Twelve original fusion recipes sit alongside the 200 base spells. Learn both ingredients first; a class ingredient must belong to your class. Forge for 3 earned shards and 120 gold. Fusions occupy the same four archive slots, not extra slots. Their dual effects trade raw power for versatility.`);
  const ingredient=id=>id.startsWith('class:')?'Your class’s '+id.slice(6)+' technique':FW_SPELLS[id].name;
  const list=el('div','fwCards');m.appendChild(list);
  for(const S of Object.values(FW_FUSIONS)){
    const known=f.learned.includes(S.id),equipped=f.equipped.includes(S.id),c=el('article','fwCard');
    c.append(el('small','fwKicker',`LEVEL ${S.level} / ${S.school.toUpperCase()} + ${S.secondary.toUpperCase()}`),el('h4','',S.name),el('p','',ingredient(S.a)+' + '+ingredient(S.b)),el('p','',S.desc),el('p','',`${S.mp} MP · ${S.cooldown}s cooldown`));
    fwButton(c,known?'Fusion learned':'Forge '+S.name,()=>{fwFuse(S.id);fwFusionMenu();},known||!!ST.battle||!fwFusionReady(S)||f.shards<3||d.gold<120);
    if(known)fwButton(c,equipped?'Unequip '+S.name:'Equip '+S.name,()=>{if(ST.battle)return;if(equipped)f.equipped=f.equipped.filter(id=>id!==S.id);else if(f.equipped.length<4)f.equipped.push(S.id);stSave();fwFusionMenu();},!!ST.battle||!equipped&&f.equipped.length>=4);list.appendChild(c);
  }fwButton(m,'Study base spell ingredients',fwSpellbook);fwButton(m,'Train class ingredients',stClassMenu);fwBack(m);
}
const fwFusionBook=fwSpellbook;
fwSpellbook=function(){fwFusionBook();fwButton($('stMenu'),'Combine spells & abilities',fwFusionMenu);};
const fwFusionOpen=stOpenMenu;
stOpenMenu=function(){fwFusionOpen();if(ST.mode==='menu')fwButton($('stMenu'),'Confluence · combine spells & abilities',fwFusionMenu);};
ST_GUIDE.push(['Combining magic & abilities','The Confluence Workshop has twelve learnable fusions. Some combine two archive spells; others require a learned, class-owned guard, flurry, drain, frost, strike or ward technique. Three earned shards and 120 gold unlock each eligible recipe once. Fusions share the four archive spell slots. Dual effects, reduced raw coefficients, higher mana costs and longer cooldowns keep combinations tactical rather than universally stronger.']);
