// Wraps game/thornwake.html (the same file published as the Claude artifact) into a
// standalone page with the payments and online (accounts, cloud saves, online play) add-ons,
// written to public/index.html.
import {readFileSync, writeFileSync} from 'node:fs';

const expansion = readFileSync(new URL('../game/homes-classes.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../game/thornwake.html', import.meta.url), 'utf8');
const marker = "reset(0); resize(); show('scr-title'); requestAnimationFrame(frame);";
if (!source.includes(marker)) throw new Error('Game startup insertion point is missing');
const balance = readFileSync(new URL('../game/balance.js', import.meta.url), 'utf8');
const game = source.replace(marker, expansion + '\n' + balance + '\n' + marker);
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
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
console.log('Built public/index.html');
