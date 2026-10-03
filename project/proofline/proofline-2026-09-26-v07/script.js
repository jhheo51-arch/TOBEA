const storageKey = 'proofline-records-v7';
const previousStorageKey = 'proofline-records-v5';
const demoDismissedKey = 'proofline-demo-dismissed-v7';
const fields = [
  'name','story','evidence','preference','strength1','proof1','strength2','proof2','strengthFeedback','audience',
  'context','sourceTitle','sourceUrl','checkedAt','directionA','reasonA','directionB','reasonB','chosen',
  'intro','firstActivity','contentIdea','firstStep','validationQuestion','reviewAt',
  'actionStatus','actionDone','reaction','revision','nextStep'
];
const demoInitial = {
  name:'박다은 (가상 인물)',
  story:'도서관 안내 일을 하며, 사람을 직접 돕는 경험을 앞으로의 일이나 작은 활동으로 이어갈 수 있을지 고민한다.',
  evidence:'가상 방문객이 모바일 예약 순서를 이해하지 못했을 때, 종이에 단계를 적고 옆에서 함께 따라 해봤다.',
  strength1:'복잡한 절차를 작은 단계로 나누어 설명한다',
  proof1:'예약 화면에서 막힌 지점을 묻고 순서를 적어 다시 설명했다.',
  strength2:'상대가 이해하는 속도에 맞춰 돕는다',
  proof2:'설명을 마친 뒤 방문객이 다음 단계를 직접 눌러보도록 기다렸다.',
  strengthFeedback:'agree',
  preference:'사람을 직접 돕는 일과 규칙적인 일정',
  audience:'모바일 예약이나 인증이 낯선 사람',
  context:'한국지능정보사회진흥원은 고령층 대상 실생활 디지털 교육에서 1:1 지도와 복습 자료를 제공한 사례를 소개했다. 이는 안내 방식의 참고 사례이며, 이 가상 활동의 수요를 증명하지는 않는다.',
  sourceTitle:'한국지능정보사회진흥원, 「멈추지 않는 배움! AI 잘 쓰는 K-시니어 교육현장에 가다」',
  sourceUrl:'https://www.nia.or.kr/site/nia_kor/ex/bbs/View.do?bcIdx=28573&cbIdx=99938&parentSeq=28573',
  checkedAt:'2026-09-26',
  directionA:'디지털 예약·인증 안내 활동을 작게 시험하기',
  reasonA:'직접 해본 설명 경험과 사람을 돕고 싶은 조건을 함께 살릴 수 있다. 실제 필요와 반응은 따로 확인해야 한다.',
  directionB:'도서관·공공 서비스의 디지털 이용 지원 직무 탐색하기',
  reasonB:'규칙적인 일정과 대면 안내를 중시하는 조건을 살펴볼 수 있다. 채용 여부와 직무 적합성은 조사해야 한다.',
  chosen:'A',
  intro:'저는 복잡한 디지털 절차를 쉬운 단계로 풀어 설명한 경험이 있습니다. 모바일 예약이나 인증이 낯선 분을 돕는 작은 활동을 시험하고 있습니다.',
  firstActivity:'모바일 예약 순서 안내문 1장과 10분 설명',
  contentIdea:'예약 화면에서 막히는 순간을 어떻게 단계별 안내로 풀었는지 소개하기',
  firstStep:'안내문 1장을 만들어 가상의 이용자 2명에게 따라 해보게 하기',
  validationQuestion:'설명 없이도 다음 단계를 찾을 수 있나요? 어느 부분에서 멈췄나요?',
  reviewAt:'2026-10-03',
  actionStatus:'planned',actionDone:'',reaction:'',revision:'',nextStep:'',phase:'direction'
};
const demoRevised = {
  ...demoInitial,
  firstActivity:'인증 문자 찾기 10분 안내와 한 장짜리 설명문',
  contentIdea:'많이 막혔던 인증 문자 찾기를 세 단계로 설명하는 글',
  firstStep:'수정한 설명문을 새로운 가상 이용자 2명에게 다시 보여주기',
  actionDone:'가상 이용자 2명에게 첫 안내문을 보여주고 혼자 따라 하게 했다.',
  reaction:'가상 이용자 1명은 예약을 마쳤고, 1명은 인증 문자를 찾는 단계에서 멈췄다.',
  revision:'첫 활동의 범위를 전체 예약 과정에서 인증 문자 찾기로 좁혔다.',
  nextStep:'새 설명문을 다시 시험하고, 어느 문장이 이해되지 않는지 묻는다.',
  actionStatus:'done',phase:'followup'
};
function safeSource(data) {
  if (!data.context || !data.sourceTitle || !data.sourceUrl || !data.checkedAt) return null;
  try {
    const url = new URL(data.sourceUrl);
    if (!['http:','https:'].includes(url.protocol)) return null;
    const now = new Date();
    const today = [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.checkedAt) || data.checkedAt > today) return null;
    return url.href;
  } catch { return null; }
}
function makeCard(data) {
  const source = safeSource(data);
  const chosen = data.chosen === 'B' && data.directionB ? data.directionB
    : data.chosen === 'A' && data.directionA ? data.directionA : '아직 선택 전';
  const followup = data.phase === 'followup' || Boolean(data.actionDone || data.reaction || data.revision || data.nextStep);
  const strengthFeedbackText = data.strengthFeedback === 'agree' ? '본인 확인: 동의함'
    : data.strengthFeedback === 'revise' ? '본인 확인: 수정이 필요함' : '본인 확인: 아직 확인 전';
  const actionStatusText = data.actionStatus === 'done' || (!data.actionStatus && data.actionDone) ? '해봤음'
    : data.actionStatus === 'delayed' ? '아직 못 했음' : '아직 해보기 전';
  return {
    ...data,
    contextText: source ? data.context : '조사 전 — 자료 이름·주소·확인 날짜를 함께 입력해야 합니다.',
    sourceUrl: source,
    sourceText: source ? data.sourceTitle + ' · 입력된 확인일 ' + data.checkedAt : '출처 확인 전',
    chosenText: chosen,
    strengthFeedbackText,
    actionStatusText,
    followup
  };
}
function cardToText(card, number) {
  const lines = [
    'PROOFLINE | ' + card.name + ' | ' + number + '차 카드',
    '', '들은 이야기 [본인 진술 · 사실 확인 전]', card.story, '', '직접 해본 일 [본인 진술 · 사실 확인 전]', card.evidence,
    '', '강점 가설 1 [상담자의 해석]', card.strength1 || '아직 함께 정리하기 전', '근거: ' + (card.proof1 || '아직 확인 전'),
    '', '강점 가설 2', card.strength2 || '아직 확인 전', '근거: ' + (card.proof2 || '아직 확인 전'),
    card.strengthFeedbackText,
    '', '중요한 조건', card.preference || '아직 확인 전',
    '', '도울 사람', card.audience || '아직 확인 전',
    '', '관련 흐름 [외부 자료 · 입력된 출처와 날짜]', card.contextText, card.sourceText, card.sourceUrl || '',
    '', '방향 1 [상담자의 제안]', card.directionA || '아직 함께 정리하기 전', '이유: ' + (card.reasonA || '아직 확인 전'),
    '', '방향 2', card.directionB || '아직 제안 전', '이유: ' + (card.reasonB || '아직 확인 전'),
    '', '본인이 고른 방향', card.chosenText,
    '', '20초 자기소개', card.intro || '아직 작성 전',
    '', '첫 활동', card.firstActivity || '아직 정하기 전',
    '', '처음 알릴 이야기', card.contentIdea || '아직 정하기 전',
    '', '첫 행동', card.firstStep || '아직 정하기 전',
    '', '확인할 질문', card.validationQuestion || '아직 정하기 전',
    '', '돌아볼 날짜', card.reviewAt || '아직 정하기 전'
  ];
  if (card.followup) lines.push('', '첫 행동 상태', card.actionStatusText, '실제로 한 행동 [본인 기록]', card.actionDone || '미기록', '상대의 반응 [본인 기록]', card.reaction || '미기록',
    '수정한 점', card.revision || '미기록', '다음 행동', card.nextStep || '미기록');
  lines.push('', '※ 입력과 상담 초안을 정리한 기록이며 성과를 보장하지 않습니다.');
  return lines.join('\n');
}
function historyToText(record) {
  return record.versions.map((version,index) =>
    '저장 시각: '+(version.savedAt ? new Date(version.savedAt).toLocaleString('ko-KR') : '미기록')+'\n'+cardToText(makeCard(version.data),index+1)
  ).join('\n\n'+'='.repeat(40)+'\n\n');
}
if (typeof module !== 'undefined') module.exports = { makeCard, cardToText, historyToText, demoInitial, demoRevised };

