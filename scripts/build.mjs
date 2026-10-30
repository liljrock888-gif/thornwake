// Wraps game/thornwake.html (the same file published as the Claude artifact) into a
// standalone page with the payments and online (accounts, cloud saves, online play) add-ons,
// written to public/index.html.
import {readFileSync, writeFileSync, readdirSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const expansion = readFileSync(new URL('../game/homes-classes.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../game/thornwake.html', import.meta.url), 'utf8');
const marker = "reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);";
if (!source.includes(marker)) throw new Error('Game startup insertion point is missing');
const balance = readFileSync(new URL('../game/balance.js', import.meta.url), 'utf8');
const souls = readFileSync(new URL('../game/soul-classes.js', import.meta.url), 'utf8');
const slots = readFileSync(new URL('../game/character-slots.js', import.meta.url), 'utf8');
const frontier = readFileSync(new URL('../game/story-frontier.js', import.meta.url), 'utf8');
const inventory = readFileSync(new URL('../game/story-inventory.js', import.meta.url), 'utf8');
const mythology = readFileSync(new URL('../game/story-mythology.js', import.meta.url), 'utf8');
const realtime = readFileSync(new URL('../game/story-realtime.js', import.meta.url), 'utf8');
const tabletop = readFileSync(new URL('../game/story-tabletop.js', import.meta.url), 'utf8');
const builds = readFileSync(new URL('../game/story-builds.js', import.meta.url), 'utf8');
const neighborhood = readFileSync(new URL('../game/story-neighborhood.js', import.meta.url), 'utf8');
const fusion = readFileSync(new URL('../game/story-fusion.js', import.meta.url), 'utf8');
const duels = readFileSync(new URL('../game/story-duels.js', import.meta.url), 'utf8');
const crime = readFileSync(new URL('../game/story-crime.js', import.meta.url), 'utf8');
const civics = readFileSync(new URL('../game/story-civics.js', import.meta.url), 'utf8');
const familiars = readFileSync(new URL('../game/story-familiars.js', import.meta.url), 'utf8');
const strongholds = readFileSync(new URL('../game/story-strongholds.js', import.meta.url), 'utf8');
const emotes = readFileSync(new URL('../game/story-emotes.js', import.meta.url), 'utf8');
const storyRefresh = readFileSync(new URL('../game/story-refresh.js', import.meta.url), 'utf8');
const ganiPlayer = readFileSync(new URL('../game/gani-player.js', import.meta.url), 'utf8');
const storyGani = readFileSync(new URL('../game/story-gani.js', import.meta.url), 'utf8');
const game = source.replace(marker, expansion + '\n' + balance + '\n' + souls + '\n' + slots + '\n' + frontier + '\n' + inventory + '\n' + mythology + '\n' + realtime + '\n' + tabletop + '\n' + builds + '\n' + neighborhood + '\n' + fusion + '\n' + duels + '\n' + crime + '\n' + civics + '\n' + familiars + '\n' + strongholds + '\n' + emotes + '\n' + marker);
const refreshedGame=game.replace(marker,storyRefresh+'\n'+ganiPlayer+'\n'+storyGani+'\n'+marker);
// Ship actual editable original GANI files alongside the inline game.
const ganiFactory=new Function(ganiPlayer+';return GANI.preset;')();
mkdirSync(new URL('../public/animations/',import.meta.url),{recursive:true});
for(const mode of ['idle','walk','slash','shoot','cast','dodge','guard','hit','dance','wave','sit','cheer'])
  writeFileSync(new URL(`../public/animations/${mode}.gani`,import.meta.url),ganiFactory(mode,mode==='idle'?5:mode==='walk'?2:1));
const hash=createHash('sha256').update(refreshedGame);
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
<link rel="icon" href="data:,">
<meta name="thornwake-build" content="${build}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
</head>
<body>
${refreshedGame}
<script src="/payments.js"></script>
<script src="/online.js"></script>
</body>
</html>
`;
writeFileSync(new URL('../public/index.html', import.meta.url), page);
writeFileSync(new URL('../public/release.json',import.meta.url),JSON.stringify({build})+'\n');
console.log('Built public/index.html');
