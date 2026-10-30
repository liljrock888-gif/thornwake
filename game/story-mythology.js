// Original depictions of public-domain mythological creatures and real encounters.
const FW_MYTHS=[
  ['minotaur','Minotaur','bull','#9d7b65',560,37,12,'charge'],
  ['leviathan','Leviathan','serpent','#6aaeb4',420,24,9,'tide'],
  ['basilisk','Basilisk','lizard','#91b27c',760,48,15,'gaze'],
  ['hydra','Jungle Hydra','hydra','#82a286',1050,58,19,'heads'],
  ['sphinx','Duneglass Sphinx','sphinx','#d4b47b',1450,73,24,'riddle'],
  ['frostwyrm','Silverpeak Wyrm','serpent','#b8d5e0',1900,91,30,'frost'],
  ['gryphon','Wild Gryphon','gryphon','#b8a483',140,17,6,'swoop'],
  ['phoenix','Ash Phoenix','bird','#e59b67',190,23,7,'flame'],
  ['manticore','Manticore','sphinx','#ad8b85',230,28,8,'venom'],
  ['cyclops','Hill Cyclops','cyclops','#b2a389',260,31,9,'charge'],
  ['cerberus','Ash Hound Triad','hydra','#8d7b7a',215,26,8,'heads'],
  ['harpy','Canopy Harpy','gryphon','#b6b1a2',120,16,5,'swoop']
];
for(const [id,name,myth,color,hp,atk,def,pattern]of FW_MYTHS){
  ST_FOES['myth_'+id]={name,myth,color,hp,atk,def,spd:8,xp:Math.round(hp*.25),gold:Math.round(hp*.12),pattern,boss:FW_MYTHS.findIndex(x=>x[0]===id)<6,draw:'myth',lv:8};
}
for(const [map,id,level]of [['lumenreach','leviathan',8],['cinderward','minotaur',18],['veilwood','basilisk',28],['jadecanopy','hydra',36],['duneglass','sphinx',45],['frostcrag','frostwyrm',55]]){
  const D=ST_DUNGEONS[map],rows=D.rows.map(r=>r.split(''));D.boss='myth_'+id;rows[24][31]='B';
  const pools=map==='jadecanopy'?[['myth_harpy'],['myth_gryphon','myth_harpy']]:map==='duneglass'?[['myth_manticore'],['myth_cyclops']]:map==='frostcrag'?[['myth_gryphon'],['myth_cerberus']]:map==='cinderward'?[['myth_phoenix']]:map==='veilwood'?[['myth_harpy']]:[['wolf']];
  D.pool=pools;
  // Off the central town roads: cities remain safe unless you approach the wilds.
  if(level>=18)for(const [x,y]of [[3,13],[32,22]])rows[y][x]='X';
  D.rows=rows.map(r=>r.join(''));ST_BOSS_LV[D.boss]=level;
  ST_FOES[D.boss].lv=level;
}
function fwDrawMyth(F,x,y,now,scale,face,flash){
  const g=ctx,c=flash>0?'#f0e7cb':F.color,edge='#273333',bob=Math.sin(now*2)*2;
  g.save();g.translate(x,y+bob);g.scale(scale*(face===Math.PI?-1:1),scale);g.lineJoin='round';g.lineCap='round';g.strokeStyle=edge;g.lineWidth=3;
  const ellipse=(x,y,rx,ry,fill)=>{g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill();g.stroke();};
  const path=(points,fill)=>{g.fillStyle=fill;g.beginPath();points.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.closePath();g.fill();g.stroke();};
  const eye=(x,y)=>{ellipse(x,y,4,5,'#efcf82');g.fillStyle=edge;g.fillRect(x-1,y-4,2,7);};
  g.globalAlpha=.3;ellipse(0,4,53,11,'#13221a');g.globalAlpha=1;
  if(F.myth==='bull'||F.myth==='cyclops'){
    path([[-26,-48],[-22,-6],[-8,-3],[-5,-38],[8,-38],[10,-3],[26,-6],[26,-48]],'#594c43');
    ellipse(0,-66,38,40,c);ellipse(-37,-60,14,27,c);ellipse(37,-60,14,27,c);
    path([[-24,-43],[24,-43],[27,-23],[-27,-23]],'#65534d');ellipse(0,-109,28,25,c);
    if(F.myth==='bull'){
      path([[-20,-120],[-43,-136],[-37,-111],[-24,-102]],'#ded2b4');path([[20,-120],[43,-136],[37,-111],[24,-102]],'#ded2b4');
      ellipse(0,-100,22,13,'#bea58c');eye(-12,-112);eye(12,-112);g.fillStyle=edge;g.fillRect(-9,-102,4,4);g.fillRect(5,-102,4,4);
      g.strokeStyle='#816b53';g.lineWidth=7;g.beginPath();g.moveTo(49,-12);g.lineTo(49,-122);g.stroke();g.strokeStyle=edge;g.lineWidth=3;
      path([[47,-122],[75,-114],[69,-91],[49,-99],[29,-91],[23,-114]],'#a8b5b0');
    }else{eye(0,-114);path([[-12,-96],[12,-96],[8,-88],[-8,-88]],'#5f4941');}
  }else if(F.myth==='serpent'||F.myth==='lizard'){
    g.strokeStyle=edge;g.lineWidth=36;g.beginPath();g.moveTo(-65,0);g.bezierCurveTo(-10,15,58,-9,21,-55);g.bezierCurveTo(-12,-85,-20,-101,18,-116);g.stroke();
    g.strokeStyle=c;g.lineWidth=29;g.stroke();g.strokeStyle=edge;g.lineWidth=3;
    for(let i=0;i<7;i++){const x=-45+i*12;path([[x,-5],[x+8,-25-Math.sin(i)*5],[x+15,-8]],'#c6d2b4');}
    ellipse(21,-115,27,15,c);path([[29,-107],[52,-104],[44,-119]],'#e2dbba');eye(23,-120);
    path([[-2,-123],[-18,-137],[-9,-111]],'#bccdc0');
    if(F.myth==='lizard'){ellipse(-16,-6,16,8,c);ellipse(35,-6,16,8,c);path([[8,-127],[15,-146],[25,-127]],'#c2ca88');}
  }else if(F.myth==='hydra'){
    ellipse(0,-24,43,28,c);for(const sx of [-28,28])ellipse(sx,0,17,8,c);
    for(let i=-1;i<=1;i++){
      const hx=i*37,hy=-79-Math.cos(now*2+i)*6;
      g.strokeStyle=edge;g.lineWidth=20;g.beginPath();g.moveTo(i*16,-37);g.quadraticCurveTo(i*48,-57,hx,hy);g.stroke();g.strokeStyle=c;g.lineWidth=14;g.stroke();g.strokeStyle=edge;g.lineWidth=3;
      ellipse(hx+3,hy-8,20,15,c);eye(hx+9,hy-12);path([[hx-8,hy-20],[hx-10,hy-31],[hx+2,hy-22]],'#b4b89a');
    }
  }else{
    const bird=F.myth==='bird',w=Math.sin(now*4)*8;
    if(bird||F.myth==='gryphon'||F.myth==='sphinx'){
      for(const side of [-1,1])path([[side*18,-49],[side*74,-88-w],[side*65,-54],[side*48,-35],[side*30,-26]],bird?'#db9063':'#9ca89c');
    }
    ellipse(0,-33,38,25,c);for(const sx of [-25,25]){g.strokeStyle=c;g.lineWidth=12;g.beginPath();g.moveTo(sx,-24);g.lineTo(sx+3,0);g.stroke();g.strokeStyle=edge;g.lineWidth=3;ellipse(sx+5,0,12,5,'#c8b78e');}
    ellipse(24,-65,23,22,c);eye(29,-68);
    if(F.myth==='gryphon'||bird){path([[36,-64],[60,-56],[38,-51]],'#d0ae68');path([[14,-82],[7,-99],[29,-85]],c);}
    else{path([[6,-75],[-4,-94],[16,-85],[29,-90],[40,-82],[46,-72]],'#9a795b');ellipse(27,-49,14,7,'#d4bb94');}
    if(F.pattern==='venom'){g.strokeStyle='#796c68';g.lineWidth=7;g.beginPath();g.moveTo(-33,-28);g.quadraticCurveTo(-81,-62,-53,-88);g.stroke();g.strokeStyle=edge;g.lineWidth=3;path([[-59,-90],[-42,-93],[-46,-78]],'#b3aa86');}
    if(bird){for(let i=0;i<4;i++)path([[-12+i*8,-25],[-24+i*12,17+Math.sin(now*5+i)*7],[-3+i*8,-23]],['#e4a373','#efc28a'][i%2]);}
  }
  g.restore();
}
const fwMythBaseDraw=stDrawFoe;
stDrawFoe=function(key,x,y,now,scale,face,flash){
  const F=ST_FOES[key];if(F?.myth)return fwDrawMyth(F,x,y,now,scale,face,flash);
  return fwMythBaseDraw(key,x,y,now,scale,face,flash);
};
ST_GUIDE.push(['Mythological encounters','The new frontier includes Minotaurs, Leviathans, Basilisks, Hydras, Sphinxes, frost wyrms, Gryphons, Phoenixes, Manticores, Cyclopes, three-headed ash hounds and Harpies. Six regional guardians wait beyond the towns. Orange ground markers telegraph their attacks: charges, tidal areas, three-headed strikes, gaze roots, mana drains, frost slows, aerial swoops, fire and venom. These are optional encounters beside the original story bosses.']);
