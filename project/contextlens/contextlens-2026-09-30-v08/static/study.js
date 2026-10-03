const $ = id => document.getElementById(id);
const node = (tag, className, value) => { const item=document.createElement(tag); if (className) item.className=className; if (value!==undefined) item.textContent=value; return item; };
const clear = item => { while (item.firstChild) item.removeChild(item.firstChild); };
async function get(path) { const response=await fetch(path); const data=await response.json(); if (!response.ok) throw new Error(data.error || '자료를 읽지 못했습니다.'); return data; }
async function post(path,payload) { const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await response.json(); if (!response.ok) throw new Error(data.error || '저장하지 못했습니다.'); return data; }

async function loadSources() {
  const cases=await get('/api/cases');
  clear($('study-source'));
  for (const item of cases.cases) {
    if (!item.latest_snapshot_id) continue;
    const option=node('option','',`${item.title} · 저장된 수집 시점 ${item.snapshot_count}개`);
    option.value=item.latest_snapshot_id; $('study-source').appendChild(option);
  }
  if (!$('study-source').options.length) {
    const option=node('option','','먼저 댓글이 있는 링크를 분석해 주세요'); option.value=''; $('study-source').appendChild(option);
  }
}

function cohortCard(label, stats) {
  const card=node('div','cohort-card');
  card.appendChild(node('strong','',label));
  const rate=stats.reviewed ? `${stats.success}/${stats.started}명 (시작 기준)` : '아직 판정 없음';
  const duration=stats.median_seconds===null ? '아직 없음' : `${stats.median_seconds}초`;
  card.appendChild(node('p','',`시작 ${stats.started}명 · 제출 ${stats.finished}명 · 검토 ${stats.reviewed}명`));
  card.appendChild(node('p','',`과제 성공 ${rate} · 중앙 소요 시간 ${duration}`));
  card.appendChild(node('p','',`근거 없는 주장 ${stats.unsupported_claims}건`));
  return card;
}

function reviewer(row) {
  const form=node('div','study-review');
  const statusLabel=node('label','','답변 타당성');
  const status=node('select');
  [['pending','아직 검토하지 않음'],['valid','근거와 가설이 타당함'],['invalid','근거 또는 가설이 부적절함']].forEach(([value,label])=>{const option=node('option','',label); option.value=value; status.appendChild(option);});
  status.value=row.review_status; statusLabel.appendChild(status);
  const checkLabel=node('label','check-row');
  const unsupported=node('input'); unsupported.type='checkbox'; unsupported.checked=row.unsupported_claim;
  checkLabel.append(unsupported,node('span','','표본을 전체 고객으로 일반화하거나 근거 없는 효과를 주장함'));
  const noteLabel=node('label','','판정 이유와 관찰한 불편');
  const note=node('textarea'); note.maxLength=1500; note.value=row.reviewer_note; noteLabel.appendChild(note);
  const button=node('button','','검토 결과 저장'); button.type='button';
  const saveState=node('span','save-state','');
  button.addEventListener('click',async()=>{
    button.disabled=true; saveState.textContent='저장 중';
    try { await post('/api/study/review',{id:row.id,status:status.value,unsupported_claim:unsupported.checked,note:note.value}); await loadDashboard(); }
    catch(error) { saveState.textContent=`저장 실패: ${error.message}`; button.disabled=false; }
  });
  form.append(statusLabel,checkLabel,noteLabel,button,saveState);
  return form;
}

function sessionCard(row) {
  const card=node('article','session-card');
  card.appendChild(node('h4','',`${row.variant==='before'?'변경 전':'변경 후'} · ${row.source_title}`));
  card.appendChild(node('p','muted',`익명 기록 ${row.id.slice(0,8)} · 시작 ${new Date(row.started_at).toLocaleString('ko-KR')}${row.seconds===null?' · 진행 중':` · ${row.seconds}초`}`));
  if (!row.finished_at) {
    const link=node('a','study-back','이 과제 계속하기'); link.href=`/?study=${row.id}`; card.appendChild(link); return card;
  }
  card.appendChild(node('p','',`자동 조건: ${row.task_complete?'형식 충족':'미충족'} · 10분 이내: ${row.within_time?'예':'아니요'} · 검토 판정: ${row.review_status==='pending'?'대기':row.review_status==='valid'?'타당':'부적절'}`));
  card.appendChild(node('p','',`가설: ${row.hypothesis || '작성하지 않음'}`));
  for (const [index,item] of row.selected_comments.entries()) {
    const role=index<row.evidence_ids.length ? `근거 ${index+1}` : '반례';
    card.appendChild(node('p','',`${role}: ${item.text}`));
  }
  card.appendChild(reviewer(row));
  return card;
}

async function loadDashboard() {
  const selected=$('study-source').value;
  const data=await get(selected ? `/api/study/dashboard?snapshot_id=${encodeURIComponent(selected)}` : '/api/study/dashboard');
  clear($('cohort-summary'));
  $('cohort-summary').append(cohortCard('변경 전',data.cohorts.before),cohortCard('변경 후',data.cohorts.after));
  const enough=data.cohorts.before.reviewed>=data.target_per_cohort && data.cohorts.after.reviewed>=data.target_per_cohort;
  $('study-caution').textContent=enough
    ? '두 방식의 작은 표본을 비교할 수 있습니다. 참가자 차이와 과제 숙련도 때문에 변화의 원인을 확정할 수는 없습니다.'
    : `변경 전·후에 각각 최소 ${data.target_per_cohort}명의 답변을 검토하면 탐색적 비교를 시작할 수 있습니다. 현재 실제 참가자 결과를 기다리는 중입니다.`;
  clear($('session-list'));
  if (!data.sessions.length) $('session-list').appendChild(node('p','muted','아직 시험 기록이 없습니다. 위에서 첫 익명 시험을 시작해 주세요.'));
  data.sessions.forEach(row=>$('session-list').appendChild(sessionCard(row)));
}

$('start-form').addEventListener('submit',async event=>{
  event.preventDefault(); $('start-error').hidden=true;
  try {
    const session=await post('/api/study/start',{variant:$('study-variant').value,snapshot_id:$('study-source').value});
    location.href=`/?study=${session.id}`;
  } catch(error) { $('start-error').textContent=error.message; $('start-error').hidden=false; }
});

$('download-report').addEventListener('click',async()=>{
  try {
    const selected=$('study-source').value;
    const data=await get(selected ? `/api/study/report?snapshot_id=${encodeURIComponent(selected)}` : '/api/study/report');
    const url=URL.createObjectURL(new Blob([data.markdown],{type:'text/markdown;charset=utf-8'}));
    const a=node('a'); a.href=url; a.download=`contextlens-cx-study-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(error) { $('study-caution').textContent=`요약 저장 실패: ${error.message}`; }
});

$('study-source').addEventListener('change',()=>loadDashboard().catch(error=>{ $('study-caution').textContent=`기록을 읽지 못했습니다: ${error.message}`; }));
loadSources().then(loadDashboard).catch(error=>{ $('study-caution').textContent=`기록을 읽지 못했습니다: ${error.message}`; });
