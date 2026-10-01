'use strict';
const POLICY='silver2-20260211-v1', LIMIT=300000, KEY='fanbridge-v03-records';
const TASKS=[
 {id:'quantity',prompt:'2026 라이온즈 멤버십 실버 2매권을 보유하고 있습니다. 본인 포함 세 명이 같은 홈경기에 가려고 합니다. 이 2매권만으로 세 명 모두의 선예매 수량을 확보할 수 있나요?', options:[['yes','세 명 모두 선예매할 수 있습니다.','danger'],['no','2매권의 수량은 2매입니다. 세 번째 사람의 표는 별도 예매 가능 여부를 확인합니다.','correct'],['unknown','공식 공지에서도 2매권의 수량을 알 수 없습니다.','wrong']],answer:'2매권의 수량은 2매입니다. 세 명 모두를 위한 선예매 수량으로는 부족합니다.'},
 {id:'remaining',prompt:'같은 2매권으로 이번 경기에 이미 2매를 구매했습니다. 이 과제에서 해당 경기의 일반예매 총 한도는 6매로 주어집니다. 일반예매로 추가 구매할 수 있는 한도는 몇 매인가요? (잔여 좌석 확보는 별도입니다.)', options:[['six','6매입니다. 멤버십 구매 수량은 별개입니다.','danger'],['four','4매입니다. 총 6매에서 이미 구매한 2매를 뺍니다.','correct'],['zero','멤버십을 쓰면 일반예매를 할 수 없습니다.','wrong']],answer:'6 − 2 = 4매입니다. 총 한도 6매는 이 과제의 전제이며 모든 경기의 한도를 뜻하지 않습니다.'},
 {id:'adjacent',prompt:'실버 2매권으로 본인과 친구의 좌석 두 개를 예매하려고 합니다. 두 좌석이 반드시 붙어 있다고 안내해도 될까요?', options:[['guaranteed','2매권이면 연석이 보장됩니다.','danger'],['check','연석은 보장되지 않습니다. 예매 전에 좌석 현황을 확인합니다.','correct'],['never','두 명이 함께 관람하는 것은 항상 금지됩니다.','wrong']],answer:'예매 현황에 따라 연석 구입이 안 될 수 있습니다. 권종과 연석 보장은 다른 조건입니다.'}
];
const IMPROVED=`<p class="eyebrow">실버 2매권 / 2026.02.11 공지</p><h3>권종의 ‘2’는 구매 수량입니다.</h3><ol class="steps"><li><span><strong>먼저 인원을 세세요.</strong><br>본인 포함 3명이면 2매권의 수량만으로는 부족합니다. 세 번째 표의 별도 예매 가능 여부를 확인하세요.</span></li><li><span><strong>이미 산 표를 빼세요.</strong><br>멤버십으로 구매한 수량은 일반예매 가능 수량에서 차감됩니다. 해당 경기 총 한도가 6매이고 이미 2매를 샀다면 추가 한도는 4매입니다.</span></li><li><span><strong>예매 전에 좌석을 확인하세요.</strong><br>티켓링크 모바일 앱에서 해당 경기의 안내·좌석 현황을 확인하세요. 2매권이어도 연석은 보장되지 않습니다.</span></li></ol><p>공지의 선예매 시간: 일반예매 1일 전 11시부터 익일 10시까지. 해당 경기의 일반예매 일정을 먼저 확인하세요.</p><p class="help">실버의 예매 대상 좌석 범위가 따로 있습니다. 수량 한도가 남아도 표·연석을 확보했다는 뜻은 아닙니다. 친구에게 회원 계정을 빌려줘도 된다는 뜻도 아닙니다.</p>`;
function allocate(records,kind,experience,random=Math.random()) {
 const group=records.filter(r=>r.kind===kind&&r.experience===experience);
 return group.length%2 ? (group.at(-1).variant==='original'?'improved':'original') : (random<.5?'original':'improved');
}
function score(task,answer,elapsed){
 if(!Number.isFinite(elapsed)||elapsed<0) throw new Error('잘못된 측정 시간');
 if(elapsed>=LIMIT) return 'timeout';
 const t=TASKS.find(t=>t.id===task), option=t?.options.find(o=>o[0]===answer);
 if(!option) throw new Error('과제와 답을 확인하세요');
 return option[2];
}
function successful(r){return r.status==='completed'&&r.tasks.length===3&&r.tasks.every(t=>t.grade==='correct'&&t.elapsedMs<LIMIT&&t.help.length===0);}
function median(values){if(!values.length)return null;values.sort((a,b)=>a-b);const m=Math.floor(values.length/2);return values.length%2?values[m]:(values[m-1]+values[m])/2;}
function validRecords(rows){return Array.isArray(rows)&&rows.filter(r=>r?.status==='active').length<=1&&rows.every(r=>r&&r.policy===POLICY&&/^[A-Za-z0-9_-]{1,32}$/.test(r.pid)&&['practice','actual'].includes(r.kind)&&['original','improved'].includes(r.variant)&&['active','completed','stopped'].includes(r.status)&&Array.isArray(r.tasks)&&r.tasks.length<=3&&r.tasks.every((t,i)=>t.id===TASKS[i].id&&Number.isFinite(t.startedAt)&&Number.isFinite(t.elapsedMs)&&t.elapsedMs>=0&&Array.isArray(t.help)&&Array.isArray(t.away)&&[null,'correct','wrong','danger','timeout','stopped'].includes(t.grade))&&r.tasks.filter(t=>!t.grade).length<=1&&(r.status!=='completed'||r.tasks.length===3&&r.tasks.every(t=>t.grade))&&(r.status!=='active'||r.tasks.filter(t=>t.grade).length<3));}
function summarize(records,kind='actual',excludeTechnical=false){return ['original','improved'].map(variant=>{
 const rows=records.filter(r=>r.policy===POLICY&&r.kind===kind&&r.variant===variant&&(!excludeTechnical||r.stopReason!=='technical'));
 const wins=rows.filter(successful), tasks=rows.flatMap(r=>r.tasks);
 return {variant,total:rows.length,success:wins.length,help:rows.filter(r=>r.tasks.some(t=>t.help.length)).length,stopped:rows.filter(r=>r.status==='stopped').length,inProgress:rows.filter(r=>r.status==='active').length,timeout:tasks.filter(t=>t.grade==='timeout').length,danger:tasks.filter(t=>t.grade==='danger').length,submitted:tasks.filter(t=>t.answer!==null).length,medianMs:median(wins.map(r=>r.tasks.reduce((sum,t)=>sum+t.elapsedMs,0)))};
 });}
