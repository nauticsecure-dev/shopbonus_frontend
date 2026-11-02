const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:(key)=>key in mocks?mocks[key]:require(key),...globals},{filename:file});return module.exports;
}
function elements(tree){return !tree?[]:Array.isArray(tree)?tree.flatMap(elements):typeof tree==='object'?[tree,...elements(tree.props?.children)]:[];}
test('editing marked text preserves headings, nested lists, links, buttons and image references',()=>{
 const Editor=load('src/components/cms/RichTextEditor.tsx',{'@/i18n/LocaleContext':{useLocale:()=>({locale:'en'})}}).default;
 const text={type:'text',text:'Original',marks:[{type:'bold'},{type:'italic'},{type:'link',attrs:{href:'/help'}}]};
 const doc={type:'doc',content:[{type:'heading',attrs:{level:3},content:[text]},{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'List'}]},{type:'orderedList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Nested'}]}]}]}]}]},{type:'image',attrs:{asset_id:'uploaded-id',alt:'Image'}},{type:'button',attrs:{href:'/join',label:'Join'}}]};
 let changed;const tree=Editor({value:doc,onChange:d=>changed=d});
 elements(tree).find(e=>e.type==='textarea').props.onChange({target:{value:'Edited'}});
 const expected=structuredClone(doc);expected.content[0].content[0].text='Edited';
 assert.equal(JSON.stringify(changed),JSON.stringify(expected));assert.equal(doc.content[0].content[0].text,'Original');
});
function storage(initial={}){const data=new Map(Object.entries(initial));return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function consentEnvironment(){
 const jar=new Map([['_ga_test','value'],['session','essential'],['sb_mkt_click','id']]);
 const scripts=[];const document={querySelectorAll:()=>scripts,get cookie(){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ')},set cookie(value){const [name]=value.split('=');if(value.includes('Max-Age=0'))jar.delete(name)}};
 let reloads=0;const localStorage=storage({_ga_test:'id',session:'keep'}),sessionStorage=storage({sb_mkt_click:'id'});
 const window={dispatchEvent(){},location:{reload(){reloads++}}};
 const api=load('src/lib/cookies.ts',{'@/lib/api':{}},{window,document,localStorage,sessionStorage,location:{hostname:'shop.example.test',pathname:'/pagina/legal'},CustomEvent:class{}});
 return {api,window,scripts,jar,localStorage,sessionStorage,reloads:()=>reloads};
}
test('withdrawal after a registered tracker loads stops its interval and listener and clears optional cookies/storage',async()=>{
 const env=consentEnvironment();let ticks=0,listenerActive=false,timer;
 env.api.registerConsentTracker('analytics',{enable(){listenerActive=true;timer=setInterval(()=>ticks++,5)},disable(){listenerActive=false;clearInterval(timer)}});
 env.scripts.push({dataset:{consentTracker:'analytics',src:'/tracker.js'},removeAttribute(){}});
 env.api.applyAllowedTrackers(['session','analytics']);await new Promise(r=>setTimeout(r,25));assert.ok(ticks>0);assert.equal(listenerActive,true);
 env.api.applyAllowedTrackers(['session']);const stopped=ticks;await new Promise(r=>setTimeout(r,20));assert.equal(ticks,stopped);assert.equal(listenerActive,false);
 assert.equal(env.jar.has('_ga_test'),false);assert.equal(env.jar.has('sb_mkt_click'),false);assert.equal(env.jar.has('session'),true);
 assert.equal(env.localStorage.getItem('_ga_test'),null);assert.equal(env.localStorage.getItem('session'),'keep');assert.equal(env.sessionStorage.getItem('sb_mkt_click'),null);
 assert.equal(env.reloads(),0);assert.equal(env.window.__shopbonusAnalyticsAllowed,false);
 env.api.applyAllowedTrackers(['session','analytics']);assert.equal(listenerActive,true);env.api.applyAllowedTrackers(['session']);
});
test('loaded tracker without shutdown support forces document replacement after permissions are revoked',()=>{
 const env=consentEnvironment();env.scripts.push({dataset:{consentTracker:'external',consentLoaded:'1'},removeAttribute(){}});env.api.applyAllowedTrackers([]);assert.equal(env.reloads(),1);assert.deepEqual(Array.from(env.window.__shopbonusAllowedTrackers),[]);
});
test('account locale overrides automatically stored detection; explicit user choice wins',async()=>{
 for(const explicit of [false,true]){
  const localStorage=storage({'shopbonus-locale':'nl',...(explicit?{'shopbonus-locale-explicit':'1'}:{})});let states=[],index=0,effects=[];
  const react={createContext:()=>({Provider:'provider'}),useState:(initial)=>{const i=index++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v}]},useEffect:(fn,deps)=>{const i=index++;if(!states[i]||JSON.stringify(states[i])!==JSON.stringify(deps)){states[i]=deps;effects.push(fn)}},useCallback:fn=>fn,useMemo:fn=>fn()};
  const Provider=load('src/i18n/LocaleContext.tsx',{react,'next/navigation':{useRouter:()=>({refresh(){}})},'@/i18n/dictionaries':{getDictionary:()=>({})},'@/types/locale':{DEFAULT_LOCALE:'nl',isLocale:v=>v==='nl'||v==='en'}},{localStorage,document:{documentElement:{},cookie:''},queueMicrotask}).LocaleProvider;
  function render(){index=0;return Provider({children:null}).props.value;}
  render();effects.splice(0).forEach(fn=>fn());await new Promise(r=>queueMicrotask(r));let value=render();effects.splice(0).forEach(fn=>fn());value.applyAccountLocale('en');value=render();assert.equal(value.locale,explicit?'nl':'en');
 }
});
test('CMS language switch follows the published alternate before fetching the new locale',async()=>{
 let locale='nl',slug='over-ons',states=[],index=0,effects=[],requests=[],navigations=[];
 const page={key:'about',locale:'nl',slug:'over-ons',content:{title:'Over ons'},alternates:{nl:'over-ons',en:'about-us'}};
 const router={replace:path=>navigations.push(path)};
 const react={useState:initial=>{const i=index++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=v}]},useRef:initial=>{const i=index++;if(!(i in states))states[i]={current:initial};return states[i]},useEffect:(fn,deps)=>{const i=index++;if(!states[i]||JSON.stringify(states[i])!==JSON.stringify(deps)){states[i]=deps;effects.push(fn)}}};
 const Component=load('src/app/pagina/[slug]/page.tsx',{react,'next/link':()=>null,'next/navigation':{useParams:()=>({slug}),useRouter:()=>router},'@/i18n/LocaleContext':{useLocale:()=>({locale,dictionary:{notFound:'Missing'}})},'@/lib/api':{ApiError:class extends Error{}},'@/lib/cms':{fetchPublicPage:async(l,s)=>{requests.push([l,s]);return page}},'@/components/cms/PageInlineCms':{default:()=>null,PageBody:()=>null}}).default;
 function render(){index=0;Component();effects.splice(0).forEach(fn=>fn());}
 render();await new Promise(r=>setImmediate(r));locale='en';render();
 assert.deepEqual(navigations,['/pagina/about-us']);assert.deepEqual(requests,[['nl','over-ons']]);slug='about-us';render();await new Promise(r=>setImmediate(r));assert.deepEqual(requests,[['nl','over-ons'],['en','about-us']]);
});
test('homepage and merchant SEO metadata request the selected locale',async()=>{
 for(const [file,view,lib,fn]of [['src/app/page.tsx','@/components/homepage/HomepageView','@/lib/homepage','fetchHomepageContentServer'],['src/app/voor-webshops/page.tsx','@/components/voor-webshops/MerchantLandingView','@/lib/merchantLanding','fetchMerchantLandingServer']]){
  let requested;
  const mod=load(file,{'@/i18n/requestLocale':{requestLocale:async()=> 'en'},[view]:{},'@/lib/discoveryServer':{},[lib]:{[fn]:async locale=>{requested=locale;return {title:'English title',seo_description:'English description'}}}});
  const metadata=await mod.generateMetadata();assert.equal(requested,'en');assert.equal(metadata.title,'English title');assert.equal(metadata.description,'English description');
 }
});
