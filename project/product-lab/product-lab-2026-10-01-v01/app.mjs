import {stages, sample, analyze, validate, rate, simulate, score} from './model.mjs';
const $ = id => document.getElementById(id);
const key = 'product-lab-v01';
const ideas = [
  {title:'핵심 정보를 먼저 보여주기', description:'상세 화면 상단에 가격·일정·배울 내용을 모으면 신청 시작이 쉬워질까요?', ratings:[4,2,2]},
  {title:'신청 입력 항목 줄이기', description:'필수 입력 항목을 줄이면 신청을 시작한 사람이 더 많이 완료할까요?', ratings:[3,3,2]},
  {title:'모바일 신청 버튼 개선', description:'모바일에서 신청 버튼을 쉽게 찾게 하면 신청 시작이 늘어날까요?', ratings:[4,2,3]}
];
const blankPlan = () => ({reason:'',hypothesis:'',metric:'신청 시작 인원 ÷ 강의 상세 보기 인원',target:'',method:''});
const fresh = () => ({rows:structuredClone(sample), source:'sample',name:'온라인 클래스 신청 과정',selected:0,ratings:ideas.map(i=>[...i.ratings]),plans:ideas.map(blankPlan)});
let state = fresh();
let loaded = false;
try {
  const saved = localStorage.getItem(key);
  if (saved) {
    const value = JSON.parse(saved);
    validate(value.rows);
    if (!['sample','custom','synthetic'].includes(value.source) || typeof value.name !== 'string' || value.name.length > 150 || !Number.isInteger(value.selected) || value.selected < 0 || value.selected > 2 || !Array.isArray(value.ratings) || value.ratings.length !== 3 || !Array.isArray(value.plans) || value.plans.length !== 3) throw Error('Invalid saved state');
    value.ratings.forEach(r=>{if(!Array.isArray(r)||r.length!==3)throw Error('Invalid ratings');score(...r);});
    value.plans.forEach(p=>{for(const field of Object.keys(blankPlan()))if(typeof p[field]!=='string'||p[field].length>2000)throw Error('Invalid plan');});
    state = value; loaded = true;
  }
} catch { $('save-status').textContent = '저장한 자료를 불러오지 못해 가상 예시 데이터로 시작했습니다.'; }
const fmt = n => n.toLocaleString('ko-KR');
const pct = n => n === null ? '계산 불가' : (n*100).toFixed(1)+'%';
const esc = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current = () => analyze($('segment').value === 'all' ? state.rows : [state.rows[Number($('segment').value)]]);
function persist(message) {
  try {localStorage.setItem(key, JSON.stringify(state)); $('save-status').textContent = message;}
  catch {$('save-status').textContent = '브라우저 저장 공간에 저장하지 못했습니다. 기획 보고서 내려받기로 내용을 보관해 주세요.';}
}
function readPlan() {for (const name of Object.keys(blankPlan())) state.plans[state.selected][name] = $(name).value;}
function loadPlan() {
  $('selected-title').textContent = `선택한 개선안 · ${ideas[state.selected].title}`;
  for (const name of Object.keys(blankPlan())) $(name).value = state.plans[state.selected][name];
}
function renderAnalysis() {
  const a = current();
  $('source-label').textContent = state.source === 'sample' ? '가상 예시 데이터' : state.source === 'synthetic' ? '직접 입력 · 가상 자료' : '직접 입력 · 출처 미검증';
  $('source-note').textContent = state.name + (state.source === 'custom' ? ' · 인원 순서·범위만 검증합니다.' : ' · 실제 서비스 성과가 아닙니다.');
  $('metrics').innerHTML = [
    ['방문 인원',fmt(a.counts[0])+'명','분석할 집단의 시작 인원'],
    ['신청 완료율',pct(a.conversion),fmt(a.counts[3])+'명이 마지막 단계 도달'],
    ['가장 큰 이탈 인원',a.largest ? fmt(a.largest.lost)+'명':'계산 불가',a.largest ? `${stages[a.largest.from]} → ${stages[a.largest.to]}`:'관찰할 인원이 없습니다.']
  ].map(([title,value,note])=>`<article class="metric"><p>${title}</p><strong>${value}</strong><small>${note}</small></article>`).join('');
  $('funnel').innerHTML = stages.map((label,i)=>`<div class="funnel-row"><span>${label}</span><div class="bar-track" aria-hidden="true"><div class="bar" style="width:${(rate(a.counts[i],a.counts[0])??0)*100}%"></div></div><strong>${fmt(a.counts[i])}명</strong></div>${i<3 ? `<div class="step-loss">다음 단계 진행률 ${pct(a.transitions[i].passRate)} · 이탈 ${fmt(a.transitions[i].lost)}명</div>`:''}`).join('');
  $('finding-title').textContent = a.largest ? `${stages[a.largest.from]}에서 ${fmt(a.largest.lost)}명이 멈췄습니다.` : '아직 관찰할 인원이 없습니다.';
  $('finding-body').textContent = a.largest ? `이탈 인원 기준으로 가장 큰 구간입니다. 이 단계에 도달한 ${fmt(a.counts[a.largest.from])}명 중 ${pct(a.largest.lossRate)}가 다음 단계로 진행하지 않았습니다. 이탈 비율이 가장 큰 구간과는 다를 수 있습니다.` : '방문 인원을 입력하면 단계별 진행률을 볼 수 있습니다.';
  $('segments').innerHTML = state.rows.map(r=>`<tr><th scope="row">${esc(r.name)}</th><td>${fmt(r.counts[0])}명</td><td>${fmt(r.counts[3])}명</td><td>${pct(rate(r.counts[3],r.counts[0]))}</td></tr>`).join('');
  renderSimulation();
}
function renderSimulation() {
  const points = Number($('uplift').value);
  $('uplift-label').textContent = `+${points}%p`;
  const result = simulate(current(), Number($('sim-step').value), points);
  $('scenario-result').innerHTML = result ? `<p>가정하에서의 추가 신청 완료 인원</p><strong>+${fmt(Math.round(result.added))}명</strong><p>총 약 ${fmt(Math.round(result.completed))}명 · 선택 단계 진행률 ${pct(result.nextRate)}</p>` : '<p>계산에 필요한 단계 인원이 없습니다. 데이터를 입력해 주세요.</p>';
}
function renderIdeas() {
  $('idea-cards').innerHTML = ideas.map((idea,i)=>`<article class="card idea-card ${i===state.selected?'selected':''}"><div class="idea-num">가설 0${i+1} · 사람이 작성한 예시</div><h3>${idea.title}</h3><p>${idea.description}</p><div class="rating-row">${['영향','근거 확신','노력'].map((name,j)=>`<label>${name}<select data-idea="${i}" data-rating="${j}" aria-label="${idea.title} ${name}">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===state.ratings[i][j]?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}</div><div class="score-row"><div><small>우선순위 점수</small><strong id="score-${i}">${score(...state.ratings[i]).toFixed(1)}</strong></div><button data-select="${i}" aria-pressed="${i===state.selected}" class="${i===state.selected?'primary':''}">${i===state.selected?'선택됨':'이 가설 선택'}</button></div></article>`).join('');
}
function refreshSegments() {
  $('segment').innerHTML = '<option value="all">전체 사용자</option>'+state.rows.map((r,i)=>`<option value="${i}">${esc(r.name)}</option>`).join('');
}
$('segment').addEventListener('change',renderAnalysis);
$('sim-step').addEventListener('change',renderSimulation);
$('uplift').addEventListener('input',renderSimulation);
$('idea-cards').addEventListener('change', e=>{
  const {idea,rating} = e.target.dataset;
  if (idea===undefined) return;
  state.ratings[Number(idea)][Number(rating)] = Number(e.target.value);
  $('score-'+idea).textContent = score(...state.ratings[Number(idea)]).toFixed(1);
  readPlan(); persist('평가 점수와 작성 중인 계획을 저장했습니다.');
});
$('idea-cards').addEventListener('click', e=>{
  const button = e.target.closest('[data-select]'); if(!button)return;
  readPlan();state.selected=Number(button.dataset.select);renderIdeas();loadPlan();persist('선택한 개선안을 저장했습니다.');
  $('idea-cards').querySelector(`[data-select="${state.selected}"]`).focus();
});
$('plan-form').addEventListener('input',()=>{readPlan();persist('작성 중인 계획을 이 브라우저에 저장했습니다.');});
$('plan-form').addEventListener('submit',e=>{e.preventDefault();readPlan();persist('실험 계획을 저장했습니다. 아직 실험을 실행하거나 효과를 확인한 것은 아닙니다.');});
$('edit-data').addEventListener('click',()=>{
  $('dataset-name').value = state.source==='sample'?'':state.name;
  $('data-source').value = state.source==='synthetic'?'synthetic':'custom';
  const totals = analyze(state.rows).counts;
  $('data-fields').innerHTML = '<div class="data-input-row">'+stages.map((name,i)=>`<div><label for="count-${i}">${name} 인원</label><input id="count-${i}" type="number" min="0" max="1000000000" step="1" required value="${totals[i]}"></div>`).join('')+'</div>';
  $('data-error').textContent='';$('data-dialog').showModal();
});
$('close-dialog').addEventListener('click',()=>$('data-dialog').close());
function applyDataset(rows,source,name) {
  state=fresh();state.rows=rows;state.source=source;state.name=name;
  refreshSegments();renderAnalysis();renderIdeas();loadPlan();persist('새 분석을 시작했습니다. 이전 계획은 내려받은 보고서로 보관해 주세요.');$('data-dialog').close();
}
$('data-form').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('dataset-name').value.trim();
  const rows=[{name:'입력한 집단',counts:stages.map((_,i)=>Number($('count-'+i).value))}];
  try {if(!name)throw Error('자료 이름과 기간을 입력해 주세요.');validate(rows);applyDataset(rows,$('data-source').value,name);}
  catch(error){$('data-error').textContent=error.message;}
});
$('sample-reset').addEventListener('click',()=>applyDataset(structuredClone(sample),'sample','온라인 클래스 신청 과정'));
$('export').addEventListener('click',()=>{
  readPlan(); const a=current(); const group=$('segment').selectedOptions[0].textContent;
  const text=[`# 제품 개선 실험실 · 기획 보고서`,`\n작성 시각: ${new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)`,`\n자료: ${state.name}`,`자료 구분: ${$('source-label').textContent}`,`분석 집단: ${group}`,`상태: 실험 준비 / AI 미연결`,`\n## 데이터 기준`,`같은 기간·같은 집단이 순서대로 단계에 도달한 고유 인원. 직접 입력 자료의 출처·중복·기간 일치는 미검증.`,...stages.map((s,i)=>`- ${s}: ${a.counts[i]}명`),`- 전체 완료율: ${pct(a.conversion)}`,`\n## 관찰`, $('finding-body').textContent,`이탈의 원인은 숫자만으로 단정할 수 없음.`,`\n## 개선안 비교 (사람이 작성한 가설)`,...ideas.map((idea,i)=>`- ${idea.title}: 영향 ${state.ratings[i][0]}, 근거 확신 ${state.ratings[i][1]}, 노력 ${state.ratings[i][2]} / 점수 ${score(...state.ratings[i]).toFixed(1)}`),`\n## 선택한 개선안`,ideas[state.selected].title,...Object.entries({reason:'선택 이유',hypothesis:'검증할 가설',metric:'주요 지표',target:'목표와 판단 기준',method:'실험 방법과 중단 조건'}).map(([k,label])=>`\n### ${label}\n${state.plans[state.selected][k]||'(아직 작성하지 않음)'}`),`\n## 한계`,`가상 자료는 실제 서비스 성과가 아님. 시뮬레이션은 고정된 진행률을 가정한 계산이며 실험 결과가 아님. 목표 달성과 개선 효과는 아직 검증하지 않음.`].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`product-lab-report-${new Date().toISOString().replace(/[:.]/g,'-')}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  persist('기획 보고서를 내려받았습니다. 브라우저의 다운로드 목록에서 확인해 주세요.');
});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}},{rootMargin:'-10% 0px -60% 0px'});
document.querySelectorAll('main > section[id]').forEach(section=>observer.observe(section));
refreshSegments();renderAnalysis();renderIdeas();loadPlan();
if(loaded)$('save-status').textContent='이 브라우저에 저장한 분석과 계획을 불러왔습니다.';
