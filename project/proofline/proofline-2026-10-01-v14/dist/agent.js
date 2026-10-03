(() => {
  const $ = id => document.getElementById(id);
  let current = null;
  let signature = '';
  let busy = false;
  let configured = false;
  let statusLoaded = false;
  const limits = {challenge:500,experience:500,reaction:350,strength:160,audience:180,situation:220,preference:180,currentOffer:300};
  const labels = {challenge:'지금 막히는 점',experience:'직접 해본 일',reaction:'실제로 들은 반응',strength:'강점 후보',audience:'먼저 도울 사람',situation:'그 사람이 처한 상황',preference:'중요한 조건',currentOffer:'현재 생각한 작은 도움'};
  const value = (text,key) => String(text || '').slice(0,limits[key]);
  function inputFor(record) {
    const data=record.versions.at(-1).data;
    const offer=record.campaign?.offers?.at(-1)?.data;
    return {
      challenge:value(data.story,'challenge'),experience:value(data.evidence,'experience'),
      reaction:value(data.pastReaction,'reaction'),strength:value(data.strength1,'strength'),
      audience:value(offer?.offerAudience || data.audience,'audience'),
      situation:value(offer?.offerProblem || data.targetSituation,'situation'),
      preference:value(data.preference,'preference'),
      currentOffer:value(offer?.offerSmall || data.firstActivity,'currentOffer')
    };
  }
  function safeUrl(url) {
    try { const parsed=new URL(url); return ['http:','https:'].includes(parsed.protocol)?parsed.href:null; } catch { return null; }
  }
  function addText(parent,tag,text,className) {
    const element=document.createElement(tag);if(className)element.className=className;
    element.textContent=text || '미확인';parent.append(element);return element;
  }
  function render(result) {
    $('agentResult').hidden=false;
    $('agentGeneratedAt').textContent=new Date(result.generated_at).toLocaleString('ko-KR')+' 생성';
    $('agentInsight').textContent=result.insight;
    $('agentReframe').textContent=result.reframe;
    $('agentQuestion').textContent=result.clarifying_question;
    $('agentBoundary').textContent=result.note;
    const cards=$('agentOpportunities');cards.replaceChildren();
    result.opportunities.forEach((item,index)=>{
      const article=document.createElement('article');article.className='agent-card';
      addText(article,'span',String(index+1).padStart(2,'0')+' / 기회 가설','section-kicker');
      addText(article,'h4',item.title);
      for(const [label,key] of [['누가 어떤 순간에 필요한가','unmet_need'],['왜 이 경험과 연결되나','why_this_person'],['새로운 접근','new_angle'],['외부 자료에서 본 신호','external_signal'],['반론과 실패 조건','counterargument'],['7일 안에 해볼 실험','first_experiment'],['관찰할 성공 신호','success_signal']]) {
        const row=document.createElement('div');row.className='agent-row';addText(row,'strong',label);addText(row,'p',item[key]);article.append(row);
      }
      const links=document.createElement('div');links.className='agent-card-links';
      for(const url of item.source_urls || []){const href=safeUrl(url);if(!href)continue;const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='관련 자료 ↗';links.append(a);}
      if(!links.childNodes.length)addText(links,'small','이 가설에 직접 연결된 출처는 확인되지 않았습니다.');
      article.append(links);cards.append(article);
    });
    const sources=$('agentSources');sources.replaceChildren();
    for(const source of result.sources || []){const href=safeUrl(source.url);if(!href)continue;const li=document.createElement('li');const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title || new URL(href).hostname;li.append(a);sources.append(li);}
  }
  function showRecord(record) {
    current=record;
    $('agentEmpty').hidden=Boolean(record);$('agentReady').hidden=!record;
    $('agentResult').hidden=true;$('agentConsent').checked=false;$('agentRunButton').disabled=true;
    $('agentStatus').textContent='';
    if(!record)return;
    const input=inputFor(record);signature=JSON.stringify(input);
    $('agentPreview').value=Object.entries(input).map(([key,item])=>`${labels[key]}: ${item || '미입력'}`).join('\n\n');
    if(record.fictional)$('agentStatus').textContent='가상 사례입니다. AI 분석 결과도 실제 고객 성과를 뜻하지 않습니다.';
    if(statusLoaded && !configured)$('agentStatus').textContent='AI 연결 대기 중입니다. 지금은 새 기회를 생성할 수 없습니다. 기존 기록은 계속 사용하실 수 있습니다.';
    try {const saved=JSON.parse(localStorage.getItem('proofline-agent-'+record.id) || 'null');if(saved?.signature===signature)render(saved.result);}catch{}
  }
  window.addEventListener('proofline:record',event=>showRecord(event.detail));
  $('agentConsent').addEventListener('change',()=>{$('agentRunButton').disabled=!configured || !$('agentConsent').checked || busy;});
  $('agentDemoButton').addEventListener('click',()=>{ $('demoButton').click();$('opportunityAgent').scrollIntoView({behavior:'smooth',block:'start'}); });
  $('agentRunButton').addEventListener('click',async()=>{
    if(!current || !$('agentConsent').checked || busy)return;
    const recordId=current.id, sentSignature=signature;
    busy=true;$('agentRunButton').disabled=true;$('agentStatus').textContent='외부 자료를 찾고 기회 가설을 만들고 있습니다. 잠시 기다려 주세요.';
    try {
      const response=await fetch('/api/opportunities',{method:'POST',headers:{'content-type':'application/json'},body:sentSignature});
      const data=await response.json();
      if(!response.ok)throw Error(data.error || 'AI 분석에 실패했습니다.');
      if(current?.id!==recordId || signature!==sentSignature)return;
      render(data);$('agentStatus').textContent='새로운 기회 가설 3개를 만들었습니다. 아래 근거와 반론을 함께 확인해 주세요.';
      try {localStorage.setItem('proofline-agent-'+recordId,JSON.stringify({signature:sentSignature,result:data}));}catch{}
    } catch(error){if(current?.id===recordId)$('agentStatus').textContent=error.message || 'AI 분석에 실패했습니다. 다시 시도해 주세요.';}
    finally {busy=false;$('agentRunButton').disabled=!configured || !$('agentConsent').checked;}
  });
  showRecord(window.prooflineGetActiveRecord?.() || null);
  fetch('/api/agent-status').then(response=>response.json()).then(data=>{
    statusLoaded=true;
    configured=Boolean(data.configured);
    $('agentRunButton').disabled=!configured || !$('agentConsent').checked;
    if(!configured && current)$('agentStatus').textContent='AI 연결 대기 중입니다. 지금은 새 기회를 생성할 수 없습니다. 기존 기록은 계속 사용하실 수 있습니다.';
  }).catch(()=>{if(current)$('agentStatus').textContent='AI 연결 상태를 확인하지 못했습니다. 잠시 후 다시 열어 주세요.';});
})();
