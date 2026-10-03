const assert=require('node:assert/strict');
const {buildGuide,summarize}=require('./app.js');
assert.equal(buildGuide('2025','blue','eligibility',2).links.length,1);
assert.ok(buildGuide('2026','none','companions',4).steps.some(s=>s.includes('4명')));
assert.throws(()=>buildGuide('2026','blue','eligibility',0));
const base={kind:'practice',variant:'original',tasks:['pass','pass','pass'],help:false,elapsed:200};
const s=summarize([base,{...base,help:true},{...base,tasks:['pass','stopped','pass']},{...base,kind:'actual'},{...base,elapsed:901}])[0];
assert.deepEqual(s,{variant:'original',total:4,success:1,help:1});
console.log('PASS: 과거 정책 혼용 방지, 인원 검증, 중단·도움·시간 초과·실제 자료 분리');
