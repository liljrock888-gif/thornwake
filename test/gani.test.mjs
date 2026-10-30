import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const box={};vm.runInNewContext(readFileSync('game/gani-player.js','utf8')+';this.G=GANI;',box);
const G=box.G;let passed=0;
const ok=(v,label)=>{assert(v,label);passed++;console.log('ok',label);};
for(const mode of ['idle','walk','slash','shoot','cast','dodge','guard','hit','dance','wave','sit','cheer']){
  const a=G.parse(G.preset(mode,2));ok(a.frames.length===4&&a.sprites.size===16,mode+' parses four frames and directions');
  ok(G.at(a,.16).index===1&&G.at(a,1.21).index===0,mode+' timing and looping');
}
const simple='GANI0001\nSINGLEDIRECTION\nLOOP\nDEFAULTBODY body.png\nSPRITE 0 BODY 0 0 16 24 player\nANI\n0 -8 -24\nWAIT 3\nPLAYSOUND step.wav 0 0\n0 -8 -23\nANIEND';
const a=G.parse(simple);
ok(a.single&&a.defaults.BODY==='body.png'&&a.frames[0].ticks===4,'single-direction, default sheet and WAIT');
ok(a.frames[0].sounds[0].source==='step.wav','sound cue parsed as data');
const calls=[],ctx={save(){},restore(){},drawImage(...v){calls.push(v);}};
G.draw(ctx,a,{'body.png':{width:16,height:24}},100,200,0,3,2);
ok(calls.length===1&&calls[0][5]===84&&calls[0][6]===152,'sprite placement, direction and scale');
ok(G.at(G.parse(simple.replace('LOOP','')),999).index===1,'non-looping animations clamp to last frame');
const scripted=G.parse(simple+'\nSCRIPT\nalert(\"no\")\nSCRIPTEND');
ok(scripted.warnings.some(w=>w.includes('not executed')),'scripts are inert');
for(const text of [
  simple.replace('body.png','../../secret.png'),
  simple.replace('body.png','https://bad.test/a.png'),
  simple.replace('SPRITE 0 BODY','SPRITE 0 constructor'),
  simple.replace('16 24 player','-1 24 player'),
  simple.replace('WAIT 3','WAIT NaN'),
  simple.replace('WAIT 3','WAIT 999999999'),
  simple.replace('0 -8 -24','99 -8 -24'),
  simple.replace('ANIEND',''),
  'x'.repeat(262145)
]){
  assert.throws(()=>G.parse(text));passed++;
}
console.log(passed+' GANI parser/safety checks passed');
