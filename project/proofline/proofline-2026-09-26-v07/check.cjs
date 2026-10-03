const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeCard, cardToText, historyToText, demoInitial, demoRevised } = require('./script.js');

const first = makeCard(demoInitial);
const revised = makeCard(demoRevised);
assert.equal(first.followup, false);
assert.equal(revised.followup, true);
assert.equal(first.chosenText, demoInitial.directionA);
assert.equal(first.sourceUrl, demoInitial.sourceUrl);
assert.match(cardToText(revised, 2), /인증 문자 찾기/);
assert.match(cardToText(revised, 2), /상대의 반응/);
assert.equal(makeCard({ ...demoInitial, sourceUrl: '' }).contextText.startsWith('조사 전'), true);
assert.equal(makeCard({ ...demoInitial, sourceUrl: 'javascript:alert(1)' }).sourceUrl, null);
assert.equal(makeCard({name:'가명',story:'고민',evidence:'경험',chosen:'A'}).chosenText,'아직 선택 전');
assert.match(cardToText(makeCard({name:'가명',story:'고민',evidence:'경험',chosen:'pending'}),1),/아직 함께 정리하기 전/);
assert.equal(makeCard({...demoInitial,strengthFeedback:'revise'}).strengthFeedbackText,'본인 확인: 수정이 필요함');
assert.match(cardToText(first,1),/본인 진술 · 사실 확인 전/);
assert.match(cardToText(first,1),/상담자의 해석/);
assert.match(cardToText(first,1),/외부 자료/);
assert.match(historyToText({versions:[{data:demoInitial},{data:demoRevised}]}),/2차 카드/);

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
assert.equal(ids.size,[...html.matchAll(/id="([^"]+)"/g)].length,'중복된 화면 ID가 없어야 합니다');
for (const match of script.matchAll(/(?:byId|set)\('([^']+)'/g)) assert.ok(ids.has(match[1]),'화면 ID 누락: '+match[1]);
for (const name of Object.keys(demoInitial).filter(name=>name!=='phase')) assert.ok(ids.has(name), '입력 누락: ' + name);
for (const id of ['demoButton', 'headerDemoButton', 'storyStage', 'directionStage', 'followupStage', 'storyStep', 'directionStep', 'followupStep', 'versionBar', 'cardStrengths', 'cardStrengthFeedback', 'cardDirections', 'cardReviewAt', 'followupBlock', 'recordList', 'followupCta', 'copyButton', 'downloadButton', 'downloadHistoryButton']) {
  assert.ok(ids.has(id), '화면 요소 누락: ' + id);
}
assert.match(html, /href="fictional-case-v07.txt"/);
assert.match(script, /byId\('headerDemoButton'\)\.addEventListener\('click'/);
assert.match(script, /showDemo\(false\)/);
assert.match(script, /previousStorageKey = 'proofline-records-v5'/);
assert.match(script, /setPhase\('story'\)/);
assert.match(script, /setPhase\('direction'\)/);
assert.match(script, /setPhase\('followup'\)/);
assert.ok(fs.existsSync(path.join(__dirname, 'fictional-case-v07.txt')));
const originalCss=fs.readFileSync(path.join(__dirname,'../proofline-2026-09-26-v06/style.css'),'utf8');
const newCss=fs.readFileSync(path.join(__dirname,'style.css'),'utf8');
assert.ok(newCss.startsWith(originalCss.trimEnd()),'기존 디자인 CSS가 보존되어야 합니다');
console.log('PROOFLINE v07 단계·근거·후속 기록 검사 통과');
