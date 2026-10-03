import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const files = {'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.mjs':'app.mjs','/model.mjs':'model.mjs','/events.mjs':'events.mjs'};
const types = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8'};
const server=createServer(async(req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}
  catch{res.writeHead(500);res.end('Unable to load file');}
});
server.on('error',error=>{console.error('실행 실패:',error.message);process.exitCode=1;});
server.listen(Number(process.env.PORT)||4193,'127.0.0.1',()=>console.log('제품 개선 실험실: http://127.0.0.1:'+server.address().port));
