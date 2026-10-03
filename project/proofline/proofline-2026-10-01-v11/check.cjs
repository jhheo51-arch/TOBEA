const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {
  makeCard,cardToText,historyToText,buildOfferMessage,campaignToText,
  demoInitial,demoRevised,demoOffers,demoAttempt
}=require('./dist/script.js');

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

const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'dist/script.js'),'utf8');
const idMatches=[...html.matchAll(/id="([^"]+)"/g)];
const ids=new Set(idMatches.map(m=>m[1]));
assert.equal(ids.size,idMatches.length,'중복된 화면 ID');
for(const match of script.matchAll(/(?:byId|set)\('([^']+)'/g))assert.ok(ids.has(match[1]),'누락된 화면 ID: '+match[1]);
for(const name of ['offerAudience','offerProblem','offerPromise','offerSmall','offerDuration','offerDeliverable','offerExclusions','offerChannel','offerCta','offerMessage','offerChangeReason',
  'attemptDate','attemptPlace','attemptUrl','ownerUnderstanding','replyCount','interestCount','questionCount','participationCount','inquiryCount','attemptReaction','rejectionReason','attemptLearning','attemptNext','workMinutes','ownerApproved',
  'candidateAlias','candidateChallenge','candidateExample','candidateSource','candidateConsent',
  'selfName','selfChallenge','selfExperience','selfPastReaction','selfStrength','selfAudience','selfSituation','selfActivity','pastReaction','targetSituation']){
  assert.match(html,new RegExp('name="'+name+'"'),'누락된 입력 필드: '+name);
}
for(const id of ['offerForm','offerVersionBar','offerMessageView','attemptForm','attemptList','pilotNumbers','offerStatus','candidateForm','candidateList','candidateStatus','copyInviteButton','fictionalJourney','fictionalJourneyTitle','viewFictionalRecordButton','selfForm','selfStatus'])assert.ok(ids.has(id));
assert.match(html,/id="ownerApproved"[^>]*required/);
assert.match(html,/id="candidateConsent"[^>]*required/);
assert.match(html,/href="fictional-pilot-v09.txt"/);
assert.ok(fs.existsSync(path.join(__dirname,'dist/fictional-pilot-v09.txt')));
assert.match(script,/fictional-park-daeun-v9/);
assert.match(script,/records\.filter\(r=>!r\.fictional && !r\.selfGuided\)/);
assert.match(script,/data\.attemptDate>today/);
const oldCss=fs.readFileSync(path.join(__dirname,'../proofline-2026-09-30-v10/dist/style.css'),'utf8');
const newCss=fs.readFileSync(path.join(__dirname,'dist/style.css'),'utf8');
assert.ok(newCss.replace(/\r\n/g,'\n').startsWith(oldCss.replace(/\r\n/g,'\n').trimEnd()),'기존 디자인이 유지되어야 합니다');

// 브라우저 파일 접근 없이도 화면 이벤트의 전체 경로를 확인한다.
const nodes=new Map();
function element(id=''){
  return {id,value:'',checked:false,hidden:false,disabled:false,textContent:'',children:[],listeners:{},
    classList:{toggle(){}},setAttribute(){},removeAttribute(){},scrollIntoView(){},focus(){},select(){},reset(){},
    addEventListener(type,handler){this.listeners[type]=handler;},
    append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},
    reportValidity(){return true;},click(){this.listeners.click?.({preventDefault(){}});}};
}
for(const id of ids)nodes.set(id,element(id));
for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*\bhidden(?:\s|>)/g))nodes.get(match[1]).hidden=true;
for(const formId of ['intakeForm','offerForm','attemptForm','candidateForm','selfForm'])nodes.get(formId).elements={};
for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*\bname="([^"]+)"[^>]*>/g)){
  const [_,id,name]=match;
  const formId=html.slice(0,match.index).lastIndexOf('<form id="selfForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'selfForm':
    html.slice(0,match.index).lastIndexOf('<form id="attemptForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'attemptForm':
    html.slice(0,match.index).lastIndexOf('<form id="offerForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'offerForm':
    html.slice(0,match.index).lastIndexOf('<form id="candidateForm"')>html.slice(0,match.index).lastIndexOf('</form>')?'candidateForm':'intakeForm';
  nodes.get(formId).elements[name]=nodes.get(id);
}
const dataStore=new Map();
const context={module:{exports:{}},document:{getElementById:id=>nodes.get(id),createElement:tag=>element(tag)},
  localStorage:{getItem:key=>dataStore.get(key)||null,setItem:(key,value)=>dataStore.set(key,value),removeItem:key=>dataStore.delete(key)},
  window:{confirm:()=>true},navigator:{clipboard:{writeText:async()=>{}}},URL,Date,Blob,setTimeout,console};
vm.runInNewContext(script,context);
const fire=(id,type='click')=>nodes.get(id).listeners[type]({preventDefault(){}});
assert.equal(nodes.get('output').hidden,true,'개인 체험 전에는 가상 카드를 자동 표시하지 않아야 합니다');
for(const [name,value] of Object.entries({selfName:'직접 체험',selfChallenge:'경험을 어떻게 소개할지 고민',selfExperience:'친구의 이야기를 듣고 선택지를 정리함',selfPastReaction:'선택지가 보인다고 말함',selfStrength:'이야기를 듣고 정리하기',selfAudience:'진로가 막막한 사람',selfSituation:'금융업계 직무를 모름',selfActivity:'20분 대화'}))nodes.get(name).value=value;
fire('selfForm','submit');
const personal=JSON.parse(dataStore.get('proofline-records-v9')).find(record=>record.selfGuided);
assert.ok(personal,'개인 체험 카드가 저장되어야 합니다');
assert.equal(personal.versions[0].data.strength1,'이야기를 듣고 정리하기');
assert.equal(personal.versions[0].data.pastReaction,'선택지가 보인다고 말함');
assert.equal(personal.versions[0].data.targetSituation,'금융업계 직무를 모름');
assert.match(cardToText(makeCard(personal.versions[0].data),1),/본인이 적은 초안/);
assert.match(nodes.get('cardNote').textContent,/본인이 입력한/);
assert.equal(nodes.get('pilotNumbers').children[0].children[0].textContent,'0명','개인 체험은 실제 시범 고객에서 제외');
fire('demoButton');
assert.equal(nodes.get('output').hidden,false,'가상 버튼을 누른 뒤 방향 카드가 보여야 합니다');
assert.equal(nodes.get('fictionalJourney').hidden,false,'가상 첫 고객 전체 흐름이 보여야 합니다');
fire('viewFictionalRecordButton');
assert.equal(nodes.get('offerOutput').hidden,false,'가상 제안이 바로 보여야 합니다');
assert.equal(nodes.get('offerVersionBar').children.length,2,'가상 제안 두 버전이 보여야 합니다');
assert.match(nodes.get('offerDurationView').textContent,/미기록/,'이전 기록의 새 필드는 미기록으로 표시');
assert.equal(nodes.get('attemptList').children.length,1,'가상 실행 반응이 보여야 합니다');
assert.equal(nodes.get('pilotNumbers').children[0].children[0].textContent,'0명','가상 사례는 실사용 통계에서 제외');
assert.match(nodes.get('candidateList').children[0].textContent,/아직 실제 상담 후보가 없습니다/);
for(const [name,value] of Object.entries({candidateAlias:'시범 이용자',candidateChallenge:'자기소개가 고민입니다',candidateExample:'친구를 도운 적이 있습니다',candidateSource:'지인 직접 대화'}))nodes.get(name).value=value;
fire('candidateForm','submit');
assert.equal(dataStore.has('proofline-candidates-v9'),false,'동의 없는 후보는 저장되지 않아야 합니다');
nodes.get('candidateConsent').checked=true;
fire('candidateForm','submit');
const candidate=JSON.parse(dataStore.get('proofline-candidates-v9'))[0];
assert.equal(candidate.alias,'시범 이용자');
nodes.get('candidateList').children[0].children[3].children[0].click();
assert.equal(nodes.get('story').value,'자기소개가 고민입니다');
fire('intakeForm','submit');
assert.ok(JSON.parse(dataStore.get('proofline-candidates-v9'))[0].recordId,'후보와 상담 기록이 연결되어야 합니다');
fire('directionStep');
for(const [name,value] of Object.entries({strength1:'설명하기',proof1:'친구에게 설명함',directionA:'안내 활동',reasonA:'경험이 있음',firstStep:'한 사람에게 안내문 보여주기'}))nodes.get(name).value=value;
fire('intakeForm','submit');
for(const [name,value] of Object.entries({offerAudience:'처음 시작하는 사람',offerProblem:'순서를 모름',offerPromise:'작은 단계로 설명함',offerSmall:'10분 안내',offerDuration:'10분',offerDeliverable:'한 장 안내문',offerExclusions:'결과 보장',offerChannel:'직접 대화',offerCta:'막힌 점을 말해 주세요'}))nodes.get(name).value=value;
fire('draftOfferButton');
assert.match(nodes.get('offerMessage').value,/10분 안내/);
fire('offerForm','submit');
for(const [name,value] of Object.entries({attemptDate:'2020-01-01',attemptPlace:'가상의 지인 1명',ownerUnderstanding:'yes',replyCount:'2',interestCount:'1',questionCount:'1',participationCount:'0',inquiryCount:'0',rejectionReason:'시간이 맞지 않는다고 말함',workMinutes:'45'}))nodes.get(name).value=value;
nodes.get('ownerApproved').checked=true;
fire('attemptForm','submit');
const savedRecords=JSON.parse(dataStore.get('proofline-records-v9'));
const actual=savedRecords.find(record=>!record.fictional&&!record.selfGuided);
assert.ok(actual,'실제 이용자 기록이 있어야 합니다');
assert.equal(actual.campaign.offers.length,1);
assert.equal(actual.campaign.offers[0].data.offerDeliverable,'한 장 안내문');
assert.equal(actual.campaign.attempts.length,1);
assert.equal(actual.campaign.attempts[0].data.inquiryCount,'0');
assert.equal(actual.campaign.attempts[0].data.rejectionReason,'시간이 맞지 않는다고 말함');
assert.match(nodes.get('offerComparison').children[0].textContent,/관심 1건/);
assert.equal(nodes.get('pilotNumbers').children[0].children[0].textContent,'1명');
assert.match(nodes.get('candidateList').children[0].children[1].textContent,/실제 실행 기록됨/);
fire('offerForm','submit');
assert.equal(JSON.parse(dataStore.get('proofline-records-v9')).find(record=>!record.fictional&&!record.selfGuided).campaign.offers.length,1,'수정 이유 없는 2차 제안은 저장되지 않아야 합니다');
nodes.get('offerChangeReason').value='처음 반응에서 순서가 어렵다는 말을 들음';
fire('offerForm','submit');
assert.equal(JSON.parse(dataStore.get('proofline-records-v9')).find(record=>!record.fictional&&!record.selfGuided).campaign.offers.length,2);
assert.equal(nodes.get('offerComparison').children.length,2);
fire('newAttemptButton');
nodes.get('attemptDate').value='2999-01-01';
nodes.get('attemptPlace').value='미래의 게시 장소';
nodes.get('ownerApproved').checked=true;
fire('attemptForm','submit');
assert.equal(JSON.parse(dataStore.get('proofline-records-v9')).find(record=>!record.fictional&&!record.selfGuided).campaign.attempts.length,1,'미래 실행은 저장되지 않아야 합니다');
console.log('PROOFLINE v11 개인 체험·상담 후보·제안·실행 흐름 검사 통과');