function csv(records){
 const columns=['kind','pid','variant','experience','route','policy','session_status','stop_reason','task','answer','grade','elapsed_ms','help_count','away_count','reason'];
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 const rows=records.flatMap(r=>TASKS.map(task=>{const t=r.tasks.find(t=>t.id===task.id);return [r.kind,r.pid,r.variant,r.experience,r.route,r.policy,r.status,r.stopReason,task.id,t?.answer,t?.grade??'not_started',t?.elapsedMs,t?.help.length??0,t?.away.length??0,t?.reason];}));
 return '\ufeff'+[columns,...rows].map(row=>row.map(safe).join(',')).join('\r\n');
}
if(typeof module!=='undefined') module.exports={POLICY,LIMIT,TASKS,allocate,score,successful,summarize,csv,validRecords};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id), escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let records=[], storageOK=true, active=null;
 try {const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(!validRecords(raw)) throw Error();records=raw;}catch{storageOK=false;$('storage-status').textContent='저장 자료를 읽지 못했습니다. 기존 자료를 덮어쓰지 않습니다. 다른 브라우저에서 시험하거나 저장 자료를 복구하세요.';}
 function persist(){if(!storageOK)return false;try{localStorage.setItem(KEY,JSON.stringify(records));$('storage-status').textContent='이 브라우저에 저장했습니다. 시험 후 내보내기로 보관하세요.';return true;}catch{storageOK=false;$('storage-status').textContent='저장 공간 오류: 새 시험을 시작하지 마세요. 현재 화면의 기록을 먼저 내보내세요.';return false;}}
 function report(){
  $('summary').innerHTML=['actual','practice'].map(kind=>`<h4>${kind==='actual'?'실제 팬':'기능 확인용 연습'}</h4>`+summarize(records,kind).map(s=>`<div class="metric"><strong>${s.variant==='original'?'기존':'개선'} 안내</strong> · ${s.total?`${s.success}/${s.total}명 성공 (${Math.round(s.success/s.total*100)}%)`:'미측정 · 배정 0명'}<br>도움 ${s.help}명 · 중단 ${s.stopped}명 · 진행 중 ${s.inProgress}명<br>시간 초과 ${s.timeout}과제 · 위험 오답 ${s.danger}/${s.submitted}제출 답<br>성공자 합계 시간 중앙값: ${s.medianMs===null?'미측정':(s.medianMs/1000).toFixed(1)+'초'}</div>`).join('')).join('')+`<details><summary>기술 장애 제외 결과 (보조 비교)</summary>${summarize(records,'actual',true).map(s=>`<p>${s.variant}: ${s.success}/${s.total}명 성공 · 제외 전 결과와 함께 해석하세요.</p>`).join('')}</details>`;
  $('records').innerHTML=records.map(r=>`<div class="record">${escape(r.pid)} · ${r.kind==='actual'?'실제':'연습'} · ${r.variant==='original'?'기존':'개선'} · ${r.status==='active'?'진행 중':r.status==='stopped'?'중단':'완료'}<br>${r.tasks.map(t=>`${t.id}: ${t.grade||'진행 중'} / ${(t.elapsedMs/1000).toFixed(1)}초 / 도움 ${t.help.length}회`).join('<br>')}</div>`).join('');
 }
 function taskIndex(){return active.tasks.filter(t=>t.grade).length;}
 function current(){return active?.tasks.find(t=>!t.grade);}
 function elapsed(t){return Math.max(0,Date.now()-t.startedAt);}
 function session(){
  $('setup').hidden=true;$('session').hidden=false;$('done').hidden=true;document.querySelector('.facilitator').hidden=true;
  const i=taskIndex(),t=current();$('task-title').textContent=`과제 ${i+1} / 3`;$('assignment').textContent=`${active.pid} · ${active.variant==='original'?'기존':'개선'} 안내 · ${active.kind==='practice'?'기능 확인용 연습':'실제 팬 시험'}`;
  $('prompt').textContent=TASKS[i].prompt;$('prompt').hidden=!t;$('begin').hidden=!!t;$('guide-wait').hidden=!!t;$('guide-content').hidden=!t;$('answer-form').hidden=!t;
  $('guide-content').innerHTML=active.variant==='original'?'<a href="original-policy.png" target="_blank" rel="noopener noreferrer" aria-label="공식 공지 발췌 크게 보기"><img class="policy-image" src="original-policy.png" alt="실버는 1~4매권 구분. 멤버십 구매 수량은 일반예매 가능 수량에서 차감. 좌석별 예매 현황에 따라 연석 구입이 안 될 수 있음."></a><p class="help">이미지를 누르면 원래 크기로 열립니다. 브라우저 확대 기능으로 읽을 수 있습니다.</p>':IMPROVED;
  $('clock').textContent=t?'측정 중':'시작 전';$('help-response').textContent='';$('help-count').textContent=`${t?.help.length||0}회`;$('reason').value=t?.reason||'';
  $('options').innerHTML='<legend>어떤 행동이 맞을까요?</legend>'+TASKS[i].options.map(([value,label])=>`<label class="choice"><input type="radio" name="answer" value="${value}" required ${t?.draft===value?'checked':''}><span>${label}</span></label>`).join('');$('task-title').focus();
 }
 function finish(status,reason=null){active.status=status;active.stopReason=reason;active.finishedAt=new Date().toISOString();const saved=persist();$('session').hidden=true;$('done').hidden=false;document.querySelector('.facilitator').hidden=false;$('completion').textContent=!saved?'브라우저 저장에 실패했습니다. 아래 내보내기로 현재 기록을 먼저 보관하세요.':status==='completed'?'세 과제의 답과 시간이 저장되었습니다.':'중단 기록을 보존했습니다. 시작하지 않은 과제는 성공으로 세지 않습니다.';$('feedback').innerHTML=TASKS.map((t,i)=>`<p><strong>과제 ${i+1}</strong> · ${escape(t.answer)}</p>`).join('');active=null;report();const heading=$('done').querySelector('h2');heading.tabIndex=-1;heading.focus();}
 function endTask(answer,forced=false){const t=current();if(!t)return;const ms=elapsed(t);t.elapsedMs=ms;t.answer=forced?null:answer;t.reason=$('reason').value.trim();t.grade=forced?'timeout':score(t.id,answer,ms);persist();if(taskIndex()===3)finish('completed');else session();$('session-status').textContent=t.grade==='timeout'?'이전 과제는 제한 시간이 되어 시간 초과로 기록했습니다.' : '';}
 $('setup-form').onsubmit=e=>{e.preventDefault();let error='';const kind=$('kind').value,pid=$('pid').value.trim(),experience=$('experience').value;
  if(!storageOK)error='저장 오류를 먼저 해결해야 합니다.';
  else if(records.some(r=>r.pid===pid&&r.kind===kind))error='이 참가 번호의 기록이 이미 있습니다. 같은 참가자는 두 안내 조건을 반복하지 않습니다.';
  else if(kind==='actual'&&(!$('eligible').checked||!$('reviewed').checked||$('route').value==='practice'))error='실제 시험은 관련 팬 여부·진행자의 정책 검토·모집 경로가 필요합니다.';
  $('setup-error').textContent=error;if(error){$('setup-error').focus();return;}
  active={pid,kind,experience,route:$('route').value,policy:POLICY,variant:allocate(records,kind,experience),consent:true,eligible:$('eligible').checked,reviewed:$('reviewed').checked,device:{width:innerWidth,height:innerHeight},assignedAt:new Date().toISOString(),status:'active',tasks:[]};records.push(active);if(!persist()){records.pop();active=null;$('setup-error').textContent='참가자 배정을 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시작하세요.';$('setup-error').focus();return;}report();session();};
 $('begin').onclick=()=>{if(current())return;active.tasks.push({id:TASKS[taskIndex()].id,startedAt:Date.now(),elapsedMs:0,answer:null,draft:null,grade:null,help:[],away:[],reason:''});persist();session();};
 $('answer-form').onchange=()=>{const t=current();if(t){t.draft=document.querySelector('input[name=answer]:checked')?.value??null;persist();}};
 $('reason').oninput=()=>{const t=current();if(t){t.reason=$('reason').value;persist();}};
 $('answer-form').onsubmit=e=>{e.preventDefault();const answer=document.querySelector('input[name=answer]:checked')?.value;if(answer)endTask(answer);};
 $('help').onclick=()=>{const t=current();if(!t)return;t.help.push({atMs:elapsed(t),response:'표시된 안내 재확인'});persist();$('help-count').textContent=`${t.help.length}회`;$('help-response').textContent='기록했습니다. 표시된 안내를 다시 확인해 주세요. 추가로 진행자의 도움을 받은 경우에도 버튼으로 기록해 주세요.';};
 $('stop').onclick=()=>{const t=current();if(t){t.elapsedMs=elapsed(t);t.grade='stopped';t.reason=$('reason').value;t.draft=document.querySelector('input[name=answer]:checked')?.value??null;}finish('stopped',$('stop-reason').value);};
 $('next').onclick=()=>{$('done').hidden=true;$('setup').hidden=false;$('setup-form').reset();$('setup-error').textContent='';$('pid').focus();};
 document.addEventListener('visibilitychange',()=>{const t=current();if(t){t.away.push({event:document.hidden?'hidden':'visible',atMs:elapsed(t)});persist();}});
 window.addEventListener('pagehide',()=>{const t=current();if(t){t.elapsedMs=elapsed(t);t.away.push({event:'pagehide',atMs:t.elapsedMs});persist();}});
 setInterval(()=>{const t=current();if(t){t.elapsedMs=elapsed(t);$('clock').textContent=`${Math.ceil(t.elapsedMs/1000)}초 / 300초`;if(t.elapsedMs>=LIMIT)endTask(null,true);}},500);
 function download(content,type,extension){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=`fanbridge-v03-${new Date().toISOString().replace(/[:.]/g,'-')}.${extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('export').onclick=()=>download(JSON.stringify({schema:3,policy:POLICY,exportedAt:new Date().toISOString(),records},null,2),'application/json','json');$('csv').onclick=()=>download(csv(records),'text/csv;charset=utf-8','csv');
 report();active=records.find(r=>r.status==='active')||null;if(active)session();
}

