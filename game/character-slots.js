let crTargetSlot=0,crTargetOriginal=null;
function stSelectCharacterSlot(index){
  if(ST.on||![0,1].includes(index))return false;
  const slots=stEnsureStorySlots(PROF);
  slots[PROF.storySlot]=PROF.story;
  PROF.storySlot=index;PROF.story=slots[index]||null;saveProfile();return true;
}
function stRenderCharacterSlots(){
  const slots=stEnsureStorySlots(PROF),container=$('stCharacterSlots');container.replaceChildren();
  slots.forEach((d,index)=>{
    const active=PROF.storySlot===index,card=el('button','storySlotCard'+(active?' isSelected':''));
    card.type='button';card.dataset.slot=String(index+1);
    card.setAttribute('aria-pressed',String(active));
    card.setAttribute('aria-label',`Select character slot ${index+1}${d?': '+d.name+', level '+d.lv+' '+(ST_CLASSES[d.cls]?.name||d.cls):' (empty)'}`);
    const art=el('canvas');art.width=96;art.height=114;art.setAttribute('aria-hidden','true');
    const g=art.getContext('2d');g.translate(48,104);
    if(d){g.scale(1.5,1.5);fwChibi(g,{look:ST_CLASSES[d.cls]?.look||'knight',color:d.color,outfit:d.outfit,team:0,level:d.lv,face:0,x:0,y:0,walk:0,_lw:0,atkT:0,atkCd:1,hitFlash:0,id:1},0);}
    else{g.fillStyle='#b7b29a';g.font='36px Cinzel,serif';g.textAlign='center';g.fillText('+',0,-35);}
    const body=el('div','slotBody');
    body.append(el('small','',`CHARACTER SLOT ${index+1}${active?' · SELECTED':''}`),
      el('h3','',d?d.name:'An unwritten legend'),
      el('p','',d?`Level ${d.lv} ${ST_CLASSES[d.cls]?.name||d.cls}`:'Empty character slot'),
      el('span','',d?`Chapter ${Math.min(4,(d.ch||0)+1)} of 4`:'Create another hero. Keep your first.'));
    card.append(art,body);
    card.addEventListener('click',()=>{if(stSelectCharacterSlot(index))openStoryMenu();});
    container.appendChild(card);
  });
  const empty=slots.findIndex(d=>!d);
  $('stNew').textContent=!slots[PROF.storySlot]?'Create hero in slot '+(PROF.storySlot+1):empty>=0?'Create hero in slot '+(empty+1):'Replace selected hero';
}
function stBeginCharacterCreation(){
  if(ST.on)return;
  const slots=stEnsureStorySlots(PROF);
  let target=PROF.storySlot;
  if(slots[target]&&slots.some(d=>!d))target=slots.findIndex(d=>!d);
  const existing=slots[target];
  if(existing&&!confirm(`Replace ${existing.name} in character slot ${target+1}? Only this hero's adventure will be erased when you finish creating. Your other slot and account purchases will not change. This cannot be undone.`))return;
  if(!stSelectCharacterSlot(target))return;
  crTargetSlot=target;crTargetOriginal=existing||null;
  crSel={cls:'warrior',race:'human',color:ST_COLORS[0],skills:[],voice:'m',outfit:{race:'human',hat:'none'},attr:{},diff:1};
  crStep=0;$('crName').value='';renderCreator();show('scr-create');
}
function stConfirmCharacterTarget(){
  if(ST.on||crSel.skills.length!==3)return false;
  const slots=stEnsureStorySlots(PROF),existing=slots[crTargetSlot];
  if(existing&&existing!==crTargetOriginal&&!confirm(`Character slot ${crTargetSlot+1} now contains ${existing.name}. Replace this hero? The other slot will be kept.`))return false;
  return stSelectCharacterSlot(crTargetSlot);
}
const stSlotStyles=el('style');
stSlotStyles.textContent=`
.storySlots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;width:100%;max-width:820px;margin:22px auto 26px}
.storySlotCard{display:flex;align-items:center;gap:12px;min-width:0;min-height:154px;padding:16px 12px;background:#172222;color:#e8e0cb;border:1px solid #647265;border-radius:6px;text-align:left;cursor:pointer;font-family:'Barlow Semi Condensed',sans-serif}
.storySlotCard:hover{background:#21302c;border-color:#d3b16a}.storySlotCard.isSelected{border-color:#e2be68;box-shadow:inset 0 0 0 1px #e2be68}
.storySlotCard:focus-visible{outline:2px solid #f5d67c;outline-offset:4px}
.storySlotCard canvas{width:80px;height:100px;flex:0 0 80px}
.slotBody{min-width:0}.slotBody small{display:block;color:#bfcca8;font-size:11px;letter-spacing:.07em}
.storySlotCard .slotBody h3{font:600 20px/1.25 'Cinzel',serif;color:#f0dba0;overflow-wrap:anywhere;margin:10px 0 7px}
.storySlotCard .slotBody p{margin:0 0 5px;font-size:15px;color:#e8e0cb}.slotBody span{font-size:13px;line-height:1.4;color:#bdc8bb}
@media(max-width:640px){.storySlots{grid-template-columns:1fr;gap:10px;margin:16px auto}.storySlotCard{min-height:126px;padding:10px 12px}.storySlotCard canvas{width:68px;height:88px;flex-basis:68px}.storySlotCard .slotBody h3{font-size:18px;margin:7px 0}.slotBody small{font-size:12px}}
`;
document.head.appendChild(stSlotStyles);
ST_GUIDE.push(['Two character slots','The story screen holds two independent heroes. Select a character slot, then Continue story. New story prefers an empty slot so you can create a second class without erasing your first. With both slots occupied, replacing the selected hero requires confirmation; cancelling creation preserves that hero. Levels, class, quests, souls, mounts, equipment and housing are per hero. Account purchases, Crowns and cosmetics are shared. Both characters are included in local and cloud profile saves; storage availability and account sync still follow the existing save rules.']);
