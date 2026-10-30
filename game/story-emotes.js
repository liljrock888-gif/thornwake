// Cosmetic social animation only. Never persisted or allowed during combat.
const FW_EMOTES=[
  {id:'dance',name:'Lantern Dance',duration:12},{id:'spin',name:'Crystal Twirl',duration:7},
  {id:'wave',name:'Wave',duration:4},{id:'bow',name:'Courteous Bow',duration:4},
  {id:'cheer',name:'Victory Cheer',duration:5},{id:'clap',name:'Applaud',duration:5},
  {id:'sit',name:'Sit & Rest',duration:20},{id:'nod',name:'Friendly Nod',duration:4}
];
function fwEmoteStart(id){
  const E=FW_EMOTES.find(e=>e.id===id);
  if(!E||!ST.on||ST.battle||SDUEL.match||stData().riding||!['walk','menu'].includes(ST.mode))return false;
  if(ST.mode==='menu')stCloseMenu();ST.keys={};ST.touchMove=null;ST.padMove=null;ST.moving=false;
  ST.emote={id,at:rtTownTime,until:rtTownTime+E.duration,stamp:Date.now()};stNetPush(true);return true;
}
function fwEmoteStop(){ST.emote=null;stNetPush(true);}
function fwRemoteEmote(raw){
  if(!raw||!Number.isFinite(raw.stamp))return null;const E=FW_EMOTES.find(e=>e.id===raw.id),elapsed=(Date.now()-raw.stamp)/1000;
  return E&&elapsed>=-1&&elapsed<E.duration?{id:E.id,elapsed:Math.max(0,elapsed)}:null;
}
function fwEmoteMenu(){
  if(ST.battle||SDUEL.match)return;
  const m=fwPanel('Say it without words','SOCIAL EMOTES / 2D CHARACTER ANIMATION','Dance, twirl, wave, bow, cheer, clap, sit or nod. These are cosmetic motions with no combat, healing, XP or movement bonuses. Walking, entering battle or changing areas stops your emote. Dismount first. Connected adventurers on the same map can see your emotes.');
  for(const E of FW_EMOTES)fwButton(m,E.name+' · '+E.duration+'s',()=>fwEmoteStart(E.id),!!stData().riding);
  if(ST.emote)fwButton(m,'Stop current emote',()=>{fwEmoteStop();stCloseMenu();});fwBack(m);
}
const fwEmoteDraw=stDrawCh;
stDrawCh=function(u,now,k=1){
  if(u.id===30){
    if(ST.moving||ST.battle||!ST.emote||ST.emote.until<=rtTownTime)ST.emote=null;
    if(ST.emote)u={...u,emote:{id:ST.emote.id,elapsed:rtTownTime-ST.emote.at}};
  }return fwEmoteDraw(u,now,k);
};
const fwEmoteEnter=stEnterMap;
stEnterMap=function(...args){ST.emote=null;return fwEmoteEnter(...args);};
const fwEmoteBattle=stStartBattle;
stStartBattle=function(...args){ST.emote=null;return fwEmoteBattle(...args);};
const fwEmoteOpen=stOpenMenu;
stOpenMenu=function(){fwEmoteOpen();if(ST.mode==='menu')fwButton($('stMenu'),'Emotes · dance & gestures',fwEmoteMenu);};
addEventListener('keydown',e=>{
  if(e.code==='KeyB'&&!e.repeat&&ST.on&&ST.mode==='walk'&&!ST.battle&&!SDUEL.match&&!/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')){
    e.preventDefault();fwEmoteMenu();
  }
});
ST_GUIDE.push(['2D animation & social emotes','Eight-step walking, left/right facing, an upward back view, swinging weapons, casting hands, ranged poses, guard, dodge, hit reactions and compact familiar gait use 2D canvas animation in Story. Menu → Emotes, or B while exploring, opens eight cosmetic gestures and dances. Movement, battles and area changes cancel them. They never heal, deal damage or change stats, and require dismounting. Existing online presence shares emotes with connected same-map players; offline play still works.']);
