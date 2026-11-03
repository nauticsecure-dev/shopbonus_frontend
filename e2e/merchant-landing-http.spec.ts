import { test, expect, type BrowserContext } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const api='http://localhost:8026', password='Acceptance-only-2026!';
const security:number[]=[]; let recoveryCodes:string[]=[];
const evidence:{method:string;path:string;status:number}[]=[];
async function call(ctx:BrowserContext,method:string,path:string,data?:unknown){
 if(!['GET','HEAD'].includes(method))await ctx.request.get(api+'/sanctum/csrf-cookie',{headers:{Origin:'http://localhost:3026',Referer:'http://localhost:3026/'}});
 const cookie=(await ctx.cookies(api)).find(c=>c.name==='XSRF-TOKEN');
 const response = await ctx.request.fetch(api+path,{method,data,headers:{Accept:'application/json',Origin:'http://localhost:3026',Referer:'http://localhost:3026/',...(cookie?{'X-XSRF-TOKEN':decodeURIComponent(cookie.value)}:{})}});
 evidence.push({method,path,status:response.status()}); return response;
}
async function data(ctx:BrowserContext,path:string){const r=await call(ctx,'GET',path);expect(r.status(),path+': '+await r.text()).toBe(200);return (await r.json()).data;}
function totp(secret:string){let bits='';for(const c of secret)bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g)!.map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',key).update(counter).digest();const offset=hash.at(-1)!&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}


