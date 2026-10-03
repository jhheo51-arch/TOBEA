const storageKey = 'proofline-records-v9';
const previousStorageKeys = ['proofline-records-v8','proofline-records-v7','proofline-records-v5'];
const candidateStorageKey = 'proofline-candidates-v9';
const demoDismissedKey = 'proofline-demo-dismissed-v9';
const backupFormat = 'proofline-backup';
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function makeBackup(records,candidates) {
  return {format:backupFormat,version:1,exportedAt:new Date().toISOString(),
    records:records.filter(item=>!item.fictional),candidates};
}
function mergeBackup(backup,records,candidates) {
  if(!isObject(backup) || backup.format!==backupFormat || backup.version!==1 || !Array.isArray(backup.records) || !Array.isArray(backup.candidates))throw Error('PROOFLINE 백업 파일 형식이 아닙니다.');
  if(backup.records.length>20 || backup.candidates.length>20)throw Error('백업 파일의 기록 개수가 허용 범위를 넘습니다.');
  const ids=new Set(),candidateIds=new Set();
  for(const record of backup.records){
    if(!isObject(record) || typeof record.id!=='string' || !record.id || record.fictional || !Array.isArray(record.versions) || !record.versions.length || record.versions.length>100 ||
      !record.versions.every(v=>isObject(v) && typeof v.savedAt==='string' && isObject(v.data) && typeof v.data.name==='string' && typeof v.data.story==='string' && typeof v.data.evidence==='string') ||
      (record.campaign!==undefined && (!isObject(record.campaign) || !Array.isArray(record.campaign.offers) || !Array.isArray(record.campaign.attempts) || ![...record.campaign.offers,...record.campaign.attempts].every(entry=>isObject(entry) && isObject(entry.data)))))throw Error('백업 파일에 읽을 수 없는 상담 기록이 있습니다.');
    if(ids.has(record.id))throw Error('백업 파일에 중복된 상담 기록이 있습니다.');ids.add(record.id);
  }
  for(const candidate of backup.candidates){
    if(!isObject(candidate) || typeof candidate.id!=='string' || !candidate.id || typeof candidate.alias!=='string' || !candidate.alias || typeof candidate.challenge!=='string' || typeof candidate.example!=='string' || candidate.consentConfirmed!==true || (candidate.recordId!=null && typeof candidate.recordId!=='string'))throw Error('백업 파일에 읽을 수 없는 상담 후보가 있습니다.');
    if(candidateIds.has(candidate.id))throw Error('백업 파일에 중복된 상담 후보가 있습니다.');candidateIds.add(candidate.id);
  }
  const oldRecordIds=new Set(records.map(item=>item.id));
  const oldCandidateIds=new Set(candidates.map(item=>item.id));
  const addedRecords=backup.records.filter(item=>!oldRecordIds.has(item.id));
  const addedCandidates=backup.candidates.filter(item=>!oldCandidateIds.has(item.id));
  if(records.length+addedRecords.length>20 || candidates.length+addedCandidates.length>20)throw Error('이 브라우저의 보관 한도(각 20개)를 넘습니다. 기존 기록은 그대로 두었습니다.');
  const mergedRecords=[...records,...addedRecords],mergedCandidates=[...candidates,...addedCandidates];
  const mergedIds=new Set(mergedRecords.map(item=>item.id));
  for(const item of addedCandidates)if(item.recordId && !mergedIds.has(item.recordId))item.recordId=null;
  return {records:mergedRecords,candidates:mergedCandidates,addedRecords:addedRecords.length,addedCandidates:addedCandidates.length};
}
const fields = [
  'name','story','evidence','pastReaction','preference','strength1','proof1','strength2','proof2','strengthFeedback','audience','targetSituation',
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
const demoOffers = [
  {savedAt:'2026-09-26T11:00:00+09:00',data:{
    offerAudience:'모바일 예약이 낯선 사람',offerProblem:'예약 화면에서 어느 순서로 눌러야 할지 막힌다',
    offerPromise:'복잡한 예약 순서를 작은 단계로 나누어 함께 확인한다',offerSmall:'예약 안내문 한 장과 10분 설명',
    offerChannel:'온라인 커뮤니티',offerCta:'막힌 화면이나 순서를 댓글로 알려주세요',
    offerMessage:'모바일 예약 화면에서 순서를 찾기 어렵다면 알려주세요. 제가 직접 해본 안내 경험을 바탕으로 예약 단계를 한 장으로 정리해 보고 있습니다. 설명문을 보고도 막히는 부분이 있다면 댓글로 알려주세요.'
  }},
  {savedAt:'2026-09-26T13:00:00+09:00',data:{
    offerAudience:'인증 문자 단계에서 멈추는 사람',offerProblem:'예약 도중 받은 인증 문자를 어디에서 찾아야 할지 모른다',
    offerPromise:'인증 문자를 찾는 과정을 세 단계로 나누어 설명한다',offerSmall:'인증 문자 찾기 10분 안내와 설명문 한 장',
    offerChannel:'온라인 커뮤니티',offerCta:'설명문에서 이해되지 않는 문장을 알려주세요',
    offerMessage:'모바일 예약 중 인증 문자를 찾는 단계에서 막히셨나요? 화면을 함께 보며 세 단계로 나누어 설명한 한 장짜리 안내문을 시험 중입니다. 설명문에서 이해되지 않는 문장을 알려주시면 고치겠습니다.'
  }}
];
const demoAttempt = {id:'fictional-attempt-1',offerIndex:0,savedAt:'2026-09-26T12:00:00+09:00',history:[],data:{
  attemptDate:'2026-09-26',attemptPlace:'가상의 온라인 커뮤니티',attemptUrl:'',ownerUnderstanding:'yes',
  replyCount:'2',inquiryCount:'0',attemptReaction:'가상 반응 두 건 중 한 건은 안내문이 도움 됐다고 했고, 한 건은 인증 문자 찾는 단계가 이해되지 않는다고 했다.',
  attemptLearning:'전체 예약보다 인증 문자 단계에 대한 설명이 먼저 필요해 보인다.',
  attemptNext:'제안 문구와 안내 범위를 인증 문자 찾기로 좁힌다.',workMinutes:'85',ownerApproved:true
}};
const offerFields = ['offerAudience','offerProblem','offerPromise','offerSmall','offerDuration','offerDeliverable','offerExclusions','offerChannel','offerCta','offerMessage','offerChangeReason'];
const attemptFields = ['attemptDate','attemptPlace','attemptUrl','ownerUnderstanding','replyCount','interestCount','questionCount','participationCount','inquiryCount','attemptReaction','rejectionReason','attemptLearning','attemptNext','workMinutes'];
function buildOfferMessage(data) {
  const scope=data.offerDuration && data.offerDeliverable && data.offerExclusions
    ? `\n시간: ${data.offerDuration}\n결과물: ${data.offerDeliverable}\n포함되지 않는 일: ${data.offerExclusions}` : '';
  return `도움이 필요한 분: ${data.offerAudience}\n${data.offerProblem}라는 어려움이 있다면, ${data.offerPromise}.\n먼저 ${data.offerSmall}부터 해보려 합니다.${scope}\n${data.offerCta}`;
}
function campaignToText(record) {
  const lines=[historyToText(record),'','=== 첫 제안 동행 ==='];
  const campaign=record.campaign || {offers:[],attempts:[]};
  campaign.offers.forEach((offer,index)=>{
    const d=offer.data;
    lines.push('',`${index+1}차 제안 · ${offer.savedAt || '저장일 미기록'}`,
      '대상: '+d.offerAudience,'불편: '+d.offerProblem,'도울 변화: '+d.offerPromise,
      '작은 활동: '+d.offerSmall,'걸리는 시간: '+(d.offerDuration || '미기록'),
      '결과물: '+(d.offerDeliverable || '미기록'),'제외 범위: '+(d.offerExclusions || '미기록'),
      '채널: '+d.offerChannel,'요청할 행동: '+d.offerCta,
      '바꾼 이유: '+(d.offerChangeReason || '첫 제안 또는 미기록'),'',d.offerMessage);
  });
  campaign.attempts.forEach((attempt,index)=>{
    const d=attempt.data;
    lines.push('',`${index+1}차 실행 기록 · ${d.attemptDate} · ${attempt.offerIndex+1}차 제안`,
      '실행 장소: '+d.attemptPlace,'게시 주소: '+(d.attemptUrl || '미기록'),
      '본인 이해: '+({yes:'자기 말로 설명함',no:'수정 필요',unknown:'아직 확인 전'}[d.ownerUnderstanding] || '아직 확인 전'),
      '반응 수: '+(d.replyCount==='' || d.replyCount==null?'미확인':d.replyCount),
      '관심 표현: '+(d.interestCount==='' || d.interestCount==null?'미확인':d.interestCount),
      '추가 질문: '+(d.questionCount==='' || d.questionCount==null?'미확인':d.questionCount),
      '참여: '+(d.participationCount==='' || d.participationCount==null?'미확인':d.participationCount),
      '문의 수: '+(d.inquiryCount || (d.inquiryCount==='0'?'0':'미확인')),
      '실제로 들은 반응: '+(d.attemptReaction || '미기록'),'직접 들은 거절 이유: '+(d.rejectionReason || '미확인'),
      '배운 점: '+(d.attemptLearning || '미기록'),
      '다음 수정: '+(d.attemptNext || '미기록'),'운영 시간(분): '+(d.workMinutes || '미기록'));
    (attempt.history || []).forEach((previous,revision)=>{
      lines.push(`이전 기록 ${revision+1} · ${previous.savedAt || '시각 미기록'}`,
        '이전 반응: '+(previous.data.attemptReaction || '미기록'),
        '이전 문의 수: '+(previous.data.inquiryCount===''?'미확인':previous.data.inquiryCount));
    });
  });
  return lines.join('\n');
}
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
  const self=Boolean(card.selfGuided);
  const lines = [
    'PROOFLINE | ' + card.name + ' | ' + number + '차 카드',
    '', '들은 이야기 [본인 진술 · 사실 확인 전]', card.story, '', '직접 해본 일 [본인 진술 · 사실 확인 전]', card.evidence,
    '', '그때 실제로 들은 반응 [본인 진술]', card.pastReaction || '미확인',
    '', self?'강점 가설 1 [본인이 적은 초안]':'강점 가설 1 [상담자의 해석]', card.strength1 || '아직 함께 정리하기 전', '근거: ' + (card.proof1 || '아직 확인 전'),
    '', '강점 가설 2', card.strength2 || '아직 확인 전', '근거: ' + (card.proof2 || '아직 확인 전'),
    card.strengthFeedbackText,
    '', '중요한 조건', card.preference || '아직 확인 전',
    '', '도울 사람', card.audience || '아직 확인 전',
    '', '첫 대상의 상황 [입력한 가설]', card.targetSituation || '아직 확인 전',
    '', '관련 흐름 [외부 자료 · 입력된 출처와 날짜]', card.contextText, card.sourceText, card.sourceUrl || '',
    '', self?'방향 1 [본인이 적은 초안]':'방향 1 [상담자의 제안]', card.directionA || '아직 함께 정리하기 전', '이유: ' + (card.reasonA || '아직 확인 전'),
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
  lines.push('', self?'※ 본인이 입력한 내용을 정리한 초안이며 강점·수요·성과를 검증하지 않습니다.':'※ 입력과 상담 초안을 정리한 기록이며 성과를 보장하지 않습니다.');
  return lines.join('\n');
}
function historyToText(record) {
  return record.versions.map((version,index) =>
    '저장 시각: '+(version.savedAt ? new Date(version.savedAt).toLocaleString('ko-KR') : '미기록')+'\n'+cardToText(makeCard(version.data),index+1)
  ).join('\n\n'+'='.repeat(40)+'\n\n');
}
if (typeof module !== 'undefined') module.exports = { makeCard, cardToText, historyToText, buildOfferMessage, campaignToText, demoInitial, demoRevised, demoOffers, demoAttempt, makeBackup, mergeBackup };

if (typeof document !== 'undefined') {
  const form = document.getElementById('intakeForm');
  const byId = id => document.getElementById(id);
  const set = (id,text) => { byId(id).textContent = text; };
  const offerStatus = message => { set('offerStatus',message); };
  let records = readRecords();
  let candidates = readCandidates();
  let activeId = null;
  let pendingCandidateId = null;
  let viewedIndex = 0;
  let phase = 'story';
  let activeOfferIndex = -1;
  let activeAttemptIndex = -1;
  const offerForm=byId('offerForm');
  const attemptForm=byId('attemptForm');
  const candidateForm=byId('candidateForm');
  const selfForm=byId('selfForm');

  function readCandidates() {
    try {
      const stored=JSON.parse(localStorage.getItem(candidateStorageKey) || '[]');
      return Array.isArray(stored)?stored.filter(item=>item && item.id && item.alias && item.consentConfirmed).slice(0,20):[];
    } catch { return []; }
  }
  function persistCandidates() {
    try { localStorage.setItem(candidateStorageKey,JSON.stringify(candidates.slice(0,20)));return true; }
    catch { set('candidateStatus','이 브라우저에서는 상담 후보를 저장할 수 없습니다. 내용을 복사해 별도로 보관해 주세요.');return false; }
  }

  function readRecords() {
    try {
      const current=localStorage.getItem(storageKey);
      const previous=previousStorageKeys.map(key=>localStorage.getItem(key)).find(Boolean);
      const stored = JSON.parse(current || previous || '[]');
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
  function currentRecord() { return records.find(r=>r.id===activeId); }
  function campaignFor(record) {
    if(!record.campaign)record.campaign={offers:[],attempts:[]};
    return record.campaign;
  }
  function offerData() { return Object.fromEntries(offerFields.map(name=>[name,offerForm.elements[name].value.trim()])); }
  function attemptData() {
    return {...Object.fromEntries(attemptFields.map(name=>[name,attemptForm.elements[name].value.trim()])),ownerApproved:attemptForm.elements.ownerApproved.checked};
  }
  function fillOffer(data={}) { for(const name of offerFields)offerForm.elements[name].value=data[name] || ''; }
  function fillAttempt(data={}) {
    for(const name of attemptFields)attemptForm.elements[name].value=data[name] || (name==='ownerUnderstanding'?'unknown':'');
    attemptForm.elements.ownerApproved.checked=Boolean(data.ownerApproved);
  }
  function suggestOffer(record) {
    const data=record.versions.at(-1).data;
    fillOffer({offerAudience:data.audience || '',offerProblem:data.targetSituation || '',
      offerSmall:data.firstActivity || '',offerCta:data.validationQuestion || ''});
  }
  function renderPilotStats() {
    const real=records.filter(r=>!r.fictional && !r.selfGuided);
    const executed=real.filter(r=>r.campaign?.attempts?.length).length;
    const known=real.flatMap(r=>r.campaign?.attempts || []).map(a=>a.data.inquiryCount).filter(v=>v!=='' && v!=null);
    const inquiries=known.length?known.reduce((sum,value)=>sum+Number(value),0):'미확인';
    const box=byId('pilotNumbers');box.replaceChildren();
    for(const [label,value] of [['시범 이용자',real.length+'명'],['실제 실행 기록',executed+'명'],['기록된 문의',String(inquiries)]]){
      const item=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');
      strong.textContent=value;span.textContent=label;item.append(strong,span);box.append(item);
    }
  }
  function renderOffer(record,index) {
    const campaign=campaignFor(record),entry=campaign.offers[index];if(!entry)return;
    activeOfferIndex=index;fillOffer(entry.data);
    set('offerTag',(record.fictional?'가상 사례 · ':'작성한 제안 · ')+(index+1)+'차 문구');
    set('offerDate',new Date(entry.savedAt).toLocaleString('ko-KR'));
    set('offerFor',entry.data.offerAudience);
    set('offerProblemView',entry.data.offerProblem);
    set('offerPromiseView',entry.data.offerPromise);
    set('offerSmallView',entry.data.offerSmall);
    set('offerDurationView','걸리는 시간: '+(entry.data.offerDuration || '미기록'));
    set('offerDeliverableView','결과물: '+(entry.data.offerDeliverable || '미기록'));
    set('offerExclusionsView','제외 범위: '+(entry.data.offerExclusions || '미기록'));
    set('offerMessageView',entry.data.offerMessage);
    set('offerChannelView','알릴 곳: '+entry.data.offerChannel);
    byId('offerChangeBlock').hidden=!entry.data.offerChangeReason;
    set('offerChangeView',entry.data.offerChangeReason || '');
    set('offerCtaView','요청할 행동: '+entry.data.offerCta);
    const bar=byId('offerVersionBar');bar.replaceChildren();
    campaign.offers.forEach((offer,i)=>{
      const button=document.createElement('button');button.type='button';
      button.className='version-button'+(i===index?' is-active':'');
      button.setAttribute('aria-pressed',String(i===index));button.textContent=(i+1)+'차 제안';
      button.addEventListener('click',()=>renderOffer(record,i));bar.append(button);
    });
  }
  function renderAttemptList(record) {
    const list=byId('attemptList');list.replaceChildren();
    const attempts=campaignFor(record).attempts;
    if(!attempts.length){const p=document.createElement('p');p.textContent='아직 실제 실행 기록이 없습니다.';list.append(p);return;}
    attempts.forEach((attempt,index)=>{
      const item=document.createElement('div');item.className='attempt-item';
      const title=document.createElement('strong');title.textContent=(record.fictional?'가상 실행 · ':'실행 · ')+attempt.data.attemptDate+' · '+attempt.data.attemptPlace;
      const known=name=>attempt.data[name]==='' || attempt.data[name]==null?'미확인':attempt.data[name]+'건';
      const reply=document.createElement('p');reply.textContent='반응 '+known('replyCount')+' · 관심 '+known('interestCount')+' · 질문 '+known('questionCount')+' · 참여 '+known('participationCount')+' · 문의 '+known('inquiryCount');
      const reaction=document.createElement('p');reaction.textContent='들은 말: '+(attempt.data.attemptReaction || '아직 기록 전');
      const rejection=document.createElement('p');rejection.textContent='직접 들은 거절 이유: '+(attempt.data.rejectionReason || '미확인');
      const learning=document.createElement('p');learning.textContent='다음 수정: '+(attempt.data.attemptNext || '아직 정하지 않음');
      const edit=document.createElement('button');edit.type='button';edit.textContent='이 실행 기록 수정';
      edit.addEventListener('click',()=>{activeAttemptIndex=index;fillAttempt(attempt.data);set('attemptSaveButton','실행 기록 수정 저장');byId('attemptForm').scrollIntoView({block:'start',behavior:'smooth'});});
      item.append(title,reply,reaction,rejection,learning,edit);list.append(item);
    });
  }
  function renderComparison(record) {
    const box=byId('offerComparison');box.replaceChildren();
    const campaign=campaignFor(record);
    campaign.offers.forEach((offer,index)=>{
      const attempts=campaign.attempts.filter(item=>item.offerIndex===index);
      const item=document.createElement('p');
      const known=name=>attempts.length && attempts.at(-1).data[name]!=='' && attempts.at(-1).data[name]!=null
        ?attempts.at(-1).data[name]+'건':'미확인';
      item.textContent=(index+1)+'차 제안 · 실제 알린 기록 '+attempts.length+'회 · 반응 '+known('replyCount')+
        ' · 관심 '+known('interestCount')+' · 질문 '+known('questionCount')+
        ' · 참여 '+known('participationCount')+' · 문의 '+known('inquiryCount');
      box.append(item);
    });
  }
  function clearAttempt() { activeAttemptIndex=-1;fillAttempt();set('attemptSaveButton','실행 기록 저장'); }
  function renderCampaign(record) {
    renderPilotStats();
    if(!record){byId('offerEmpty').hidden=false;byId('offerOutput').hidden=true;fillOffer();clearAttempt();set('offerStatus','');return;}
    const campaign=campaignFor(record);
    if(!campaign.offers.length){byId('offerEmpty').hidden=false;byId('offerOutput').hidden=true;suggestOffer(record);clearAttempt();return;}
    byId('offerEmpty').hidden=true;byId('offerOutput').hidden=false;
    renderOffer(record,campaign.offers.length-1);renderAttemptList(record);renderComparison(record);
    if(campaign.attempts.length){activeAttemptIndex=campaign.attempts.length-1;fillAttempt(campaign.attempts.at(-1).data);set('attemptSaveButton','실행 기록 수정 저장');}
    else clearAttempt();
  }
  function candidateStage(candidate) {
    const record=records.find(item=>item.id===candidate.recordId);
    if(!record)return '상담 전';
    if(record.campaign?.attempts?.length)return '실제 실행 기록됨';
    if(record.campaign?.offers?.length)return '첫 제안 작성됨';
    if(record.versions.at(-1).data.directionA)return '방향 카드 작성됨';
    return '상담 기록 시작됨';
  }
  function renderCandidates() {
    const list=byId('candidateList');list.replaceChildren();
    if(!candidates.length){
      const p=document.createElement('p');p.className='record-empty';
      p.textContent='아직 실제 상담 후보가 없습니다. 가상 사례는 여기에 표시되지 않습니다.';
      list.append(p);return;
    }
    for(const candidate of candidates){
      const item=document.createElement('div');item.className='candidate-item';
      const title=document.createElement('strong');title.textContent=candidate.alias;
      const meta=document.createElement('p');meta.textContent=candidateStage(candidate)+' · '+candidate.source+' · '+candidate.createdAt.slice(0,10);
      const issue=document.createElement('p');issue.textContent='막힌 점: '+candidate.challenge;
      const actions=document.createElement('div');actions.className='output-actions';
      const start=document.createElement('button');start.type='button';start.className='button button-dark';
      start.textContent=records.some(record=>record.id===candidate.recordId)?'상담 기록 열기':'이 후보로 상담 시작';
      start.addEventListener('click',()=>{
        if(candidate.recordId && records.some(record=>record.id===candidate.recordId)){openRecord(candidate.recordId,false);}
        else {
          pendingCandidateId=candidate.id;activeId=null;
          fill({name:candidate.alias,story:candidate.challenge,evidence:candidate.example});setPhase('story');
          byId('output').hidden=true;byId('empty').hidden=false;renderCampaign(null);
        }
        set('candidateStatus','상담 기록에 이 후보의 이야기와 경험을 불러왔습니다. 직접 확인한 뒤 저장해 주세요.');
        byId('inputTitle').scrollIntoView({block:'start',behavior:'smooth'});
      });
      const remove=document.createElement('button');remove.type='button';remove.className='button button-quiet';remove.textContent='후보 목록에서 삭제';
      remove.addEventListener('click',()=>{
        if(!window.confirm('이 후보를 목록에서 삭제할까요? 이미 만든 방향 카드·제안 기록은 별도로 남습니다.'))return;
        candidates=candidates.filter(item=>item.id!==candidate.id);
        if(pendingCandidateId===candidate.id)pendingCandidateId=null;
        const saved=persistCandidates();renderCandidates();
        if(saved)set('candidateStatus','후보를 목록에서 삭제했습니다. 이미 만든 상담 기록은 아래에서 따로 삭제할 수 있습니다.');
      });
      actions.append(start,remove);item.append(title,meta,issue,actions);list.append(item);
    }
  }
  function renderCard(record, index) {
    const version=record.versions[index];
    if (!version) return;
    viewedIndex=index;
    const card=makeCard(version.data);
    byId('empty').hidden=true;byId('output').hidden=false;
    set('cardTag',(record.fictional?'가상 사례 · ':record.selfGuided?'내 경험 · ':'작성한 기록 · ')+(index+1)+'차 카드');
    set('resultTitle',record.selfGuided?'내 경험으로 만든 방향 카드':'이용자에게 이렇게 보여줍니다');
    set('strengthProvenance',record.selfGuided?'본인이 적은 강점 후보 · 실제 경험과 다시 비교':'상담자의 해석 · 본인과 확인');
    set('directionProvenance',record.selfGuided?'본인이 적은 방향 초안 · 적합성은 행동으로 확인':'상담자의 제안 · 적합성은 행동으로 확인');
    set('cardNote',record.selfGuided?'본인이 입력한 내용을 정리한 초안입니다. 강점·수요·성과를 검증하지 않습니다.':'입력과 상담자가 작성한 초안을 정리한 결과입니다. 진로·사업 성과를 보장하지 않습니다.');
    set('cardDate',new Date(version.savedAt).toLocaleString('ko-KR'));
    set('cardName',card.name);
    set('cardStory',card.story);
    set('cardEvidence',card.evidence);
    set('cardPastReaction',card.pastReaction || '미확인');
    set('cardPreference','중요한 조건: '+textOr(card.preference));
    set('cardAudience','도울 사람: '+textOr(card.audience));
    set('cardTargetSituation',textOr(card.targetSituation));
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
      const meta=document.createElement('span');meta.textContent=(record.fictional?'가상 사례':record.selfGuided?'나 혼자 체험':'작성한 기록')+' · '+record.versions.length+'차까지 저장';
      button.append(title,meta);
      if(latest.reviewAt){const review=document.createElement('span');review.textContent='돌아볼 날짜: '+latest.reviewAt+(latest.followup?' · 반응 기록됨':' · 반응 기록 전');button.append(review);}
      button.addEventListener('click',()=>openRecord(record.id));
      list.append(button);
    }
  }
  function openRecord(id, scroll=true) {
    const record=records.find(r=>r.id===id);
    if(!record)return;
    pendingCandidateId=null;
    activeId=id;fill(record.versions.at(-1).data);
    setPhase(record.versions.at(-1).data.phase==='followup'?'followup':'story');
    renderCard(record,record.versions.length-1);
    renderCampaign(record);
    if(scroll)byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function saveVersion(data,selfGuided=false) {
    let record=records.find(r=>r.id===activeId);
    if(!record){
      record={id:String(Date.now())+'-'+Math.random().toString(36).slice(2),fictional:false,selfGuided,versions:[]};
      records.unshift(record);activeId=record.id;
      if(pendingCandidateId){
        const candidate=candidates.find(item=>item.id===pendingCandidateId);
        if(candidate){candidate.recordId=record.id;persistCandidates();}
        pendingCandidateId=null;
      }
    }
    if(record.selfGuided)data.selfGuided=true;
    record.versions.push({savedAt:new Date().toISOString(),data});
    records=[record,...records.filter(r=>r.id!==record.id)].slice(0,20);
    const saved=persist();renderCard(record,record.versions.length-1);renderList();renderCampaign(record);renderCandidates();
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
  selfForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!selfForm.reportValidity())return;
    const value=name=>selfForm.elements[name].value.trim();
    const name=value('selfName'),story=value('selfChallenge'),evidence=value('selfExperience');
    const pastReaction=value('selfPastReaction'),strength=value('selfStrength');
    const audience=value('selfAudience'),targetSituation=value('selfSituation'),activity=value('selfActivity');
    if([name,story,evidence,strength,audience,targetSituation,activity].some(item=>!item)){
      set('selfStatus','필수 질문에 모두 답해 주세요.');return;
    }
    const data={name,story,evidence,pastReaction,strength1:strength,proof1:evidence,strengthFeedback:'agree',audience,targetSituation,
      directionA:activity,reasonA:'내가 적은 경험과 강점 후보를 바탕으로 작은 활동을 시험한다. 실제 필요와 반응은 확인 전이다.',
      chosen:'A',intro:`제가 해본 일: ${evidence}\n제가 생각하는 강점: ${strength}\n도와보고 싶은 사람: ${audience}`,
      firstActivity:activity,contentIdea:'직접 해본 일에서 내가 한 행동과 배운 점을 소개하기',
      firstStep:'먼저 한 사람에게 작은 활동을 설명하고 필요한지 묻기',
      validationQuestion:'이 활동에서 가장 필요한 부분은 무엇인가요?',actionStatus:'planned',phase:'direction',selfGuided:true};
    activeId=null;pendingCandidateId=null;fill(data);setPhase('direction');saveVersion(data,true);
    set('selfStatus','내가 적은 내용으로 방향 카드 초안을 만들었습니다. 카드의 표현을 확인하고 아래에서 고칠 수 있습니다.');
    byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
  });
  function showDemo(scroll=true) {
    let record=records.find(r=>r.id==='fictional-park-daeun-v9');
    if(!record){
      record={
        id:'fictional-park-daeun-v9',fictional:true,
        versions:[
          {savedAt:'2026-09-26T09:00:00+09:00',data:{...demoInitial}},
          {savedAt:'2026-09-26T10:00:00+09:00',data:{...demoRevised}}
        ],
        campaign:{offers:demoOffers.map(o=>({savedAt:o.savedAt,data:{...o.data}})),attempts:[{...demoAttempt,data:{...demoAttempt.data}}]}
      };
      records=[record,...records].slice(0,20);
      persist();
    }
    try{localStorage.removeItem(demoDismissedKey);}catch{}
    pendingCandidateId=null;activeId=record.id;fill(record.versions.at(-1).data);setPhase('story');
    renderCard(record,record.versions.length-1);renderList();renderCampaign(record);
    byId('fictionalJourney').hidden=false;
    set('status','가상 사례가 표시되었습니다. 방향 카드와 아래 첫 제안 동행의 1차·2차 문구, 가상 실행 반응을 비교할 수 있습니다.');
    if(scroll)byId('fictionalJourneyTitle').scrollIntoView({block:'start',behavior:'smooth'});
  }
  byId('copyInviteButton').addEventListener('click',async()=>{
    const copy=byId('inviteText');
    try { await navigator.clipboard.writeText(copy.value);set('candidateStatus','모집 문구를 복사했습니다. 실제 연락은 본인이 선택한 채널에서 직접 진행해 주세요.'); }
    catch { copy.focus();copy.select();set('candidateStatus','자동 복사가 차단되었습니다. 선택된 문구를 직접 복사해 주세요.'); }
  });
  candidateForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!candidateForm.reportValidity())return;
    if(candidates.length>=20){set('candidateStatus','이 브라우저에는 후보를 20명까지 보관합니다. 먼저 기존 기록을 정리해 주세요.');return;}
    const candidate={
      id:String(Date.now())+'-'+Math.random().toString(36).slice(2),
      alias:candidateForm.elements.candidateAlias.value.trim(),
      challenge:candidateForm.elements.candidateChallenge.value.trim(),
      example:candidateForm.elements.candidateExample.value.trim(),
      source:candidateForm.elements.candidateSource.value,
      consentConfirmed:candidateForm.elements.candidateConsent.checked,
      createdAt:new Date().toISOString(),recordId:null
    };
    if(!candidate.alias || !candidate.challenge || !candidate.example || !candidate.consentConfirmed){
      set('candidateStatus','참여자의 가명, 고민, 경험과 기록 동의를 확인해 주세요.');return;
    }
    candidates.unshift(candidate);
    const saved=persistCandidates();renderCandidates();
    if(saved){candidateForm.reset();set('candidateStatus','실제 상담 후보를 저장했습니다. 아래 ‘이 후보로 상담 시작’을 눌러 대화를 이어가세요.');}
  });
  byId('demoButton').addEventListener('click',()=>showDemo());
  byId('viewFictionalRecordButton').addEventListener('click',()=>byId('resultTitle').scrollIntoView({block:'start',behavior:'smooth'}));
  byId('storyStep').addEventListener('click',()=>setPhase('story'));
  byId('directionStep').addEventListener('click',openDirection);
  byId('followupStep').addEventListener('click',openFollowup);
  byId('followupCta').addEventListener('click',openFollowup);
  byId('toOfferButton').addEventListener('click',()=>{
    const record=currentRecord();
    if(!record?.versions.at(-1).data.directionA){offerStatus('먼저 강점·방향을 정리해 저장해 주세요.');openDirection();return;}
    byId('offerTitle').scrollIntoView({block:'start',behavior:'smooth'});
  });
  byId('nextButton').addEventListener('click',()=>phase==='story'?openDirection():openFollowup());
  byId('draftOfferButton').addEventListener('click',()=>{
    const record=currentRecord();
    if(!record?.versions.at(-1).data.directionA){offerStatus('먼저 강점·방향 카드를 저장해 주세요.');return;}
    const latest=record.versions.at(-1).data;
    if(!offerForm.elements.offerAudience.value)offerForm.elements.offerAudience.value=latest.audience || '';
    if(!offerForm.elements.offerProblem.value)offerForm.elements.offerProblem.value=latest.targetSituation || '';
    if(!offerForm.elements.offerSmall.value)offerForm.elements.offerSmall.value=latest.firstActivity || '';
    if(!offerForm.elements.offerCta.value)offerForm.elements.offerCta.value=latest.validationQuestion || '';
    for(const name of offerFields.filter(name=>name!=='offerMessage' && name!=='offerChangeReason')){
      if(!offerForm.elements[name].value.trim()){
        offerStatus('먼저 도울 사람, 불편, 도울 변화, 작은 활동, 채널, 요청할 행동을 채워주세요.');
        offerForm.elements[name].focus();return;
      }
    }
    offerForm.elements.offerMessage.value=buildOfferMessage(offerData());
    offerStatus('기록한 내용으로 첫 문구 초안을 만들었습니다. 표현을 직접 확인한 뒤 저장해 주세요.');
  });
  offerForm.addEventListener('submit',event=>{
    event.preventDefault();
    const record=currentRecord();
    if(!record?.versions.at(-1).data.directionA){offerStatus('먼저 강점·방향 카드를 저장해 주세요.');return;}
    if(!offerForm.reportValidity())return;
    const campaign=campaignFor(record);
    if(campaign.offers.length && !offerForm.elements.offerChangeReason.value.trim()){
      offerStatus('2차 제안부터는 무엇을 왜 바꿨는지 적어주세요. 실제 반응이 없었다면 그 사실도 구분해 주세요.');
      offerForm.elements.offerChangeReason.focus();return;
    }
    campaign.offers.push({savedAt:new Date().toISOString(),data:offerData()});
    records=[record,...records.filter(r=>r.id!==record.id)];
    const saved=persist();renderCampaign(record);clearAttempt();renderList();renderCandidates();
    offerStatus(saved?campaign.offers.length+'차 제안 문구를 저장했습니다. 실제 게시·제안은 직접 실행한 뒤 기록해 주세요.':'이 브라우저에서는 저장이 차단되었습니다. 전체 시범 기록을 텍스트로 저장해 주세요.');
    byId('offerOutputTitle').scrollIntoView({block:'start',behavior:'smooth'});
  });
  attemptForm.addEventListener('submit',event=>{
    event.preventDefault();
    const record=currentRecord();
    if(!record?.campaign?.offers.length){offerStatus('먼저 제안 문구를 저장해 주세요.');return;}
    if(!attemptForm.reportValidity())return;
    const data=attemptData();
    const now=new Date();
    const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    if(data.attemptDate>today){offerStatus('실제로 게시·제안한 날짜를 적어주세요. 미래 날짜는 실행으로 기록할 수 없습니다.');attemptForm.elements.attemptDate.focus();return;}
    const campaign=campaignFor(record);
    if(activeAttemptIndex>=0 && campaign.attempts[activeAttemptIndex]){
      const old=campaign.attempts[activeAttemptIndex];
      old.history=[...(old.history || []),{savedAt:old.savedAt,data:{...old.data}}];
      old.savedAt=new Date().toISOString();old.data=data;
      offerStatus('실행 기록의 반응과 수정 내용을 갱신했습니다.');
    } else {
      campaign.attempts.push({id:String(Date.now())+'-'+Math.random().toString(36).slice(2),offerIndex:activeOfferIndex,savedAt:new Date().toISOString(),history:[],data});
      offerStatus('실제 게시·제안 기록을 저장했습니다. 받은 반응은 나중에 같은 기록에서 수정할 수 있습니다.');
    }
    const saved=persist();renderCampaign(record);renderList();renderCandidates();
    if(!saved)offerStatus('이 브라우저에서는 저장이 차단되었습니다. 전체 시범 기록을 텍스트로 저장해 주세요.');
    byId('attemptList').scrollIntoView({block:'start',behavior:'smooth'});
  });
  byId('newAttemptButton').addEventListener('click',()=>{clearAttempt();offerStatus('같은 고객의 새 게시·제안 기록을 적을 수 있습니다.');});
  byId('copyOfferButton').addEventListener('click',async()=>{
    const record=currentRecord(),entry=record?.campaign?.offers[activeOfferIndex];if(!entry)return;
    try{await navigator.clipboard.writeText(entry.data.offerMessage);offerStatus('현재 보고 있는 제안 문구를 복사했습니다. 실제 게시 여부는 별도로 기록해야 합니다.');}
    catch{offerStatus('복사가 차단되었습니다. 전체 시범 기록 저장을 이용해 주세요.');}
  });
  byId('downloadPilotButton').addEventListener('click',()=>{
    const record=currentRecord();if(!record)return;
    downloadText(campaignToText(record),'proofline-pilot-'+new Date().toISOString().slice(0,10)+'.txt');
    offerStatus('이 고객의 방향 카드, 제안 문구, 실행·반응을 텍스트 파일로 저장했습니다.');
  });
  byId('newButton').addEventListener('click',()=>{
    activeId=null;pendingCandidateId=null;fill({});setPhase('story');
    byId('output').hidden=true;byId('empty').hidden=false;
    renderCampaign(null);
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
  function downloadText(content,name,mime='text/plain;charset=utf-8') {
    const blob=new Blob(mime.startsWith('application/json')?[content]:['\uFEFF',content],{type:mime});
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
  byId('backupButton').addEventListener('click',()=>{
    const backup=makeBackup(records,candidates);
    downloadText(JSON.stringify(backup,null,2),'proofline-backup-'+new Date().toISOString().slice(0,10)+'.json','application/json;charset=utf-8');
    set('backupStatus',`상담 기록 ${backup.records.length}개와 후보 ${backup.candidates.length}개를 백업 파일로 저장했습니다.`);
  });
  byId('restoreButton').addEventListener('click',async()=>{
    const file=byId('restoreFile').files?.[0];
    if(!file){set('backupStatus','먼저 PROOFLINE 백업 파일을 선택해 주세요.');return;}
    if(file.size>2*1024*1024){set('backupStatus','백업 파일이 2MB를 넘습니다. 파일을 확인해 주세요.');return;}
    try{
      const merged=mergeBackup(JSON.parse(await file.text()),records,candidates);
      const oldRecords=localStorage.getItem(storageKey),oldCandidates=localStorage.getItem(candidateStorageKey);
      try{
        localStorage.setItem(storageKey,JSON.stringify(merged.records));
        localStorage.setItem(candidateStorageKey,JSON.stringify(merged.candidates));
      }catch(error){
        try{if(oldRecords===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,oldRecords);
          if(oldCandidates===null)localStorage.removeItem(candidateStorageKey);else localStorage.setItem(candidateStorageKey,oldCandidates);}catch{}
        throw Error('이 브라우저에 저장하지 못했습니다. 저장 공간을 확인해 주세요.');
      }
      records=merged.records;candidates=merged.candidates;
      renderList();renderCandidates();renderPilotStats();
      set('backupStatus',`상담 기록 ${merged.addedRecords}개, 후보 ${merged.addedCandidates}개를 추가했습니다. 같은 기록은 건너뛰었습니다.`);
      byId('restoreFile').value='';
    }catch(error){set('backupStatus',error instanceof Error?error.message:'백업 파일을 읽지 못했습니다.');}
  });
  byId('deleteButton').addEventListener('click',()=>{
    const record=records.find(r=>r.id===activeId);if(!record)return;
    if(!window.confirm('이 기록의 모든 카드 버전을 이 브라우저에서 삭제할까요?'))return;
    if(record.fictional)try{localStorage.setItem(demoDismissedKey,'1');}catch{}
    records=records.filter(r=>r.id!==activeId);activeId=null;persist();renderList();renderCampaign(null);renderCandidates();fill({});setPhase('story');
    byId('output').hidden=true;byId('empty').hidden=false;
    set('status','선택한 기록을 삭제했습니다.');
  });
  setPhase('story');renderList();renderCampaign(null);renderCandidates();
  const latestPersonal=records.find(r=>!r.fictional);
  if(latestPersonal)openRecord(latestPersonal.id,false);
}
