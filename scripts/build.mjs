// Wraps game/thornwake.html (the same file published as the Claude artifact) into a
// standalone page with the payments add-on, written to public/index.html.
import {readFileSync, writeFileSync} from 'node:fs';

const game = readFileSync(new URL('../game/thornwake.html', import.meta.url), 'utf8');
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
</body>
</html>
`;
writeFileSync(new URL('../public/index.html', import.meta.url), page);
console.log('Built public/index.html');
