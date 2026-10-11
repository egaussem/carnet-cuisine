const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(controller=true){
 const nodes=new Map(),events={},get=s=>{if(!nodes.has(s))nodes.set(s,{hidden:true,textContent:''});return nodes.get(s)};
 let reloads=0,canClose=true;
 const context={navigator:{onLine:true,userAgent:'iPhone',serviceWorker:{controller:controller?{}:null,addEventListener:(name,fn)=>events[name]=fn}},window:{isSecureContext:false,matchMedia:()=>({matches:true}),addEventListener(){},carnetMayClose:async()=>canClose},location:{reload:()=>reloads++},$:get,saving:false,draft:null,db:null,storageName:'test',localStorage:{getItem:()=>null},toast(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../docs/pwa.js','utf8'),context);
 return {context,get,change:()=>events.controllerchange(),reloads:()=>reloads,deny:()=>canClose=false,allow:()=>canClose=true};
}
(async()=>{
 let t=fixture();t.change();assert.equal(t.reloads(),1);
 t=fixture(false);t.change();assert.equal(t.reloads(),0);t.change();assert.equal(t.reloads(),1);
 for(const field of ['lock','saving','draft']){
  t=fixture();if(field==='lock')t.context.window.carnetSyncLocked=true;else t.context[field]=true;
  t.change();assert.equal(t.reloads(),0);await vm.runInContext('refreshWebStatus()',t.context);assert.equal(t.get('#apply-update').hidden,false);
  t.deny();await t.get('#apply-update').onclick();assert.equal(t.reloads(),0);
  t.context.window.carnetSyncLocked=false;t.context.saving=false;t.context.draft=null;t.allow();await t.get('#apply-update').onclick();assert.equal(t.reloads(),1);
 }
 console.log('PASS updates: first install stays open; active sync, save and draft defer reload; explicit update respects close guard.');
})().catch(e=>{console.error(e);process.exitCode=1});
