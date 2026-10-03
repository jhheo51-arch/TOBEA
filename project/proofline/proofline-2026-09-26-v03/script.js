const key = 'proofline-records-v3';
const names = ['name','story','evidence','strength','preference','audience','context','source','direction','firstStep'];
const form = document.querySelector('#intakeForm');
const fictional = {
  name:'박다은 (가상 인물)',
  story:'동네 도서관에서 안내 일을 하며, 사람을 돕는 일을 계속할지 다른 일을 찾을지 고민한다.',
  evidence:'스마트폰 예약이 어려운 방문객을 위해 순서를 적은 안내문을 만들고, 가상의 방문객 3명이 그 안내문을 따라 예약을 끝냈다.',
  strength:'복잡한 과정을 쉬운 단계로 설명하는 능력',
  preference:'사람을 직접 돕는 일과 규칙적인 일정',
  audience:'디지털 예약이 어려운 사람',
  context:'',source:'',
  direction:'디지털 이용 안내 활동을 작은 규모로 시험해 본다.',
  firstStep:'예약 안내문 1장을 만든 뒤 가상의 이용자 2명에게 이해되는지 묻는다.'
};
const $ = id => document.getElementById(id);
const value = id => form.elements[id].value.trim();
const set = (id,text) => { $(id).textContent = text; };
function cardFrom(data) {
  return {
    ...data,
    contextText:data.context && data.source ? data.context : '조사 전 — 관련 자료를 확인한 뒤 적습니다.',
    sourceText:data.context && data.source ? `입력한 출처: ${data.source} · 사실 확인 필요` : '확인된 출처 없음',
    intro:data.audience
      ? `“저는 ${data.audience}에게 도움이 되는 일을 시험하고 있습니다. 강점으로 살펴보는 것은 ‘${data.strength}’이며, 첫 방향은 ‘${data.direction}’입니다.”`
      : `“제 경험에서 살펴보는 강점은 ‘${data.strength}’입니다. 이를 바탕으로 ‘${data.direction}’을 시험하고 있습니다.”`,
    content:`“${data.evidence}”라는 경험을 짧게 소개하고, 어떤 도움을 줄 수 있을지 상대의 반응을 듣습니다.`
  };
}
function readRecords() {
  try {
    const data=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(data) ? data.filter(item=>item&&item.data&&item.id).slice(0,20) : [];
  } catch { return []; }
}
function saveRecords(records) {
  try { localStorage.setItem(key,JSON.stringify(records.slice(0,20))); return true; }
  catch { set('status','이 브라우저에서 저장할 수 없습니다. 화면의 결과는 볼 수 있습니다.'); return false; }
}
function render(item) {
  const card=cardFrom(item.data);
  set('cardTag',item.fictional?'가상 사례 · 시연용':'작성한 기록');
  set('cardDate',new Date(item.savedAt).toLocaleString('ko-KR'));
  set('cardName',card.name);
  for(const id of ['story','evidence','strength','preference','direction','firstStep']) set('card'+id[0].toUpperCase()+id.slice(1),card[id]||'아직 적지 않음');
  set('cardContext',card.contextText);set('cardSource',card.sourceText);
  set('cardIntro',card.intro);set('cardContent',card.content);
  $('empty').hidden=true;$('card').hidden=false;
}
function renderList() {
  const list=$('recordList');list.replaceChildren();
  const records=readRecords();
  if(!records.length){const p=document.createElement('p');p.className='record-empty';p.textContent='저장된 기록이 없습니다. 가상 사례를 불러와 보세요.';list.append(p);return;}
  for(const item of records){
    const button=document.createElement('button');button.type='button';button.className='record-item';
    const title=document.createElement('strong');title.textContent=item.data.name;
    const detail=document.createElement('span');detail.textContent=`${item.fictional?'가상 사례':'작성한 기록'} · ${new Date(item.savedAt).toLocaleString('ko-KR')}`;
    button.append(title,detail);
    button.addEventListener('click',()=>{render(item);$('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});});
    list.append(button);
  }
}
function addRecord(data,fictional=false) {
  const item={id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,savedAt:new Date().toISOString(),fictional,data};
  const prior=readRecords().filter(record=>!(fictional&&record.fictional&&record.data.name===data.name));
  const saved=saveRecords([item,...prior]);
  render(item);renderList();
  if(saved)set('status',fictional?'가상 사례를 저장했습니다. 아래 기록을 눌러 다시 열 수 있습니다.':'한 장 카드와 입력을 저장했습니다.');
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  addRecord(Object.fromEntries(names.map(name=>[name,value(name)])));
  $('resultTitle').scrollIntoView({block:'start',behavior:'smooth'});
});
$('demoButton').addEventListener('click',()=>{
  for(const name of names)form.elements[name].value=fictional[name];
  addRecord({...fictional},true);
  $('inputTitle').scrollIntoView({block:'start',behavior:'smooth'});
});
renderList();
if(new URLSearchParams(location.search).has('selftest')){
  const check=cardFrom(fictional);
  console.assert(check.contextText.startsWith('조사 전')&&check.intro.includes('디지털 예약이 어려운 사람'),'PROOFLINE 기본 검사 실패');
}
