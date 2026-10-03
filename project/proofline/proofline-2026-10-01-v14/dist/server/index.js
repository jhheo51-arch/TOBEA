const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

const fieldLimits = { challenge: 500, experience: 500, reaction: 350, strength: 160, audience: 180, situation: 220, preference: 180, currentOffer: 300 };
const opportunitySchema = {
  type: 'object', additionalProperties: false, required: ['insight', 'reframe', 'opportunities', 'clarifying_question'],
  properties: {
    insight: { type: 'string' },
    reframe: { type: 'string' },
    clarifying_question: { type: 'string' },
    opportunities: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['title','unmet_need','why_this_person','new_angle','external_signal','source_urls','counterargument','first_experiment','success_signal'],
      properties: Object.fromEntries(['title','unmet_need','why_this_person','new_angle','external_signal','counterargument','first_experiment','success_signal'].map(key => [key, {type:'string'}]).concat([['source_urls',{type:'array',items:{type:'string'}}]]))
    }}
  }
};

function cleanInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result = {};
  for (const [key, limit] of Object.entries(fieldLimits)) {
    if (typeof raw[key] !== 'string' || raw[key].length > limit) return null;
    result[key] = raw[key].trim();
  }
  return result.challenge && result.experience ? result : null;
}

function sourcesFrom(response) {
  const urls = new Map();
  for (const item of response.output || []) {
    for (const source of item.action?.sources || []) {
      if (source.url) urls.set(source.url, {url:source.url, title:source.title || new URL(source.url).hostname});
    }
    for (const content of item.content || []) for (const annotation of content.annotations || []) {
      if (annotation.type === 'url_citation' && annotation.url) urls.set(annotation.url, {url:annotation.url, title:annotation.title || new URL(annotation.url).hostname});
    }
  }
  return [...urls.values()].filter(source => { try { return ['http:','https:'].includes(new URL(source.url).protocol); } catch { return false; } }).slice(0, 12);
}

function outputText(response) {
  return (response.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
}

async function generate(input, apiKey, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const body = {
      model: 'gpt-5.5', store: false, reasoning: {effort:'medium'},
      tools: [{type:'web_search', search_context_size:'medium'}], tool_choice: 'required',
      include: ['web_search_call.action.sources'], max_output_tokens: 3500,
      text: {format:{type:'json_schema',name:'proofline_opportunities',strict:true,schema:opportunitySchema}},
      instructions: `당신은 PROOFLINE의 기회발견 에이전트다. 한국어 존댓말로 답한다. 입력은 검증되지 않은 본인 진술이다. 반드시 웹 검색으로 현재의 관련 문제·대체 서비스·산업 변화를 확인한다. 검색이 없거나 신뢰할 만한 자료가 없으면 수요가 검증된 것처럼 말하지 않는다. 단순 요약·표현 바꾸기를 피하고, 사용자의 경험을 서로 다른 고객 상황과 결과물에 재조합한 기회 가설을 정확히 3개 제시한다. 각 가설에는 기존 대안과 다른 접근, 반론 또는 실패 조건, 7일 안에 비용 거의 없이 해볼 실험과 관찰 가능한 성공 신호를 적는다. 시장 크기나 수익을 지어내지 않는다. 외부 신호의 source_urls에는 실제 검색한 URL만 넣는다. insight에는 세 가설을 관통하는 예상 밖의 통찰을 한 문장으로, reframe에는 기존 자기소개 대신 해결할 고객의 문제를 써라. clarifying_question은 다음 상담에서 물을 질문 하나다.`,
      input: [{role:'user',content:'아래 입력을 바탕으로 기회를 발견해 주세요. 모든 진술은 작성자 입력이며 사실 검증 전입니다.\n'+JSON.stringify(input)}]
    };
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method:'POST', headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
      body:JSON.stringify(body), signal:controller.signal
    });
    if (!response.ok) {
      let code='';
      try { code=(await response.json()).error?.code || ''; } catch {}
      if (['credit_balance_exhausted','insufficient_quota'].includes(code)) return {error:'OpenAI API 사용 잔액이 소진되어 AI 분석을 실행할 수 없습니다. 계정의 결제·크레딧 상태를 확인해 주세요.',status:503};
      if (response.status===429) return {error:'AI 요청이 많아 잠시 제한되었습니다. 조금 뒤 다시 시도해 주세요.',status:503};
      if (response.status===401) return {error:'AI 인증값을 확인해야 합니다. 사이트 관리자에게 알려 주세요.',status:503};
      return {error:'AI 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.', status:502};
    }
    const result = await response.json();
    if (result.status !== 'completed') return {error:'AI 분석이 끝나지 않았습니다. 다시 시도해 주세요.', status:502};
    const searched = (result.output || []).some(item => item.type === 'web_search_call');
    const sources = sourcesFrom(result);
    if (!searched || !sources.length) return {error:'외부 자료를 확인하지 못해 기회 가설을 표시하지 않았습니다. 다시 시도해 주세요.', status:502};
    let analysis;
    try { analysis = JSON.parse(outputText(result)); } catch { return {error:'AI 결과를 읽을 수 없습니다. 다시 시도해 주세요.', status:502}; }
    if (!Array.isArray(analysis.opportunities) || analysis.opportunities.length !== 3) return {error:'세 가지 기회 가설을 만들지 못했습니다. 다시 시도해 주세요.', status:502};
    const allowed = new Set(sources.map(source => source.url));
    analysis.opportunities = analysis.opportunities.map(item => ({...item, source_urls:(item.source_urls || []).filter(url => allowed.has(url))}));
    return {data:{...analysis, sources, generated_at:new Date().toISOString(), note:'입력한 경험은 본인 진술, 외부 자료는 일반적 신호입니다. 제안한 기회와 수요는 검증 전 가설입니다.'},status:200};
  } catch { return {error:'연결 시간이 초과되었거나 AI 서비스에 접속할 수 없습니다. 다시 시도해 주세요.',status:502}; }
  finally { clearTimeout(timer); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/agent-status' && request.method === 'GET') return json({configured:Boolean(env.OPENAI_API_KEY)});
    if (url.pathname !== '/api/opportunities') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json({error:'POST 요청만 받습니다.'},405);
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({error:'허용되지 않은 요청입니다.'},403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON 형식으로 보내 주세요.'},415);
    if (Number(request.headers.get('content-length') || 0) > 12000) return json({error:'입력 내용이 너무 깁니다.'},413);
    let raw;
    try { const body = await request.text(); if (body.length > 12000) return json({error:'입력 내용이 너무 깁니다.'},413); raw = JSON.parse(body); }
    catch { return json({error:'입력 내용을 읽을 수 없습니다.'},400); }
    const input = cleanInput(raw);
    if (!input) return json({error:'막히는 점과 직접 해본 일을 입력해 주세요.'},400);
    if (!env.OPENAI_API_KEY) return json({error:'AI 연결이 아직 설정되지 않았습니다. 관리자에게 알려 주세요.'},503);
    const result = await generate(input, env.OPENAI_API_KEY);
    return result.error ? json({error:result.error},result.status) : json(result.data);
  }
};

export {cleanInput, sourcesFrom, generate};
