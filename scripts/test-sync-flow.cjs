const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');global.crypto=webcrypto;
const core=require('../docs/sync-core.js');
async function fixture(){
 const nodes=new Map(),store=new Map(),node=()=>({disabled:false,value:'192.168.1.23:12345/'+'A'.repeat(32),append(){},prepend(){},setAttribute(){},addEventListener(){},showModal(){},close(){},replaceChildren(){}});
 const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
 let phone={version:1,recipes:[],pantry:[]},host={version:1,recipes:[{id:'a',title:'Test photo',photos:['data:image/jpeg;base64,YQ==']}],pantry:['Tomate']},commits=0,finishes=0,failResponse=false,failStore=false,failLocal=false;
 const context={console,crypto:webcrypto,TextEncoder,URL,AbortController,TypeError,Error,setTimeout,clearTimeout,setInterval,clearInterval,structuredClone,CarnetSyncCore:core,native:false,window:{},document:{createElement:node,querySelector:get,body:{append(){}}},toast(){},saving:false,draft:null,db:{},exportState:async()=>structuredClone(phone),validateState:value=>structuredClone(value),detailId:null,selectedIngredients:[],render(){},confirmAction:async()=>true,
  fetch:async(url,options)=>{const path=new URL(url).pathname;let value;
   if(path==='/snapshot')value={protocol:1,hostID:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',state:host,digest:await core.hash(host)};
   else if(path==='/commit'){const payload=JSON.parse(options.body);assert.equal(payload.expected,await core.hash(host));host=payload.state;commits++;if(failResponse){failResponse=false;throw new TypeError('lost response');}value={digest:await core.hash(host)};}
   else if(path==='/finish'){finishes++;value={ok:true};}else throw Error(path);
   return{ok:true,json:async()=>structuredClone(value)};
  },commit:async(next,options)=>{if(failLocal){failLocal=false;throw new Error('quota during local commit');}phone=structuredClone(next);assert(options.allowed);store.set(options.key,options.baseline);store.delete('sync-pending');}
 };
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../docs/sync.js','utf8'),context);
 context.mockStore=async(key,value)=>{if(value===undefined)return store.get(key);if(failStore){failStore=false;throw Error('quota before upload');}store.set(key,structuredClone(value));};vm.runInContext('syncStore=mockStore',context);
 return{run:()=>vm.runInContext('syncPhone()',context),lost:()=>failResponse=true,quotaBefore:()=>failStore=true,quotaAfter:()=>failLocal=true,phone:()=>phone,host:()=>host,commits:()=>commits,finishes:()=>finishes,store};
}
(async()=>{
 let test=await fixture();await test.run();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);assert.equal(test.finishes(),1);assert(test.store.has('sync-before'));assert(!test.store.has('sync-pending'));
 test=await fixture();test.lost();await test.run();assert.equal(test.phone().recipes.length,0);assert.equal(test.host().recipes.length,1);assert(test.store.has('sync-pending'));await test.run();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);assert(!test.store.has('sync-pending'));
 test=await fixture();test.quotaBefore();await test.run();assert.equal(test.commits(),0);assert.equal(test.phone().recipes.length,0);
 test=await fixture();test.quotaAfter();await test.run();assert.equal(test.commits(),1);assert.equal(test.phone().recipes.length,0);assert(test.store.has('sync-pending'));await test.run();assert.deepEqual(test.phone(),test.host());assert.equal(test.commits(),1);
 console.log('PASS sync flow: successful exchange, phone backup before upload, interrupted response recovery, quota before upload, quota after Mac commit, pending transaction recovery without duplicate upload.');
})().catch(e=>{console.error(e);process.exitCode=1});
