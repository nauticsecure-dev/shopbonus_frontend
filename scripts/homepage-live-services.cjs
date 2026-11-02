const http = require('node:http');
const {spawn, execFile} = require('node:child_process');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../shopbonus_backend');
const child=spawn('php',[path.join(backend,'scripts/homepage-live.php'),'serve'],{cwd:backend,windowsHide:true,stdio:['ignore','inherit','inherit']});
let delaySearch=false; const evidence=[];
const proxy=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost:8017'); const began=Date.now();
 const upstream=http.request({hostname:'127.0.0.1',port:8018,path:req.url,method:req.method,headers:{...req.headers,host:'localhost:8017'}},incoming=>{
  const chunks=[];incoming.on('data',chunk=>chunks.push(chunk));incoming.on('end',()=>{
   evidence.push({method:req.method,path:req.url,status:incoming.statusCode,request_id:incoming.headers['x-request-id'],cache_control:incoming.headers['cache-control'],duration_ms:Date.now()-began});
   const send=()=>{if(!res.destroyed){res.writeHead(incoming.statusCode,incoming.headers);res.end(Buffer.concat(chunks));}};
   if(delaySearch&&url.pathname.endsWith('/public/search')&&url.searchParams.get('q')==='Alpha')setTimeout(send,1500);else send();
  });
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
});
const control=http.createServer((req,res)=>{
 let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/evidence')return res.end(JSON.stringify(evidence));
  if(req.url==='/delay-search'){delaySearch=JSON.parse(body||'{}').enabled===true;return res.end('{}');}
  const action=req.url.slice(1);if(!['reset-mfa','wallet-down','wallet-up','credit','coupon-expiry','coupon-reset','verify'].includes(action)){res.writeHead(404);return res.end('{}');}
  execFile('php',[path.join(backend,'scripts/homepage-live.php'),action],{cwd:backend,windowsHide:true},(err,stdout,stderr)=>{if(err){res.statusCode=500;return res.end(JSON.stringify({error:stderr||String(err)}));}res.end(stdout);});
 });
});
proxy.listen(8017,'127.0.0.1');control.listen(8019,'127.0.0.1');
function stop(){proxy.close();control.close();if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>process.exit());else{child.kill();process.exit();}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);child.on('exit',code=>{if(code){console.error('Laravel acceptance process exited',code);process.exit(code);}});