test('real Laravel login, immutable comparison, draft isolation, upload, publish, restore and due scheduler',async({playwright})=>{
 test.setTimeout(420000);
 execFileSync('php',['scripts/merchant-review.php','reset-mfa'],{cwd:'../shopbonus_backend',windowsHide:true});
 const request=await playwright.request.newContext();
 const ctx={request,cookies:async()=> (await request.storageState()).cookies} as unknown as BrowserContext;
 let r=await call(ctx,'POST','/login',{email:'merchant-review@example.test',password});expect(r.status()).toBe(200);
 r=await call(ctx,'GET','/api/v1/admin/content/voor-webshops?locale=nl');security.push(r.status());expect(r.status()).toBe(403);expect((await r.json()).error.code).toBe('mfa_required');
 expect((await call(ctx,'POST','/user/confirm-password',{password})).status()).toBe(201);
 expect((await call(ctx,'POST','/user/two-factor-authentication',{})).status()).toBe(200);
 const secretResponse=await call(ctx,'GET','/user/two-factor-secret-key');const secret=(await secretResponse.json()).secretKey;
 expect((await call(ctx,'POST','/user/confirmed-two-factor-authentication',{code:totp(secret)})).status()).toBe(200);
 recoveryCodes=await (await call(ctx,'GET','/user/two-factor-recovery-codes')).json();const recovery=recoveryCodes[0];
 await call(ctx,'POST','/logout',{});r=await call(ctx,'POST','/login',{email:'merchant-review@example.test',password});expect((await r.json()).two_factor).toBe(true);
 expect((await call(ctx,'GET','/api/v1/me')).status()).toBe(401);
 expect((await call(ctx,'POST','/two-factor-challenge',{recovery_code:recovery})).status()).toBe(200);
 r=await call(ctx,'POST','/api/v1/admin/content/voor-webshops/publish',{locale:'nl'});security.push(r.status());expect(r.status()).toBe(423);
 expect((await call(ctx,'POST','/user/confirm-password',{password})).status()).toBe(201);
 const noCsrf=await ctx.request.post(api+'/api/v1/admin/content/voor-webshops/publish',{data:{locale:'nl'},headers:{Origin:'http://localhost:3026',Accept:'application/json'}});security.push(noCsrf.status());expect(noCsrf.status()).toBe(419);


 const base=await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl');
 const content=structuredClone(base.draft);content.hero.heading='HTTP saved unpublished draft';
 expect((await call(ctx,'PUT','/api/v1/admin/content/voor-webshops',{locale:'nl',revision:base.draft_revision,content})).status()).toBe(200);
 expect((await data(ctx,'/api/v1/content/voor-webshops?locale=nl')).content.hero.heading).toBe(base.published.hero.heading);
 expect((await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl')).draft.hero.heading).toBe(content.hero.heading);
 const cookie=(await ctx.cookies(api)).find(c=>c.name==='XSRF-TOKEN');
 const upload=await request.post(api+'/api/v1/admin/content/voor-webshops/assets',{headers:{Origin:'http://localhost:3026',Referer:'http://localhost:3026/',Accept:'application/json','X-XSRF-TOKEN':decodeURIComponent(cookie!.value)},multipart:{image:{name:'actual-upload.png',mimeType:'image/png',buffer:await import('node:fs/promises').then(fs=>fs.readFile('../docs/voor-webshops/screenshots/mobile-hero.png'))}}});
 expect(upload.status(),await upload.text()).toBe(201);
 const asset=(await upload.json()).data;
 expect((await request.get(asset.url)).status()).toBe(200);
 content.media={hero:{alt:'Actual uploaded image',mobile_asset_id:asset.id}};
 let state=await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl');
 expect((await call(ctx,'PUT','/api/v1/admin/content/voor-webshops',{locale:'nl',revision:state.draft_revision,content})).status()).toBe(200);
 state=await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl');
 expect((await call(ctx,'POST','/api/v1/admin/content/voor-webshops/publish',{locale:'nl',revision:state.draft_revision})).status()).toBe(200);
 expect((await data(ctx,'/api/v1/content/voor-webshops?locale=nl')).content.hero.heading).toBe(content.hero.heading);
 const response=await call(ctx,'GET','/api/v1/admin/content/voor-webshops/versions?locale=nl&include_content=1');
 const versions=(await response.json()).data;
 expect(versions[0].content.hero.heading).toBe(content.hero.heading);
 const first=versions.find((v:{number:number})=>v.number===1);
 expect(first.content.hero.heading).toBe('Echte goedgekeurde publicatie');
 await writeFile('../shopbonus_backend/docs/api/MERCHANT_HISTORY_HTTP_CAPTURE.json',JSON.stringify({method:'GET',path:'/api/v1/admin/content/voor-webshops/versions?locale=nl&include_content=1',status:response.status(),request_id:response.headers()['x-request-id'],environment:'Real local Laravel HTTP, isolated SQLite and filesystem, cookie login/CSRF/TOTP/password confirmation; synthetic records; no intercepted responses',response:{data:versions}},null,2));
 expect((await call(ctx,'POST','/api/v1/admin/content/voor-webshops/restore',{locale:'nl',revision_id:first.id})).status()).toBe(200);
 expect((await data(ctx,'/api/v1/content/voor-webshops?locale=nl')).content.hero.heading).toBe(first.content.hero.heading);
 state=await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl');
 const scheduled=structuredClone(state.draft); scheduled.hero.heading='HTTP actually scheduled publication';
 expect((await call(ctx,'PUT','/api/v1/admin/content/voor-webshops',{locale:'nl',revision:state.draft_revision,content:scheduled})).status()).toBe(200);
 state=await data(ctx,'/api/v1/admin/content/voor-webshops?locale=nl');
 const due_at=new Date(Date.now()+65000).toISOString();
 const queued=await call(ctx,'POST','/api/v1/admin/cms/pages/'+state.id+'/schedules',{action:'publish',locale:'nl',revision:state.draft_revision,due_at});
 expect(queued.status(),await queued.text()).toBe(201);
 expect((await data(ctx,'/api/v1/content/voor-webshops?locale=nl')).content.hero.heading).toBe(first.content.hero.heading);
 await expect.poll(async()=>{execFileSync('php',['scripts/merchant-review.php','run-schedules'],{cwd:'../shopbonus_backend',windowsHide:true});return (await data(ctx,'/api/v1/content/voor-webshops?locale=nl')).content.hero.heading;},{timeout:100000,intervals:[10000]}).toBe(scheduled.hero.heading);
 await writeFile('docs/merchant-landing/real-http-results.json',JSON.stringify({environment:'Real Laravel HTTP, isolated SQLite, real cookie/CSRF/TOTP authentication, filesystem upload and actual scheduler command after due time. No browser UI or external providers.',security,upload_status:upload.status(),schedule_status:queued.status(),requests:evidence,result:'passed'},null,2));
 await request.dispose();
});
