import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {dayKey,streak,preparedQuestion,validateRating,FEEDBACK,safeArticleUrl,parseFeed} from '../public/core.js';
import {scoreAudio,checkAudio,createApp,validateHosting} from '../server.mjs';
const q=preparedQuestion({topics:['cafe']},'opinion',0);
function rating(score=4){return {status:'scored',score,transcript:'I enjoy cafes because I can read there.',summary:'테스트 판정',requirements:q.requirements.map((_,index)=>({index,status:'met',reason:'테스트'})),evidence:[{start:0,end:4,quote:'I enjoy cafes',reason:'의견'}],feedback:FEEDBACK.map(area=>({area,status:'strength',note:'테스트'})),improvements:['예시를 더하세요.'],rewrite:'I enjoy reading at cafes.',next_question:'What book did you read?'};}
test('서울 자정과 중복·하루 유예·끊김·미래 학습일',()=>{
 assert.equal(dayKey(new Date('2026-10-01T15:00:00Z')),'2026-10-02');
 assert.deepEqual(streak(['2026-09-30','2026-10-01','2026-10-01','2026-10-03'],'2026-10-02'),{current:2,longest:2,total:2,today:false});
 assert.equal(streak(['2026-09-30'],'2026-10-02').current,0);
 assert.equal(streak(['2026-09-30','2026-10-01','2026-10-02'],'2026-10-02').current,3);
});
test('채점 근거 없는 결과·잘못된 시간·거짓 인용·누락된 최고점 차단',()=>{
 assert.equal(validateRating(rating(),q,10).score,4);
 for(const mutate of [r=>r.evidence=[],r=>r.evidence[0].end=11,r=>r.evidence[0].quote='invented statement',r=>r.evidence[0].quote='!!!',r=>r.score=6,r=>r.feedback.pop(),r=>{r.score=5;r.requirements[0].status='missing';}]){const r=rating();mutate(r);assert.throws(()=>validateRating(r,q,10));}
 const r=rating();Object.assign(r,{status:'deferred',score:null,transcript:'',evidence:[]});assert.equal(validateRating(r,q,10).score,null);
});
test('두 평가 독립 입력과 불일치 시 세 번째 재검토',async()=>{
 const inputs=[];const scores=[3,4,3];const out=await scoreAudio({question:q,audio:{mime:'audio/wav',data:'test'},duration:10},async(s,p)=>{inputs.push(p);return rating(scores[inputs.length-1]);},'rubric');
 assert.deepEqual(inputs[0],inputs[1]);assert.equal(inputs[2].length,3);assert.equal(out.score,3);assert.equal(out.review.calls,3);assert.equal(out.review.reviewed,true);
});
test('일치한 점수는 2회로 종료·재검토 보류를 유지',async()=>{
 const out=await scoreAudio({question:q,audio:{},duration:10},async()=>rating(),'rubric');assert.equal(out.review.calls,2);
 let n=0;const r=await scoreAudio({question:q,audio:{},duration:10},async()=>{n++;if(n<3)return rating(n+2);return {...rating(),status:'deferred',score:null,transcript:'',evidence:[]};},'rubric');assert.equal(r.score,null);assert.equal(r.status,'deferred');
});
test('뉴스는 허용 출처 제목만, 과거 기사는 지난 기사로',()=>{
 for(const u of ['https://cnn.com.evil.test/x','http://cnn.com/x','https://127.0.0.1/','javascript:alert(1)'])assert.equal(safeArticleUrl(u),null);
 const result=parseFeed('<rss><item><title>A &amp; B</title><link>https://www.wsj.com/world/a</link><pubDate>Mon, 27 Jan 2025 10:00:00 GMT</pubDate><description>private full text</description></item></rss>','WSJ',Date.parse('2026-10-02'));
 assert.equal(result[0].title,'A & B');assert.equal(result[0].archived,true);assert.equal('description' in result[0],false);
});
test('음성 파일 헤더와 길이 제한',()=>{
 const bytes=Buffer.alloc(128);bytes.write('RIFF');bytes.write('WAVE',8);const audio={mime:'audio/wav',data:bytes.toString('base64')};assert.equal(checkAudio(audio,10).length,64);
 assert.throws(()=>checkAudio(audio,181));assert.throws(()=>checkAudio({...audio,mime:'audio/webm'},10));assert.throws(()=>checkAudio({mime:'text/plain',data:'abc'},10));
});
test('로컬 서버: 키 없음·요청 토큰·외부 origin·설정파일 노출 차단',async t=>{
 const server=await createApp({key:'',model:'gemini-3.8-flash'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.ready,false);assert.equal(status.key,undefined);
 const post=(path,body,token=status.token)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-app-token':token},body:JSON.stringify(body)});
 assert.equal((await post('/api/question',{},'wrong')).status,403);
 assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://evil.test'}})).status,403);
 assert.equal((await fetch(base+'/.env')).status,404);
 const question=await(await post('/api/question',{type:'response',profile:{topics:['music']}})).json();assert.match(question.question,/music/);assert.equal(question.scale_max,3);
 assert.equal((await post('/api/score',{questionId:question.id,consent:true})).status,503);
 assert.equal((await post('/api/score',{questionId:question.id,consent:false})).status,400);
 assert.equal((await post('/api/question',{type:'news_opinion',article:{title:'bad',url:'https://localhost/',notes:''}})).status,400);
});
test('서버 채점 요청 전체 흐름: 고정 질문·음성·검증 결과 전달',async t=>{
 let calls=0;
 const server=await createApp({model:'test-only'},async()=>{calls++;return rating();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`,status=await(await fetch(base+'/api/status')).json();
 const post=(route,body)=>fetch(base+'/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-app-token':status.token},body:JSON.stringify(body)});
 const question=await(await post('question',{type:'opinion',profile:{topics:['cafe']}})).json();
 const bytes=Buffer.alloc(128);bytes.write('RIFF');bytes.write('WAVE',8);
 const response=await post('score',{questionId:question.id,consent:true,duration:10,scale_max:100,audio:{mime:'audio/wav',data:bytes.toString('base64')}});
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.score,4);assert.equal(result.scale_max,5);assert.equal(result.question_id,question.id);assert.equal(result.audio_hash.length,64);assert.equal(calls,2);
 const home=await(await fetch(base+'/')).text();assert.match(home,/뭐라카노/);assert.match(home,/type="module"/);
});
test('HTTPS와 비밀번호 없이 외부 수신 금지',()=>{
 assert.throws(()=>validateHosting({host:'0.0.0.0'}));
 assert.throws(()=>validateHosting({publicOrigin:'http://example.test',password:'test-only-password'}));
 assert.throws(()=>validateHosting({publicOrigin:'https://example.test',password:'short'}));
 assert.throws(()=>validateHosting({publicOrigin:'https://example.test/path',password:'test-only-password'}));
 assert.doesNotThrow(()=>validateHosting({host:'127.0.0.1'}));
});
test('모바일 인증·출처 검사 및 홈 화면 자산',async t=>{
 // Use raw HTTP to simulate the reverse proxy's Host header; fetch controls Host itself.
 const fetch=(url,options)=>new Promise((resolve,reject)=>{
  const req=request(url,options,res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(body),headers:{get:name=>res.headers[name]}}));});req.on('error',reject);req.end();
 });
 const password='test-only-not-a-real-secret',host='practice.example.test';
 const server=await createApp({host:'0.0.0.0',publicOrigin:`https://${host}`,password});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const headers={Host:host,Authorization:'Basic '+Buffer.from('mworakano:'+password).toString('base64'),Origin:`https://${host}`};
 assert.equal((await fetch(base+'/api/status',{headers:{Host:host}})).status,401);
 assert.equal((await fetch(base+'/api/status',{headers:{...headers,Authorization:'Basic wrong'}})).status,401);
 assert.equal((await fetch(base+'/api/status',{headers:{...headers,Origin:'https://other.test'}})).status,403);
 assert.equal((await fetch(base+'/api/status',{headers:{...headers,Host:'other.test'}})).status,403);
 const status=await(await fetch(base+'/api/status',{headers})).json();assert.equal(status.version,'v04');assert.equal(status.password,undefined);
 const manifest=await(await fetch(base+'/manifest.webmanifest',{headers})).json();assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,2);
 for(const icon of manifest.icons){const r=await fetch(base+icon.src,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');}
 assert.equal((await fetch(base+'/.env',{headers})).status,404);
});
