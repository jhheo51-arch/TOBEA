import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const assets={};
for(const file of await readdir('public')){
 if(!/\.(js|css|html|png|webmanifest)$/.test(file))continue;
 const type=file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.png')?'image/png':'application/manifest+json';
 assets['/'+file]={type,data:(await readFile('public/'+file)).toString('base64')};
}
const core=(await readFile('public/core.js','utf8')).replace(/^export /gm,'');
const evaluation=(await readFile('evaluation.js','utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const source=`const PUBLIC_ASSETS=${JSON.stringify(assets)};\nconst COACHING=${JSON.stringify(await readFile('prompts/scoring.md','utf8'))};\nconst GENERATOR=${JSON.stringify(await readFile('skills/english-question-generator/SKILL.md','utf8'))};\n${core}\n${evaluation}\n${await readFile('worker.js','utf8')}`;
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
if(typeof module.default?.fetch!=='function')throw Error('Worker fetch export missing');
console.log('Built standalone Workers-compatible app; public assets allowlisted; no .env included.');
