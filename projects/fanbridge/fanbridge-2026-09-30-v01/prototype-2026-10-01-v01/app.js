'use strict';
const sources=[
 {name:'2026 시즌권·멤버십 모집 안내',date:'2026-02-11 게시 / 세부 조건 검증 전',url:'https://www.samsunglions.com/intro/intro02.asp?act=view&idx=1017177'},
 {name:'2026 시즌권·멤버십 약관 개정 안내',date:'2026-04-02 게시 / 적용일 확인 필요',url:'https://www.samsunglions.com/intro/intro02.asp?act=view&idx=1017195'},
 {name:'티켓링크 고객센터',date:'예매 관련 공식 문의 경로',url:'https://www.ticketlink.co.kr/help/main/'}
];
function buildGuide(year,member,goal,people){
 if(!['2025','2026'].includes(year)||!['unknown','none','blue','lions','season'].includes(member)||!['eligibility','companions','changes'].includes(goal)||!Number.isInteger(people)||people<1||people>20)throw Error('시즌·회원 상태·인원을 확인해 주세요.');
 const steps=['공식 상품명과 가입 상태를 확인하세요. 같은 이름의 과거 상품과 구분해야 합니다.'];
 if(member==='none')steps[0]='가입 전 해당 시즌의 판매 여부·상품 조건을 확인하세요. 가입하면 선예매가 가능하다고 단정할 수 없습니다.';
 if(member==='unknown')steps[0]='가입 내역에서 정확한 상품명을 먼저 확인하세요. 기억만으로 선예매 자격을 판단하지 마세요.';
 if(goal==='eligibility')steps.push('선예매 대상 회원, 예매 시작 시각, 계정 연결 조건을 공식 정책에서 확인하세요.');
 if(goal==='companions')steps.push(`총 ${people}명 관람 계획입니다. 회원당 구매 가능 매수·계정별 제한·동반인 조건을 확인하세요.`);
 if(goal==='changes')steps.push('2025년과 2026년의 공식 문서를 따로 확인하세요. 현재 조건을 과거에도 같았다고 적용하지 마세요.');
 steps.push('조건이 확인되지 않으면 구매처에 시즌·정확한 상품명·관람 인원을 함께 전달해 문의하세요.');
 return {steps,links:year==='2026'?sources:[sources[2]],warning:year==='2025'?'2025년의 공식 정답 문서는 아직 등록되지 않았습니다. 2026 안내를 대신 적용하지 않습니다.':'공식 문서의 적용일과 세부 조건은 검증 전입니다. 선예매 가능 여부는 아직 판정하지 않습니다.'};
}
function summarize(rows){return ['original','improved'].map(variant=>{const group=rows.filter(r=>r.kind==='practice'&&r.variant===variant);return {variant,total:group.length,success:group.filter(r=>r.tasks.every(v=>v==='pass')&&!r.help&&r.elapsed<=900).length,help:group.filter(r=>r.help).length};});}
if(typeof module!=='undefined')module.exports={buildGuide,summarize};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),key='fanbridge.practice.v01';let started=null,rows=[];
 try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(stored)||stored.some(r=>r.kind!=='practice'||!Array.isArray(r.tasks)||r.tasks.length!==3||!['original','improved'].includes(r.variant)||!Number.isFinite(r.elapsed)))throw Error();rows=stored;}catch{ $('save-status').textContent='저장 자료를 읽을 수 없습니다. 새 기록 저장을 잠갔습니다.';$('trial-form').querySelector('[type=submit]').disabled=true;}
 function element(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
 function link(s){const a=element('a',s.name,'source');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.append(element('small',s.date));return a;}
 sources.forEach(s=>$('source-list').append(link(s)));
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==b.dataset.page);document.querySelectorAll('[data-page]').forEach(n=>{n.classList.toggle('active',n===b);n.setAttribute('aria-pressed',String(n===b));});});
 $('guide-form').onsubmit=e=>{e.preventDefault();try{const g=buildGuide($('year').value,$('member').value,$('goal').value,Number($('people').value));$('result').replaceChildren(element('p','CHECK YOUR CONDITIONS','eyebrow'),element('h3','다음 세 가지를 확인하세요.'),element('div',g.warning,'note'));const list=element('ol','', 'steps');g.steps.forEach(s=>list.append(element('li',s)));$('result').append(list,element('h4','공식 확인 경로'));g.links.forEach(s=>$('result').append(link(s)));}catch(err){$('result').textContent=err.message;}};
 ['정상 상황','조건이 다른 상황','예외 상황'].forEach((name,i)=>{const label=element('label',`${i+1}. ${name}`);label.htmlFor=`task-${i}`;const select=element('select','');select.id=`task-${i}`;[['','판정을 선택하세요'],['pass','정답'],['fail','오답 / 부분 정답'],['stopped','중단 / 시간 초과']].forEach(([value,text])=>{const o=element('option',text);o.value=value;select.append(o);});select.required=true;$('tasks').append(label,select);});
 $('start').onclick=()=>{started=performance.now();$('start').disabled=true;$('timer').textContent='측정 중';};
 setInterval(()=>{if(started!==null)$('timer').textContent=`${Math.floor((performance.now()-started)/1000)}초 경과`;},1000);
 function render(){ $('summary').replaceChildren();summarize(rows).forEach(s=>{$('summary').append(element('div',`${s.variant==='original'?'기존':'개선'} 안내 · 연습 ${s.total}건 / 도움 없는 성공 ${s.success}건 / 도움 요청 ${s.help}건`,'metric'));});$('records').replaceChildren();rows.slice().reverse().forEach(r=>{$('records').append(element('div',`${r.id} · ${r.variant==='original'?'기존':'개선'} · ${r.elapsed}초 · ${r.tasks.join(' / ')}${r.risk?' · 위험한 오답 기록':''}${r.note?' · '+r.note:''}`,'record'));});}
 $('trial-form').onsubmit=e=>{e.preventDefault();if(started===null){$('save-status').textContent='먼저 시간 측정을 시작해 주세요.';return;}const id=$('participant').value.trim();if(!id){$('save-status').textContent='연습 ID를 입력해 주세요.';return;}if(rows.some(r=>r.id===id)){$('save-status').textContent='같은 ID는 한 조건에만 기록할 수 있습니다. 다른 연습 ID를 사용하세요.';return;}const row={id,kind:'practice',variant:$('variant').value,tasks:[0,1,2].map(i=>$(`task-${i}`).value),elapsed:Math.floor((performance.now()-started)/1000),help:$('help').checked,risk:$('risk').checked,note:$('note').value,createdAt:new Date().toISOString(),policy:'unverified',prototype:'v01'};try{localStorage.setItem(key,JSON.stringify([...rows,row]));rows.push(row);started=null;$('start').disabled=false;$('timer').textContent='저장 완료';$('save-status').textContent='연습 기록을 저장했습니다. 실제 성과에는 포함되지 않습니다.';render();}catch{$('save-status').textContent='저장 공간을 사용할 수 없습니다. 기록이 저장되지 않았습니다.';}};
 $('export').onclick=()=>{const blob=new Blob([JSON.stringify({prototype:'v01',actualResults:'not_measured',records:rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`fanbridge-practice-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('clear').onclick=()=>{if(!confirm('이 브라우저의 연습 기록을 삭제할까요? 먼저 내보내기로 보관할 수 있습니다.'))return;try{localStorage.removeItem(key);rows=[];$('trial-form').querySelector('[type=submit]').disabled=false;$('save-status').textContent='연습 기록을 삭제했습니다.';render();}catch{$('save-status').textContent='삭제하지 못했습니다.';}};
 render();
}
