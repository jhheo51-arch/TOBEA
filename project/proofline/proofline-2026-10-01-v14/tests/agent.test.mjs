import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{cleanInput,generate} from '../dist/server/index.js';

const input={challenge:'제 경험을 어떻게 알릴지 모르겠습니다',experience:'도서관에서 예약 절차를 설명했습니다',reaction:'고맙다는 말을 들었습니다',strength:'절차 설명',audience:'예약이 어려운 사람',situation:'문자 인증에서 막힘',preference:'소자본',currentOffer:'안내문 만들기'};
const idea={title:'인증 문자 10분 안내',unmet_need:'문자 인증 단계의 어려움',why_this_person:'예약 절차 설명 경험',new_angle:'인증 단계만 집중',external_signal:'관련 자료 있음',source_urls:['https://example.org/source','https://unverified.example/bad'],counterargument:'도움이 필요하지 않을 수 있음',first_experiment:'한 명에게 안내문 보여주기',success_signal:'스스로 인증 완료'};

test('기록 입력을 제한하고 민감한 추가 필드를 버립니다',()=>{
  assert.equal(cleanInput({...input,contact:'010-1234-5678'}).contact,undefined);
  assert.equal(cleanInput({...input,experience:'x'.repeat(501)}),null);
});

test('검색한 출처만 남긴 기회 가설 세 개를 반환합니다',async()=>{
  const mock=async(_url,options)=>{
    assert.equal(options.headers.authorization,'Bearer test-key');
    const body=JSON.parse(options.body);
    assert.equal(body.store,false);
    assert.equal(body.tool_choice,'required');
    assert.equal(body.tools[0].type,'web_search');
    return new Response(JSON.stringify({status:'completed',output:[
      {type:'web_search_call',action:{sources:[{url:'https://example.org/source',title:'출처'}]}},
      {type:'message',content:[{type:'output_text',text:JSON.stringify({insight:'새 통찰',reframe:'고객의 문제',clarifying_question:'무엇이 막혔나요?',opportunities:[idea,idea,idea]})}]}
    ]}),{status:200});
  };
  const result=await generate(input,'test-key',mock);
  assert.equal(result.status,200);
  assert.equal(result.data.opportunities.length,3);
  assert.deepEqual(result.data.opportunities[0].source_urls,['https://example.org/source']);
});

test('AI 인증값이 없으면 외부 요청을 하지 않고 오류를 알려줍니다',async()=>{
  const request=new Request('https://proofline.example/api/opportunities',{method:'POST',headers:{'content-type':'application/json',origin:'https://proofline.example'},body:JSON.stringify(input)});
  const response=await worker.fetch(request,{});
  assert.equal(response.status,503);
  assert.match((await response.json()).error,/AI 연결/);
});

test('API 잔액 소진을 일시적인 속도 제한과 구분합니다',async()=>{
  const result=await generate(input,'test-key',async()=>new Response(JSON.stringify({error:{code:'credit_balance_exhausted'}}),{status:429}));
  assert.equal(result.status,503);
  assert.match(result.error,/잔액이 소진/);
});
