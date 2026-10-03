// 127.0.0.1에서만 사용하는 브라우저 QA 도구. 배포 Worker에는 포함되지 않는다.
import http from 'node:http';
http.createServer((req,res)=>{
  const headers={...req.headers,'oai-authenticated-user-id':'local-qa','oai-authenticated-user-email':'qa@example.invalid'};
  delete headers.origin;
  const upstream=http.request({hostname:'127.0.0.1',port:8770,path:req.url,method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('Local preview unavailable');});
  req.pipe(upstream);
}).listen(8772,'127.0.0.1',()=>console.log('Local QA preview: http://127.0.0.1:8772/projects.html'));
