import test from 'node:test';
import assert from 'node:assert/strict';
import {resultHtml,demoResult,deferredDemo,demoQuestion} from '../public/result-view.js';

test('preview never offers invented audio evidence and labels its score',()=>{
 const html=resultHtml({...demoResult,evidence:[{start:0,end:2,quote:'fiction',reason:'fiction'}]},demoQuestion,{demo:true});
 assert.match(html,/가상 답변·가상 점수/);
 assert.doesNotMatch(html,/data-seek=/);
 assert.match(html,/예시에는 녹음이 없습니다/);
});
test('deferred results do not claim agreement, a numeric score or a grade',()=>{
 const html=resultHtml(deferredDemo,demoQuestion);
 assert.match(html,/평가 보류/);
 assert.doesNotMatch(html,/판정이 일치|null|undefined|class="report-number">\d/);
 assert.match(html,/비공식 예상 등급 기능은 아직 구현·검증되지 않았습니다/);
});
test('real evidence playback times survive while AI text is escaped',()=>{
 const html=resultHtml({...demoResult,summary:'<img src=x onerror=alert(1)>',review:{calls:2},evidence:[{start:1.5,end:4,quote:'<script>bad</script>',reason:'reason'}]},demoQuestion);
 assert.match(html,/data-seek="1.5" data-end="4"/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/판정이 일치/);
});
