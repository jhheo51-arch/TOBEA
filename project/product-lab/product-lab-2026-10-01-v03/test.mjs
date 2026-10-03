import test from 'node:test';
import assert from 'node:assert/strict';
import {sample,analyze,validate,simulate,score} from './model.mjs';
import {parseCSV,aggregateEvents,sampleCSV,parseDay} from './events.mjs';
test('예시 합계·완료율·이탈 인원 계산',()=>{
  const a=analyze(sample);assert.deepEqual(a.counts,[1200,756,252,144]);assert.equal(a.conversion,.12);assert.equal(a.largest.from,1);assert.equal(a.largest.lost,504);assert.ok(Math.abs(a.transitions[1].lossRate-2/3)<1e-10);
});
test('집단별 분석을 전체와 분리',()=>{assert.equal(analyze([sample[0]]).conversion,.075);assert.equal(analyze([sample[1]]).conversion,.225);});
test('무인원·도달자가 없는 단계에서 잘못된 수치를 표시하지 않음',()=>{
  const a=analyze([{name:'빈 자료',counts:[0,0,0,0]}]);assert.equal(a.conversion,null);assert.equal(a.largest,null);assert.equal(simulate(a,1,5),null);
  assert.equal(simulate(analyze([{name:'중단',counts:[10,0,0,0]}]),0,5),null);
});
test('역순·음수·분수·잘못된 형태 차단',()=>{
  for(const counts of [[10,11,5,2],[-1,0,0,0],[10,5.5,2,1],[10,5,1]])assert.throws(()=>validate([{name:'입력',counts}]));
  assert.throws(()=>validate([]));assert.throws(()=>validate([null]));assert.throws(()=>validate([{name:' ',counts:[1,1,1,1]}]));
});
test('시뮬레이션은 이후 진행률 유지·100% 상한·증가폭 0',()=>{
  const a=analyze(sample);assert.ok(Math.abs(simulate(a,1,5).added-21.6)<1e-10);assert.equal(simulate(a,1,0).added,0);assert.equal(simulate(a,2,100).completed,252);assert.throws(()=>simulate(a,3,5));
});
test('평가 점수 범위 검증',()=>{assert.equal(score(4,2,2),4);assert.throws(()=>score(1,2,0));});
const record=(id,event,time,device='mobile')=>({user_id:id,event,occurred_at:`2026-10-01T10:${time}:00+09:00`,device});
test('행동 예시의 고유 인원과 정확히 같은 중복 제거',()=>{
  const result=aggregateEvents(parseCSV(sampleCSV()),'2026-10-01','2026-10-01');
  assert.deepEqual(analyze(result.rows).counts,[12,8,5,3]);assert.equal(result.audit.duplicates,1);assert.equal(result.audit.input,29);
});
test('CSV 따옴표·쉼표·줄바꿈·BOM·열 순서',()=>{
  const rows=parseCSV('\uFEFFdevice,event,occurred_at,user_id\r\nmobile,visit,2026-10-01T09:00:00+09:00,"demo,a"\r\n');assert.equal(rows[0].user_id,'demo,a');
  assert.equal(parseCSV('user_id,event,occurred_at,device\n"line\nnext",visit,2026-10-01T09:00:00+09:00,mobile')[0].user_id,'line\nnext');
  assert.throws(()=>parseCSV('user_id,event,occurred_at,device\n"bad,visit,date,mobile'));assert.throws(()=>parseCSV('user_id,user_id,event,device\na,b,c,d'));
});
test('파일 입력 순서와 무관하게 시각순으로 집계, 반복 방문·기기 변경 중복 없음',()=>{
  const events=[record('a','application_start','02','desktop'),record('a','visit','00'),record('a','detail','01'),record('a','visit','03','desktop')];
  const r=aggregateEvents(events,'2026-10-01','2026-10-01');assert.deepEqual(r.rows[0].counts,[1,1,1,0]);assert.deepEqual(r.rows[1].counts,[0,0,0,0]);
});
test('행동 단계를 건너뛰거나 순서가 뒤바뀌면 제외',()=>{
  const r=aggregateEvents([record('a','visit','00'),record('a','application_start','01'),record('a','detail','02'),record('a','application_complete','03')],'2026-10-01','2026-10-01');
  assert.deepEqual(analyze(r.rows).counts,[1,1,0,0]);assert.equal(r.audit.outOfOrder,2);
});
test('동일 시각의 순서를 추정하지 않음',()=>{
  const r=aggregateEvents([record('a','visit','00'),record('a','detail','00')],'2026-10-01','2026-10-01');assert.deepEqual(analyze(r.rows).counts,[1,0,0,0]);assert.equal(r.audit.tiedUsers,1);
});
test('한국 시간의 시작·종료 경계, 방문 없는 사용자 구분',()=>{
  const r=aggregateEvents([{user_id:'a',event:'visit',occurred_at:'2026-09-30T15:00:00Z',device:'mobile'},record('b','detail','00'),{user_id:'c',event:'visit',occurred_at:'2026-10-01T15:00:00Z',device:'desktop'}],'2026-10-01','2026-10-01');assert.equal(r.audit.includedUsers,1);assert.equal(r.audit.outside,1);assert.equal(r.audit.withoutVisit,1);
});
test('잘못된 날짜·시각·행동 이름과 방문 없는 기간 차단',()=>{
  assert.throws(()=>parseDay('2026-02-30'));assert.throws(()=>aggregateEvents([record('a','visit','00')],'2026-10-02','2026-10-01'));
  assert.throws(()=>aggregateEvents([record('a','unknown','00')],'2026-10-01','2026-10-01'));
  assert.throws(()=>aggregateEvents([{...record('a','visit','00'),occurred_at:'2026-10-01T10:00:00'}],'2026-10-01','2026-10-01'));
  assert.throws(()=>aggregateEvents([record('a','detail','00')],'2026-10-01','2026-10-01'));
});
