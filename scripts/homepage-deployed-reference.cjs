const {chromium} = require('@playwright/test');
const fs = require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const result={url:'https://www.shopbonus.nl/',captured_at:new Date().toISOString(),environment:'Local Chrome, no CPU/network emulation; navigation timing is not staging server P95 or field Core Web Vitals',samples:[]};
 try {
  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,locale:'nl-NL'});
   await context.addCookies([{name:'shopbonus-locale',value:'nl',url:result.url}]);
   await context.addInitScript(()=>{
    localStorage.setItem('shopbonus-locale','nl');
    window.__homepageVitals={lcp_ms:null,cls:0};
    new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__homepageVitals.lcp_ms=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__homepageVitals.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
   });
   const page=await context.newPage();
   const response=await page.goto(result.url,{waitUntil:'load',timeout:60000});
   await page.evaluate(()=>document.fonts.ready);
   const hydrated=await page.locator('[data-testid="wallet-preview-guest"]').waitFor({state:'visible',timeout:20000}).then(()=>true,()=>false);
   await page.screenshot({path:`docs/homepage-reference-${name}.png`,fullPage:true});
   result.samples.push({viewport:name,hydrated,status:response?.status(),final_url:page.url(),title:await page.title(),timing:await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfb_ms:n.responseStart-n.requestStart,dom_content_loaded_ms:n.domContentLoadedEventEnd,load_ms:n.loadEventEnd,transfer_bytes:n.transferSize,fcp_ms:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,...window.__homepageVitals};})});
   await context.close();
  }
  const timings=[];
  const probe=await browser.newContext();
  for(let i=0;i<30;i++){const began=performance.now();const response=await probe.request.get(result.url,{timeout:30000});timings.push({status:response.status(),duration_ms:performance.now()-began});await response.dispose();}
  await probe.close();
  const sorted=timings.map(row=>row.duration_ms).sort((a,b)=>a-b);
  result.http={description:'30 sequential public HTML requests from local Chrome; duration includes network and full response, not isolated server time',samples:timings,p95_ms:sorted[Math.ceil(sorted.length*.95)-1]};
 }catch(error){result.error=String(error);process.exitCode=1;}
 finally{await fs.writeFile('docs/homepage-deployed-reference.json',JSON.stringify(result,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
