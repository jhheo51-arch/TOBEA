import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {existsSync} from 'node:fs';
import {runAgent,prepareInput} from './agent.mjs';
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.mjs':'app.mjs','/model.mjs':'model.mjs','/events.mjs':'events.mjs'};
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8'};
export function createLabServer({apiKey='',model='',configFile=null,runner=runAgent}={}) {
  let busy=false,requests=[];
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  return createServer(async(req,res)=>{
    const authority=`127.0.0.1:${req.socket.localPort}`;
    if(req.headers.host!==authority&&req.headers.host!==`localhost:${req.socket.localPort}`){json(res,403,{error:'접속 주소를 확인해 주세요.'});return;}
    const url=new URL(req.url,`http://${authority}`);
    let settings={};
    if(configFile)try{settings=parseEnv(await readFile(configFile,'utf8'));}catch(error){if(error.code!=='ENOENT'){json(res,500,{error:'.env 설정 파일을 읽지 못했습니다.'});return;}}
    const activeKey=settings.OPENAI_API_KEY??apiKey,activeModel=settings.OPENAI_MODEL??model;
    if(url.pathname==='/api/status'&&req.method==='GET'){json(res,200,{configured:Boolean(activeKey&&activeModel),model:activeModel||null,message:activeKey&&activeModel?'실제 호출 준비됨 · 실행 시 API 사용량 발생':'API 키와 모델 설정 필요 · 실제 호출 미검증'});return;}
    if(url.pathname==='/api/agent'&&req.method==='POST'){
      if(![`http://${authority}`,`http://localhost:${req.socket.localPort}`].includes(req.headers.origin)){json(res,403,{error:'이 웹서비스 화면에서만 실행할 수 있습니다.'});return;}
      if(!activeKey||!activeModel){json(res,503,{error:'서버에 API 키와 모델을 먼저 설정해 주세요. 실제 AI 호출은 수행하지 않았습니다.'});return;}
      if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,415,{error:'JSON 자료만 받을 수 있습니다.'});return;}
      requests=requests.filter(t=>Date.now()-t<3600000);if(busy||requests.length>=5){json(res,429,{error:busy?'이미 AI 작업을 처리 중입니다.':'로컬 시험 한도인 시간당 5회에 도달했습니다.'});return;}
      let size=0,chunks=[],locked=false;
      try {
        for await(const chunk of req){size+=chunk.length;if(size>20000){json(res,413,{error:'입력이 너무 큽니다.'});return;}chunks.push(chunk);}
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));prepareInput(input);
        if(busy){json(res,429,{error:'이미 AI 작업을 처리 중입니다.'});return;}
        busy=true;locked=true;requests.push(Date.now());const result=await runner(input,{apiKey:activeKey,model:activeModel});json(res,200,result);
      }catch(error){json(res,400,{error:error.name==='TimeoutError'?'AI 응답 시간이 초과되었습니다. 기존 가설은 유지합니다.':error instanceof SyntaxError?'자료 형식이 올바르지 않습니다.':error.message||'AI 작업을 완료하지 못했습니다.'});}
      finally{if(locked)busy=false;}return;
    }
    if(req.method!=='GET'){json(res,405,{error:'지원하지 않는 요청입니다.'});return;}
    const file=files[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
    try{const data=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(500);res.end('Unable to load file');}
  });
}
import {pathToFileURL,fileURLToPath} from 'node:url';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const sharedConfig=new URL('../.env',import.meta.url);
  const configFile=existsSync(sharedConfig)?sharedConfig:new URL('.env',import.meta.url);
  if(existsSync(configFile))process.loadEnvFile(fileURLToPath(configFile));
  const server=createLabServer({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,configFile});
  server.on('error',error=>{console.error('실행 실패:',error.code==='EADDRINUSE'?'같은 주소가 실행 중입니다. 기존 실행을 종료하거나 PORT를 바꿔 주세요.':error.message);process.exitCode=1;});
  server.listen(Number(process.env.PORT)||4197,'127.0.0.1',()=>console.log(`제품 개선 실험실 v03: http://127.0.0.1:${server.address().port}`));
}
