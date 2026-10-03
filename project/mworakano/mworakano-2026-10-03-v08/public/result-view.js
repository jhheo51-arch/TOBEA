import {compareAttempts} from './core.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {strength:'강점', improve:'연습할 부분', unknown:'관찰 부족', na:'해당 없음'};
const requirements = {met:'충족', partial:'일부 충족', missing:'미충족', unknown:'확인 필요'};
const time = n => `${Math.floor(n / 60).toString().padStart(2,'0')}:${Math.floor(n % 60).toString().padStart(2,'0')}`;

export const demoQuestion = {question:'Tell me about your interest in cafes. Describe what you usually do and explain what you enjoy about it.',requirements:['평소 하는 일 설명','좋아하는 이유']};
export const demoResult = {
  status:'coached',
  summary:'하는 일은 잘 전했어요. 이제 왜 좋아하는지 한 문장 더해보세요.',
  transcript:'I go cafe on weekends. I drink coffee. It is good.',
  requirements:[{index:0,status:'met',reason:'주말에 카페에 가서 커피를 마신다고 설명했습니다.'},{index:1,status:'partial',reason:'It is good만으로는 무엇이 좋은지 구체적으로 알기 어렵습니다.'}],
  evidence:[],feedback:[
    {area:'관련성·완성도',status:'strength',note:'카페라는 질문 주제에 맞는 활동을 말했습니다.'},
    {area:'문법',status:'improve',note:'go cafe를 go to a cafe로 바꿔보세요.'},
    {area:'어휘',status:'improve',note:'good보다 relaxing처럼 구체적인 단어로 이유를 표현해 보세요.'},
    {area:'내용 연결',status:'improve',note:'because를 사용해 활동과 이유를 연결해 보세요.'},
    {area:'발음',status:'unknown',note:'예시에는 녹음이 없어 확인할 수 없습니다.'},
    {area:'억양·강세·흐름',status:'unknown',note:'예시에는 녹음이 없어 확인할 수 없습니다.'},
    {area:'정보 정확성',status:'na',note:'개인 경험의 사실 여부는 평가하지 않습니다.'}
  ],improvements:['because 뒤에 실제로 좋아하는 이유를 덧붙여 보세요.'],
  rewrite:'I go to a cafe on weekends and drink coffee. I enjoy it.',
  next_question:'Tell me about a memorable visit to a cafe. What happened, and why do you remember it?'
};
export const deferredDemo = {...demoResult,status:'deferred',summary:'녹음에서 평가에 필요한 근거를 충분히 확인하지 못했습니다.',transcript:'',requirements:demoQuestion.requirements.map((_,index)=>({index,status:'unknown',reason:'음성을 확인한 뒤 판단할 수 있습니다.'})),feedback:[],improvements:['마이크 위치와 주변 소음을 확인하고 다시 녹음해 주세요.'],rewrite:'',next_question:''};

