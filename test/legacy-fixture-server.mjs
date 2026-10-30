// Test-only server. Legacy regression suites exercise the existing classic combat
// implementation; frontier.test exercises the new default real-time implementation.
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('public'),marker="reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);";
createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return;}
  let body=readFileSync(path);
  if(path.endsWith('/index.html'))body=Buffer.from(body.toString().replace(marker,
    "const qaClassicStart=stStartBattle;stStartBattle=function(...args){stData().storyCombat='classic';return qaClassicStart(...args);};"+marker));
  const type={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.css':'text/css'}[extname(path)]||'application/octet-stream';
  res.writeHead(200,{'content-type':type});res.end(body);
}).listen(3001,'127.0.0.1',()=>console.log('Legacy fixture server 3001'));
