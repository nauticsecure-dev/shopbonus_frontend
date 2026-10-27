import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {spawn} from "node:child_process";

const received=[];
const upstream=createServer(async(req,res)=>{
  const body=await Array.fromAsync(req).then(chunks=>Buffer.concat(chunks).toString());
  received.push({url:req.url,method:req.method,headers:req.headers,body});
  res.setHeader("Content-Type","application/json");
  if(req.url==="/sanctum/csrf-cookie"){
    res.setHeader("Set-Cookie",["XSRF-TOKEN=integration-token; Path=/; SameSite=Lax","shopbonus_session=session-secret; Domain=backend.example; Path=/; HttpOnly; SameSite=Lax"]);
    res.writeHead(204).end();return;
  }
  if(req.url==="/login"){
    if(req.headers["x-xsrf-token"]!=="integration-token"||!req.headers.cookie?.includes("shopbonus_session=")){res.writeHead(419).end(JSON.stringify({message:"CSRF mismatch"}));return;}
    res.setHeader("Set-Cookie","shopbonus_session=authenticated; Path=/; HttpOnly; SameSite=Lax");
    res.end(JSON.stringify({data:{email:"integration@example.invalid"}}));return;
  }
  if(req.url?.startsWith("/api/v1/errors/")){
    const status=Number(req.url.split("/").at(-1));
    res.setHeader("X-Request-Id","integration-request");
    if(status===429)res.setHeader("Retry-After","60");
    res.writeHead(status).end(JSON.stringify({error:{status,code:"integration_error",message:"Expected test error",fields:{email:["Expected validation message"]}}}));return;
  }
  if(req.url==="/api/v1/me"||req.url?.startsWith("/api/v1/consumer/")||req.url?.startsWith("/api/v1/admin/")||req.url==="/api/v1/owner/dashboard"){
    res.writeHead(401).end(JSON.stringify({error:{code:"unauthenticated",message:"Authentication is required."}}));return;
  }
  res.end(JSON.stringify({data:[],meta:{current_page:1,last_page:1,total:0}}));
});
upstream.listen(0,"127.0.0.1");await once(upstream,"listening");
const backend="http://127.0.0.1:"+upstream.address().port;
const portServer=createServer();portServer.listen(0,"127.0.0.1");await once(portServer,"listening");
const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
const origin="http://127.0.0.1:"+port;
const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env:{...process.env,BACKEND_URL:backend,BACKEND_STATEFUL_ORIGIN:"http://localhost:3000"},windowsHide:true,stdio:["ignore","pipe","pipe"]});
let output="";app.stdout.on("data",c=>output+=c);app.stderr.on("data",c=>output+=c);
const request=(path,options={})=>fetch(origin+path,{...options,signal:AbortSignal.timeout(25000)});
try{
  let ready=false;
  for(let i=0;i<120;i++){
    if(app.exitCode!==null)throw new Error(output);
    try{await request("/api/backend/api/v1/public/webshops");ready=true;break;}catch{await new Promise(r=>setTimeout(r,250));}
  }
  assert.ok(ready,"Frontend server failed to start: "+output);
  const catalog=await request("/api/backend/api/v1/public/webshops?search=chairs&page=2");
  assert.equal(catalog.status,200);assert.match(catalog.headers.get("cache-control"),/no-store/);
  assert.equal(received.at(-1).url,"/api/v1/public/webshops?search=chairs&page=2");
  assert.deepEqual((await catalog.json()).data,[]);
  console.log("PASS public catalog/query forwarding and no-store responses");
  const csrf=await request("/api/backend/sanctum/csrf-cookie");
  const cookies=csrf.headers.getSetCookie();assert.equal(csrf.status,204);assert.equal(cookies.length,2);
  assert.ok(cookies.some(c=>c.includes("HttpOnly")));assert.ok(cookies.every(c=>!c.includes("Domain=")));
  const cookie=cookies.map(c=>c.split(";")[0]).join("; ");
  const login=await request("/api/backend/login",{method:"POST",headers:{origin,cookie,"X-XSRF-TOKEN":"integration-token","Content-Type":"application/json"},body:JSON.stringify({email:"integration@example.invalid",password:"not-a-real-password"})});
  assert.equal(login.status,200);assert.match(login.headers.get("set-cookie"),/HttpOnly/);
  assert.equal(received.at(-1).headers.origin,"http://localhost:3000");
  console.log("PASS session cookies, CSRF header and Sanctum origin forwarding");
  const missingCsrf=await request("/api/backend/login",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:"{}"});assert.equal(missingCsrf.status,419);
  for(const badOrigin of [undefined,"https://attacker.example"]){
    const count=received.length;
    const denied=await request("/api/backend/login",{method:"POST",headers:badOrigin?{origin:badOrigin}:{},body:"{}"});
    assert.equal(denied.status,403);assert.equal(received.length,count);
  }
  assert.equal((await request("/api/backend/not-allowed")).status,404);
  assert.equal((await request("/api/backend/api/v1/public%2Fwebshops")).status,400);
  console.log("PASS cross-origin mutation, missing CSRF and invalid path rejection");
  for(const status of [401,403,409,419,422,429,500]){
    const response=await request("/api/backend/api/v1/errors/"+status);assert.equal(response.status,status);
    assert.equal(response.headers.get("x-request-id"),"integration-request");
    assert.equal((await response.json()).error.status,status);
    if(status===429)assert.equal(response.headers.get("retry-after"),"60");
  }
  console.log("PASS 401/403/409/419/422/429/500 error propagation and request IDs");
  const key="integration-checkout-key";
  await request("/api/backend/api/v1/consumer/checkouts",{method:"POST",headers:{origin,cookie,"Idempotency-Key":key,"Content-Type":"application/json"},body:'{"offer":"chair","use_wallet":true}'});
  assert.equal(received.at(-1).headers["idempotency-key"],key);
  assert.equal(JSON.parse(received.at(-1).body).offer,"chair");
  console.log("PASS checkout payload and idempotency forwarding");
  const upload=new FormData();upload.append("file",new Blob(["code\nTEST-CODE\n"],{type:"text/csv"}),"codes.csv");
  await request("/api/backend/api/v1/workspaces/example/offers/example/code-imports",{method:"POST",headers:{origin,cookie,"X-XSRF-TOKEN":"integration-token"},body:upload});
  assert.match(received.at(-1).headers["content-type"],/multipart\/form-data; boundary=/);
  assert.match(received.at(-1).body,/TEST-CODE/);
  console.log("PASS CSV multipart upload forwarding");
  for(const path of ["/api/vouchers","/api/transactions","/api/dashboard/admin","/api/dashboard/merchant"]){
    const response=await request(path,{headers:{cookie:'shopbonus-session={"role":"admin"}',"x-role":"admin"}});assert.equal(response.status,401,path);
  }
  let lastNonce;
  for(const path of ["/","/account?mode=login","/dashboard","/profiel","/mijn-voordelen","/admin"]){
    const response=await request(path);assert.equal(response.status,200,path);
    const html=await response.text();assert.ok(!html.includes("sanne@example.nl"));assert.ok(!html.includes("123456</strong>"));
    const policy=response.headers.get("content-security-policy");assert.match(policy,/nonce-/);assert.doesNotMatch(policy,/unsafe-eval/);
    const nonce=policy.match(/nonce-([^']+)/)[1];assert.notEqual(nonce,lastNonce);lastNonce=nonce;
    assert.match(response.headers.get("cache-control"),/no-store/);
  }
  console.log("PASS forged demo roles rejected, production pages render and nonce/cache security retained");
  await new Promise(resolve=>upstream.close(resolve));
  const unavailable=await request("/api/backend/api/v1/public/webshops");assert.equal(unavailable.status,502);
  assert.ok(!(await unavailable.text()).includes("ECONNREFUSED"));
  console.log("PASS unavailable upstream returns safe 502");
}finally{
  if(app.exitCode===null){const ended=once(app,"exit");app.kill();await ended;}
  upstream.close();
}
