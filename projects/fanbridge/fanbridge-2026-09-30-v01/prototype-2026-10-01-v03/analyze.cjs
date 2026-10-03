const evidence=require('./question-evidence.json');
const assert=require('node:assert/strict');
assert.equal(new Set(evidence.map(r=>r.source)).size,evidence.length);
for(const row of evidence) assert.ok(row.evidence&&row.counterexample&&row.access&&row.scope);
const included=evidence.filter(r=>!r.access.includes('본문 집계에서 제외'));
const counts={};for(const row of included)for(const type of row.classification)counts[type]=(counts[type]||0)+1;
console.log(JSON.stringify({method:'2026-09-30 기존 조사 재분류. 원문 신규 수집·대량 수집 아님',independentRecords:evidence.length,bodyRecords:included.length,supplementalRecords:evidence.length-included.length,classificationCounts:counts,confirmedPolicyProblem:0,directSilver2Evidence:'미확인',limitation:'분류는 원인 후보. 팬 전체 비율·반복 문의량·해결 여부를 뜻하지 않음'},null,2));
