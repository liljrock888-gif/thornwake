// GANI sprite/frame subset; data only, never eval/GS2.
// Format reference: https://graalonline.net/Creation/Dev/Releases/Client/2
const GANI=(()=>{
  const num=(v,name,limit=4096)=>{const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>limit)throw Error('Invalid '+name);return n;};
  const asset=v=>{
    if(!v||v.length>180||/[\\/:]/.test(v)||v.includes('..')||['__proto__','constructor','prototype'].includes(v))throw Error('Unsafe asset name');
    return v;
  };
  function parse(text){
    if(typeof text!=='string'||text.length>262144)throw Error('GANI file is too large');
    const sprites=new Map(),defaults=Object.create(null),frames=[],warnings=[];
    let single=false,loop=false,continuous=false,inside=false,ended=false,script=false,dirs=[],last=null;
    const flush=()=>{
      if(!dirs.length)return;
      if(dirs.length!==(single?1:4))throw Error('Each frame needs '+(single?1:4)+' direction lines');
      last={directions:dirs,ticks:1,sounds:[]};frames.push(last);dirs=[];
      if(frames.length>512)throw Error('Too many frames');
    };
    for(const raw of text.replace(/\r/g,'').split('\n')){
      const s=raw.trim();if(!s||s.startsWith('#')||s.startsWith('//'))continue;
      const p=s.split(/\s+/),cmd=p[0].toUpperCase();
      if(script){if(cmd==='SCRIPTEND')script=false;continue;}
      if(cmd==='SCRIPT'){script=true;warnings.push('Embedded scripts are not executed');continue;}
      if(cmd==='GANI0001')continue;
      if(cmd==='ANI'){if(inside||ended)throw Error('Duplicate animation block');inside=true;continue;}
      if(cmd==='ANIEND'){flush();inside=false;ended=true;continue;}
      if(!inside){
        if(cmd==='SINGLEDIRECTION'){single=true;continue;}
        if(cmd==='LOOP'){loop=true;continue;}
        if(cmd==='CONTINUOUS'){continuous=true;continue;}
        if(cmd==='SETBACKTO'){warnings.push('SETBACKTO uses the game action state');continue;}
        if(cmd.startsWith('DEFAULT')){defaults[cmd.slice(7)]=asset(p[1]);continue;}
        if(cmd==='SPRITE'){
          if(sprites.size>=1024)throw Error('Too many sprites');
          const id=num(p[1],'sprite index',65535);
          if(!Number.isInteger(id)||id<0||sprites.has(id))throw Error('Invalid or duplicate sprite index');
          const x=num(p[3],'sprite x'),y=num(p[4],'sprite y'),w=num(p[5],'sprite width'),h=num(p[6],'sprite height');
          if(x<0||y<0||w<=0||h<=0)throw Error('Invalid sprite rectangle');
          sprites.set(id,{id,source:asset(p[2]),x,y,w,h,alpha:1,zoom:1});continue;
        }
        if(cmd==='ZOOMEFFECT'){const S=sprites.get(Number(p[1]));if(S)S.zoom=Math.max(.1,Math.min(4,num(p[2],'zoom',4)));continue;}
        if(cmd==='COLOREFFECT'){const S=sprites.get(Number(p[1]));if(S)S.alpha=Math.max(0,Math.min(1,num(p[5],'alpha',1)));warnings.push('Color effects preserve opacity; RGB tint is not imported');continue;}
        warnings.push('Unsupported command: '+cmd);continue;
      }
      if(cmd==='WAIT'){
        flush();if(!last)throw Error('WAIT needs a preceding frame');
        const ticks=num(p[1],'wait',1200);if(ticks<0||!Number.isInteger(ticks))throw Error('Invalid wait');
        last.ticks+=ticks;continue;
      }
      if(cmd==='PLAYSOUND'){
        flush();if(!last)throw Error('Sound needs a preceding frame');
        last.sounds.push({source:asset(p[1]),x:num(p[2]||0,'sound x'),y:num(p[3]||0,'sound y')});
        warnings.push('Imported sound cues are metadata only');continue;
      }
      if(dirs.length===(single?1:4))flush();
      const layers=s.split(',').map(v=>{
        const a=v.trim().split(/\s+/);if(a.length!==3)throw Error('Invalid sprite placement');
        const ref=/^PARAM\d+$/i.test(a[0])?a[0].toUpperCase():num(a[0],'sprite reference',65535);
        return {sprite:ref,x:num(a[1],'offset x'),y:num(a[2],'offset y')};
      });
      if(layers.length>128)throw Error('Too many layers');
      dirs.push(layers);
    }
    if(!ended||inside||!frames.length||!sprites.size)throw Error('Incomplete GANI animation');
    for(const frame of frames)for(const direction of frame.directions)for(const l of direction)if(typeof l.sprite==='number'&&!sprites.has(l.sprite))throw Error('Undefined sprite '+l.sprite);
    return {sprites,defaults,frames,single,loop,continuous,warnings:[...new Set(warnings)],duration:frames.reduce((n,f)=>n+f.ticks*.05,0)};
  }
  function at(animation,seconds=0){
    let time=Math.max(0,Number.isFinite(seconds)?seconds:0);
    if(animation.loop)time%=animation.duration;else time=Math.min(time,animation.duration-1e-7);
    for(let i=0;i<animation.frames.length;i++){const f=animation.frames[i];if(time<f.ticks*.05)return {frame:f,index:i};time-=f.ticks*.05;}
    return {frame:animation.frames.at(-1),index:animation.frames.length-1};
  }
  function draw(ctx,animation,images,x,y,seconds=0,direction=2,scale=1,params={}){
    const {frame,index}=at(animation,seconds),layers=frame.directions[animation.single?0:((direction%4)+4)%4];
    ctx.save();ctx.imageSmoothingEnabled=false;
    try{for(const L of layers){
      const ref=typeof L.sprite==='string'?Number(params[L.sprite]??animation.defaults[L.sprite]):L.sprite,S=animation.sprites.get(ref);if(!S)continue;
      const source=params[S.source]||animation.defaults[S.source]||S.source,img=images[source]||images[S.source];if(!img)continue;
      if(S.x+S.w>img.width||S.y+S.h>img.height)continue;
      ctx.globalAlpha=S.alpha;ctx.drawImage(img,S.x,S.y,S.w,S.h,Math.round(x+L.x*scale),Math.round(y+L.y*scale),S.w*scale*S.zoom,S.h*scale*S.zoom);
    }}finally{ctx.restore();}
    return index;
  }
  function preset(mode,wait=2){
    const lines=['GANI0001','# Original Thornwake animation: '+mode,'DEFAULTBODY thornwake-'+mode+'.png','LOOP','CONTINUOUS'];
    for(let d=0;d<4;d++)for(let f=0;f<4;f++)lines.push(`SPRITE ${d*4+f} BODY ${f*64} ${d*88} 64 88 original-character-frame`);
    lines.push('ANI');
    for(let f=0;f<4;f++){for(let d=0;d<4;d++)lines.push(`${d*4+f} -32 -78`);lines.push('WAIT '+wait,'');}
    lines.push('ANIEND');return lines.join('\n')+'\n';
  }
  return {parse,at,draw,preset};
})();
