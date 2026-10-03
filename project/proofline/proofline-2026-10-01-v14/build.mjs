import {cpSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=import.meta.dirname;
const dist=join(root,'dist');
const client=join(dist,'client');
mkdirSync(client,{recursive:true});
for(const name of ['index.html','style.css','script.js','agent.js','demo-final-report-v13.txt','fictional-pilot-v09.txt'])cpSync(join(dist,name),join(client,name));
mkdirSync(join(dist,'.openai'),{recursive:true});
writeFileSync(join(dist,'.openai','hosting.json'),readFileSync(join(root,'.openai','hosting.json')));
writeFileSync(join(dist,'server','wrangler.json'),JSON.stringify({
  main:'index.js',compatibility_date:'2026-05-22',
  assets:{directory:'../client',binding:'ASSETS',html_handling:'auto-trailing-slash'}
},null,2));
console.log('Sites Worker build ready: dist/server/index.js + dist/client');
