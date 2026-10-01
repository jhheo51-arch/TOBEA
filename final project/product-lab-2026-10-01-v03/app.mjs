import {parseCSV, aggregateEvents, sampleCSV} from './events.mjs';
import {stages, sample, analyze, validate, rate, simulate, score} from './model.mjs';
const $ = id => document.getElementById(id);
const key = 'product-lab-v03';
const archiveKey = key + '-history';
const defaultIdeas = [
  {title:'핵심 정보를 먼저 보여주기', description:'상세 화면 상단에 가격·일정·배울 내용을 모으면 신청 시작이 쉬워질까요?', ratings:[4,2,2]},
  {title:'신청 입력 항목 줄이기', description:'필수 입력 항목을 줄이면 신청을 시작한 사람이 더 많이 완료할까요?', ratings:[3,3,2]},
  {title:'모바일 신청 버튼 개선', description:'모바일에서 신청 버튼을 쉽게 찾게 하면 신청 시작이 늘어날까요?', ratings:[4,2,3]}
];
const blankPlan = () => ({reason:'',hypothesis:'',metric:'신청 시작 인원 ÷ 강의 상세 보기 인원',target:'',method:''});
const fresh = () => ({rows:structuredClone(sample), source:'sample',name:'온라인 클래스 신청 과정',selected:0,ratings:defaultIdeas.map(i=>[...i.ratings]),plans:defaultIdeas.map(blankPlan),ideas:structuredClone(defaultIdeas),segment:'all',audit:null});
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
    if (!Array.isArray(value.ideas) || value.ideas.length!==3 || value.ideas.some(i=>typeof i.title!=='string'||!i.title.trim()||i.title.length>120||typeof i.description!=='string'||i.description.length>2000)) throw Error('Invalid ideas');
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
  $('selected-title').textContent = `선택한 개선안 · ${state.ideas[state.selected].title}`;
  for (const name of Object.keys(blankPlan())) $(name).value = state.plans[state.selected][name];
}
function renderAnalysis() {
  const a = current();
  $('source-label').textContent = state.source === 'sample' ? '가상 예시 데이터' : state.source === 'synthetic' ? (state.audit ? '가상 시험 자료 · 행동 기록' : '직접 입력 · 가상 자료') : (state.audit ? '사용자 제공 · 출처 미검증' : '직접 입력 · 출처 미검증');
  $('quality-summary').hidden = !state.audit;
  if(state.audit)$('quality-summary').textContent = qualityText(state.audit);
  $('source-note').textContent = state.name + (state.source === 'custom' ? (state.audit ? ' · 집계 기준과 제외 기록은 자료 점검란에서 확인하세요.' : ' · 인원 순서·범위만 검증합니다.') : ' · 실제 서비스 성과가 아닙니다.');
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
  $('idea-cards').innerHTML = state.ideas.map((idea,i)=>`<article class="card idea-card ${i===state.selected?'selected':''}"><div class="idea-num">가설 0${i+1} · ${idea.edited ? '직접 작성' : idea.imported ? '복원 · 출처 미검증' : idea.ai ? 'AI 제안 · 사람 채택' : '수정 가능한 예시'}</div><h3>${esc(idea.title)}</h3><p>${esc(idea.description)}</p><details><summary>내 가설로 수정하기</summary><label for="idea-title-${i}">가설 ${i+1} 제목</label><input id="idea-title-${i}" data-idea-title="${i}" maxlength="120" value="${esc(idea.title)}"><label for="idea-description-${i}">가설 ${i+1} 내용</label><textarea id="idea-description-${i}" data-idea-description="${i}" maxlength="2000" rows="3">${esc(idea.description)}</textarea></details><div class="rating-row">${['영향','근거 확신','노력'].map((name,j)=>`<label>${name}<select data-idea="${i}" data-rating="${j}" aria-label="${esc(idea.title)} ${name}">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===state.ratings[i][j]?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}</div><div class="score-row"><div><small>우선순위 점수</small><strong id="score-${i}">${score(...state.ratings[i]).toFixed(1)}</strong></div><button data-select="${i}" aria-pressed="${i===state.selected}" class="${i===state.selected?'primary':''}">${i===state.selected?'선택됨':'이 가설 선택'}</button></div></article>`).join('');
}
function refreshSegments() {
  $('segment').innerHTML = '<option value="all">전체 사용자</option>'+state.rows.map((r,i)=>`<option value="${i}">${esc(r.name)}</option>`).join('');
  $('segment').value = ['all',...state.rows.map((_,i)=>String(i))].includes(state.segment) ? state.segment : 'all';
}
$('segment').addEventListener('change',()=>{state.segment=$('segment').value;renderAnalysis();readPlan();persist('분석할 집단을 저장했습니다.');});
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
function applyDataset(rows,source,name,audit=null) {
  validate(rows); readPlan(); archiveCurrent();
  state=fresh();state.rows=rows;state.source=source;state.name=name;state.audit=audit;
  refreshSegments();renderAnalysis();renderIdeas();loadPlan();persist('새 분석을 시작했습니다. 이전 분석과 계획은 보관함에서 다시 열 수 있습니다.');$('data-dialog').close();refreshHistory();
}
$('data-form').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('dataset-name').value.trim();
  const rows=[{name:'입력한 집단',counts:stages.map((_,i)=>Number($('count-'+i).value))}];
  try {if(!name)throw Error('자료 이름과 기간을 입력해 주세요.');validate(rows);applyDataset(rows,$('data-source').value,name);}
  catch(error){$('data-error').textContent=error.message;}
});
$('sample-reset').addEventListener('click',()=>{try{applyDataset(structuredClone(sample),'sample','온라인 클래스 신청 과정');}catch(error){$('data-error').textContent=error.message;}});
$('export').addEventListener('click',()=>{
  readPlan(); const a=current(); const group=$('segment').selectedOptions[0].textContent;
  const text=[`# 제품 개선 실험실 · 기획 보고서`,`\n작성 시각: ${new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)`,`\n자료: ${state.name}`,`자료 구분: ${$('source-label').textContent}`,`분석 집단: ${group}`, state.audit ? `자료 점검: ${qualityText(state.audit)}` : '자료 점검: 집계 인원만 입력하거나 기본 예시 사용',`상태: 실험 준비 / ${state.aiRun?'AI 제안 채택 이력 있음':'AI 제안 미채택'}`,`\n## 데이터 기준`,`같은 기간·같은 집단이 순서대로 단계에 도달한 고유 인원. 인원 직접 입력의 출처·중복·기간 일치는 미검증.`,...stages.map((s,i)=>`- ${s}: ${a.counts[i]}명`),`- 전체 완료율: ${pct(a.conversion)}`,`\n## 관찰`, $('finding-body').textContent,`이탈의 원인은 숫자만으로 단정할 수 없음.`,`\n## 개선안 비교`,...state.ideas.map((idea,i)=>`- ${idea.title} (${idea.edited?'직접 작성':idea.imported?'복원 · 출처 미검증':idea.ai?'AI 제안 · 사람 채택':'예시'}): ${idea.description} / 영향 ${state.ratings[i][0]}, 근거 확신 ${state.ratings[i][1]}, 노력 ${state.ratings[i][2]} / 점수 ${score(...state.ratings[i]).toFixed(1)}`),`\n## 선택한 개선안`,state.ideas[state.selected].title,...Object.entries({reason:'선택 이유',hypothesis:'검증할 가설',metric:'주요 지표',target:'목표와 판단 기준',method:'실험 방법과 중단 조건'}).map(([k,label])=>`\n### ${label}\n${state.plans[state.selected][k]||'(아직 작성하지 않음)'}`),...(state.aiRun?[`\n## AI 제안 채택 이력`,`모델: ${state.aiRun.model} / 시각: ${state.aiRun.createdAt}`,`채택 당시 목표: ${state.aiRun.evidence.goal}`,`채택 당시 집계: ${state.aiRun.evidence.analysis.counts.join(' → ')} / 현재 분석 조건과 다를 수 있음`,...state.aiRun.proposal.limitations.map(s=>`- ${s}`),`같은 모델의 별도 검토이며 실제 효과 검증이 아님. 이후 직접 수정한 내용은 해당 검토 범위 밖임.`]:[]),`\n## 한계`,`가상 자료는 실제 서비스 성과가 아님. 시뮬레이션은 고정된 진행률을 가정한 계산이며 실험 결과가 아님. 목표 달성과 개선 효과는 아직 검증하지 않음.`].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`product-lab-report-${new Date().toISOString().replace(/[:.]/g,'-')}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  persist('기획 보고서를 내려받았습니다. 브라우저의 다운로드 목록에서 확인해 주세요.');
});
function qualityText(a) {
  return `분석 기간 ${a.startDay} ~ ${a.endDay} (한국 시간) · 입력 ${a.input}건 · 중복 제거 ${a.duplicates}건 · 기간 밖 ${a.outside}건 · 방문 없는 사용자 ${a.withoutVisit}명 · 순서 미충족 기록 ${a.outOfOrder}건 · 동일 시각 기록이 있는 사용자 ${a.tiedUsers}명 · 방문 사용자 ${a.includedUsers}명`;
}
function getHistory() {
  const records=JSON.parse(localStorage.getItem(archiveKey)||'[]');
  if(!Array.isArray(records)||records.some(r=>!r||typeof r.id!=='string'||typeof r.label!=='string'||!r.state))throw Error('보관함을 읽지 못했습니다. 현재 계획을 보고서로 먼저 내려받아 주세요.');
  return records;
}
function refreshHistory() {
  try {$('history').innerHTML='<option value="">보관한 분석 선택</option>'+getHistory().map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('');}
  catch(error){$('save-status').textContent=error.message;}
}
function archiveCurrent() {
  try {
    const history=getHistory();
    const savedAt=new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
    history.unshift({id:crypto.randomUUID(),label:`${savedAt} · ${state.name}`,state:structuredClone(state)});
    localStorage.setItem(archiveKey,JSON.stringify(history));
  }catch{throw Error('이전 분석을 보관하지 못해 새 분석을 시작하지 않았습니다. 보고서를 내려받고 브라우저 저장 공간을 확인해 주세요.');}
}
$('history-open').addEventListener('click',()=>{
  try {
    const record=getHistory().find(r=>r.id===$('history').value);
    if(!record)throw Error('보관한 분석을 먼저 선택해 주세요.');
    const value=structuredClone(record.state);validate(value.rows);
    if(!Array.isArray(value.ideas)||value.ideas.length!==3||value.ideas.some(i=>typeof i.title!=='string'||typeof i.description!=='string')||!Array.isArray(value.plans)||value.plans.length!==3||!Array.isArray(value.ratings)||value.ratings.length!==3||!Number.isInteger(value.selected)||value.selected<0||value.selected>2)throw Error('이전 분석 형식이 올바르지 않습니다. 현재 분석을 유지합니다.');
    value.ratings.forEach(r=>score(...r));
    value.plans.forEach(p=>Object.keys(blankPlan()).forEach(k=>{if(typeof p[k]!=='string')throw Error('이전 계획 형식이 올바르지 않습니다.');}));
    readPlan();archiveCurrent();state=value;refreshSegments();renderAnalysis();renderIdeas();loadPlan();refreshHistory();persist('보관한 분석을 열었습니다. 방금 작업하던 분석도 보관함에 남겼습니다.');
  }catch(error){$('save-status').textContent=error.message;}
});
function syncIdea(e) {
  const titleIndex=e.target.dataset.ideaTitle,descriptionIndex=e.target.dataset.ideaDescription;
  if(titleIndex===undefined&&descriptionIndex===undefined)return;
  const i=Number(titleIndex??descriptionIndex),field=titleIndex!==undefined?'title':'description';
  const value=e.target.value.trim();
  if(!value){if(e.type==='change')e.target.value=state.ideas[i][field];$('save-status').textContent='가설 제목과 내용은 비워 둘 수 없습니다.';return;}
  state.ideas[i][field]=value;state.ideas[i].edited=true;
  const card=e.target.closest('.idea-card');
  card.querySelector('h3').textContent=state.ideas[i].title;
  card.querySelector('p').textContent=state.ideas[i].description;
  card.querySelector('.idea-num').textContent=`가설 0${i+1} · 직접 작성`;
  card.querySelectorAll('.rating-row select').forEach((select,j)=>select.setAttribute('aria-label',`${state.ideas[i].title} ${['영향','근거 확신','노력'][j]}`));
  if(state.selected===i)$('selected-title').textContent=`선택한 개선안 · ${state.ideas[i].title}`;
  readPlan();persist('직접 작성한 가설과 계획을 저장했습니다.');
}
$('idea-cards').addEventListener('input',syncIdea);
$('idea-cards').addEventListener('change',syncIdea);
function downloadFile(text,name,type) {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let pendingImport=null,importRevision=0;
function clearReview(){importRevision++;pendingImport=null;$('import-apply').disabled=true;$('import-review').hidden=true;$('event-error').textContent='';}
$('import-open').addEventListener('click',()=>{clearReview();$('event-dialog').showModal();});
$('import-close').addEventListener('click',()=>$('event-dialog').close());
$('event-form').addEventListener('input',clearReview);
$('event-form').addEventListener('change',clearReview);
$('download-template').addEventListener('click',()=>downloadFile('\uFEFFuser_id,event,occurred_at,device\r\n','product-lab-empty-template.csv','text/csv;charset=utf-8'));
$('download-demo').addEventListener('click',()=>downloadFile(sampleCSV(),'product-lab-synthetic-demo.csv','text/csv;charset=utf-8'));
function prepareImport(text) {
  const name=$('event-name').value.trim();if(!name)throw Error('분석 이름을 입력해 주세요.');
  const result=aggregateEvents(parseCSV(text),$('start-day').value,$('end-day').value);
  pendingImport={...result,name,source:$('event-source').value};
  const counts=analyze(result.rows).counts;
  $('import-review').innerHTML=`<h3>점검 결과</h3><p>${esc(qualityText(result.audit))}</p><p>방문 ${counts[0]}명 → 상세 보기 ${counts[1]}명 → 신청 시작 ${counts[2]}명 → 완료 ${counts[3]}명</p><p>자료 구분: ${pendingImport.source==='synthetic'?'가상 시험 자료':'사용자 제공 · 출처 미검증'}. 제외 기록은 위 기준에 따라 집계했습니다. 실제 행동 누락 여부와 식별자의 정확성은 확인하지 못합니다.</p>`;
  $('import-review').hidden=false;$('import-apply').disabled=false;
}
$('try-demo').addEventListener('click',()=>{
  clearReview();$('event-paste').value='';$('event-file').value='';$('event-name').value='가상 시험 · 온라인 클래스 신청';$('event-source').value='synthetic';$('start-day').value='2026-10-01';$('end-day').value='2026-10-01';
  try {prepareImport(sampleCSV());}catch(error){$('event-error').textContent=error.message;}
});
$('event-form').addEventListener('submit',async e=>{
  e.preventDefault();clearReview();const revision=importRevision;const file=$('event-file').files[0];
  try {
    const pasted=$('event-paste').value;
    if(!pasted.trim()&&!file)throw Error('CSV 파일을 선택하거나 내용을 붙여넣어 주세요. 가상 자료로 바로 시험할 수도 있습니다.');
    if(file&&!pasted.trim()&&file.size>2000000)throw Error('2MB 이하의 파일을 선택해 주세요.');
    $('event-error').textContent='자료를 읽고 있습니다…';
    const text=pasted.trim()?pasted:await file.text();if(revision!==importRevision)return;prepareImport(text);$('event-error').textContent='';
  }catch(error){if(revision!==importRevision)return;clearReview();$('event-error').textContent=error.message;}
});
$('import-apply').addEventListener('click',()=>{
  if(!pendingImport)return;
  try{const {rows,source,name,audit}=pendingImport;applyDataset(rows,source,name,audit);$('event-dialog').close();clearReview();}
  catch(error){$('event-error').textContent=error.message;}
});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}},{rootMargin:'-10% 0px -60% 0px'});
document.querySelectorAll('main > section[id]').forEach(section=>observer.observe(section));
refreshHistory();refreshSegments();renderAnalysis();renderIdeas();loadPlan();
if(loaded)$('save-status').textContent='이 브라우저에 저장한 분석과 계획을 불러왔습니다.';
let aiConfigured=false,aiBusy=false,aiDraft=null,aiSignature='';
function aiPayload(){return {goal:$('ai-goal').value.trim(),source:state.source,rows:($('segment').value==='all'?state.rows:[state.rows[Number($('segment').value)]]).map((r,i)=>({name:`집단 ${i+1}`,counts:r.counts})),audit:$('segment').value==='all'?state.audit:null};}
function updateAI(){const payload=aiPayload();$('ai-preview').textContent=JSON.stringify(payload,null,2);$('ai-run').disabled=aiBusy||!aiConfigured||!$('ai-consent').checked||!payload.goal;$('ai-adopt').disabled=aiBusy||!aiDraft?.review.approved||aiSignature!==JSON.stringify(payload);}
async function checkAI(){try{const res=await fetch('/api/status');const value=await res.json();if(!res.ok)throw Error(value.error);aiConfigured=value.configured;$('ai-status').textContent=value.message+(value.model?` · 모델 ${value.model}`:'');}catch{aiConfigured=false;$('ai-status').textContent='서버에 연결하지 못했습니다. 웹서비스를 다시 실행해 주세요.';}updateAI();}
$('ai-refresh').addEventListener('click',checkAI);
$('ai-goal').value=state.aiGoal||'';
$('ai-goal').addEventListener('input',()=>{state.aiGoal=$('ai-goal').value;persist('분석 목표를 저장했습니다.');updateAI();});
$('ai-consent').addEventListener('change',updateAI);
$('segment').addEventListener('change',updateAI);
function showAI(result){$('ai-result').innerHTML=`<h3>${result.review.approved?'검토 통과 · 직접 확인하세요':'검토 보류 · 반영 차단'}</h3><p>${esc(result.model)} · ${esc(result.createdAt)} · 입력 ${result.usage.input_tokens} / 출력 ${result.usage.output_tokens} 토큰 (AI 처리량 단위)</p>${result.review.issues.map(s=>`<p>${esc(s)}</p>`).join('')}${result.proposal.candidates.map((c,i)=>`<article class="card"><h3>${i+1}. ${esc(c.title)}</h3><p>${esc(c.hypothesis)}</p><p>관찰 근거: ${c.evidence_ids.map(id=>{const f=result.evidence.facts.find(f=>f.id===id);return esc(`${f.label} ${Number(f.value.toFixed(2))}${f.unit}`);}).join(' · ')}</p><p>지표: ${esc(c.metric)}</p><p>비교: ${esc(c.comparison)}</p><p>중단: ${esc(c.stop_condition)}</p></article>`).join('')}<h3>자료의 한계</h3>${result.proposal.limitations.map(s=>`<p>${esc(s)}</p>`).join('')}<h3>수행 과정</h3>${result.trace.map(t=>`<p>${esc(t.label)}: ${esc(t.status)}</p>`).join('')}`;}
$('ai-run').addEventListener('click',async()=>{if(aiBusy||$('ai-run').disabled)return;const payload=aiPayload();aiBusy=true;aiDraft=null;aiSignature=JSON.stringify(payload);updateAI();$('ai-result').textContent='';$('ai-message').textContent='가설 제안과 별도 검토 중입니다. 두 번의 AI 호출이 진행되며 최대 약 2분 걸릴 수 있습니다.';try{const res=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw Error(result.error);aiDraft=result;showAI(result);$('ai-message').textContent=aiSignature===JSON.stringify(aiPayload())?'실제 AI 응답을 받았습니다. 근거와 한계를 읽은 뒤 반영 여부를 결정하세요.':'실행 중 분석 조건이 바뀌었습니다. 결과는 볼 수 있지만 현재 기획에 반영할 수 없습니다.';}catch(error){$('ai-message').textContent=error.message||'요청을 완료하지 못했습니다.';}finally{aiBusy=false;updateAI();}});
$('ai-adopt').addEventListener('click',()=>{if($('ai-adopt').disabled)return;try{readPlan();archiveCurrent();state.ideas=aiDraft.proposal.candidates.map(c=>({title:c.title.slice(0,120),description:c.hypothesis,ai:true}));state.plans=aiDraft.proposal.candidates.map(c=>({reason:'',hypothesis:c.hypothesis,metric:c.metric.slice(0,200),target:'표본 수·기간·판단 기준을 직접 설계해야 합니다.',method:`비교 방법: ${c.comparison}\n중단 조건: ${c.stop_condition}`.slice(0,2000)}));state.ratings=[[1,1,1],[1,1,1],[1,1,1]];state.selected=0;state.aiRun=aiDraft;renderIdeas();loadPlan();refreshHistory();persist('AI 가설을 반영했습니다. 점수·선택 이유·실험 기준을 직접 작성해 주세요.');$('ai-message').textContent='이전 기획을 보관하고 반영했습니다. 평가 점수는 모두 1로 시작합니다.';aiDraft=null;updateAI();}catch(error){$('ai-message').textContent=error.message;}});
function validateBackup(value){if(!value||typeof value.name!=='string'||value.name.length>150||!['sample','synthetic','custom'].includes(value.source))throw Error('분석 자료 형식을 확인해 주세요.');validate(value.rows);if(!Array.isArray(value.ideas)||value.ideas.length!==3||value.ideas.some(i=>typeof i.title!=='string'||!i.title.trim()||i.title.length>120||typeof i.description!=='string'||i.description.length>2000)||!Array.isArray(value.plans)||value.plans.length!==3||!Array.isArray(value.ratings)||value.ratings.length!==3||!Number.isInteger(value.selected)||value.selected<0||value.selected>2)throw Error('기획 자료 형식을 확인해 주세요.');value.ratings.forEach(r=>{if(!Array.isArray(r)||r.length!==3)throw Error('평가 점수 형식 오류');score(...r);});value.plans.forEach(p=>Object.keys(blankPlan()).forEach(k=>{if(typeof p[k]!=='string'||p[k].length>2000)throw Error('계획 형식 오류');}));return {rows:value.rows,source:value.source,name:value.name,ideas:value.ideas.map(i=>({title:i.title,description:i.description,imported:true})),plans:value.plans,ratings:value.ratings,selected:value.selected,segment:'all',audit:null,aiGoal:typeof value.aiGoal==='string'?value.aiGoal.slice(0,1000):''};}
$('backup-save').addEventListener('click',()=>{try{readPlan();downloadFile(JSON.stringify({format:'product-lab-backup-v1',current:state,history:getHistory()},null,2),`product-lab-backup-${Date.now()}.json`,'application/json');$('backup-message').textContent='보관 파일을 내려받았습니다. 입력 목표와 기획 내용을 포함하므로 공개 저장소에는 올리지 마세요.';}catch(error){$('backup-message').textContent=error.message;}});
$('backup-open').addEventListener('click',async()=>{try{const file=$('backup-file').files[0],pasted=$('backup-paste').value;if(!pasted.trim()&&(!file||file.size>2000000))throw Error('2MB 이하 JSON 파일을 선택하거나 내용을 붙여넣어 주세요.');const backup=JSON.parse(pasted.trim()?pasted:await file.text());if(backup.format!=='product-lab-backup-v1'||!Array.isArray(backup.history)||backup.history.length>200)throw Error('지원하지 않는 보관 파일입니다.');const restored=validateBackup(backup.current);const records=backup.history.map(r=>({id:crypto.randomUUID(),label:`복원 · ${String(r.label).slice(0,200)}`,state:validateBackup(r.state)}));readPlan();archiveCurrent();const history=getHistory();localStorage.setItem(archiveKey,JSON.stringify([...records,...history]));state=restored;refreshSegments();renderAnalysis();renderIdeas();loadPlan();refreshHistory();$('ai-goal').value=state.aiGoal;updateAI();persist('보관 파일을 복원했습니다. 이전 작업도 보관함에 남겼습니다.');$('backup-message').textContent='복원 완료. 외부 파일의 자료 점검·AI 검토 표시는 신뢰하지 않아 초기화했습니다.';}catch(error){$('backup-message').textContent=error.message;}});
const dataObserver=new MutationObserver(updateAI);dataObserver.observe($('source-note'),{childList:true});
checkAI();

if(state.aiRun){try{showAI(state.aiRun);$('ai-message').textContent='이미 채택한 AI 결과입니다. 채택 당시 자료·목표에 대한 검토이며 이후 수정한 기획은 검토 범위 밖입니다.';}catch{$('ai-message').textContent='보관한 AI 결과를 표시하지 못했습니다. 저장된 기획은 유지합니다.';}}
