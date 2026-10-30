// Original sprite sheets generated from the user's selected character appearance.
// Genuine GANI frames drive playback; generated cells are cached, not redrawn each tick.
const SG={
  builtins:Object.fromEntries(['idle','walk','slash','shoot','cast','dodge','guard','hit','dance','wave','sit','cheer'].map(mode=>[mode,GANI.parse(GANI.preset(mode,mode==='idle'?5:mode==='walk'?2:1))])),
  imported:new Map(),images:{},sheets:new Map(),renderCount:0,status:'Original GANI animations active',maxSheets:48
};
const sgSourceChibi=srChibi;
function sgDirection(angle){
  if(Math.abs(Math.sin(angle))>Math.abs(Math.cos(angle)))return Math.sin(angle)<0?0:2;
  return Math.cos(angle)<0?1:3;
}
function sgSheet(u,mode,frame,direction){
  const key=JSON.stringify([u.cls,u.look,u.color,u.outfit||u.o||{},u.weapon,mode]);
  let sheet=SG.sheets.get(key);
  if(!sheet){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=352;
    sheet={canvas,ready:new Set()};SG.sheets.set(key,sheet);
    while(SG.sheets.size>SG.maxSheets)SG.sheets.delete(SG.sheets.keys().next().value);
  }
  const cell=direction*4+frame;
  if(!sheet.ready.has(cell)){
    const g=sheet.canvas.getContext('2d'),angle=[-Math.PI/2,Math.PI,Math.PI/2,0][direction],t=frame/6+.01;
    g.save();g.beginPath();g.rect(frame*64,direction*88,64,88);g.clip();
    g.translate(frame*64+32,direction*88+78);g.scale(.9,.9);
    sgSourceChibi(g,{...u,x:0,y:0,walk:mode==='walk'?frame*12+1:0,face:angle,facing:angle,poseTime:t,pose:{kind:mode,at:0,until:.52,angle},emote:null,hitFlash:mode==='hit'?1:0},t,1);
    g.restore();sheet.ready.add(cell);
  }
  return sheet.canvas;
}
fwChibi=function(g,u,now,k=1){
  const anim=fwAnimationFrame(u,now),mode=SG.builtins[anim.mode]?anim.mode:'idle',direction=sgDirection(anim.angle);
  const isPlayer=u.id===30||u.id==='p'||u.self,imported=isPlayer&&SG.imported.get(mode);
  const animation=imported||SG.builtins[mode],activePose=u.pose?.kind===anim.mode&&u.pose.until>(u.poseTime??(rtActive()?RT.time:rtTownTime));
  const time=activePose?anim.progress*animation.duration:mode==='walk'?Math.abs(u.walk||0)/40:now;
  if(imported){GANI.draw(g,imported,SG.images,u.x,u.y,time,direction,k);SG.renderCount++;return;}
  const {index}=GANI.at(animation,time),image=sgSheet(u,mode,index,direction);
  GANI.draw(g,animation,{BODY:image},u.x,u.y,time,direction,k);SG.renderCount++;
};
function sgPanel(){
  const m=stSystemPanel('GANI animations');
  m.append(el('p','',SG.status),el('p','','Original GANI animations drive idle, walking, combat, dodge and emotes. Your wardrobe still applies. Imported packs are local to this browser tab and are never uploaded.'));
  const heading=el('h3','','Load your own pack'),input=el('input');input.type='file';input.multiple=true;input.accept='.gani,.png,.gif,.webp';input.setAttribute('aria-label','GANI files and sprite sheets');
  input.style.cssText='display:block;max-width:100%;box-sizing:border-box;min-height:44px';
  const status=el('p','sgStatus','Choose .gani files together with their referenced image sheets. File names idle, walk, attack/slash, cast, dodge, guard, hit, dance, wave, sit and cheer map to game actions.');
  input.addEventListener('change',async()=>{
    const files=[...input.files];input.disabled=true;
    try{
      if(files.length>32||files.reduce((a,f)=>a+f.size,0)>16*1024*1024)throw Error('Pack limit: 32 files and 16 MB.');
      const images={},animations=new Map(),warnings=[];
      for(const file of files.filter(f=>/\.(png|gif|webp)$/i.test(f.name))){
        const url=URL.createObjectURL(file),image=new Image();
        try{image.src=url;await image.decode();if(image.width>4096||image.height>4096)throw Error('Sprite sheets must be at most 4096 × 4096.');images[file.name]=image;}finally{URL.revokeObjectURL(url);}
      }
      for(const file of files.filter(f=>/\.gani$/i.test(f.name))){
        const rawName=file.name.replace(/\.gani$/i,'').toLowerCase(),name=({attack:'slash',hurt:'hit',run:'walk',sword:'slash'})[rawName]||rawName;
        if(!SG.builtins[name])throw Error('Unknown action name: '+rawName);
        const ani=GANI.parse(await file.text());
        for(const S of ani.sprites.values()){
          const src=ani.defaults[S.source]||S.source;
          if(!images[src]&&!images[S.source])throw Error('Missing sprite sheet '+src+' for '+file.name+'. Add DEFAULTBODY/DEFAULTHEAD entries if your pack uses BODY/HEAD.');
          const image=images[src]||images[S.source];if(S.x+S.w>image.width||S.y+S.h>image.height)throw Error('Sprite rectangle exceeds '+src);
        }
        warnings.push(...ani.warnings);animations.set(name,ani);
      }
      if(!animations.size)throw Error('Include at least one .gani animation.');
      SG.images=images;SG.imported=animations;SG.status=`Loaded ${animations.size} local GANI action${animations.size===1?'':'s'}.`;
      status.textContent=SG.status+(warnings.length?' Notes: '+[...new Set(warnings)].join('; '):'');
    }catch(e){status.textContent=e.message;status.setAttribute('role','alert');}
    finally{input.disabled=false;}
  });
  m.append(heading,input,status,el('p','','Supported: layered SPRITE rectangles, four directions, SINGLEDIRECTION, WAIT, LOOP, CONTINUOUS, default image bindings, zoom and opacity. Embedded scripts never run. RGB tint, SETBACKTO and imported audio cues are not executed.'));
  const reset=el('button','fwButton','Restore original animations');reset.addEventListener('click',()=>{SG.imported.clear();SG.images={};SG.status='Original GANI animations active';sgPanel();});m.appendChild(reset);
  const link=el('a','','Download the original walk.gani template');link.href='animations/walk.gani';link.download='walk.gani';m.appendChild(link);
  const exportSheet=el('button','fwButton','Download my walk sprite sheet');
  exportSheet.addEventListener('click',()=>{
    const d=stData(),clothing=fwWorn('clothing'),u={id:30,cls:d.cls,look:d.cls,color:ST_CLASSES[d.cls]?.color,outfit:{...d.outfit,...(clothing?{frontierCloth:clothing.color}:{})}};
    let sheet;for(let dir=0;dir<4;dir++)for(let frame=0;frame<4;frame++)sheet=sgSheet(u,'walk',frame,dir);
    const a=document.createElement('a');a.href=sheet.toDataURL('image/png');a.download='thornwake-walk.png';a.click();
  });m.appendChild(exportSheet);
  m.appendChild(el('p','','The template and your exported PNG work together as an editable original animation. For other packs, use your own sprite sheet and set DEFAULTBODY/DEFAULTHEAD to its filename.'));
}
const sgMenu=stOpenMenu;
stOpenMenu=function(){
  sgMenu();if(ST.mode!=='menu')return;
  const button=el('button','fwButton','Animations · GANI');button.addEventListener('click',sgPanel);$('stMenu').appendChild(button);
};
