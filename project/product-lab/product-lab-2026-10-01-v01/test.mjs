import test from 'node:test';
import assert from 'node:assert/strict';
import {sample,analyze,validate,simulate,score} from './model.mjs';
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
