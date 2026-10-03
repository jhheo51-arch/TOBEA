import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {compareAttempts,FEEDBACK} from '../public/core.js';
execFileSync(process.execPath,['build.mjs'],{cwd:new URL('..',import.meta.url)});
const {default:worker}=await import('data:text/javascript;base64,'+readFileSync(new URL('../dist/server/index.js',import.meta.url)).toString('base64'));
const env={SESSION_SECRET:'test-only-secret-with-more-than-thirty-two-characters'};
const user='test-user',base='https://private.example.test';
const req=(route,body,extra={})=>new Request(base+route,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':user,Origin:base,'Content-Type':'application/json','x-app-token':'same-origin-coaching',...extra},body:body?JSON.stringify(body):undefined});
test('hosted app requires identity, blocks CSRF, never serves .env',async()=>{
 assert.equal((await worker.fetch(new Request(base+'/'),env)).status,401);
 assert.equal((await worker.fetch(req('/api/status',null,{Origin:'https://evil.test'}),env)).status,403);
 assert.equal((await worker.fetch(req('/.env'),env)).status,404);
 const home=await worker.fetch(req('/'),env);assert.equal(home.status,200);assert.match(await home.text(),/점수 없는/);
});
test('encrypted key connection remains private and bound to one user',async()=>{
 const key='test-only-not-a-real-gemini-key';
 const r=await worker.fetch(req('/api/config',{key,model:'gemini-3.8-flash'}),env);
 assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/Secure; HttpOnly; SameSite=Strict/);assert.ok(!cookie.includes(key));
 const headers={Cookie:cookie.split(';')[0]};
 const own=await(await worker.fetch(req('/api/status',null,headers),env)).json();assert.equal(own.ready,true);assert.equal(own.key,undefined);
 const other=await(await worker.fetch(req('/api/status',null,{...headers,'oai-authenticated-user-id':'different-user'}),env)).json();assert.equal(other.ready,false);
});
test('hosted question binding rejects tampering and validates genuine coaching',async t=>{
 const q=await(await worker.fetch(req('/api/question',{type:'response',profile:{topics:['cafe']}}),env)).json();assert.ok(q.id);
 const previous=globalThis.fetch;t.after(()=>globalThis.fetch=previous);let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({status:'coached',summary:'설명했어요.',transcript:'I drink coffee.',requirements:q.requirements.map((_,index)=>({index,status:'partial',reason:'일부 설명'})),evidence:[{start:0,end:2,quote:'I drink coffee',reason:'활동'}],feedback:FEEDBACK.map(area=>({area,status:'unknown',note:'관찰 제한'})),improvements:['이유를 더해보세요.'],rewrite:'I drink coffee.',next_question:'Why do you enjoy coffee?'})}]}}]});};
 const bytes=Buffer.alloc(128);bytes.write('RIFF');bytes.write('WAVE',8);
 const body={consent:true,questionId:q.id,duration:5,audio:{mime:'audio/wav',data:bytes.toString('base64')}};
 const configured={...env,GEMINI_API_KEY:'test-only-key'};
 const bad=await worker.fetch(req('/api/score',{...body,questionId:q.id+'tampered'}),configured);assert.equal(bad.status,409);assert.equal(calls,0);
 assert.equal((await worker.fetch(req('/api/score',body,{'oai-authenticated-user-id':'different-user'}),configured)).status,409);
 const r=await worker.fetch(req('/api/score',body),configured);assert.equal(r.status,200);const data=await r.json();assert.equal(data.status,'coached');assert.equal('score' in data,false);assert.equal(calls,2);
});
test('retry comparison preserves unchanged, regressed, unknown and deferred outcomes',()=>{
 const before={status:'coached',requirements:[{status:'partial'},{status:'met'},{status:'unknown'},{status:'met'}]};
 const after={status:'coached',requirements:[{status:'met'},{status:'partial'},{status:'met'},{status:'met'}]};
 assert.deepEqual(compareAttempts(before,after,{requirements:['a','b','c','d']}).map(x=>x.change),['improved','revisit','unknown','same']);
 assert.deepEqual(compareAttempts(before,{...after,status:'deferred'},{requirements:[]}),[]);
});
