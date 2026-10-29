// Wraps game/thornwake.html (the same file published as the Claude artifact) into a
// standalone page with the payments and online (accounts, cloud saves, online play) add-ons,
// written to public/index.html.
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const expansion = readFileSync(new URL('../game/homes-classes.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../game/thornwake.html', import.meta.url), 'utf8');
const marker = "reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);";
if (!source.includes(marker)) throw new Error('Game startup insertion point is missing');
const balance = readFileSync(new URL('../game/balance.js', import.meta.url), 'utf8');
const game = source.replace(marker, expansion + '\n' + balance + '\n' + marker);
const hash=createHash('sha256').update(game);
function hashAssets(dir, prefix=''){
  for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const path=prefix+entry.name;
    if(entry.isDirectory())hashAssets(new URL(entry.name+'/',dir),path+'/');
    else if(!['index.html','release.json','maintenance.json'].includes(path))hash.update(path).update(readFileSync(new URL(entry.name,dir)));
  }
}
hashAssets(new URL('../public/',import.meta.url));
const build=hash.digest('hex').slice(0,16);
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="thornwake-build" content="${build}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
</head>
<body>
${game}
<script src="/payments.js"></script>
<script src="/online.js"></script>
</body>
</html>
`;
writeFileSync(new URL('../public/index.html', import.meta.url), page);
writeFileSync(new URL('../public/release.json',import.meta.url),JSON.stringify({build})+'\n');
console.log('Built public/index.html');
