(function(root){
  'use strict';
  const fields = {
    name:'프로젝트 이름',industry:'산업·활동 맥락',target:'누구를 위한 기획인가요?',problem:'어떤 문제가 있나요?',importance:'왜 지금 해결해야 하나요?',evidence:'확인한 사실과 출처',assumption:'아직 확인하지 못한 가정',goal:'이번에 만들 변화',reason:'선택한 이유',exclude:'이번에 하지 않을 일',message:'핵심 메시지',channel:'실행할 채널',action:'첫 실행과 요청 행동',metric:'핵심 지표 이름',unit:'단위',baseline:'현재값',targetValue:'목표값',definition:'무엇을 어떻게 셀까요?',source:'측정 자료 출처',start:'측정 시작일',end:'측정 종료일',rule:'결과에 따른 판단 기준',revisionReason:'이번 버전의 작성·수정 이유'
  };
  const required = ['name','target','problem','importance','evidence','goal','reason','message','channel','action','metric','targetValue','definition','source','start','end','rule','revisionReason'];
  const steps = {name:0,industry:0,target:0,problem:0,importance:0,evidence:0,assumption:0,goal:0,reason:1,exclude:1,message:1,channel:1,action:1,metric:2,unit:2,baseline:2,targetValue:2,definition:2,source:2,start:2,end:2,rule:2,revisionReason:3,selected:1};
  function blank(name='',industry='') {return {id:'',example:false,name,industry,target:'',problem:'',importance:'',evidence:'',assumption:'',goal:'',candidates:Array.from({length:3},()=>({name:'',action:'',basis:''})),selected:'',reason:'',exclude:'',message:'',channel:'',action:'',metric:'',unit:'건',baseline:'',targetValue:'',definition:'',source:'',start:'',end:'',rule:'',revisionReason:'',revisions:[],updated:''};}
  function issues(p) {
    const out=[];
    for(const key of required)if(String(p[key]??'').trim()==='')out.push({key,message:fields[key]+' · 내용을 작성해 주세요.'});
    if(!['0','1','2'].includes(String(p.selected))||!p.candidates[Number(p.selected)]?.name.trim()||!p.candidates[Number(p.selected)]?.action.trim())out.push({key:'selected',message:'이름과 실행 내용이 있는 후보를 선택해 주세요.'});
    for(const key of ['baseline','targetValue'])if(p[key]!==''&&(!Number.isFinite(Number(p[key]))||Number(p[key])<0||(p.unit==='%'&&Number(p[key])>100)))out.push({key,message:fields[key]+'은(는) 0 이상'+(p.unit==='%'?' 100 이하':'')+'의 숫자여야 합니다.'});
    const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
    for(const key of ['start','end'])if(p[key]&&!validDate(p[key]))out.push({key,message:'올바른 '+fields[key]+'을 입력해 주세요.'});
    if(validDate(p.start)&&validDate(p.end)&&p.start>p.end)out.push({key:'end',message:'종료일은 시작일보다 빠를 수 없습니다.'});
    return out;
  }
  function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function display(v){return String(v??'').trim()===''?'미작성':String(v);}
  function report(p,version=null){
    const errors=issues(p), chosen=['0','1','2'].includes(String(p.selected))?p.candidates[Number(p.selected)]:null;
    const pair=(name,value)=>'<dt>'+escape(name)+'</dt><dd>'+escape(display(value))+'</dd>';
    const section=(title,keys)=>'<section><h3>'+title+'</h3><dl>'+keys.map(k=>pair(fields[k],p[k])).join('')+'</dl></section>';
    const alternatives=p.candidates.map((c,i)=>pair('후보 '+(i+1)+(String(i)===String(p.selected)?' · 선택':''),[display(c.name),display(c.action),'근거·제약: '+display(c.basis)].join('\n'))).join('');
    return '<article class="report"><div class="report-header"><div class="eyebrow">JH 기획 · 기획 제안서</div><h2>'+escape(p.name||'이름 없는 프로젝트')+'</h2><div class="doc-meta">'+(p.example?'가상 예시 · 실제 고객·성과 아님':'사용자 작성 프로젝트')+' / '+escape(p.industry||'산업 미지정')+' / '+(version?'확정본 v'+String(version).padStart(2,'0'):'작성 중 초안')+'</div></div>'+
    section('01 · 문제 정의',['target','problem','importance','evidence','assumption','goal'])+
    '<section><h3>02 · 실행 선택</h3><dl>'+alternatives+pair('선택한 방향',chosen?chosen.name:'미선택')+['reason','exclude','message','channel','action'].map(k=>pair(fields[k],p[k])).join('')+'</dl></section>'+
    '<section><h3>03 · 성공을 확인하는 기준</h3><dl>'+pair('핵심 지표',p.metric)+pair('현재값',p.baseline===''?'미확인':p.baseline+' '+p.unit)+pair('목표값',p.targetValue===''?'미작성':p.targetValue+' '+p.unit)+['definition','source'].map(k=>pair(fields[k],p[k])).join('')+pair('측정 기간',display(p.start)+' ~ '+display(p.end))+pair(fields.rule,p.rule)+'</dl></section>'+
    '<section><h3>04 · 판단 기록</h3><dl>'+pair('작성·수정 이유',p.revisionReason)+pair('기획 상태',version?'담당자가 기획 내용을 확정함. 실행·성과는 아직 확인하지 않음.':errors.length?'필수 입력·형식 확인 '+errors.length+'건 필요':'필수 입력·형식 확인 완료. 담당자 확정 전.')+'</dl></section><div class="doc-notice">이 문서는 사용자가 작성한 내용을 정리합니다. AI 생성·전문가 검토·실제 성과 검증을 수행하지 않았습니다. 목표값은 달성한 결과가 아닙니다.'+(p.example?' 모든 예시 내용과 수치는 가상입니다.':'')+'</div></article>';
  }
  function safeProject(raw){
    if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||raw.id.length>100||!raw.id)throw Error('프로젝트 식별자를 확인할 수 없습니다.');
    const p=blank();p.id=raw.id;p.example=raw.example===true;
    for(const key of Object.keys(fields)){if(typeof raw[key]!=='string'||raw[key].length>10000)throw Error('입력 항목 형식이 올바르지 않습니다.');p[key]=raw[key];}
    if(!['건','명','%','원','회','일'].includes(p.unit))throw Error('지표 단위를 확인해 주세요.');
    if(!Array.isArray(raw.candidates)||raw.candidates.length!==3)throw Error('후보 형식이 올바르지 않습니다.');
    p.candidates=raw.candidates.map(c=>{const out={};for(const key of ['name','action','basis']){if(typeof c?.[key]!=='string'||c[key].length>10000)throw Error('후보 형식이 올바르지 않습니다.');out[key]=c[key];}return out;});
    if(!['','0','1','2'].includes(String(raw.selected)))throw Error('선택한 후보가 올바르지 않습니다.');p.selected=String(raw.selected);p.updated=typeof raw.updated==='string'?raw.updated:'';
    if(!Array.isArray(raw.revisions)||raw.revisions.length>30)throw Error('문서 버전이 올바르지 않습니다.');
    p.revisions=raw.revisions.map((r,i)=>{if(r?.version!==i+1||typeof r.date!=='string'||typeof r.reason!=='string'||r.reason.length>10000||!r.snapshot||typeof r.snapshot!=='object')throw Error('문서 버전 형식이 올바르지 않습니다.');const snapshot=safeProject({...r.snapshot,revisions:[]});if(issues(snapshot).length)throw Error('확정본의 필수 항목을 확인해 주세요.');return {version:r.version,date:r.date,reason:r.reason,snapshot,html:report(snapshot,r.version)};});
    return p;
  }
  function parseBackup(text){if(text.length>10000000)throw Error('백업 파일이 너무 큽니다.');const data=JSON.parse(text);if(data?.format!=='jh-planning-v1'||!Array.isArray(data.projects)||data.projects.length>50)throw Error('JH 기획 백업 파일을 선택해 주세요.');const projects=data.projects.map(safeProject);if(new Set(projects.map(p=>p.id)).size!==projects.length)throw Error('중복된 프로젝트 번호가 있습니다.');return projects;}
  const api={fields,required,steps,blank,issues,escape,display,report,safeProject,parseBackup};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JH=api;
})(typeof window!=='undefined'?window:globalThis);