if (typeof document !== 'undefined') {
  const form = document.getElementById('intakeForm');
  const byId = id => document.getElementById(id);
  const set = (id,text) => { byId(id).textContent = text; };
  let records = readRecords();
  let activeId = null;
  let viewedIndex = 0;
  let phase = 'story';

  function readRecords() {
    try {
      const current=localStorage.getItem(storageKey);
      const stored = JSON.parse(current || localStorage.getItem(previousStorageKey) || '[]');
      return Array.isArray(stored) ? stored.filter(r => r && r.id && Array.isArray(r.versions) && r.versions.length && (current || !r.fictional)).slice(0,20) : [];
    } catch { return []; }
  }
  function persist() {
    try { localStorage.setItem(storageKey,JSON.stringify(records.slice(0,20))); return true; }
    catch { set('status','이 브라우저에서는 저장이 차단되었습니다. 지금 화면의 결과는 볼 수 있습니다.'); return false; }
  }
  function fill(data) {
    for (const name of fields) {
      const fallback = name === 'chosen' || name === 'strengthFeedback' ? 'pending' : name === 'actionStatus' ? 'planned' : '';
      form.elements[name].value = data[name] || fallback;
    }
  }
  function readForm() {
    return {...Object.fromEntries(fields.map(name => [name,form.elements[name].value.trim()])),phase};
  }
  function setPhase(next) {
    phase=next;
    for (const [name,id] of [['story','storyStage'],['direction','directionStage'],['followup','followupStage']]) {
      byId(id).hidden=name!==next;
      byId(id).disabled=name!==next;
      const button=byId(name+'Step');
      button.classList.toggle('is-active',name===next);
      button.setAttribute('aria-current',name===next?'step':'false');
    }
    set('inputTitle',next==='story'?'이야기부터 시작합니다':next==='direction'?'강점과 방향을 함께 정리합니다':'첫 행동의 반응을 기록합니다');
    set('saveButton',next==='story'?'이야기 저장':next==='direction'?'첫 방향 카드 저장':'반응을 새 카드로 저장');
    byId('nextButton').hidden=next==='followup';
    set('nextButton',next==='story'?'강점·방향 정리하기':'첫 행동 결과 기록하기');
  }
  function readyStory() {
    setPhase('story');
    if(form.reportValidity())return true;
    set('status','먼저 이름, 고민, 직접 해본 일을 적어주세요.');
    return false;
  }
  function suggestReviewDate() {
    if(form.elements.reviewAt.value)return;
    const date=new Date();date.setDate(date.getDate()+7);
    form.elements.reviewAt.value=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  function openDirection() {
    if(!readyStory())return;
    suggestReviewDate();setPhase('direction');
    byId('inputTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function openFollowup() {
    if(!activeId){set('status','먼저 이야기를 저장해 주세요.');setPhase('story');return;}
    const record=records.find(r=>r.id===activeId);
    if(!record?.versions.at(-1).data.firstStep){set('status','먼저 강점·방향 단계에서 첫 행동을 정해 저장해 주세요.');openDirection();return;}
    setPhase('followup');byId('inputTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function textOr(value) { return value || '아직 작성 전'; }
  function line(parent, heading, body) {
    const wrap=document.createElement('div');
    const label=document.createElement('strong');label.textContent=heading;
    const p=document.createElement('p');p.textContent=body || '아직 작성 전';
    wrap.append(label,p);parent.append(wrap);
  }
  function renderCard(record, index) {
    const version=record.versions[index];
    if (!version) return;
    viewedIndex=index;
    const card=makeCard(version.data);
    byId('empty').hidden=true;byId('output').hidden=false;
    set('cardTag',(record.fictional?'가상 사례 · ':'작성한 기록 · ')+(index+1)+'차 카드');
    set('cardDate',new Date(version.savedAt).toLocaleString('ko-KR'));
    set('cardName',card.name);
    set('cardStory',card.story);
    set('cardEvidence',card.evidence);
    set('cardPreference','중요한 조건: '+textOr(card.preference));
    set('cardAudience','도울 사람: '+textOr(card.audience));
    set('cardContext',card.contextText);
    const source=byId('cardSource');
    source.hidden=!card.sourceUrl;
    if(card.sourceUrl){source.href=card.sourceUrl;source.textContent=card.sourceText;}
    else source.removeAttribute('href');
    set('cardSourceNote',card.sourceUrl?'입력된 자료의 내용은 별도로 확인해야 합니다. 개인에게 맞는 방향이나 수요를 보증하지 않습니다.':card.sourceText);
    set('cardChosen',card.chosenText);
    set('cardIntro',textOr(card.intro));
    set('cardActivity',textOr(card.firstActivity));
    set('cardContent',textOr(card.contentIdea));
    set('cardFirstStep','첫 행동: '+textOr(card.firstStep));
    set('cardQuestion','확인할 질문: '+textOr(card.validationQuestion));
    set('cardReviewAt','돌아볼 날짜: '+(card.reviewAt || '아직 정하지 않음 · 자동 알림 없음'));
    const strengthBox=byId('cardStrengths');strengthBox.replaceChildren();
    if(card.strength1)line(strengthBox,card.strength1,card.proof1);
    else line(strengthBox,'아직 함께 정리하기 전','먼저 적은 경험을 바탕으로 상담 중 강점을 찾습니다.');
    if(card.strength2)line(strengthBox,card.strength2,card.proof2);
    set('cardStrengthFeedback',card.strengthFeedbackText);
    const directionBox=byId('cardDirections');directionBox.replaceChildren();
    if(card.directionA)line(directionBox,'방향 1 · '+card.directionA,card.reasonA);
    else line(directionBox,'아직 함께 정리하기 전','경험과 중요한 조건을 보고 가능한 방향을 제안합니다.');
    if(card.directionB)line(directionBox,'방향 2 · '+card.directionB,card.reasonB);
    byId('followupBlock').hidden=!card.followup;
    set('cardActionStatus','첫 행동 상태: '+card.actionStatusText);
    set('cardAction','실제로 한 일: '+textOr(card.actionDone));
    set('cardReaction','들은 반응: '+textOr(card.reaction));
    set('cardRevision','바꾼 점: '+textOr(card.revision));
    set('cardNextStep','다음 행동: '+textOr(card.nextStep));
    const bar=byId('versionBar');bar.replaceChildren();
    record.versions.forEach((entry,i)=>{
      const button=document.createElement('button');
      button.type='button';button.className='version-button'+(i===index?' is-active':'');
      button.setAttribute('aria-pressed',String(i===index));
      button.textContent=(i+1)+'차 · '+(entry.data.phase==='story'?'이야기':entry.data.phase==='followup'?'반응 후 수정':i===0?'첫 카드':'방향·수정');
      button.addEventListener('click',()=>renderCard(record,i));
      bar.append(button);
    });
  }
  function renderList() {
    const list=byId('recordList');list.replaceChildren();
    if(!records.length){
      const p=document.createElement('p');p.className='record-empty';
      p.textContent='아직 저장된 기록이 없습니다. 상단의 가상 사례 버튼으로 전체 흐름을 볼 수 있습니다.';
      list.append(p);return;
    }
    for(const record of records){
      const button=document.createElement('button');button.type='button';button.className='record-item';
      const title=document.createElement('strong');title.textContent=record.versions.at(-1).data.name;
      const latest=makeCard(record.versions.at(-1).data);
      const meta=document.createElement('span');meta.textContent=(record.fictional?'가상 사례':'작성한 기록')+' · '+record.versions.length+'차까지 저장';
      button.append(title,meta);
      if(latest.reviewAt){const review=document.createElement('span');review.textContent='돌아볼 날짜: '+latest.reviewAt+(latest.followup?' · 반응 기록됨':' · 반응 기록 전');button.append(review);}
      button.addEventListener('click',()=>openRecord(record.id));
      list.append(button);
    }
  }
  function openRecord(id, scroll=true) {
    const record=records.find(r=>r.id===id);
    if(!record)return;
    activeId=id;fill(record.versions.at(-1).data);
    setPhase(record.versions.at(-1).data.phase==='followup'?'followup':'story');
    renderCard(record,record.versions.length-1);
    if(scroll)byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function saveVersion(data) {
    let record=records.find(r=>r.id===activeId);
    if(!record){
      record={id:String(Date.now())+'-'+Math.random().toString(36).slice(2),fictional:false,versions:[]};
      records.unshift(record);activeId=record.id;
    }
    record.versions.push({savedAt:new Date().toISOString(),data});
    records=[record,...records.filter(r=>r.id!==record.id)].slice(0,20);
    const saved=persist();renderCard(record,record.versions.length-1);renderList();
    if(saved)set('status',record.versions.length+'차 카드를 이 브라우저에 저장했습니다.');
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const data=readForm();
    if(phase==='direction' && (!data.name || !data.story || !data.evidence)){
      set('status','먼저 이야기 단계에서 이름, 고민, 직접 해본 일을 적어주세요.');setPhase('story');return;
    }
    if(Boolean(data.strength2)!==Boolean(data.proof2)){
      set('status','두 번째 강점과 그 근거를 함께 적어주세요.');
      form.elements[data.strength2?'proof2':'strength2'].focus();
      return;
    }
    if(Boolean(data.directionB)!==Boolean(data.reasonB)){
      set('status','두 번째 방향과 그 이유를 함께 적어주세요.');
      form.elements[data.directionB?'reasonB':'directionB'].focus();
      return;
    }
    if(phase==='followup'){
      if(!activeId){set('status','먼저 이야기나 첫 방향 카드를 저장해 주세요.');setPhase('story');return;}
      if(data.actionStatus==='planned'){set('status','해봤는지, 아직 못 했는지 선택해 주세요.');form.elements.actionStatus.focus();return;}
      if(data.actionStatus==='done' && (!data.actionDone || !data.reaction)){
        set('status','해본 행동과 들은 반응을 함께 적어주세요.');form.elements[data.actionDone?'reaction':'actionDone'].focus();return;
      }
      if(data.actionStatus==='delayed' && !data.nextStep){set('status','다음에 해볼 일을 적어주세요.');form.elements.nextStep.focus();return;}
    }
    saveVersion(data);
    byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
  });
  function showDemo(scroll=true) {
    let record=records.find(r=>r.id==='fictional-park-daeun-v7');
    if(!record){
      record={
        id:'fictional-park-daeun-v7',fictional:true,
        versions:[
          {savedAt:'2026-09-26T09:00:00+09:00',data:{...demoInitial}},
          {savedAt:'2026-09-26T10:00:00+09:00',data:{...demoRevised}}
        ]
      };
      records=[record,...records].slice(0,20);
      persist();
    }
    try{localStorage.removeItem(demoDismissedKey);}catch{}
    activeId=record.id;fill(record.versions.at(-1).data);setPhase('story');
    renderCard(record,record.versions.length-1);renderList();
    set('status','가상 사례가 표시되었습니다. 결과 카드 위의 1차·2차 버튼으로 변화를 비교할 수 있습니다.');
    if(scroll)byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  byId('demoButton').addEventListener('click',()=>showDemo());
  byId('headerDemoButton').addEventListener('click',event=>{event.preventDefault();showDemo();});
  byId('storyStep').addEventListener('click',()=>setPhase('story'));
  byId('directionStep').addEventListener('click',openDirection);
  byId('followupStep').addEventListener('click',openFollowup);
  byId('followupCta').addEventListener('click',openFollowup);
  byId('nextButton').addEventListener('click',()=>phase==='story'?openDirection():openFollowup());
  byId('newButton').addEventListener('click',()=>{
    activeId=null;fill({});setPhase('story');
    byId('output').hidden=true;byId('empty').hidden=false;
    set('status','새 기록을 시작합니다. 기존 기록은 아래에 남아 있습니다.');
    byId('inputTitle').scrollIntoView({block:'start',behavior:'smooth'});
  });
  byId('copyButton').addEventListener('click',async()=>{
    const record=records.find(r=>r.id===activeId);if(!record)return;
    const content=cardToText(makeCard(record.versions[viewedIndex].data),viewedIndex+1);
    try{await navigator.clipboard.writeText(content);set('status','현재 보고 있는 카드를 복사했습니다.');}
    catch{set('status','복사가 차단되었습니다. 텍스트 저장을 이용해 주세요.');}
  });
  byId('downloadButton').addEventListener('click',()=>{
    const record=records.find(r=>r.id===activeId);if(!record)return;
    const content=cardToText(makeCard(record.versions[viewedIndex].data),viewedIndex+1);
    downloadText(content,'proofline-card-'+(viewedIndex+1)+'-'+new Date().toISOString().slice(0,10)+'.txt');
    set('status','현재 보고 있는 카드를 텍스트 파일로 저장했습니다.');
  });
  function downloadText(content,name) {
    const blob=new Blob(['\uFEFF',content],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;
    link.download=name;
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  byId('downloadHistoryButton').addEventListener('click',()=>{
    const record=records.find(r=>r.id===activeId);if(!record)return;
    downloadText(historyToText(record),'proofline-history-'+new Date().toISOString().slice(0,10)+'.txt');
    set('status','이 사람의 전체 카드 이력을 텍스트 파일로 저장했습니다.');
  });
  byId('deleteButton').addEventListener('click',()=>{
    const record=records.find(r=>r.id===activeId);if(!record)return;
    if(!window.confirm('이 기록의 모든 카드 버전을 이 브라우저에서 삭제할까요?'))return;
    if(record.fictional)try{localStorage.setItem(demoDismissedKey,'1');}catch{}
    records=records.filter(r=>r.id!==activeId);activeId=null;persist();renderList();fill({});setPhase('story');
    byId('output').hidden=true;byId('empty').hidden=false;
    set('status','선택한 기록을 삭제했습니다.');
  });
  setPhase('story');renderList();
  let dismissed=false;
  try{dismissed=localStorage.getItem(demoDismissedKey)==='1';}catch{}
  if(records.some(r=>r.id==='fictional-park-daeun-v7'))showDemo(false);
  else if(!dismissed)showDemo(false);
  else if(records.length)openRecord(records[0].id,false);
}
