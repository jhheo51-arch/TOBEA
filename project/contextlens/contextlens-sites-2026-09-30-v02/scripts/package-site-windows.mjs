// 공식 준비 도구를 사용하고 Windows tar로 게시 파일을 묶는다.
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,cpSync} from 'node:fs';
import path from 'node:path';
const [project,archive,helper]=process.argv.slice(2);
if (![project,archive,helper].every(x=>x&&path.isAbsolute(x))) throw Error('Absolute paths required');
if (existsSync(archive)) throw Error('Archive already exists; choose a new filename');
mkdirSync(path.dirname(archive),{recursive:true});
const stage=mkdtempSync(path.join(path.dirname(archive),'package-stage-'));
const run=(exe,args)=>{const r=spawnSync(exe,args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.error?.message||'Packaging failed');return r.stdout;};
run(process.execPath,[helper,project,path.join(stage,'dist')]);
const metadata=path.join(stage,'dist','.openai');mkdirSync(metadata,{recursive:true});
const source=JSON.parse(readFileSync(path.join(project,'.openai','hosting.json'),'utf8'));
writeFileSync(path.join(metadata,'hosting.json'),JSON.stringify(source,null,2)+'\n');
cpSync(path.join(project,'drizzle'),path.join(metadata,'drizzle'),{recursive:true});
run('tar',['-C',stage,'-czf',archive,'dist']);
const entries=run('tar',['-tzf',archive]).split(/\r?\n/);
for (const entry of ['dist/.openai/hosting.json','dist/server/index.js','dist/client/projects.html','dist/client/projects.js','dist/.openai/drizzle/0001_spooky_wolf_cub.sql']) if (!entries.includes(entry)) throw Error('Missing archive entry: '+entry);
console.log(JSON.stringify({archive,validated:true,entries:entries.length}));
