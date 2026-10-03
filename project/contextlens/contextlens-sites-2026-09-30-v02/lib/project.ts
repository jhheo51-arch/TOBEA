type Obj = Record<string, any>;
const fields = ['title','audience','touchpoint','control','question','problem','problem_basis','hypothesis','before_flow','after_flow','feature_spec','acceptance_criteria','operation_rule','priority_reason','implemented_change','implemented_at','artifact_url','my_role','interpretation','caveats','next_step'];
const clean = (value: unknown, max=3000) => {
  if (value===undefined || value===null) return '';
  if (typeof value!=='string' || value.length>max) throw new Error('입력 길이와 형식을 확인해 주세요.');
  return value.trim();
};
const date = (value: unknown) => {
  const text=clean(value,10);
  if (text && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || new Date(text).toISOString().slice(0,10)!==text)) throw new Error('날짜를 YYYY-MM-DD 형식으로 확인해 주세요.');
  return text;
};
const number = (value: unknown, integer=false) => {
  if (value==='' || value===null || value===undefined) return null;
  if (typeof value!=='number' || !Number.isFinite(value) || value<0 || (integer&&!Number.isInteger(value))) throw new Error('측정값에는 0 이상의 올바른 숫자를 입력해 주세요.');
  return value;
};
const list = (value: unknown, max: number) => {
  if (value===undefined) return [];
  if (!Array.isArray(value)||value.length>max) throw new Error('저장 가능한 항목 수를 넘었습니다.');
  return value;
};
function period(raw: Obj={}, kind: string) {
  const output: Obj = {start:date(raw.start),end:date(raw.end),source:clean(raw.source,1000),
    numerator:number(raw.numerator,true),denominator:number(raw.denominator,true),value:number(raw.value)};
  if (output.start && output.end && output.start>output.end) throw new Error('측정 기간의 시작일이 종료일보다 늦습니다.');
  if (kind==='rate' && output.numerator!==null && output.denominator!==null && output.numerator>output.denominator) throw new Error('성공·해당 건수는 전체 대상 건수보다 클 수 없습니다.');
  return output;
}
export function validateProject(raw: unknown): Obj {
  if (!raw || typeof raw!=='object' || Array.isArray(raw) || JSON.stringify(raw).length>100000) throw new Error('개선 프로젝트 입력을 확인해 주세요.');
  const input=raw as Obj;
  const p: Obj={};
  fields.forEach(key=>p[key]=clean(input[key]));
  p.implemented_at=date(input.implemented_at);
  if (p.artifact_url && !/^https?:\/\//i.test(p.artifact_url)) throw new Error('변경 결과물 주소는 http 또는 https 주소를 입력해 주세요.');
  p.implementation_status=['planned','in_progress','implemented'].includes(input.implementation_status)?input.implementation_status:'planned';
  p.collaboration_mode=['solo','feedback','team'].includes(input.collaboration_mode)?input.collaboration_mode:'solo';
  p.project_type=input.project_type==='source_content'?'source_content':'own_service';
  p.claim_reviewed=input.claim_reviewed===true;
  p.snapshot_id=input.snapshot_id?number(input.snapshot_id,true):null;
  for (const key of ['evidence_ids','counterexample_ids']) p[key]=[...new Set(list(input[key],10).map(x=>clean(x,200)))];
  if (p.evidence_ids.some((id:string)=>p.counterexample_ids.includes(id))) throw new Error('같은 댓글을 근거와 반례로 동시에 선택할 수 없습니다.');
  p.priorities=list(input.priorities,5).map((x:Obj)=>{
    const item: Obj={title:clean(x.title,300),reason:clean(x.reason,1000)};
    for (const key of ['impact','confidence','effort']) {
      const n=number(x[key],true);
      if (n!==null && (n<1 || n>5)) throw new Error('우선순위 점수는 1~5로 입력해 주세요.');
      item[key]=n;
    }
    return item;
  });
  p.metrics=list(input.metrics,5).map((x:Obj)=>{
    const kind=x.kind==='value'?'value':'rate';
    return {name:clean(x.name,300),kind,direction:x.direction==='down'?'down':'up',unit:clean(x.unit,50),
      numerator_definition:clean(x.numerator_definition,500),denominator_definition:clean(x.denominator_definition,500),
      definition:clean(x.definition,1000),target:clean(x.target,300),before:period(x.before,kind),after:period(x.after,kind)};
  });
  p.stakeholders=list(input.stakeholders,20).map((x:Obj)=>({role:clean(x.role,100),request:clean(x.request,1000),
    status:['planned','requested','discussed','reflected'].includes(x.status)?x.status:'planned',date:date(x.date),
    response:clean(x.response,2000),decision:clean(x.decision,1000),my_contribution:clean(x.my_contribution,1000)}));
  p.decisions=list(input.decisions,20).map((x:Obj)=>({date:date(x.date),options:clean(x.options,1000),decision:clean(x.decision,1000),
    reason:clean(x.reason,2000),participants:clean(x.participants,300),result:clean(x.result,1000)}));
  return p;
}
export function metricComparison(metric: Obj, project: Obj={}) {
  const m=metric, reasons:string[]=[];
  const val=(p:Obj)=> m.kind==='rate' ? (p?.numerator!==null && p?.numerator!==undefined && p?.denominator>0 ? p.numerator/p.denominator*100 : null) : (typeof p?.value==='number'?p.value:null);
  const before=val(m.before),after=val(m.after);
  const delta=before!==null&&after!==null?after-before:null;
  for (const [label,p] of [['변경 전',m.before],['변경 후',m.after]] as const) {
    if (!p?.start||!p?.end||!p?.source) reasons.push(`${label} 기간·출처 필요`);
  }
  if (!m.name||!m.definition||!m.unit) reasons.push('지표 이름·정의·단위 필요');
  if (m.kind==='rate' && (!m.numerator_definition||!m.denominator_definition)) reasons.push('비율의 분자·분모 정의 필요');
  if (delta===null) reasons.push('비교 가능한 전후 측정값 필요 (분모 0은 계산하지 않음)');
  if (project.implementation_status!=='implemented'||!project.implemented_at||!project.implemented_change) reasons.push('실제 변경 내용·완료일 필요');
  if (m.before?.end && m.after?.start && m.before.end>=m.after.start) reasons.push('전후 관찰 기간이 겹침');
  if (project.implemented_at && m.before?.end && m.after?.start && (m.before.end>=project.implemented_at||m.after.start<project.implemented_at)) reasons.push('변경일과 전후 기간의 관계 확인 필요');
  return {before,after,delta,relative:delta!==null && before!==null && before!==0?delta/before*100:null,
    unit:m.kind==='rate'?'%':m.unit,delta_unit:m.kind==='rate'?'%p':m.unit,reasons,
    comparable:reasons.length===0,improved:delta===null?null:(m.direction==='down'?delta<0:delta>0)};
}
export function projectReadiness(p:Obj, study?:Obj) {
  const comparisons=(p.metrics||[]).map((m:Obj)=>({name:m.name,...metricComparison(m,p)}));
  const collaboration=(p.stakeholders||[]).filter((s:Obj)=>['discussed','reflected'].includes(s.status)&&s.date&&s.response&&s.my_contribution);
  const observed=(study?.sessions||[]).some((s:Obj)=>s.record_kind==='actual'&&s.finished_at&&(s.reviewer_note||s.observation));
  const evidence=p.project_type==='own_service'?!!(p.problem_basis&&(observed||collaboration.length)):!!(p.evidence_ids?.length>=2&&p.counterexample_ids?.length>=1);
  const hasMeasure=comparisons.some((m:Obj)=>m.comparable);
  const studyReady=study && study.cohorts.before.reviewed>=5 && study.cohorts.after.reviewed>=5;
  const checks=[
    {label:'누구의 어느 접점인지 정의',done:!!(p.audience&&p.touchpoint&&p.control&&p.question)},
    {label:p.project_type==='own_service'?'실제 사용자의 불편 관찰·피드백 기록':'원문 근거 2개와 반례 1개 연결',done:evidence},
    {label:'문제·가설·선택 이유 기록',done:!!(p.problem&&p.hypothesis&&p.priority_reason)},
    {label:'흐름·기능 정의·실제 실행 기록',done:!!(p.before_flow&&p.after_flow&&p.feature_spec&&p.acceptance_criteria&&p.implemented_change&&p.implemented_at&&p.implementation_status==='implemented')},
    {label:'전후 측정 근거 또는 사용성 시험 확보',done:!!(hasMeasure||studyReady)},
    {label:'해석·한계·다음 행동을 직접 검토',done:!!(p.claim_reviewed&&p.interpretation&&p.caveats&&p.next_step)},
  ];
  return {checks,comparisons,collaboration_count:collaboration.length,
    status:checks.every(x=>x.done)?'제출 문서 검토 가능':'사례 작성 중',
    collaboration_label:p.collaboration_mode==='solo'?'개인 프로젝트':collaboration.length?'실제 피드백·의사결정 기록 있음':'협업 기록 보강 필요'};
}
const text = (value:unknown) => String(value||'미기록').replace(/[\r\n]+/g,' ').replace(/[#<>]/g,'').trim();
const fmt=(value:number|null)=>value===null?'미측정':Number(value.toFixed(2)).toLocaleString('ko-KR');
export function projectReport(record:Obj,p:Obj,snapshot:Obj|null,study:Obj) {
  const r=projectReadiness(p,study);
  const comments=new Map((snapshot?.analysis?.comments||[]).map((c:Obj)=>[String(c.id),String(c.text)]));
  const out=['# '+text(p.title||record.title)+' — CX 개선 사례','',`문서 상태: ${r.status} · ${r.collaboration_label}`,
    '이 문서는 입력한 실행·측정·검토 기록을 요약합니다. 제출 전 출처와 표현을 직접 확인하세요.','',
    '## 1. 문제와 나의 역할','',`- 분석 자료: ${text(record.title)}`,`- 원문 주소: ${text(record.url)}`,
    `- 수집 시점: ${text(snapshot?.captured_at)}`,`- 수집한 댓글: ${snapshot?.analysis?.comment_count||0}개`,
    `- 표본 범위: ${text(snapshot?.source?.sampling)}`,`- 자료의 역할: ${p.project_type==='own_service'?'사용성 과제에 사용하는 분석 자료. 댓글 자체가 ContextLens의 불편을 입증하는 자료는 아닙니다.':'콘텐츠 반응의 조사 자료'}`,`- 분석 대상: ${text(p.audience)}`,`- 이용 접점: ${text(p.touchpoint)}`,
    `- 내가 바꿀 수 있는 범위: ${text(p.control)}`,`- 질문: ${text(p.question)}`,`- 문제: ${text(p.problem)}`,`- 실제 문제 관찰 근거: ${text(p.problem_basis)}`,`- 나의 역할·기여: ${text(p.my_role)}`,
    '', '## 2. 근거와 우선순위',''];
  for (const [label,ids] of [['근거',p.evidence_ids||[]],['반례',p.counterexample_ids||[]]] as const) {
    for (const id of ids) out.push(`- ${label}: ${text(comments.get(id)).slice(0,300)} (댓글 ${text(id)})`);
  }
  if (!p.evidence_ids?.length) out.push('- 연결한 원문 근거 없음.');
  out.push('- 댓글 작성자 전체를 서비스 고객으로 가정하지 않으며, 표본 비율은 전체 고객 비율이 아닙니다.');
  for (const item of p.priorities||[]) {
    const score=item.impact&&item.confidence&&item.effort?item.impact*item.confidence/item.effort:null;
    out.push(`- 후보 ${text(item.title)}: 영향 ${item.impact??'미평가'}, 확신 ${item.confidence??'미평가'}, 노력 ${item.effort??'미평가'}, 참고 점수 ${fmt(score)}. 이유: ${text(item.reason)}`);
  }
  out.push(`- 선택 이유: ${text(p.priority_reason)}`,`- 개선 가설: ${text(p.hypothesis)}`,'','## 3. 개선 실행과 전달물','',
    `- 변경 전 흐름: ${text(p.before_flow)}`,`- 변경 후 흐름: ${text(p.after_flow)}`,
    `- 기능 정의: ${text(p.feature_spec)}`,`- 기능 완료 기준: ${text(p.acceptance_criteria)}`,`- 운영 처리 기준: ${text(p.operation_rule)}`,
    `- 실행 상태: ${{planned:'계획',in_progress:'진행 중',implemented:'실행 완료'}[p.implementation_status as string]||'계획'}`,
    `- 실제 변경 내용: ${text(p.implemented_change)}`,`- 완료일: ${text(p.implemented_at)}`,`- 결과물 주소: ${text(p.artifact_url)}`,
    '', '## 4. 협업·의사결정','',`- 진행 형태: ${r.collaboration_label}`);
  if (p.collaboration_mode==='solo') out.push('- 개인 프로젝트이며 조직과의 협업 경력을 주장하지 않습니다.');
  const statusLabel:Obj={planned:'요청 계획',requested:'요청함',discussed:'검토·논의함',reflected:'반영함'};
  for (const s of p.stakeholders||[]) out.push(`- 역할 ${text(s.role)} · 상태 ${statusLabel[s.status]||'미기록'} · ${text(s.date)}: 요청 ${text(s.request)} / 응답 ${text(s.response)} / 결정 ${text(s.decision)} / 나의 기여 ${text(s.my_contribution)}`);
  for (const d of p.decisions||[]) out.push(`- 결정 ${text(d.date)}: 후보 ${text(d.options)} → ${text(d.decision)} / 이유 ${text(d.reason)} / 참여 역할 ${text(d.participants)} / 반영 결과 ${text(d.result)}`);
  out.push('','## 5. 측정과 관찰 결과','');
  for (const m of p.metrics||[]) {
    const c=metricComparison(m,p);
    out.push(`- ${text(m.name)}: 정의 ${text(m.definition)} / 목표 ${text(m.target)}`);
    if (m.kind==='rate') out.push(`  분자: ${text(m.numerator_definition)} / 분모: ${text(m.denominator_definition)}`);
    for (const [label,period] of [['변경 전',m.before],['변경 후',m.after]] as const) out.push(`  ${label}: ${text(period.start)}~${text(period.end)} / 출처 ${text(period.source)}`);
    out.push(`  관찰값: ${fmt(c.before)}${c.unit} → ${fmt(c.after)}${c.unit} / 차이 ${fmt(c.delta)}${c.delta_unit}`,
      c.comparable?'  전후 관찰 조건이 기록되었습니다. 차이 자체로 인과관계를 확정하지 않습니다.':`  보강 필요: ${c.reasons.join(', ')}`);
  }
  out.push('','사용성 시험 (실제 참가자로 표시된 기록만 포함):');
  for (const [label,c] of [['기존 방식',study.cohorts.before],['개선 방식',study.cohorts.after]] as const) out.push(`- ${label}: 시작 ${c.started}명 / 제출 ${c.finished}명 / 검토 ${c.reviewed}명 / 성공 ${c.started?`${c.success}/${c.started}`:'미측정'} / 중앙 소요 시간 ${c.median_seconds===null?'미측정':fmt(c.median_seconds)+'초'} / 근거 없는 주장 ${c.unsupported_claims}건`);
  const observations=(study.sessions||[]).filter((s:Obj)=>s.record_kind==='actual'&&(s.reviewer_note||s.observation));
  observations.forEach((s:Obj)=>out.push(`- 참가자 ${text(s.participant_code)} · ${s.variant==='before'?'기존':'개선'} 방식 관찰: ${text(s.reviewer_note||s.observation)}`));
  out.push('- 시험용·분류되지 않은 이전 기록은 실제 성과 집계에서 제외합니다. 작은 표본에서 차이를 관찰해도 일반적인 개선 효과를 확정하지 않습니다.',
    '', '## 6. 해석과 다음 행동','',`- 나의 해석: ${text(p.interpretation)}`,`- 다른 설명·제약: ${text(p.caveats)}`,`- 다음 행동: ${text(p.next_step)}`,
    '', '## 제출 전 확인','',...r.checks.map(x=>`- [${x.done?'x':' '}] ${x.label}`),'');
  const markdown=out.join('\n');
  const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(text(p.title||record.title))+'</title><style>body{font:15px/1.75 "Noto Sans KR","Malgun Gothic",sans-serif;color:#10233f;max-width:850px;margin:40px auto;padding:0 24px}h1{font-size:28px}h2{font-size:20px;border-top:1px solid #ccd7e2;padding-top:20px;margin-top:30px}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px 18px;cursor:pointer} @media print{body{margin:0;font-size:11pt}button{display:none}h2{break-after:avoid}p{orphans:3;widows:3}h2:nth-of-type(3),h2:nth-of-type(5){break-before:page}@page{size:A4;margin:18mm}}</style><button onclick="window.print()">인쇄 · PDF로 저장</button>'+out.filter(Boolean).map(line=>line.startsWith('# ')?`<h1>${escape(line.slice(2))}</h1>`:line.startsWith('## ')?`<h2>${escape(line.slice(3))}</h2>`:`<p>${escape(line)}</p>`).join('')+'</html>';
  return {markdown,html,readiness:r};
}
