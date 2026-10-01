const assert=require('node:assert/strict');
const {POLICY,LIMIT,TASKS,allocate,score,successful,summarize,csv,validRecords}=require('./app.js');
for(const task of TASKS){
 const correct=task.options.find(o=>o[2]==='correct')[0];
 assert.equal(score(task.id,correct,LIMIT-1),'correct');
 assert.equal(score(task.id,correct,LIMIT),'timeout');
 assert.equal(score(task.id,task.options.find(o=>o[2]==='danger')[0],100),'danger');
 assert.throws(()=>score(task.id,'invented',100));
}
assert.throws(()=>score('quantity','no',-1));
assert.equal(allocate([],'actual','new',0),'original');
assert.equal(allocate([{kind:'actual',experience:'new',variant:'original'}],'actual','new',0),'improved');
assert.equal(allocate([{kind:'practice',experience:'new',variant:'original'}],'actual','new',0),'original');
const base={pid:'FAN-1',policy:POLICY,kind:'actual',experience:'new',variant:'original',status:'completed',tasks:TASKS.map(t=>({id:t.id,startedAt:1000,answer:t.options.find(o=>o[2]==='correct')[0],grade:'correct',elapsedMs:1000,help:[],away:[]}))};
assert.ok(validRecords([base]));assert.equal(validRecords([null]),false);assert.equal(validRecords([{...base,tasks:[{...base.tasks[0],help:null}]}]),false);
assert.equal(validRecords([{...base,status:'active',tasks:[]} , {...base,status:'active',tasks:[]}]),false);
assert.ok(successful(base));
const helped=structuredClone(base);helped.tasks[1].help.push({atMs:500});
assert.equal(successful(helped),false);
const stopped={...base,status:'stopped',stopReason:'technical',tasks:[]};
const rows=[base,helped,stopped,{...base,status:'active',tasks:[]},{...base,kind:'practice'},{...base,policy:'other'}];
const result=summarize(rows)[0];
assert.equal(result.total,4);assert.equal(result.success,1);assert.equal(result.help,1);assert.equal(result.stopped,1);assert.equal(result.inProgress,1);assert.equal(result.medianMs,3000);
assert.equal(summarize(rows,'actual',true)[0].total,3);
assert.equal(summarize([])[0].medianMs,null);
const exported=csv([{...base,tasks:base.tasks.map(t=>({...t,reason:'=SUM(A1)"\n악성 수식'}))},stopped]);
assert.ok(exported.includes("'=SUM"));assert.ok(exported.includes('not_started'));assert.ok(exported.includes('""'));
console.log('PASS: 세 과제 정답·위험 오답·300초 경계, 경험별 배정, 연습 분리, 중단 포함 분모, 기술 장애 보조 비교, CSV 수식 방지');
