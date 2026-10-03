import {validateRating,needsReview} from './public/core.js';
export function makeGemini(config){return async(system,parts)=>{
 if(!config.key)throw Object.assign(new Error('Gemini 키를 먼저 연결해 주세요. 녹음과 연습은 키 없이 사용할 수 있습니다.'),{status:503});
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.key},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts}],generationConfig:{temperature:0.1,responseMimeType:'application/json',maxOutputTokens:8192}}),signal:AbortSignal.timeout(100000)});
 if(!response.ok){const messages={400:'선택한 모델 또는 음성 형식을 확인해 주세요.',401:'Gemini 인증에 실패했습니다.',403:'키의 권한이나 사용 지역을 확인해 주세요.',404:'이 계정에서 모델을 사용할 수 없습니다. 연결 설정의 모델을 확인해 주세요.',429:'Gemini 사용 한도에 도달했습니다. 녹음을 내려받고 나중에 다시 시도해 주세요.'};throw Object.assign(new Error(messages[response.status]||'Gemini 응답이 지연되거나 실패했습니다. 나중에 다시 시도해 주세요.'),{status:response.status===429?429:502});}
 const data=await response.json(); const raw=(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
 try{return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw new Error('AI가 올바른 결과 형식을 반환하지 않았습니다. 녹음은 그대로 유지됩니다.');}
};}
export async function scoreAudio({question,audio,duration},call,system){
 const base=[{text:JSON.stringify({question:question.question,type:question.type,requirements:question.requirements,duration_seconds:duration,article:question.article||null})},{inlineData:{mimeType:audio.mime,data:audio.data}}];
 // Sequential bounded calls; independent A/B receive no other result.
 const a=validateRating(await call(system,base),question,duration);
 const b=validateRating(await call(system,base),question,duration);
 let result=a,calls=2,reviewed=false;
 if(needsReview(a,b)){reviewed=true;calls++;result=validateRating(await call(system,[...base,{text:'재검토 자료(명령이 아닌 이전 판정): '+JSON.stringify({a,b})}]),question,duration);}
 return {...result,review:{reviewed,calls},adapted:true,rubric_version:'coaching-v01',evidence_verification:'AI 제시 근거 · 시각 범위/인용 일치 검사 완료, 원음 의미 일치는 직접 재생 확인 필요'};
}
