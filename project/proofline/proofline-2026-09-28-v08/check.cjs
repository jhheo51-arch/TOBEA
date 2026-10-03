const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {
  makeCard,cardToText,historyToText,buildOfferMessage,campaignToText,
  demoInitial,demoRevised,demoOffers,demoAttempt
}=require('./script.js');

assert.equal(makeCard(demoInitial).followup,false);
assert.equal(makeCard(demoRevised).followup,true);
assert.match(cardToText(makeCard(demoRevised),2),/상대의 반응/);
assert.match(buildOfferMessage(demoOffers[0].data),/예약 안내문 한 장/);
const sample={versions:[{savedAt:'2026-09-26T09:00:00+09:00',data:demoInitial},{savedAt:'2026-09-26T10:00:00+09:00',data:demoRevised}],campaign:{offers:demoOffers,attempts:[demoAttempt]}};
assert.match(historyToText(sample),/2차 카드/);
const exportText=campaignToText(sample);
assert.match(exportText,/1차 제안/);
assert.match(exportText,/2차 제안/);
assert.match(exportText,/가상의 온라인 커뮤니티/);
assert.match(exportText,/문의 수: 0/);
assert.match(exportText,/다음 수정:/);

const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'script.js'),'utf8');
const idMatches=[...html.matchAll(/id="([^"]+)"/g)];
const ids=new Set(idMatches.map(m=>m[1]));
assert.equal(ids.size,idMatches.length,'중복된 화면 ID');
for(const match of script.matchAll(/(?:byId|set)\('([^']+)'/g))assert.ok(ids.has(match[1]),'누락된 화면 ID: '+match[1]);
for(const name of ['offerAudience','offerProblem','offerPromise','offerSmall','offerChannel','offerCta','offerMessage',
  'attemptDate','attemptPlace','attemptUrl','ownerUnderstanding','replyCount','inquiryCount','attemptReaction','attemptLearning','attemptNext','workMinutes','ownerApproved']){
  assert.match(html,new RegExp('name="'+name+'"'),'누락된 입력 필드: '+name);
}
for(const id of ['offerForm','offerVersionBar','offerMessageView','attemptForm','attemptList','pilotNumbers','offerStatus'])assert.ok(ids.has(id));
assert.match(html,/id="ownerApproved"[^>]*required/);
assert.match(html,/href="fictional-pilot-v08.txt"/);
assert.ok(fs.existsSync(path.join(__dirname,'fictional-pilot-v08.txt')));
assert.match(script,/fictional-park-daeun-v8/);
assert.match(script,/records\.filter\(r=>!r\.fictional\)/);
assert.match(script,/data\.attemptDate>today/);
const oldCss=fs.readFileSync(path.join(__dirname,'../proofline-2026-09-26-v07/style.css'),'utf8');
const newCss=fs.readFileSync(path.join(__dirname,'style.css'),'utf8');
assert.ok(newCss.startsWith(oldCss.trimEnd()),'기존 디자인이 유지되어야 합니다');

// 브라우저 파일 접근 없이도 화면 이벤트의 전체 경로를 확인한다.
const nodes=new Map();
function element(id=''){
  return {id,value:'',checked:false,hidden:false,disabled:false,textContent:'',children:[],listeners:{},
    classList:{toggle(){}},setAttribute(){},removeAttribute(){},scrollIntoView(){},focus(){},
    addEventListener(type,handler){this.listeners[type]=handler;},
    append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},
    reportValidity(){return true;},click(){this.listeners.click?.({preventDefault(){}});}};
}
for(const id of ids)nodes.set(id,element(id));
for(const formId of ['intakeForm','offerForm','attemptForm'])nodes.get(formId).elements={};
for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*\bname="([^"]+)"[^>]*>/g)){
  const [_,id,name]=match;
  const formId=html.slice(0,match.index).lastIndexOf('<form id="attemptForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'attemptForm':
    html.slice(0,match.index).lastIndexOf('<form id="offerForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'offerForm':'intakeForm';
  nodes.get(formId).elements[name]=nodes.get(id);
}
const dataStore=new Map();
const context={module:{exports:{}},document:{getElementById:id=>nodes.get(id),createElement:tag=>element(tag)},
  localStorage:{getItem:key=>dataStore.get(key)||null,setItem:(key,value)=>dataStore.set(key,value),removeItem:key=>dataStore.delete(key)},
  window:{confirm:()=>true},navigator:{clipboard:{writeText:async()=>{}}},URL,Date,Blob,setTimeout,console};
vm.runInNewContext(script,context);
const fire=(id,type='click')=>nodes.get(id).listeners[type]({preventDefault(){}});
assert.equal(nodes.get('output').hidden,false,'가상 방향 카드가 바로 보여야 합니다');
assert.equal(nodes.get('offerOutput').hidden,false,'가상 제안이 바로 보여야 합니다');
assert.equal(nodes.get('offerVersionBar').children.length,2,'가상 제안 두 버전이 보여야 합니다');
assert.equal(nodes.get('attemptList').children.length,1,'가상 실행 반응이 보여야 합니다');
assert.equal(nodes.get('pilotNumbers').children[0].children[0].textContent,'0명','가상 사례는 실사용 통계에서 제외');
fire('newButton');
for(const [name,value] of Object.entries({name:'시범 이용자',story:'자기소개가 고민입니다',evidence:'친구를 도운 적이 있습니다'}))nodes.get(name).value=value;
fire('intakeForm','submit');
fire('directionStep');
for(const [name,value] of Object.entries({strength1:'설명하기',proof1:'친구에게 설명함',directionA:'안내 활동',reasonA:'경험이 있음',firstStep:'한 사람에게 안내문 보여주기'}))nodes.get(name).value=value;
fire('intakeForm','submit');
for(const [name,value] of Object.entries({offerAudience:'처음 시작하는 사람',offerProblem:'순서를 모름',offerPromise:'작은 단계로 설명함',offerSmall:'10분 안내',offerChannel:'직접 대화',offerCta:'막힌 점을 말해 주세요'}))nodes.get(name).value=value;
fire('draftOfferButton');
assert.match(nodes.get('offerMessage').value,/10분 안내/);
fire('offerForm','submit');
for(const [name,value] of Object.entries({attemptDate:'2020-01-01',attemptPlace:'가상의 지인 1명',ownerUnderstanding:'yes',replyCount:'0',inquiryCount:'0',workMinutes:'45'}))nodes.get(name).value=value;
nodes.get('ownerApproved').checked=true;
fire('attemptForm','submit');
const savedRecords=JSON.parse(dataStore.get('proofline-records-v8'));
const actual=savedRecords.find(record=>!record.fictional);
assert.ok(actual,'실제 이용자 기록이 있어야 합니다');
assert.equal(actual.campaign.offers.length,1);
assert.equal(actual.campaign.attempts.length,1);
assert.equal(actual.campaign.attempts[0].data.inquiryCount,'0');
assert.equal(nodes.get('pilotNumbers').children[0].children[0].textContent,'1명');
fire('newAttemptButton');
nodes.get('attemptDate').value='2999-01-01';
nodes.get('attemptPlace').value='미래의 게시 장소';
nodes.get('ownerApproved').checked=true;
fire('attemptForm','submit');
assert.equal(JSON.parse(dataStore.get('proofline-records-v8')).find(record=>!record.fictional).campaign.attempts.length,1,'미래 실행은 저장되지 않아야 합니다');
console.log('PROOFLINE v08 제안·실행·반응 흐름 검사 통과');
