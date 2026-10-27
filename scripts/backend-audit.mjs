// Read-only endpoint checks, plus deliberately empty identity requests that cannot create an account.
const origin=process.env.BACKEND_URL||"http://localhost:8000";
const paths=["health","health/ready","public/categories","public/webshops","public/offers","public/pages?locale=nl","public/settings","public/faq","public/cookie-policy","me","consumer/wallet","consumer/vouchers","owner/dashboard","admin/cockpit"];
for(const path of paths){
  try{const r=await fetch(origin+"/api/v1/"+path,{headers:{Accept:"application/json",Origin:"http://localhost:3000"},signal:AbortSignal.timeout(20000)});const b=await r.json();console.log(JSON.stringify({method:"GET",path:"/api/v1/"+path,status:r.status,count:Array.isArray(b.data)?b.data.length:undefined,error:b.error?.code,message:b.error?.message}));}
  catch(e){console.log(JSON.stringify({path,error:e.message}));}
}
const csrf=await fetch(origin+"/sanctum/csrf-cookie",{headers:{Accept:"application/json"}});
const cookies=csrf.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
const token=decodeURIComponent(cookies.split("; ").find(c=>c.startsWith("XSRF-TOKEN="))?.slice(11)||"");
for(const path of ["register","login"]){
  const r=await fetch(origin+"/"+path,{method:"POST",headers:{Accept:"application/json",Origin:"http://localhost:3000",Referer:"http://localhost:3000/",Cookie:cookies,"X-XSRF-TOKEN":token,"Content-Type":"application/json"},body:"{}"});
  const b=await r.json();console.log(JSON.stringify({method:"POST",path:"/"+path,status:r.status,error:b.error?.code,message:b.error?.message||b.message}));
}
