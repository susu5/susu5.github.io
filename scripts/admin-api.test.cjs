const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const admin=path.resolve(__dirname,'../admin');
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data}}
function apiContext(overrides={}){const context=vm.createContext({FormData,JSON,Error,AbortController,setTimeout,clearTimeout,globalThis:null,...overrides});context.globalThis=context;vm.runInContext(fs.readFileSync(path.join(admin,'production-api.js'),'utf8'),context);return context}
function manualTimers(){let next=0;const timers=new Map();return {timers,setTimeout:callback=>{const id=++next;timers.set(id,callback);return id},clearTimeout:id=>timers.delete(id),expire:()=>{assert.equal(timers.size,1);[...timers.values()][0]()}}}
test('opaque token stays in session storage and is only sent to fixed API origin',async()=>{
 const context=apiContext(),store=storage(),calls=[];
 const client=context.SUSU_API.createClient({storage:store,fetcher:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({state:{revision:2}})}}});
 client.setToken('opaque-session-value');await client.request('/api/state');
 assert.equal(calls[0].url,'https://susu5-admin-service.ivoryjoy135.chatgpt.site/api/state');assert.equal(calls[0].opts.headers.Authorization,'Bearer opaque-session-value');assert.equal(calls[0].opts.credentials,'omit');
 await client.request('/api/config',{publicRequest:true});assert.equal(calls[1].opts.headers.Authorization,undefined);client.setToken('');assert.equal(store.data.size,0);
});
test('state writes serialize the exact CAS revision and draft only',async()=>{
 const context=apiContext();let body;
 const client=context.SUSU_API.createClient({storage:storage(),fetcher:async(url,opts)=>{body=opts.body;return {ok:true,json:async()=>({})}}});
 await client.request('/api/state',{method:'PUT',body:{draft:{projects:[]},baseRevision:7}});assert.deepEqual(JSON.parse(body),{draft:{projects:[]},baseRevision:7});
});
test('401 revokes local session and notifies UI; conflict retains authentication',async()=>{
 const context=apiContext(),store=storage();let unauth=0,status=409;
 const client=context.SUSU_API.createClient({storage:store,onUnauthorized:()=>unauth++,fetcher:async()=>({ok:false,status,json:async()=>({error:{code:'CONFLICT',message:'bad'}})})});
 client.setToken('opaque-session-value');await assert.rejects(client.request('/api/state'),e=>e.status===409&&e.message.includes('其他窗口'));assert.equal(client.hasToken(),true);
 status=401;await assert.rejects(client.request('/api/state'),e=>e.status===401);assert.equal(client.hasToken(),false);assert.equal(unauth,1);
});
test('network failure returns actionable error and never reports saved',async()=>{
 const context=apiContext();const client=context.SUSU_API.createClient({storage:storage(),fetcher:async()=>{throw Error('network')}});
 await assert.rejects(client.request('/api/state'),e=>e.code==='NETWORK'&&e.message.includes('未保存'));
});
test('production admin has no demo entry, inline scripts, public draft data, or browser Github credential',()=>{
 const html=fs.readFileSync(path.join(admin,'index.html'),'utf8'),login=fs.readFileSync(path.join(admin,'login-layout.js'),'utf8');
 assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),false);assert.equal(html.includes('data.js'),false);assert.equal(html.includes('content.json'),false);assert.equal(login.includes('进入后台演示'),false);assert.equal(login.includes('sessionToken'),true);assert.equal(login.includes('client_secret'),false);
 assert.match(login,/event\.origin!==api\.base/);assert.match(login,/event\.source!==authPopup/);assert.match(login,/clientNonce!==authNonce/);
});
test('uploaded image keeps the editor name and alt while retaining canonical media path',()=>{
 const form={values:[['name','雨后山色'],['alt','湖面映着青山'],['group','旅行'],['body','拍摄笔记']],getAttribute:()=> 'library-image',reportValidity:()=>true};
 const context=vm.createContext({records:{articles:[]},photos:[],selected:-1,tab:'images',main:{addEventListener(){}},document:{createElement:()=>({}),head:{appendChild(){}}},FormData:class{constructor(value){this.value=value}[Symbol.iterator](){return this.value.values[Symbol.iterator]()}},ensureReady:()=>true,message:()=>{},testForm:form});
 vm.runInContext(fs.readFileSync(path.join(admin,'library-layout.js'),'utf8'),context);
 vm.runInContext("imageDraft='https://susu5-admin-service.ivoryjoy135.chatgpt.site/media/signed';imageDraftMeta={path:'assets/uploads/abc.png',name:'DSC100.png',alt:'',width:1600,height:900};imageCategories.push('旅行')",context);
 const result=vm.runInContext('readLibrary(testForm)',context);
 assert.equal(result.name,'雨后山色');assert.equal(result.alt,'湖面映着青山');assert.equal(result.path,'assets/uploads/abc.png');assert.equal(result.width,1600);assert.equal(result.body,'拍摄笔记');
});
test('authenticated backup media uses a bounded binary response without JSON parsing',async()=>{
 const context=apiContext();let options,reads=0,released=false;
 const client=context.SUSU_API.createClient({storage:storage(),fetcher:async(url,opts)=>{options=opts;return {ok:true,headers:{get:()=>null},body:{getReader:()=>({read:async()=>reads++?{done:true}:{value:new Uint8Array([1,2,3]),done:false},releaseLock:()=>released=true})},json:()=>{throw Error('must not parse binary as JSON')}}}});
 client.setToken('opaque-session-value');const bytes=await client.request('/api/maintenance/media?path=assets/test.png',{responseType:'bytes',maxBytes:10});assert.deepEqual(Array.from(bytes),[1,2,3]);assert.equal(options.headers.Authorization,'Bearer opaque-session-value');assert.equal(released,true);
 const oversized=context.SUSU_API.createClient({storage:storage(),fetcher:async()=>({ok:true,headers:{get:()=> '20'}})});
 await assert.rejects(oversized.request('/api/maintenance/media',{responseType:'bytes',maxBytes:10}),error=>error.code==='BACKUP_LIMIT');
});
test('backup manifest timeout aborts its request, clears the timer, and permits retry without changing ordinary writes',async()=>{
 const clock=manualTimers(),context=apiContext(clock);let hanging=true,requestSignal;
 const client=context.SUSU_API.createClient({storage:storage(),fetcher:async(url,options)=>{
  requestSignal=options.signal;
  if(hanging)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
  return {ok:true,json:async()=>({complete:true})};
 }});
 const pending=client.request('/api/maintenance/backup',{timeoutMs:45000,timeoutMessage:'读取备份清单超时，请重试。'});
 clock.expire();await assert.rejects(pending,error=>error.code==='TIMEOUT'&&error.message.includes('清单超时'));
 assert.equal(requestSignal.aborted,true);assert.equal(clock.timers.size,0);
 hanging=false;assert.equal((await client.request('/api/maintenance/backup',{timeoutMs:45000})).complete,true);assert.equal(clock.timers.size,0);
 await client.request('/api/state',{method:'PUT',body:{baseRevision:7,draft:{projects:[]}}});assert.equal(requestSignal,undefined);assert.equal(clock.timers.size,0);
});
test('backup media deadline covers body streaming and preserves caller cancellation with listener cleanup',async()=>{
 const clock=manualTimers(),context=apiContext(clock);let released=false,started;
 const bodyStarted=new Promise(resolve=>started=resolve);
 const client=context.SUSU_API.createClient({storage:storage(),fetcher:async(url,{signal})=>({ok:true,headers:{get:()=>null},body:{getReader:()=>({read:()=>{started();return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('body aborted')),{once:true}))},releaseLock:()=>released=true})}})});
 const pending=client.request('/api/maintenance/media',{responseType:'bytes',timeoutMs:90000});await bodyStarted;clock.expire();
 await assert.rejects(pending,error=>error.code==='TIMEOUT');assert.equal(released,true);assert.equal(clock.timers.size,0);
 const caller=new AbortController();let added=0,removed=0;
 const trackedSignal={get aborted(){return caller.signal.aborted},get reason(){return caller.signal.reason},addEventListener(...args){added++;caller.signal.addEventListener(...args)},removeEventListener(...args){removed++;caller.signal.removeEventListener(...args)}};
 const canceled=context.SUSU_API.createClient({storage:storage(),fetcher:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('canceled')),{once:true}))});
 const cancelPending=canceled.request('/api/maintenance/backup',{timeoutMs:45000,signal:trackedSignal});caller.abort();
 await assert.rejects(cancelPending,error=>error.code==='ABORTED');assert.equal(added,1);assert.equal(removed,1);assert.equal(clock.timers.size,0);
});
