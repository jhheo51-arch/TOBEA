const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),C=require('./core.js');
const seed=fs.readFileSync(__dirname+'/reward-case.js','utf8');
const startup=fs.readFileSync(__dirname+'/app.js','utf8').split('const questions=')[0];
function run(input,fail=false){let stored=input;const node={textContent:'',classList:{add(){},remove(){}}};const context={window:{JH:C},document:{querySelector:()=>node},localStorage:{getItem:()=>stored,setItem:(k,v)=>{if(fail)throw Error('full');stored=v;}},setTimeout:()=>0,clearTimeout(){}};vm.createContext(context);vm.runInContext(seed+'\n'+startup+'\nglobalThis.result={projects,broken};',context);return {result:context.result,stored};}
const empty=run(null);assert.equal(empty.result.projects.length,1);assert.equal(empty.result.projects[0].revisions.length,0);assert.equal(empty.result.projects[0].baseline,'');
assert.equal(run(empty.stored).result.projects.length,1);
const old=C.blank('기존 사용자 기획');old.id='existing';old.problem='사용자가 작성한 문제';
const merged=run(JSON.stringify({format:'jh-planning-v1',projects:[old]}));assert.equal(merged.result.projects.length,2);assert.equal(merged.result.projects[0].problem,old.problem);
assert.equal(run('{broken').result.broken,true);assert.equal(run('{broken').stored,'{broken');
assert.equal(run(null,true).result.projects.length,0);
const max=Array.from({length:50},(_,i)=>({...C.blank('기존 '+i),id:'id'+i}));assert.equal(run(JSON.stringify({format:'jh-planning-v1',projects:max})).result.projects.length,50);
const imported=C.parseBackup(fs.readFileSync(__dirname+'/reward-case-2026-10-02-v01.json','utf8'));assert.equal(imported.length,1);assert.deepEqual(C.issues(imported[0]),[]);
console.log('통과: 기존 기록 보존·중복 방지·손상 원본 보존·저장 실패 복구·50개 한도·초안 불러오기');
