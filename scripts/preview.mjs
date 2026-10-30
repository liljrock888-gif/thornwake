import {cpSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
const output=new URL('../preview/',import.meta.url);
mkdirSync(output,{recursive:true});
cpSync(new URL('../public/',import.meta.url),output,{recursive:true});
// Computer's opaque preview origin cannot persist browser saves. Keep the
// deployable production build and payment implementation completely unchanged.
const shim=`<script>
const TW_PREVIEW_STORAGE=(()=>{
  const values=new Map();
  return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()};
})();
</script>`;
const html=readFileSync(new URL('index.html',output),'utf8')
  .replaceAll('localStorage','TW_PREVIEW_STORAGE')
  .replace('</head>',shim+'</head>')
  .replace('<body>','<body><div style="position:fixed;left:50%;transform:translateX(-50%);top:3px;z-index:9999;background:#172b25;color:#d7c79f;padding:4px 10px;border:1px solid #6b7e65;border-radius:5px;font:11px sans-serif;pointer-events:none;white-space:nowrap">Preview: saves last until refresh. No real payments.</div>');
writeFileSync(new URL('index.html',output),html);
for(const file of ['payments.js','online.js','sw-bridge.js']){
  const path=new URL(file,output);
  if(!existsSync(path))continue;
  writeFileSync(path,readFileSync(path,'utf8').replaceAll('localStorage','TW_PREVIEW_STORAGE')
    .replaceAll("fetch('/api/config')","Promise.resolve(new Response(JSON.stringify({enabled:false,supabase:null,products:[]})))"));
}
console.log('Built preview/ with session-only in-memory saves; production public/ is unchanged.');
