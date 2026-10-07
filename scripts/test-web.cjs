const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../docs'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
assert(html.includes("connect-src 'self'"));assert(html.includes("form-action 'none'"));assert(html.includes('name="referrer" content="no-referrer"'));assert(html.includes('src="pwa.js" defer'));
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest')));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
for(const icon of manifest.icons){const bytes=fs.readFileSync(path.join(dir,icon.src));assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));assert.equal(bytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));}
const files=JSON.parse(sw.match(/const FILES=(\[.*\]);/)[1]);for(const n of files){assert(fs.existsSync(path.join(dir,n)));assert(!n.includes('..'));assert(!/^Carnet-|carnet\.json|fixture|backup/i.test(n));}
for(const p of [...files,'sw.js'].filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(dir,p),'utf8'),{filename:p});
const listeners={},cacheMap=new Map(),deleted=[];let failInstall=false,fetchCalls=0,claimCount=0,skipCount=0;
const context={URL,Request,Response,Set,encodeURIComponent,self:{registration:{scope:'https://example.github.io/carnet/'},clients:{claim:async()=>{claimCount++}},skipWaiting:async()=>{skipCount++},addEventListener:(type,fn)=>listeners[type]=fn},caches:{open:async key=>{if(!cacheMap.has(key))cacheMap.set(key,new Map());const values=cacheMap.get(key);return{addAll:async requests=>{if(failInstall)throw new Error('failed');for(const r of requests)values.set(r.url,new Response('asset:'+r.url))},match:async key=>values.get(key)?.clone(),put:async(key,response)=>values.set(key,response)}},keys:async()=>[...cacheMap.keys()],delete:async key=>{deleted.push(key);cacheMap.delete(key)}},fetch:async()=>{fetchCalls++;throw new Error('offline')}};
vm.createContext(context);vm.runInContext(sw,context);
const dispatch=async(type,extra={})=>{let task;listeners[type]({...extra,waitUntil:p=>task=p,respondWith:p=>task=p});return task?await task:null};
(async()=>{
 await dispatch('install');const name=[...cacheMap.keys()][0];cacheMap.set('another-app-cache',new Map());cacheMap.set(name.replace(/[^:]+$/,'old'),new Map());await dispatch('activate');assert(cacheMap.has('another-app-cache'));assert.equal(deleted.length,1);assert.equal(claimCount,1);
 const home=await dispatch('fetch',{request:new Request('https://example.github.io/carnet/')});assert.equal(home.status,200);assert((await home.text()).endsWith('/index.html'));assert.equal(fetchCalls,0);
 const sub=await dispatch('fetch',{request:new Request('https://example.github.io/carnet/style.css?v=2')});assert.equal(sub.status,200);
 assert.equal(await dispatch('fetch',{request:new Request('https://other.example/secret')}),null);assert.equal(await dispatch('fetch',{request:new Request('https://example.github.io/other/')}),null);assert.equal(await dispatch('fetch',{request:new Request('https://example.github.io/carnet/',{method:'POST',body:'private'})}),null);
 await dispatch('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(skipCount,1);
 failInstall=true;await assert.rejects(dispatch('install'));assert(cacheMap.has('another-app-cache'));
 console.log('PASS web: relative manifest, PNG sizes, CSP/privacy, public assets, offline cache, scope isolation, atomic install failure, explicit updates.');
})().catch(e=>{console.error(e);process.exitCode=1});
