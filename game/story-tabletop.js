// Optional tabletop creation and checks. No changes to an existing hero unless chosen.
const TT_ABILITIES=['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
const TT_COST={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
const TT_BACKGROUNDS=[
  ['scholar','Archive Scholar','arcana','history','int'],
  ['soldier','Castle Retainer','athletics','intimidation','str'],
  ['outlander','Frontier Wanderer','survival','perception','wis'],
  ['artisan','Crystal Artisan','investigation','sleight','int'],
  ['envoy','Harbor Envoy','persuasion','insight','cha'],
  ['urchin','Street Wayfarer','stealth','acrobatics','dex']
].map(([id,name,a,b,stat])=>({id,name,skills:[a,b],stat}));
const TT_SKILLS={athletics:0,acrobatics:1,sleight:1,stealth:1,arcana:3,history:3,investigation:3,survival:4,perception:4,insight:4,persuasion:5,intimidation:5};
function ttBuild(){
  if(!crSel.tabletop)crSel.tabletop={scores:[10,14,14,14,10,10],background:'scholar',ideal:'Protect people whose stories are forgotten.'};
  return crSel.tabletop;
}
function ttCost(scores){return scores.reduce((sum,n)=>sum+(TT_COST[n]??1000),0);}
function ttValid(t){return !!t&&Array.isArray(t.scores)&&t.scores.length===6&&t.scores.every(n=>Number.isInteger(n)&&n>=8&&n<=15)&&ttCost(t.scores)<=27&&TT_BACKGROUNDS.some(b=>b.id===t.background);}
function ttSheet(d=stData()){
  const t=d?.tabletop;if(!ttValid(t))return null;
  return {...t,proficiency:Math.min(6,2+Math.floor((d.lv-1)/4)),skills:TT_BACKGROUNDS.find(b=>b.id===t.background).skills};
}
function ttRoll(skill,dc=12){
  const d=stData(),t=ttSheet(d),index=TT_SKILLS[skill]??4,score=t?t.scores[index]:10,mod=Math.floor((score-10)/2),proficient=!!t?.skills.includes(skill),prof=proficient?t.proficiency:0;
  const die=1+Math.floor(Math.random()*20),total=die+mod+prof;
  return {die,total,mod,proficiency:prof,dc,success:total>=dc,skill};
}
const ttStyle=el('style');ttStyle.textContent=`
#ttCreator{padding:16px;margin:16px 0;background:#182b23;border:1px solid #81916d;color:#e5dfc9}
#ttCreator h3{font:600 20px 'Barlow Semi Condensed',sans-serif;margin:0 0 10px}
.ttScores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ttScore{padding:8px;background:#23382d;border:1px solid #5e725e;text-align:center}
.ttScore label{display:block;font-size:14px}.ttScore strong{font-size:22px;display:block;margin:4px}.ttScore button{min-width:36px;min-height:36px;font-size:18px}
#ttCreator select,#ttCreator input{width:100%;min-height:44px;padding:8px;font:16px 'Barlow Semi Condensed',sans-serif;background:#10241a;color:#eee3c6;border:1px solid #7e8b6c;margin:8px 0}
@media(max-width:480px){.ttScores{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(ttStyle);
const ttToggle=el('button','mbtn small','Optional tabletop character builder');ttToggle.id='ttToggle';
const ttBox=el('section');ttBox.id='ttCreator';ttBox.hidden=true;
$('crStep0').append(ttToggle,ttBox);
ttToggle.addEventListener('click',()=>{ttBox.hidden=!ttBox.hidden;if(!ttBox.hidden)ttRender();});
function ttRender(){
  const t=ttBuild();ttBox.replaceChildren();ttBox.append(el('h3','','Write your own origin'),el('p','',`27-point buy · ${27-ttCost(t.scores)} points remaining. Scores 8–15. Costs rise at 14 and 15. Your class and race stay independent.`));
  const grid=el('div','ttScores');
  TT_ABILITIES.forEach((name,i)=>{
    const box=el('div','ttScore'),mod=Math.floor((t.scores[i]-10)/2);
    box.append(el('label','',name),el('strong','',t.scores[i]+' ('+(mod>=0?'+':'')+mod+')'));
    for(const [delta,label]of [[-1,'−'],[1,'+']]){
      const b=el('button','',label);b.type='button';b.setAttribute('aria-label',(delta>0?'Increase ':'Decrease ')+name);
      b.disabled=t.scores[i]+delta<8||t.scores[i]+delta>15||delta>0&&ttCost(t.scores)-TT_COST[t.scores[i]]+TT_COST[t.scores[i]+delta]>27;
      b.addEventListener('click',()=>{const proposed=t.scores.slice();proposed[i]+=delta;if(proposed[i]>=8&&proposed[i]<=15&&ttCost(proposed)<=27){t.scores=proposed;ttRender();}});box.appendChild(b);
    }grid.appendChild(box);
  });ttBox.appendChild(grid);
  const select=el('select');select.setAttribute('aria-label','Character background');
  for(const B of TT_BACKGROUNDS){const o=el('option','',B.name+' · '+B.skills.join(' + '));o.value=B.id;o.selected=B.id===t.background;select.appendChild(o);}
  select.addEventListener('change',()=>{t.background=select.value;});ttBox.appendChild(select);
  const ideal=el('input');ideal.maxLength=100;ideal.value=t.ideal||'';ideal.setAttribute('aria-label','Character ideal');ideal.placeholder='What does your character believe?';
  ideal.addEventListener('input',()=>{t.ideal=ideal.value;});ttBox.appendChild(ideal);
  ttBox.appendChild(el('p','','Checks roll d20 + attribute modifier + background proficiency when trained. Combat gets small capped attribute bonuses, not a second full stat system. Backgrounds open extra options in frontier conversations.'));
  const remove=el('button','fwButton','Use normal creation instead');remove.addEventListener('click',()=>{delete crSel.tabletop;ttBox.hidden=true;});ttBox.appendChild(remove);
}
const ttBaseRender=renderCreator;
renderCreator=function(){ttBaseRender();ttBox.hidden=true;};
const ttBaseStats=stStats;
stStats=function(){
  const s=ttBaseStats(),t=ttSheet();if(!t)return s;
  const mods=t.scores.map(n=>Math.floor((n-10)/2));
  s.atk+=mods[0];s.spd+=Math.max(0,mods[1]);s.hp+=mods[2]*3;s.mag+=mods[3];s.mp+=Math.max(0,mods[4])*3;s.def+=Math.max(0,mods[1]-1);
  s.hp=Math.max(1,s.hp);s.atk=Math.max(1,s.atk);s.mag=Math.max(1,s.mag);return s;
};
function ttCheckConversation(skill,dc,token){
  const f=fwData();if(f.choices[token])return stSay([['Fate remembers','This scene has already been resolved. Your first roll stands.']]);
  const roll=ttRoll(skill,dc);f.choices[token]=roll; // Persist before granting rewards: never reroll by reopening.
  if(roll.success){stData().gold+=25;f.shards++;}
  stSave();stSay([['A moment of chance',`${skill}: d20 (${roll.die}) ${roll.mod>=0?'+':''}${roll.mod} + ${roll.proficiency} proficiency = ${roll.total} against DC ${dc}. ${roll.success?'Success. You uncover a forgotten route and receive 25 gold and a crystal shard.':'The clue slips away. No quest is blocked; the normal path remains open.'}`]]);
}
const ttBaseTalk=stTalk;
stTalk=function(id){
  const n=ST_NPCS.find(n=>n.id===id);ttBaseTalk(id);
  if(!n?.fwKey||!ST.dlg||!ttSheet())return;
  const mapping={lamplighter:['arcana',12],smith:['athletics',13],archivist:['history',13],historian:['insight',14],seer:['perception',14],ferryman:['persuasion',12],postmaster:['investigation',12],librarian:['arcana',15]};
  const check=mapping[n.fwKey];if(!check)return;
  const [skill,dc]=check,token='check_'+id;
  if(fwData().choices[token])return;
  ST.dlg.choices.splice(ST.dlg.choices.length-1,0,[`${skill} check · DC ${dc}`,()=>ttCheckConversation(skill,dc,token)]);
  stShowLine();
};
const TT_NEW_CLASSES=[
  {id:'runeknight',name:'Runeknight',look:'paladin',hp:118,mp:55,atk:12,mag:12,def:8,spd:6,role:'Armored rune-caster. Magic hits generate a capped barrier; rune techniques reinforce it.',special:['rune','rune','slow','rune','edge','rune','rune','rune'],
    names:['Rune Cut','Aegis Script','Binding Rune','Prism Guard','Oathpiercer','Runic Reversal','Bastion Circle','King’s Inscription']},
  {id:'spellblade',name:'Spellblade',look:'samurai',hp:105,mp:58,atk:13,mag:12,def:5,spd:10,role:'Mobile sword-and-spell hybrid. Techniques charge follow-up weapon hits and reposition.',special:['edge','blink','edge','edge','blink','edge','edge','blink'],
    names:['Spell Edge','Rift Step','Mooncut','Aether Guard','Flickering Point','Storm Sheath','Arcane Flourish','Horizon Split']},
  {id:'chronomancer',name:'Chronomancer',look:'mage',hp:90,mp:76,atk:5,mag:16,def:4,spd:8,role:'Time-control mage. Slows enemies, hastens movement and restores a bounded amount of recently lost health. Spell cooldowns are 10% shorter.',special:['slow','haste','rewind','slow','haste','rewind','slow','rewind'],
    names:['Second Hand','Borrowed Moment','Minor Rewind','Hourglass Seal','Haste Thread','Time Stitch','Still Hour','Yesterday’s Echo']}
];
for(const C of TT_NEW_CLASSES){
  ST_CLASSES[C.id]={...C,skills:[]};ST_CLASS_PATHS[C.id]=C.names.map((n,i)=>[n,['strike','fireball','bonespear','guard','fireball','drain','lightning','heal'][i]]);
  ST_CLASS_MILESTONES[C.id]=['First Inscription','Awakened Path','Greater Circle','Ascendant Art','Final Testament'];ST_CLASS_LEGACY[C.id]={};
  ST_CLASSES[C.id].growth={hp:12.5,mp:6,atk:C.id==='chronomancer'?1.2:1.8,mag:2.05,def:1.05,spd:.38};
  C.names.forEach((name,i)=>{
    const id=C.id+'_'+i,base=['strike','fireball','bonespear','guard','fireball','drain','lightning','heal'][i],level=[1,1,1,1,5,10,18,30][i],S=ST_SKILLS[base];
    ST_SKILLS[id]={...S,name,base,owner:C.id,gift:false,level,mp:[5,8,9,6,11,14,17,20][i],mult:[1.3,1.4,1.5,1,1.8,1.7,1.2,2.2][i],rtSpecial:C.special[i],desc:`${name}. ${C.role} `+S.desc};
    ST_CLASS_LEGACY[C.id][base]=id;ST_EVOLVE[id]=[name,'Honed '+name,'Greater '+name,'Master '+name];SK_COLOR[id]=['#99cece','#bd9ae0','#d6bc81'][TT_NEW_CLASSES.indexOf(C)];SK_FX[id]=SK_FX[base];SK_SHOT[id]=SK_SHOT[base];
    if(i<4)ST_CLASSES[C.id].skills.push(id);
  });
  for(let i=0;i<5;i++){
    const id=stTierSkill(C.id,i),base=ST_SKILLS[C.id+'_'+[0,1,6,5,7][i]];
    ST_SKILLS[id]={...base,name:ST_CLASS_MILESTONES[C.id][i],gift:true,level:ST_MAGIC_TIERS[i].level,mp:[4,9,16,23,30][i],mult:[1.25,1.7,1.2,2.1,2.5][i]};
    SK_COLOR[id]=SK_COLOR[C.id+'_0'];SK_FX[id]=SK_FX[C.id+'_0'];SK_SHOT[id]=SK_SHOT[C.id+'_0'];
  }
}
ST_GUIDE.push(['Tabletop custom creation','Optional creator on the first creation page: six attributes with a 27-point budget (scores 8–15), six backgrounds granting two proficiencies, and a personal ideal. Story checks roll d20 plus the relevant ability modifier and proficiency (2–6 as you level). Each scene resolves once and saves its roll. Failed checks do not block the campaign. Existing characters are not rerolled. Original classes, race powers and stat allocation remain separate.']);
// Character Studio: retains the existing inputs and handlers, changes their presentation.
const ttStudioStyle=el('style');ttStudioStyle.textContent=`
#scr-create .creatorLayout{background:#14251ff5}
#scr-create .creatorHeading{border-bottom:1px solid #5c6f57;padding-bottom:16px}
#scr-create .creatorStage{background:linear-gradient(155deg,#2e4434,#152822);border:1px solid #7d8968;border-radius:4px;position:relative}
#scr-create .creatorStage canvas{image-rendering:auto}
#scr-create .creatorTabs{gap:6px;border-bottom:1px solid #64785e;padding-bottom:12px}
#scr-create .creatorTabs button{border-radius:3px;background:#21372b;border:1px solid #6c7c5c;min-height:44px;color:#dddcc0}
#scr-create .creatorTabs button[aria-selected=true]{background:#cfbd82;border-color:#e2d39a;color:#1b2e23}
#scr-create .orow{padding:12px 0;border-bottom:1px solid #425b47}
#scr-create .olab{font-size:14px;color:#d6d7b4}
#scr-create #crClass{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
#scr-create #crClass button{margin:0;min-height:44px;white-space:normal}
#scr-create #crName{background:#15271d;border:1px solid #b6ae7e;color:#f0e6c3;min-height:48px;font-size:20px}
#scr-create .creatorNav{border-top:1px solid #5a7158;padding-top:12px}
@media(max-width:640px){#scr-create #crClass{grid-template-columns:repeat(3,minmax(0,1fr))}#scr-create .creatorTabs button{padding:10px 7px;font-size:13px}#scr-create .creatorStage{max-height:none}}
`;document.head.appendChild(ttStudioStyle);
for(const [i,label]of ['Origin & background','Hair, clothes & color','Class abilities'].entries())$('crTab'+i).textContent=label;
