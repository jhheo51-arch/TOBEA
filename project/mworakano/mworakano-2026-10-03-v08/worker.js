// Bundled with core.js, evaluation.js, prompts and allowlisted public assets by build.mjs.
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
async function secretKey(secret){if(!secret||secret.length<32)throw fail('사이트 연결 설정이 필요합니다.',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function seal(data,secret,purpose,user){const iv=crypto.getRandomValues(new Uint8Array(12));const body=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(purpose+':'+user)},await secretKey(secret),enc.encode(JSON.stringify({...data,expires:Date.now()+12*3600000})));return b64(iv)+'.'+b64(new Uint8Array(body));}
async function unseal(token,secret,purpose,user){try{if(typeof token!=='string'||token.length>18000)throw Error();const [iv,body]=token.split('.');const data=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(iv),additionalData:enc.encode(purpose+':'+user)},await secretKey(secret),un64(body))));if(data.expires<Date.now())throw Error();return data;}catch{throw fail('연결 또는 질문이 만료되었습니다. 다시 연결하거나 새 질문을 선택해 주세요.',409);}}
async function readJson(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('JSON 요청이 필요합니다.',415);const reader=request.body?.getReader();if(!reader)throw fail('요청이 비어 있습니다.');let total=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>12*1024*1024){await reader.cancel();throw fail('음성 파일은 8MB 이하로 사용해 주세요.',413);}chunks.push(value);}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}try{return JSON.parse(dec.decode(bytes));}catch{throw fail('요청 형식이 잘못되었습니다.');}}
function audioBytes(a,duration){if(!a||typeof a.data!=='string'||a.data.length>11500000||!Number.isFinite(duration)||duration<1||duration>180||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.data))throw fail('1~180초, 8MB 이하 음성으로 다시 시도해 주세요.');const bytes=un64(a.data);if(bytes.length<100||bytes.length>8*1024*1024)throw fail('음성 크기가 올바르지 않습니다.');const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));const valid=(a.mime==='audio/webm'&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163)||(a.mime==='audio/wav'&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE')||(a.mime==='audio/ogg'&&ascii(0,4)==='OggS')||(['audio/mp4','audio/m4a'].includes(a.mime)&&ascii(4,8)==='ftyp')||(a.mime==='audio/flac'&&ascii(0,4)==='fLaC')||(['audio/mp3','audio/mpeg'].includes(a.mime)&&(ascii(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224));if(!valid)throw fail('파일 형식과 음성 데이터가 일치하지 않습니다.');return bytes;}
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8',...extra}});
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),user=request.headers.get('oai-authenticated-user-id');
  // Private Sites dispatch authenticates the visitor. Never expose a public fallback.
  if(!user)return json({error:'이 사이트를 만든 계정으로 로그인해 주세요.'},401);
  if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'다른 사이트의 요청은 허용하지 않습니다.'},403);
  if(request.method==='GET'&&!url.pathname.startsWith('/api/')){const asset=PUBLIC_ASSETS[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return json({error:'페이지를 찾을 수 없습니다.'},404);return new Response(un64(asset.data),{headers:{...headers,'Content-Type':asset.type}});}
  let config={key:env.GEMINI_API_KEY||'',model:env.GEMINI_MODEL||'gemini-3.8-flash'};
  const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-mworakano='))?.slice(17);
  if(cookie){try{const c=await unseal(cookie,env.SESSION_SECRET,'gemini',user);config={key:c.key,model:c.model};}catch{/* Expired connections are shown as disconnected, never leaked. */}}
  if(url.pathname==='/api/status'&&request.method==='GET')return json({ready:!!config.key,model:config.model,token:'same-origin-coaching',version:'v08',hosted:true});
  if(url.pathname==='/api/news'&&request.method==='GET'){const sources=await Promise.all([['CNN','https://rss.cnn.com/rss/edition_world.rss'],['WSJ','https://feeds.a.dj.com/rss/RSSWorldNews.xml']].map(async([source,link])=>{try{const r=await fetch(link,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error();const articles=parseFeed(await r.text(),source);return {source,articles,status:articles.length?'ok':'unavailable'};}catch{return {source,articles:[],status:'unavailable'};}}));return json({sources,fetched_at:new Date().toISOString()});}
  if(request.method!=='POST')return json({error:'없는 기능입니다.'},404);
  if(request.headers.get('x-app-token')!=='same-origin-coaching')return json({error:'화면을 새로고침해 주세요.'},403);
  const body=await readJson(request);
  if(url.pathname==='/api/config'){
   if(typeof body.key!=='string'||!/^[A-Za-z0-9_-]{20,200}$/.test(body.key)||typeof body.model!=='string'||!/^gemini-[a-zA-Z0-9.-]{2,80}$/.test(body.model))throw fail('Gemini 키와 모델을 확인해 주세요.');
   const token=await seal({key:body.key,model:body.model},env.SESSION_SECRET,'gemini',user);
   return json({ready:true,model:body.model,message:'최대 12시간 동안 연결했습니다. 키는 암호화된 보안 쿠키에 보관되며 화면 코드에서 읽을 수 없습니다.'},200,{'Set-Cookie':`__Host-mworakano=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200`});
  }
  if(url.pathname==='/api/question'){
   let q;
   if(body.type==='news_opinion'){const a=body.article;if(!a||typeof a.title!=='string'||!a.title.trim()||a.title.length>300||!safeArticleUrl(a.url)||typeof a.notes!=='string'||a.notes.length>3000)throw fail('기사 제목과 CNN·WSJ 원문 주소를 확인해 주세요.');q={question:'What is your opinion on the issue in this article? Explain your position with a reason and a specific example.',requirements:['입장','이유','구체적 예시'],type:'news_opinion',topic:'뉴스 의견',source:'article',article:a};}
   else if(body.ai){if(body.consent!==true)throw fail('정보 전송 동의가 필요합니다.');const type=Object.hasOwn(TYPES,body.type)&&body.type!=='news_opinion'?body.type:'response';q=validateQuestion(await makeGemini(config)(GENERATOR,[{text:JSON.stringify({profile:cleanProfile(body.profile),requestedType:type,previousQuestions:Array.isArray(body.previous)?body.previous.filter(x=>typeof x==='string').slice(-6).map(x=>x.slice(0,1600)):[]})}]));if(q.type!==type)throw fail('요청 유형과 생성 결과가 다릅니다.',502);q.source='gemini';}
   else q=preparedQuestion(body.profile,body.type,Number.isInteger(body.index)&&body.index>=0?body.index:0);
   q=validateQuestion(q);delete q.scale_max;q.created_at=new Date().toISOString();q.id=await seal(q,env.SESSION_SECRET,'question',user);return json(q);
  }
  if(url.pathname==='/api/score'){
   if(body.consent!==true)throw fail('음성 전송 동의가 필요합니다.');if(!config.key)throw fail('설정에서 Gemini 키를 연결해 주세요.',503);
   const q=validateQuestion(await unseal(body.questionId,env.SESSION_SECRET,'question',user));const bytes=audioBytes(body.audio,body.duration);
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   const result=await scoreAudio({question:q,audio:body.audio,duration:body.duration},makeGemini(config),COACHING);
   return json({...result,model:config.model,question_id:body.questionId,audio_hash:hash,evaluated_at:new Date().toISOString()});
  }
  return json({error:'없는 기능입니다.'},404);
 }catch(e){return json({error:e.status?e.message:'처리하지 못했습니다. 녹음을 보관한 뒤 다시 시도해 주세요.'},e.status||502);}
}};
