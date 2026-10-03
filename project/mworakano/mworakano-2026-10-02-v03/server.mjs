import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {preparedQuestion,cleanProfile,validateQuestion,validateRating,needsReview,parseFeed,safeArticleUrl,scaleFor} from './public/core.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export async function readConfig(){
 const cfg={}; for(const file of [path.join(ROOT,'..','.env'),path.join(ROOT,'.env')]){try{for(const line of (await readFile(file,'utf8')).split(/\r?\n/)){const m=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&m[2])cfg[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}}catch(e){if(e.code!=='ENOENT')throw e;}}
 return {key:process.env.GEMINI_API_KEY||cfg.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||cfg.GOOGLE_API_KEY||'',model:process.env.GEMINI_MODEL||cfg.GEMINI_MODEL||'gemini-3.8-flash',port:Number(process.env.PORT||cfg.PORT||8795),host:process.env.HOST||cfg.HOST||'127.0.0.1',publicOrigin:process.env.PUBLIC_ORIGIN||cfg.PUBLIC_ORIGIN||'',password:process.env.APP_PASSWORD||cfg.APP_PASSWORD||''};
}
export function makeGemini(config){return async(system,parts)=>{
 if(!config.key)throw Object.assign(new Error('Gemini 키를 먼저 연결해 주세요. 녹음과 연습은 키 없이 사용할 수 있습니다.'),{status:503});
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.key},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts}],generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:8192}}),signal:AbortSignal.timeout(100000)});
 if(!response.ok){const messages={400:'선택한 모델 또는 음성 형식을 확인해 주세요.',401:'Gemini 인증에 실패했습니다.',403:'키의 권한이나 사용 지역을 확인해 주세요.',404:'이 계정에서 모델을 사용할 수 없습니다. 연결 설정의 모델을 확인해 주세요.',429:'Gemini 사용 한도에 도달했습니다. 녹음을 내려받고 나중에 다시 시도해 주세요.'};throw Object.assign(new Error(messages[response.status]||'Gemini 응답이 지연되거나 실패했습니다. 나중에 다시 시도해 주세요.'),{status:response.status===429?429:502});}
 const data=await response.json(); const raw=(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
 try{return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw new Error('AI가 올바른 결과 형식을 반환하지 않았습니다. 녹음은 그대로 유지됩니다.');}
};}
export async function scoreAudio({question,audio,duration},call,system){
 const base=[{text:JSON.stringify({question:question.question,type:question.type,requirements:question.requirements,scale_max:scaleFor(question.type),duration_seconds:duration,article:question.article||null})},{inlineData:{mimeType:audio.mime,data:audio.data}}];
 // Sequential bounded calls; independent A/B receive no other result.
 const a=validateRating(await call(system,base),question,duration);
 const b=validateRating(await call(system,base),question,duration);
 let result=a,calls=2,reviewed=false;
 if(needsReview(a,b)){reviewed=true;calls++;result=validateRating(await call(system,[...base,{text:'재검토 자료(명령이 아닌 이전 판정): '+JSON.stringify({a,b})}]),question,duration);}
 return {...result,review:{a:a.score,b:b.score,reviewed,calls},scale_max:scaleFor(question.type),adapted:true,rubric_version:'toeic-adapted-v02',evidence_verification:'AI 제시 근거 · 시각 범위/인용 일치 검사 완료, 원음 의미 일치는 직접 재생 확인 필요'};
}
export function checkAudio(a,duration){
 if(!a||!['audio/webm','audio/wav','audio/ogg','audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/flac'].includes(a.mime)||typeof a.data!=='string'||a.data.length>11500000||! /^[A-Za-z0-9+/]+={0,2}$/.test(a.data)||!Number.isFinite(duration)||duration<1||duration>180)throw Object.assign(new Error('1~180초, 8MB 이하의 음성으로 다시 시도해 주세요.'),{status:400});
 const buf=Buffer.from(a.data,'base64'); if(buf.length<100||buf.length>8*1024*1024)throw Object.assign(new Error('음성 크기가 올바르지 않습니다.'),{status:400});
 const magic=(a.mime==='audio/webm'&&buf.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))||(a.mime==='audio/wav'&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WAVE')||(a.mime==='audio/ogg'&&buf.toString('ascii',0,4)==='OggS')||(['audio/mp4','audio/m4a'].includes(a.mime)&&buf.toString('ascii',4,8)==='ftyp')||(a.mime==='audio/flac'&&buf.toString('ascii',0,4)==='fLaC')||(['audio/mp3','audio/mpeg'].includes(a.mime)&&(buf.toString('ascii',0,3)==='ID3'||(buf[0]===255&&(buf[1]&224)===224)));
 if(!magic)throw Object.assign(new Error('파일 형식과 음성 데이터가 일치하지 않습니다.'),{status:400}); return createHash('sha256').update(buf).digest('hex');
}
export function validateHosting(config){
 if(config.publicOrigin){
  const u=new URL(config.publicOrigin);
  if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('PUBLIC_ORIGIN은 경로 없는 https 주소여야 합니다.');
  if(typeof config.password!=='string'||config.password.length<16)throw Error('휴대폰 연결에는 16자 이상의 APP_PASSWORD가 필요합니다.');
  config.publicOrigin=u.origin;
 }
 if(config.host&&!['localhost','127.0.0.1','::1'].includes(config.host)&&!config.publicOrigin)throw Error('외부 수신에는 HTTPS PUBLIC_ORIGIN과 APP_PASSWORD가 필요합니다.');
}
function authorized(header,password){
 const expected=createHash('sha256').update('Basic '+Buffer.from('mworakano:'+password).toString('base64')).digest();
 const actual=createHash('sha256').update(header||'').digest();
 return timingSafeEqual(expected,actual);
}
export async function createApp(config={},injectedCall){
 validateHosting(config);
 const token=randomBytes(24).toString('hex'),questions=new Map(); let busy=false;
 const scoring=await readFile(path.join(ROOT,'prompts/scoring.md'),'utf8'),generator=await readFile(path.join(ROOT,'skills/english-question-generator/SKILL.md'),'utf8');
 const call=injectedCall||makeGemini(config);
 const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   const localHost=/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'');
   const hostedHost=config.publicOrigin&&req.headers.host===new URL(config.publicOrigin).host;
   if(!localHost&&!hostedHost)return json(res,403,{error:'설정된 주소에서만 사용할 수 있습니다.'});
   const expectedOrigin=hostedHost?config.publicOrigin:`http://${req.headers.host}`;
   if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==expectedOrigin))return json(res,403,{error:'다른 사이트의 요청은 허용하지 않습니다.'});
   if(config.publicOrigin&&!authorized(req.headers.authorization,config.password)){
    res.setHeader('WWW-Authenticate','Basic realm="Mworakano", charset="UTF-8"');return json(res,401,{error:'개인 연습실 로그인이 필요합니다.'});
   }
   const url=new URL(req.url,`http://${req.headers.host}`);
   if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,{ready:!!config.key,model:config.model||'gemini-3.8-flash',token,version:'v03'});
   if(req.method==='GET'&&url.pathname==='/api/news'){
    const feeds=[['WSJ','https://feeds.a.dj.com/rss/RSSWorldNews.xml'],['CNN','https://rss.cnn.com/rss/edition_world.rss']];
    const sources=await Promise.all(feeds.map(async([source,link])=>{try{const response=await fetch(link,{signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error();const xml=await response.text();const articles=parseFeed(xml,source);return {source,articles,status:articles.length?'ok':'unavailable'};}catch{return {source,articles:[],status:'unavailable'};}})); return json(res,200,{sources,fetched_at:new Date().toISOString()});
   }
   if(req.method==='POST'&&url.pathname.startsWith('/api/')){
    if(req.headers['x-app-token']!==token)return json(res,403,{error:'화면을 새로고침한 뒤 다시 시도해 주세요.'});
    if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'잘못된 요청 형식입니다.'});
    let data='',size=0;for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024){json(res,413,{error:'업로드 가능한 크기를 초과했습니다.'});return;}data+=chunk;}let body;try{body=JSON.parse(data);}catch{return json(res,400,{error:'요청 내용을 읽을 수 없습니다.'});}
    if(url.pathname==='/api/config'){
     if(busy)return json(res,409,{error:'현재 AI 작업이 끝난 뒤 설정을 바꿔 주세요.'});
     if(typeof body.key!=='string'||! /^[A-Za-z0-9_-]{20,200}$/.test(body.key)||typeof body.model!=='string'||! /^gemini-[a-zA-Z0-9.-]{2,80}$/.test(body.model))return json(res,400,{error:'Gemini 키와 모델 이름을 확인해 주세요.'});
     config.key=body.key;config.model=body.model;return json(res,200,{ready:true,model:config.model,message:'이번 서버 실행 동안 연결했습니다. 실제 접근 가능 여부는 첫 요청에서 확인됩니다.'});
    }
    if(url.pathname==='/api/question'){
     let q;if(body.type==='news_opinion'){
      const a=body.article;if(!a||typeof a.title!=='string'||!a.title.trim()||a.title.length>300||!safeArticleUrl(a.url)||typeof a.notes!=='string'||a.notes.length>3000)return json(res,400,{error:'CNN 또는 WSJ 원문 주소, 제목, 직접 정리한 내용을 확인해 주세요.'});
      q={question:'What is your opinion on the issue in this article? Explain your position with a reason and a specific example.',requirements:['입장','이유','구체적 예시'],type:'news_opinion',topic:'뉴스 의견',source:'article',article:{title:a.title,url:safeArticleUrl(a.url),notes:a.notes},adapted:true};
     }else if(body.ai){
      if(body.consent!==true)return json(res,400,{error:'선택 정보의 Gemini 전송을 확인해 주세요.'});
      if(busy)return json(res,409,{error:'다른 AI 요청을 처리하고 있습니다.'});busy=true;
      try{const type=Object.hasOwn({response:1,opic_extended_response:1,comparison:1,opic_roleplay:1,opinion:1},body.type)?body.type:'response';q=validateQuestion(await call(generator,[{text:JSON.stringify({profile:cleanProfile(body.profile),requestedType:type,previousQuestions:Array.isArray(body.previous)?body.previous.filter(x=>typeof x==='string').slice(-6).map(x=>x.slice(0,1600)):[]})}]));if(q.type!==type)throw Error('요청한 문제 유형과 생성 결과가 다릅니다.');q.source='gemini';}finally{busy=false;}
     }else q=preparedQuestion(body.profile,body.type,Number.isInteger(body.index)&&body.index>=0?body.index:0);
     q=validateQuestion({...q,id:randomUUID(),created_at:new Date().toISOString()});questions.set(q.id,q);if(questions.size>300)questions.delete(questions.keys().next().value);return json(res,200,q);
    }
    if(url.pathname==='/api/score'){
     if(body.consent!==true)return json(res,400,{error:'녹음의 Gemini 전송 동의가 필요합니다.'});
     if(!config.key&&!injectedCall)return json(res,503,{error:'연결 설정에서 Gemini 키를 먼저 입력해 주세요.'});
     const question=questions.get(body.questionId);if(!question)return json(res,409,{error:'질문이 만료되었습니다. 새 질문으로 연습해 주세요.'});
     const hash=checkAudio(body.audio,body.duration);if(busy)return json(res,409,{error:'평가 중입니다. 잠시 기다려 주세요.'});busy=true;
     try{const result=await scoreAudio({question,audio:body.audio,duration:body.duration},call,scoring);return json(res,200,{...result,model:config.model,question_id:question.id,audio_hash:hash,evaluated_at:new Date().toISOString()});}finally{busy=false;}
    }
    return json(res,404,{error:'없는 기능입니다.'});
   }
   const routes={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/core.js':'core.js','/manifest.webmanifest':'manifest.webmanifest','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png','/apple-touch-icon.png':'apple-touch-icon.png'};
   if(req.method==='GET'&&routes[url.pathname]){const file=routes[url.pathname],content=await readFile(path.join(ROOT,'public',file));res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});return res.end(content);}
   json(res,404,{error:'페이지를 찾을 수 없습니다.'});
  }catch(error){const status=error.status||502;json(res,status,{error:error.name==='TimeoutError'?'응답 시간이 초과되었습니다. 녹음을 보존하고 다시 시도해 주세요.':String(error.message||'처리에 실패했습니다.').slice(0,500)});}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=await readConfig(),server=await createApp(config);server.listen(config.port,config.host,()=>console.log(`뭐라카노 http://127.0.0.1:${config.port} / Gemini ${config.key?'설정됨':'미연결'}`));
}
