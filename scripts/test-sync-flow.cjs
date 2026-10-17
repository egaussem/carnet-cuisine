const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');global.crypto=webcrypto;
const core=require('../docs/sync-core.js');
async function fixture(flags={}){
 const nodes=new Map(),store=new Map(),node=()=>({disabled:false,value:'192.168.1.23:12345/'+'A'.repeat(32),append(){},prepend(){},setAttribute(){},addEventListener(name,fn){this[name]=fn},showModal(){},close(){},replaceChildren(){}});
 const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
 let phone={version:1,recipes:[],pantry:[]},host={version:1,recipes:[{id:'a',title:'Test photo',photos:['data:image/jpeg;base64,YQ==']}],pantry:['Tomate']},commits=0,finishes=0,failResponse=false,failStore=false,failLocal=false;
 phone={...phone,...flags.phone};host={...host,...flags.host};
 const context={console,crypto:webcrypto,TextEncoder,URL,AbortController,TypeError,Error,setTimeout:flags.timeout?fn=>{setImmediate(fn);return 0}:setTimeout,clearTimeout,setInterval,clearInterval,structuredClone,CarnetSyncCore:core,native:false,stopQRScan(){},startQRScan(){},storageName:'test',localStorage:{getItem:key=>flags.trace||null,setItem:(key,value)=>flags.saved=value},navigator:{onLine:flags.offline!==true},queueMicrotask,window:{carnetReady:true,addEventListener(){}},document:{createElement:node,querySelector:get,body:{append(){}}},toast(){},saving:false,draft:null,db:{},exportState:async()=>structuredClone(phone),validateState:value=>structuredClone(value),detailId:null,selectedIngredients:[],render(){},confirmAction:async()=>true,
  fetch:async(url,options)=>{if(flags.hang)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e)}));const path=new URL(url).pathname;let value;
   if(flags.network)throw new TypeError('unreachable');
   if(path==='/pair'){if(flags.badPIN)return {ok:false,status:403,json:async()=>({error:'PIN incorrect.'})};value={protocol:1,token:'A'.repeat(32)};}
   else if(path==='/snapshot')value={protocol:flags.old?2:3,hostID:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',state:host,digest:await core.hash(host)};
   else if(path==='/commit'){const payload=JSON.parse(options.body);assert.equal(payload.expected,await core.hash(host));host=payload.state;commits++;if(failResponse){failResponse=false;throw new TypeError('lost response');}value={digest:await core.hash(host)};}
   else if(path==='/finish'){finishes++;value={ok:true};}else throw Error(path);
   return{ok:true,json:async()=>structuredClone(value)};
  },commit:async(next,options)=>{if(failLocal){failLocal=false;throw new Error('quota during local commit');}phone=structuredClone(next);assert(options.allowed);store.set(options.key,options.baseline);store.delete('sync-pending');}
 };
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../docs/sync.js','utf8'),context);
 context.mockStore=async(key,value)=>{if(value===undefined)return store.get(key);if(failStore){failStore=false;throw Error('quota before upload');}store.set(key,structuredClone(value));};vm.runInContext('syncStore=mockStore',context);
 return{open:()=>vm.runInContext('syncButton.onclick()',context),click:()=>get('#sync-connect').onclick(),enter:()=>get('#sync-phone-code').keydown({key:'Enter',preventDefault(){}}),context,nodes,run:()=>vm.runInContext('syncPhone()',context),lost:()=>failResponse=true,quotaBefore:()=>failStore=true,quotaAfter:()=>failLocal=true,phone:()=>phone,host:()=>host,commits:()=>commits,finishes:()=>finishes,store};
}
(async()=>{
 let test=await fixture();await test.open();await test.click();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);assert.equal(test.finishes(),1);assert(test.store.has('sync-before'));assert(!test.store.has('sync-pending'));
 test=await fixture();test.lost();await test.run();assert.equal(test.phone().recipes.length,0);assert.equal(test.host().recipes.length,1);assert(test.store.has('sync-pending'));await test.run();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);assert(!test.store.has('sync-pending'));
 test=await fixture();test.quotaBefore();await test.run();assert.equal(test.commits(),0);assert.equal(test.phone().recipes.length,0);
 test=await fixture();test.quotaAfter();await test.run();assert.equal(test.commits(),1);assert.equal(test.phone().recipes.length,0);assert(test.store.has('sync-pending'));await test.run();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);
 test=await fixture();await test.open();test.nodes.get('#sync-phone-code').value='invalid';test.enter();await new Promise(resolve=>setImmediate(resolve));assert.equal(test.commits(),0);assert.match(test.nodes.get('#sync-status').textContent,/code/i);
 test=await fixture();await test.open();test.nodes.get('#sync-phone-code').value='192.168.1.23:12345/1234';await test.click();assert.equal(test.commits(),1);
 test=await fixture({badPIN:true});await test.open();test.nodes.get('#sync-phone-code').value='192.168.1.23:12345/9999';await test.click();assert.equal(test.commits(),0);assert.match(test.nodes.get('#sync-status').textContent,/HTTP 403/);
 test=await fixture({network:true});await test.open();await test.click();assert.match(test.nodes.get('#sync-status').textContent,/RÉSEAU/);assert.equal(test.nodes.get('#sync-connect').disabled,false);assert.equal(test.commits(),0);
 test=await fixture({offline:true});await test.open();await test.click();assert.match(test.nodes.get('#sync-status').textContent,/HORS CONNEXION/);
 let recovery={trace:JSON.stringify({started:Date.now()-3000,active:true,steps:[{at:0,text:'Connexion au Mac…'}]})};test=await fixture(recovery);await new Promise(resolve=>setImmediate(resolve));assert.match(test.nodes.get('#sync-status').textContent,/interrompue/);assert.equal(JSON.parse(recovery.saved).active,false);assert.equal(test.commits(),0);
 test=await fixture({hang:true,timeout:true});await test.open();await test.click();assert.match(test.nodes.get('#sync-status').textContent,/DÉLAI DÉPASSÉ/);assert.equal(test.nodes.get('#sync-connect').disabled,false);
 let flags={hang:true};test=await fixture(flags);await test.open();const waiting=test.click();await new Promise(resolve=>setImmediate(resolve));test.nodes.get('#sync-cancel-request').onclick();await waiting;assert.match(test.nodes.get('#sync-status').textContent,/ATTENTE ARRÊTÉE/);assert(!flags.saved.includes('A'.repeat(32)));assert(!flags.saved.includes('192.168'));
 test=await fixture();await test.open();await vm.runInContext('syncPhone(true)',test.context);assert.equal(test.commits(),0);assert.equal(test.store.size,0);assert.match(test.nodes.get('#sync-status').textContent,/TEST RÉUSSI/);
 test=await fixture({old:true});await test.open();await test.click();assert.equal(test.commits(),0);assert.match(test.nodes.get('#sync-status').textContent,/2.4/);
 test=await fixture({phone:{planner:[{id:'meal',recipeID:'a',date:'2026-10-11',slot:'Dîner',servings:8}]},host:{shopping:[{id:'item',name:'Farine',quantity:'1 kg',checked:true,manual:false}]}});await test.open();await test.click();assert.equal(test.commits(),1);assert.deepEqual(test.phone(),test.host());assert.equal(test.phone().planner.length,1);assert.equal(test.phone().shopping[0].checked,true);
 test=await fixture({phone:{recipes:[{id:'parent',title:'Ramen',photos:[],subRecipes:[{recipeID:'a',servings:2,note:'La veille'}]}]}});await test.run();assert.equal(test.commits(),1);assert.equal(test.host().recipes.find(r=>r.id==='parent').subRecipes[0].recipeID,'a');assert.deepEqual(test.phone(),test.host());
 console.log('PASS sync flow: successful exchange, phone backup before upload, interrupted response recovery, quota before upload, quota after Mac commit, pending transaction recovery without duplicate upload.');
})().catch(e=>{console.error(e);process.exitCode=1});
