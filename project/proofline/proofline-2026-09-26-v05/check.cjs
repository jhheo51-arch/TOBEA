const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeCard, cardToText, demoInitial, demoRevised } = require('./script.js');

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

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
for (const name of Object.keys(demoInitial)) assert.ok(ids.has(name), '입력 누락: ' + name);
for (const id of ['demoButton', 'versionBar', 'cardStrengths', 'cardDirections', 'followupBlock', 'recordList', 'copyButton', 'downloadButton']) {
  assert.ok(ids.has(id), '화면 요소 누락: ' + id);
}
console.log('PROOFLINE v05 기본 흐름 검사 통과');