// The preview and actual result share this layout. Demo data never enters scoring or history.
export function resultHtml(r,q={}, {demo=false,previous=null}={}) {
 const scored=r.status==='coached';
 const review=demo?'AI 호출 없이 만든 설명용 예시입니다.':!scored?'근거가 부족해 코칭을 확정하지 않았습니다.':r.review?.reviewed?'평가 차이를 재검토한 결과입니다.':r.review?.calls>=2?'두 독립 평가의 요구사항·영역별 판정이 일치했습니다.':'평가 세부 정보가 제공되지 않았습니다.';
 const audio=(r.evidence||[]).filter(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=0&&e.end>e.start);
 return `<div class="report-heading"><div><p class="report-kicker">${demo?'PREVIEW · 창작 예시':'SPEAKING REVIEW'}</p><h2 tabindex="-1">${scored?'한마디 더 나아가는 피드백.':'다시 들려주면, 함께 볼게요.'}</h2><p>잘한 점은 이어가고, 한 가지만 바꿔 말해보세요.</p></div><span class="report-tag">${demo?'실제 코칭 아님':'내 답변 분석'}</span></div>
 ${demo?'<p class="report-demo-note">창작 답변·코칭 예시입니다. 실제 녹음이나 AI 평가를 실행하지 않았으며 학습 기록에 저장되지 않습니다.</p>':''}
 <div class="report-overview coaching-overview"><section class="report-score"><span>${scored?'이번에 잘한 점':'다시 확인할 부분'}</span><h3>${esc(scored?(r.feedback||[]).find(x=>x.status==='strength')?.note||'충분한 강점 근거가 확인되지 않았어요.':r.summary)}</h3><p>${demo?'창작 예시 · 실제 평가 아님':'숫자 없이, 내 말에 집중하는 코칭'}</p></section><section class="report-summary"><span class="report-kicker">${scored?'이번에는 한 가지만':'다시 시작하기'}</span><h3>${esc(r.improvements?.[0]||'이번 답변의 흐름을 다른 경험에도 적용해 보세요.')}</h3><p class="report-review">${review}</p><button class="button primary" data-retry>${scored?'같은 질문에 다시 말하기':'녹음 다시 준비하기'} →</button></section></div>
 ${previous?`<section class="report-panel"><div class="report-section-title"><span>↻</span><h3>재도전에서 달라진 점</h3></div><p>같은 질문의 두 답변에서 확인한 요구사항 판정을 비교합니다. 시험 성적 향상을 의미하지 않습니다.</p>${compareAttempts(previous,r,q).length?compareAttempts(previous,r,q).map(x=>`<p><strong>${esc(x.label)}</strong> · ${requirements[x.before]} → ${requirements[x.after]} <span class="report-status">${({improved:'충족 범위 확대',revisit:'다시 확인',same:'같은 판정',unknown:'비교 보류'})[x.change]}</span></p>`).join(''):'<p>근거가 부족해 전후 비교를 보류했습니다.</p>'}<div class="report-comparison"><div><span class="report-kicker">이전 답변</span><p lang="en">${esc(previous.transcript)}</p></div><div><span class="report-kicker">이번 답변</span><p lang="en">${esc(r.transcript)}</p></div></div></section>`:''}
 <details class="report-opic"><summary>오픽 모의시험과 예상 등급 안내</summary><p>일일 연습은 점수 없이 코칭합니다. 여러 질문에 답하는 오픽 모의시험과 비공식 예상 등급 기능은 아직 준비 중이며 사용할 수 없습니다.</p></details>
 <section class="report-panel"><div class="report-section-title"><span>01</span><h3>질문에 충분히 답했나요?</h3></div><p class="report-question" lang="en">${esc(q.question)}</p><div class="report-requirements">${(r.requirements||[]).map(x=>`<div><span class="report-status status-${['met','partial','missing','unknown'].includes(x.status)?x.status:'unknown'}">${requirements[x.status]||'확인 필요'}</span><strong>${esc(q.requirements?.[x.index]||`요구사항 ${x.index+1}`)}</strong><p>${esc(x.reason)}</p></div>`).join('')}</div></section>
 <section class="report-panel"><div class="report-section-title"><span>02</span><h3>${scored?'다음 답변은 이렇게 바꿔보세요.':'다시 녹음하기 전에 확인해 주세요.'}</h3></div><ol class="report-priorities">${(r.improvements||[]).slice(0,1).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${r.transcript||r.rewrite?`<div class="report-comparison"><div><span class="report-kicker">${demo?'창작 답변':'내가 말한 내용'}</span><p lang="en">${esc(r.transcript||'확인 가능한 받아쓰기가 없습니다.')}</p></div>${r.rewrite?`<div class="report-rewrite"><span class="report-kicker">개선 예문</span><p lang="en">${esc(r.rewrite)}</p><small>내 경험과 의도에 맞게 바꿔 말해보세요.</small></div>`:''}</div>`:''}</section>
 <section class="report-panel"><div class="report-section-title"><span>03</span><h3>판단 근거를 확인해 보세요.</h3></div>${demo?'<p class="report-empty">예시에는 녹음이 없습니다. 실제 코칭에서는 인용 문장과 해당 음성 구간을 함께 확인할 수 있습니다.</p>':audio.length?`<p>AI가 제시한 구간을 들어보고 실제 발화와 일치하는지 확인해 주세요.</p>${audio.map(e=>`<button class="evidence-button" data-seek="${e.start}" data-end="${e.end}"><span class="report-kicker">재생 · ${time(e.start)}–${time(e.end)}</span><strong lang="en">${esc(e.quote)}</strong><span>${esc(e.reason)}</span></button>`).join('')}`:'<p class="report-empty">확인할 수 있는 음성 근거가 없습니다. 녹음을 재생해 음질을 확인해 주세요.</p>'}
 ${(r.feedback||[]).length?`<div class="report-feedback">${r.feedback.map(x=>`<article><div><h4>${esc(x.area)}</h4><span class="report-status">${labels[x.status]||'확인 필요'}</span></div><p>${esc(x.note)}</p></article>`).join('')}</div>`:''}</section>
 ${r.next_question?`<section class="report-next"><span class="report-kicker">다음에 연습할 질문</span><p lang="en">${esc(r.next_question)}</p><span>이번 답변을 다듬은 뒤, 다른 경험으로도 확장해 보세요.</span></section>`:''}
 <footer class="report-footer"><p>학습용 AI 코칭 · 공식 시험 평가가 아닙니다.${!demo&&r.model?` · ${esc(r.model)}`:''}</p><button class="button primary" data-retry>내 말로 다시 연습하기 →</button></footer>`;
}

export const retryDemo={...demoResult,feedback:demoResult.feedback.map(x=>['문법','어휘','내용 연결'].includes(x.area)?{...x,status:'strength',note:({문법:'go to a cafe로 표현했습니다.',어휘:'relax로 좋아하는 이유를 구체화했습니다.','내용 연결':'because로 이유를 연결했습니다.'})[x.area]}:x),transcript:'I go to a cafe on weekends. I drink coffee because it helps me relax.',requirements:demoResult.requirements.map(x=>({...x,status:'met',reason:'창작 재도전 예시: 활동과 좋아하는 이유를 설명했습니다.'})),summary:'활동과 이유가 연결됐어요.',improvements:['다른 경험에도 같은 연결 방식을 적용해 보세요.'],rewrite:'I go to a cafe on weekends and drink coffee because it helps me relax.'};
