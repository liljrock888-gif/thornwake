// Fantasy civic institutions, local Story governments and civilian employment.
const FW_GOVERNMENTS=[
  ['lumenreach','Lumenreach Harbor Council','Elected harbor republic','Mayor Selene Voss','Crystal streetlights, public medicine, courier routes and a citizens’ council.'],
  ['cinderward','Cinderward Crown Assembly','Constitutional crown & elected assembly','Minister Arlen Brass','Rune-powered workshops coexist with the crown, civil courts and public services.'],
  ['veilwood','Veilwood Grove Compact','Confederation of grove councils','Speaker Ivara Reed','The forest settlements share healers, conservation law and an elected speaker.'],
  ['jadecanopy','Jadecanopy Canopy Union','Federation of jungle settlements','Councillor Neri Vale','River communities maintain crystal lamps, public clinics and protected forest paths.'],
  ['duneglass','Duneglass Civic League','Merchant republic with civil courts','Consul Amira Sable','Caravan trade, civic employment and public medicine bind the oasis cities.'],
  ['frostcrag','Frostcrag Hearth Assembly','Mountain township assembly','First Steward Edda Snow','Winter stores, magical heating and a public infirmary support the mountain towns.']
].map(([map,name,system,politician,desc])=>({map,name,system,politician,desc}));
const FW_CANDIDATES=[
  {id:'care',name:'The Hearth Coalition',platform:'Public care, shared supplies and nurses. Clinic treatment is free for everyone; this policy makes that a civic guarantee.'},
  {id:'trade',name:'The Open Road League',platform:'Support trades and civilian work. Paid civic jobs earn 5% more gold.'},
  {id:'watch',name:'The Lantern Charter',platform:'Due process and accountable watchmen. Court fine settlements cost 10% less; death records are never erased.'}
];
const FW_JOBS=[
  {id:'courier',name:'Ward Courier',lv:1,pay:50,need:1,desc:'Carry a sealed parcel to this city’s public-clinic nurse.'},
  {id:'lamplighter',name:'Crystal Lamplighter',lv:4,pay:85,need:3,desc:'Visit and attune all three street crystals in this city after accepting the shift.'},
  {id:'herbalist',name:'Clinic Herbalist',lv:4,pay:90,need:3,desc:'Gather three marked medicinal sprigs along the southern streets after accepting the shift.'},
  {id:'archivist',name:'Civic Archivist',lv:1,pay:70,need:2,desc:'Interview this city’s politician and inspect one street crystal after accepting the shift.'},
  {id:'artisan',name:'Municipal Artisan',lv:1,pay:75,need:1,desc:'Deliver two Copper Ore from your existing materials bag to the job registrar.'},
  {id:'warden',name:'Road Warden',lv:5,pay:120,need:3,desc:'Defeat three groups of hostile creatures in this region. Citizens, PvP and guards never count.'}
];
const FW_HERBS=[];
function fwCivicData(){
  const f=fwData();for(const key of ['ballots','jobCooldowns'])if(!f[key]||typeof f[key]!=='object')f[key]={};
  if(!Array.isArray(f.cases))f.cases=[];return f;
}
function fwGovernment(map=stData().map){return FW_GOVERNMENTS.find(g=>g.map===map||'clinic_'+g.map===map)||FW_GOVERNMENTS[0];}
function fwCivicPolicy(map){return fwCivicData().ballots[map]?.policy||'care';}
function fwCivicVote(map,policy){
  const f=fwCivicData();if(ST.battle||!FW_GOVERNMENTS.some(g=>g.map===map)||!FW_CANDIDATES.some(c=>c.id===policy)||Date.now()-(f.ballots[map]?.at||0)<86400000)return false;
  f.ballots[map]={policy,at:Date.now()};stSave();return true;
}
for(const G of FW_GOVERNMENTS){
  const rows=Array.from({length:10},(_,y)=>Array.from({length:14},(_,x)=>x===0||y===0||x===13||y===9?'#':'.'));
  rows[9][7]='E';for(const x of [2,4,9,11])rows[2][x]='b';rows[1][6]='k';rows[3][6]='t';
  ST_DUNGEONS['clinic_'+G.map]={name:G.name.split(' ')[0]+' · Public Infirmary',home:true,lit:true,pool:[],rows:rows.map(r=>r.join('')),theme:{floor:'#b8ad91',wall:'#849487',glow:'#d2edc9'},exit:[14,14],clinicCity:G.map};
  const D=ST_DUNGEONS[G.map],row=[...D.rows[12]];row[14]='H';D.rows[12]=row.join('');
  ST_NPCS.push({id:'civic_'+G.map+'_politician',fwKey:'politician',name:G.politician,map:G.map,x:14,y:7,look:'paladin',color:'#c5b382'},
    {id:'civic_'+G.map+'_judge',fwKey:'judge',name:'Magistrate of '+G.map[0].toUpperCase()+G.map.slice(1),map:G.map,x:24,y:7,look:'mage',color:'#af9cbb'},
    {id:'civic_'+G.map+'_registrar',fwKey:'registrar',name:'Civic Job Registrar',map:G.map,x:24,y:16,look:'ranger',color:'#95b49d'},
    {id:'civic_'+G.map+'_nurse',fwKey:'nurse',name:'Nurse '+['Liora','Mira','Sorrel','Nari','Sana','Freya'][FW_GOVERNMENTS.indexOf(G)],map:'clinic_'+G.map,x:7,y:4,look:'mage',color:'#dae5cf'});
  for(let i=0;i<3;i++)FW_HERBS.push({id:G.map+'_herb_'+i,map:G.map,x:[10,20,29][i],y:22});
}
Object.assign(RT_CHATTER,{politician:'A city owes its people more than promises.',judge:'Evidence, a fair hearing, and a lawful sentence.',registrar:'Honest work. Fair coin. New shifts on the board.',nurse:'Everyone deserves care. Come inside.'});
function fwCivicMenu(map=fwGovernment().map){
  const G=fwGovernment(map),f=fwCivicData(),policy=FW_CANDIDATES.find(c=>c.id===fwCivicPolicy(G.map)),m=fwPanel(G.name,'GOVERNMENT / POLITICIANS / PUBLIC SERVICES',G.system+'. '+G.desc+' Elections and policies belong to your saved Story, not a global multiplayer election. Cast one ballot per city per real-world day. Existing free treatment is never removed.');
  m.appendChild(el('p','',G.politician+' · Current civic platform: '+policy.name));
  for(const C of FW_CANDIDATES){const c=el('article','fwCard');c.append(el('h4','',C.name),el('p','',C.platform));fwButton(c,'Vote for '+C.name,()=>{fwCivicVote(G.map,C.id);fwCivicMenu(G.map);},!!ST.battle||Date.now()-(f.ballots[G.map]?.at||0)<86400000);m.appendChild(c);}
  fwButton(m,'City employment board',()=>fwJobsMenu(G.map));fwButton(m,'Civil court & justice',fwJusticeMenu);
  fwButton(m,'Visit public infirmary',()=>{if(ST.battle)return;stCloseMenu();stEnterMap('clinic_'+G.map,7,8);},!!ST.battle);fwBack(m);
}
const fwCivicCrime=stCrime;
stCrime=function(gold,why){
  const d=stData(),before=d.crime||0;fwCivicCrime(gold,why);const f=fwCivicData();
  f.cases.push({id:crypto.randomUUID(),charge:why,fine:(d.crime||0)-before,at:Date.now(),map:d.map,status:'open',heard:false});
  if(f.cases.length>80){const closed=f.cases.findIndex(c=>c.status!=='open');if(closed>=0)f.cases.splice(closed,1);}stSave();
};
function fwJusticeClose(status){for(const C of fwCivicData().cases)if(C.status==='open')C.status=status;}
function fwJusticePay(){
  const d=stData(),f=fwCivicData(),fee=Math.ceil((d.crime||0)*(fwCivicPolicy(fwGovernment().map)==='watch'?.9:1));
  if(ST.battle||!d.crime||d.gold<fee)return false;d.gold-=fee;d.crime=0;f.service=false;fwJusticeClose('fine paid');stSave();return true;
}
function fwJusticeHearing(){
  const d=stData(),f=fwCivicData(),cases=f.cases.filter(c=>c.status==='open');if(ST.battle||!d.crime||!cases.length||cases.every(c=>c.heard))return null;
  const roll=ttRoll('persuasion',18);for(const C of cases){C.heard=true;C.roll=roll;}
  d.crime=Math.max(1,Math.ceil(d.crime*(roll.success?.75:1.1)));stSave();return roll;
}
function fwJusticeMenu(){
  const d=stData(),f=fwCivicData(),m=fwPanel('The Lantern Civil Court','JUSTICE / BOUNTIES / DUE PROCESS',`Outstanding bounty: ${d.crime||0} gold. Pay a lawful settlement, request one persuasion hearing per set of charges, perform unpaid community service, or serve the existing jail sentence. A hearing can reduce the fine by 25%; failure adds 10%. Settling a case never resurrects slain civilians or erases its history.`);
  const fee=Math.ceil((d.crime||0)*(fwCivicPolicy(fwGovernment().map)==='watch'?.9:1));
  fwButton(m,'Pay settlement · '+fee+' gold',()=>{fwJusticePay();fwJusticeMenu();},!!ST.battle||!d.crime||d.gold<fee);
  fwButton(m,'Request a hearing · Persuasion DC 18',()=>{const r=fwJusticeHearing();fwJusticeMenu();if(r)$('stMenu').insertBefore(el('p','',`Court roll: ${r.die} + ${r.mod} + ${r.proficiency} = ${r.total}. ${r.success?'Mitigation granted.':'The fine increases.'}`),$('stMenu').children[2]);},!!ST.battle||!d.crime||!f.cases.some(c=>c.status==='open'&&!c.heard));
  fwButton(m,f.service?'Community service selected':'Choose community service',()=>{f.service=true;stSave();fwJobsMenu();},!!ST.battle||!d.crime||!!f.job);
  fwButton(m,'Serve the jail sentence',()=>{if(ST.battle||!d.crime)return;stCloseMenu();stJail();},!!ST.battle||!d.crime);
  for(const C of [...f.cases].reverse().slice(0,12))m.appendChild(el('p','',`${C.charge} · ${C.fine} original fine · ${C.status}${C.heard?' · hearing already held':''}`));
  if(!f.cases.length)m.appendChild(el('p','','No recorded charges. Legacy bounties can still be settled.'));fwBack(m);
}
const fwCivicJail=stJail;
stJail=function(){fwJusticeClose('sentence served');fwCivicData().service=false;return fwCivicJail();};
const fwCivicArrest=stArrest;
stArrest=function(guard){
  fwCivicArrest(guard);const b=el('button','','Request civil court hearing');b.addEventListener('click',()=>{$('stDialog').hidden=true;ST.dlg=null;fwJusticeMenu();});$('stChoices').appendChild(b);
};
function fwJobAccept(map,id){
  const d=stData(),f=fwCivicData(),J=FW_JOBS.find(j=>j.id===id);if(ST.battle||f.job||!J||d.lv<J.lv||!FW_GOVERNMENTS.some(g=>g.map===map)||Date.now()<(f.jobCooldowns[map+'_'+id]||0))return false;
  f.job={map,id,progress:[],at:Date.now(),service:!!f.service};stSave();return true;
}
function fwJobMark(key){
  const f=fwCivicData(),j=f.job;if(!j||j.map!==fwGovernment().map||j.progress.includes(key))return false;
  j.progress.push(key);stSave();return true;
}
function fwJobClaim(){
  const d=stData(),f=fwCivicData(),j=f.job,J=FW_JOBS.find(J=>J.id===j?.id);
  const registrar=ST_NPCS.find(n=>n.id==='civic_'+j?.map+'_registrar');
  if(ST.battle||!j||!J||d.map!==j.map||!registrar||Math.hypot(d.x-registrar.x*64-32,d.y-registrar.y*64-30)>110||j.progress.length<J.need)return false;
  const pay=Math.round((J.pay+Math.min(120,d.lv*2))*(fwCivicPolicy(j.map)==='trade'?1.05:1));
  if(j.service){d.crime=Math.max(0,(d.crime||0)-80);if(!d.crime){f.service=false;fwJusticeClose('community service completed');}}
  else d.gold+=pay;
  d.xp+=20+J.lv*3;f.jobCooldowns[j.map+'_'+j.id]=Date.now()+180000;f.job=null;
  while(d.xp>=stXpNeed(d.lv)){d.xp-=stXpNeed(d.lv);d.lv++;const s=stStats();d.hp=s.hp;d.mp=s.mp;}stSyncProgress(false);stSave();return true;
}
function fwJobsMenu(map=fwGovernment().map){
  const d=stData(),f=fwCivicData(),G=fwGovernment(map),m=fwPanel('Civic Employment Board','PAID WORK / HONEST PROGRESSION',G.name+'. One active shift at a time. Complete real deliveries, gathering, inspections or hostile encounters; return to the registrar to claim. Each shift has a three-minute cooldown after completion. Community-service shifts pay no gold and reduce the bounty by 80 instead.');
  if(f.job){const J=FW_JOBS.find(j=>j.id===f.job.id);m.appendChild(el('p','',`Current: ${J.name} in ${f.job.map} · ${f.job.progress.length}/${J.need}${f.job.service?' · unpaid community service':''}`));fwButton(m,'Claim completed shift',()=>{fwJobClaim();fwJobsMenu(map);},f.job.map!==G.map||f.job.progress.length<J.need);fwButton(m,'Abandon shift without reward',()=>{f.job=null;stSave();fwJobsMenu(map);});}
  for(const J of FW_JOBS){const c=el('article','fwCard');c.append(el('h4','',J.name+' · Level '+J.lv),el('p','',J.desc),el('p','',`${Math.round((J.pay+Math.min(120,d.lv*2))*(fwCivicPolicy(G.map)==='trade'?1.05:1))} gold · ${20+J.lv*3} XP${f.service?' / community service replaces gold':''}`));fwButton(c,'Take '+J.name+' shift',()=>{fwJobAccept(G.map,J.id);fwJobsMenu(map);},!!ST.battle||!!f.job||d.lv<J.lv||Date.now()<(f.jobCooldowns[G.map+'_'+J.id]||0));m.appendChild(c);}
  fwBack(m);
}
const fwCivicTalk=stTalk;
stTalk=function(id){
  const n=ST_NPCS.find(n=>n.id===id);if(!n||!['politician','judge','registrar','nurse'].includes(n.fwKey))return fwCivicTalk(id);
  const G=fwGovernment(n.map),f=fwCivicData(),d=stData();CR.talking=id;
  if(n.fwKey==='politician'){if(f.job?.id==='archivist'&&f.job.map===G.map)fwJobMark('interview');return stSay([[n.name,G.desc+' The institutions in this Story answer to the local council. You can read the platforms and vote, ask the magistrate for a hearing, or take an honest shift.']],null,[['Council & elections',()=>fwCivicMenu(G.map)],['Leave',null]]);}
  if(n.fwKey==='judge')return fwJusticeMenu();
  if(n.fwKey==='registrar'){
    if(f.job?.id==='artisan'&&f.job.map===G.map&&(d.mats?.copper||0)>=2&&!f.job.progress.includes('materials')){d.mats.copper-=2;fwJobMark('materials');}
    return fwJobsMenu(G.map);
  }
  if(f.job?.id==='courier'&&f.job.map===G.map)fwJobMark('parcel');
  return stSay([[n.name,'This infirmary treats everyone without payment. Magic tends the wounds; careful hands do the rest. Your health and mana can be restored here, regardless of your politics.']],null,[['Receive free nursing care',()=>{if(ST.battle)return;const s=stStats();d.hp=s.hp;d.mp=s.mp;d.wounds=null;RT.poisonUntil=0;stSave();stHud();sfx('respawn');}],['Leave',null]]);
};
const fwCivicNear=stNearby;
stNearby=function(){
  const d=stData(),f=fwCivicData();
  if(FW_GOVERNMENTS.some(g=>g.map===d.map)&&Math.hypot(d.x-(14*64+32),d.y-(13*64+32))<65)return{kind:'civicClinic',label:'Enter the public infirmary',map:d.map};
  if(f.job?.id==='herbalist')for(const H of FW_HERBS)if(H.map===d.map&&!f.job.progress.includes(H.id)&&Math.hypot(d.x-H.x*64-32,d.y-H.y*64-32)<75)return{kind:'civicHerb',label:'Gather medicinal sprig',H};
  return fwCivicNear();
};
const fwCivicInteract=stInteract;
stInteract=function(pre){
  const it=pre||stNearby(),f=fwCivicData(),d=stData();
  if(it?.kind==='civicClinic')return stEnterMap('clinic_'+it.map,7,8);
  if(it?.kind==='civicHerb'){if(f.job?.id==='herbalist')fwJobMark(it.H.id);stCallout('MEDICINAL SPRIG GATHERED','#c2ddaa');return;}
  if(it?.kind==='fwCrystal'&&f.job?.map===d.map){if(f.job.id==='lamplighter')fwJobMark(it.node.id);if(f.job.id==='archivist')fwJobMark('crystal');}
  return fwCivicInteract(it);
};
const fwCivicEnter=stEnterMap;
stEnterMap=function(key,...args){const D=ST_DUNGEONS[stData().map];if(D?.clinicCity&&key==='world')return fwCivicEnter(D.clinicCity,14,14);return fwCivicEnter(key,...args);};
const fwCivicBattleEnd=stEndBattle;
stEndBattle=function(result){
  const d=stData(),f=fwCivicData(),b=ST.battle;
  if(result==='won'&&f.job?.id==='warden'&&f.job.map===d.map&&b&&!b.ended&&!b.foes.some(x=>x.key==='guard'))fwJobMark('encounter_'+crypto.randomUUID());
  return fwCivicBattleEnd(result);
};
const fwCivicOverlay=rtWorldOverlay;
rtWorldOverlay=function(now,dt){
  fwCivicOverlay(now,dt);const d=stData(),f=fwCivicData(),z=Math.max(.7,Math.min(1.2,Math.min(cw,ch)/700));ctx.save();ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(cw/2-ST.cam.x*z),dpr*(ch/2-ST.cam.y*z));
  if(f.job?.id==='herbalist')for(const H of FW_HERBS)if(H.map===d.map&&!f.job.progress.includes(H.id)){ctx.fillStyle='#c4e3a3';ctx.beginPath();ctx.ellipse(H.x*64+32,H.y*64+24,9,17,Math.sin(now)*.2,0,7);ctx.fill();ctx.fillStyle='#fff0ba';ctx.font='bold 16px sans-serif';ctx.fillText('+',H.x*64+28,H.y*64-2);}
  if(FW_GOVERNMENTS.some(g=>g.map===d.map)){ctx.fillStyle='#e8f0d0';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('PUBLIC INFIRMARY',14*64+32,12*64-34);}
  ctx.restore();
};
const fwCivicOpen=stOpenMenu;
stOpenMenu=function(){fwCivicOpen();if(ST.mode==='menu'){fwButton($('stMenu'),'City council · government & services',()=>fwCivicMenu());fwButton($('stMenu'),'Jobs · civilian employment',()=>fwJobsMenu());fwButton($('stMenu'),'Justice · courts & wanted level',fwJusticeMenu);}};
function fwCrimeChoice(id){
  const target=ST.mode==='talk'?$('stChoices'):ST.mode==='menu'?$('stMenu'):null;
  const n=ST_NPCS.find(n=>n.id===id);if(!target||!fwCrimeEligible(n)||target.querySelector('[data-crime-choice]'))return;
  const b=el('button','','Hostile actions · crime');b.dataset.crimeChoice='true';b.addEventListener('click',()=>fwCrimeMenu(id));
  target.appendChild(b);
}
const fwCivicDialogue=stTalk;
stTalk=function(id){fwCivicDialogue(id);if(ST.dlg)ST.dlg.crimeNpc=id;fwCrimeChoice(id);};
const fwCivicLine=stShowLine;
stShowLine=function(){fwCivicLine();if(ST.dlg?.crimeNpc)fwCrimeChoice(ST.dlg.crimeNpc);};
ST_GUIDE.push(['Governments, nurses & jobs','Six frontier cities have original political institutions, a politician, magistrate, registrar and a staffed public infirmary. Elections are local to your Story save, once per city per real-world day: public care, +5% job pay, or −10% court settlement. All nursing care remains free. Six job types involve actual deliveries, crystal inspections, medicine gathering, copper delivery or defeating hostile groups; one shift at a time with a three-minute repeat cooldown. Courts record charges, allow a single d20 persuasion hearing, fine settlement, community service or the original jail sentence. The setting remains fantasy-first crystal magitech, not contemporary cars or skyscrapers.']);
