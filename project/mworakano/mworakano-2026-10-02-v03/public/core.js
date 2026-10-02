export const BRAND = '뭐라카노';
export const TOPICS = [
 ['movies','영화 보기','movies'],['concerts','공연·콘서트','live performances'],['parks','공원 가기','parks'],['beach','해변 가기','the beach'],['camping','캠핑','camping'],['cafe','카페 가기','cafes'],['shopping','쇼핑','shopping'],['music','음악 감상','music'],['cooking','요리','cooking'],['reading','독서','reading'],['games','게임','games'],['walking','걷기','walking'],['running','조깅','jogging'],['cycling','자전거','cycling'],['swimming','수영','swimming'],['fitness','운동','exercise'],['travel','국내 여행','travel in your country'],['abroad','해외 여행','travel abroad'],['home','집에서 쉬기','relaxing at home']
].map(([id,label,en])=>({id,label,en}));
export const TYPES = {response:'묘사하기',opic_extended_response:'경험 이야기',comparison:'비교하기',opic_roleplay:'상황 대처',opinion:'의견 말하기',news_opinion:'뉴스로 말하기'};
export const FEEDBACK = ['발음','억양·강세·흐름','문법','어휘','내용 연결','관련성·완성도','정보 정확성'];
export function dayKey(date = new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function previousDay(day) {return new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10);}
export function streak(days,today=dayKey()) {
 const unique=new Set(days.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today)); let cursor=unique.has(today)?today:previousDay(today), current=0;
 while(unique.has(cursor)){current++;cursor=previousDay(cursor);} let longest=0,run=0,last='';
 for(const d of [...unique].sort()){run=last===previousDay(d)?run+1:1;longest=Math.max(longest,run);last=d;} return {current,longest,total:unique.size,today:unique.has(today)};
}
export function scaleFor(type){return type==='opinion'||type==='news_opinion'?5:3;}
export function cleanProfile(p={}) {
 const allowed={work:['company','business','teacher','none'],working:['yes','no'],student:['yes','no'],home:['alone','family','roommates','dorm','barracks'],level:['starter','steady','challenge']};
 const out={}; for(const [key,values] of Object.entries(allowed)){out[key]=values.includes(p[key])?p[key]:values[0];}
 out.topics=[...new Set(Array.isArray(p.topics)?p.topics:[])].filter(id=>TOPICS.some(t=>t.id===id)).slice(0,19); if(!out.topics.length)out.topics=['cafe','music','walking']; return out;
}
export function preparedQuestion(profile,type='response',index=0){
 const p=cleanProfile(profile), topic=TOPICS.find(t=>t.id===p.topics[index%p.topics.length]);
 const t=topic.en, variants={
 response:[`Tell me about your interest in ${t}. Describe what you usually do and explain what you enjoy about it.`,['평소 하는 일 설명','좋아하는 이유']],
 opic_extended_response:[`Tell me about a memorable experience related to ${t}. What happened, what did you do, and how did it end?`,['구체적인 과거 사건','본인의 행동','결과']],
 comparison:[`How has your interest in ${t} changed over time? Compare the past with the present and explain why it changed.`,['과거와 현재 비교','변화 이유']],
 opic_roleplay:[`You made plans with a friend related to ${t}, but you need to change them. Explain the problem, suggest another plan, and ask if it works for your friend.`,['문제 설명','대안 제안','상대에게 확인']],
 opinion:[`Do you think people should spend more time on activities such as ${t}? Explain your opinion with reasons and a specific example.`,['입장','이유','구체적 예시']]
 }; const [question,requirements]=variants[type]||variants.response;
 return {question,requirements,type:type in variants?type:'response',topic:topic.label,source:'prepared',adapted:true,scale_max:scaleFor(type)};
}
export function validateQuestion(q){
 if(!q||typeof q.question!=='string'||q.question.length<15||q.question.length>1600||!Object.hasOwn(TYPES,q.type)||!Array.isArray(q.requirements)||q.requirements.length<1||q.requirements.length>6||!q.requirements.every(x=>typeof x==='string'&&x.length>1&&x.length<240))throw new Error('질문 형식을 확인할 수 없습니다. 다시 시도해 주세요.');
 return {...q,scale_max:scaleFor(q.type),adapted:true};
}
export function validateRating(r,q,duration){
 if(!r||!['scored','deferred'].includes(r.status))throw new Error('AI 평가 상태가 올바르지 않습니다.');
 if(r.status==='scored'&&(!Number.isInteger(r.score)||r.score<0||r.score>scaleFor(q.type)))throw new Error('AI 점수가 허용 범위를 벗어났습니다.');
 if(r.status==='deferred'&&r.score!==null)throw new Error('보류 결과에 점수가 포함되었습니다.');
 const str=(s,max=8000)=>typeof s==='string'&&s.length<=max;
 if(!str(r.transcript)||!str(r.summary,1600)||!Array.isArray(r.requirements)||r.requirements.length!==q.requirements.length||!r.requirements.every((x,i)=>x.index===i&&['met','partial','missing','unknown'].includes(x.status)&&str(x.reason,800)))throw new Error('AI 요구사항 판정이 누락되었습니다.');
 if(!Array.isArray(r.evidence)||r.evidence.length>20||!r.evidence.every(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=0&&e.end>e.start&&e.end<=duration+.5&&str(e.quote,600)&&e.quote.trim().length&&str(e.reason,800)))throw new Error('AI 음성 근거의 시간 또는 내용이 올바르지 않습니다.');
 if(r.status==='scored'&&(!r.evidence.length||!r.transcript.trim()))throw new Error('음성 근거 없는 점수는 표시할 수 없습니다.');
 if(!Array.isArray(r.feedback)||r.feedback.length!==FEEDBACK.length||!FEEDBACK.every(name=>r.feedback.filter(x=>x.area===name).length===1)||!r.feedback.every(x=>str(x.note,1000)&&['strength','improve','unknown','na'].includes(x.status)))throw new Error('AI 세부 평가가 누락되었습니다.');
 if(!Array.isArray(r.improvements)||r.improvements.length>2||!r.improvements.every(x=>str(x,1200))||!str(r.rewrite,1800)||!str(r.next_question,1000))throw new Error('AI 개선 안내가 올바르지 않습니다.');
 const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 if(!r.evidence.every(e=>norm(e.quote).length>0&&norm(r.transcript).includes(norm(e.quote))))throw new Error('근거 문장이 받아쓰기와 일치하지 않습니다.');
 if(r.status==='scored'&&r.score===scaleFor(q.type)&&r.requirements.some(x=>x.status!=='met'))throw new Error('필수 요소가 부족한 최고점은 재검토가 필요합니다.');
 return {status:r.status,score:r.score,transcript:r.transcript,summary:r.summary,requirements:r.requirements,evidence:r.evidence,feedback:r.feedback,improvements:r.improvements,rewrite:r.rewrite,next_question:r.next_question};
}
export function needsReview(a,b){return a.status!==b.status||a.score!==b.score||a.requirements.some((x,i)=>x.status!==b.requirements[i].status);}
export function safeArticleUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['cnn.com','wsj.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d))?u.href:null;}catch{return null;}}
export function parseFeed(xml,source,now=Date.now()){
 const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();
 const field=(s,k)=>decode(s.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+k+'>','i'))?.[1]||'');
 return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,20).map(m=>{const s=m[1],date=field(s,'pubDate'),ms=Date.parse(date);return {title:field(s,'title').slice(0,220),url:safeArticleUrl(field(s,'link')),source,date:Number.isFinite(ms)?new Date(ms).toISOString():null,archived:!Number.isFinite(ms)||now-ms>30*86400000};}).filter(x=>x.title&&x.url);
}
