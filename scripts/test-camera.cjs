const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 let resolveMedia,stopped=0,frame=0;
 const video={srcObject:null,play:async()=>{}},nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,{open:true,hidden:true,querySelector:()=>video,append(){},appendChild(){},addEventListener(){},setAttribute(){}});return nodes.get(s)};
 const context={console,Map,Set,Date,Error,native:false,navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>resolveMedia=resolve)}},document:{body:{append(){}},querySelector:get,createElement:()=>({dataset:{},setAttribute(){},append(){},addEventListener(){},getContext:()=>({})}),addEventListener(){}},window:{addEventListener(){}},$:get,renderDetail(){},setTimeout,clearTimeout,requestAnimationFrame:()=>++frame,cancelAnimationFrame(){},syncMessage(){}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../docs/kitchen.js','utf8'),context);
 const pending=vm.runInContext('startQRScan()',context);vm.runInContext('stopQRScan()',context);resolveMedia({getTracks:()=>[{stop:()=>stopped++}]});await pending;assert.equal(stopped,1);assert.equal(video.srcObject,null);assert.equal(frame,0);
 let p=vm.runInContext('startQRScan()',context);resolveMedia({getTracks:()=>[{stop:()=>stopped++}]});await p;assert(video.srcObject);assert.equal(get('#sync-camera').hidden,false);vm.runInContext('stopQRScan()',context);assert.equal(stopped,2);assert.equal(video.srcObject,null);assert.equal(get('#sync-camera').hidden,true);
 console.log('PASS camera: delayed permission after cancellation releases stream; active scanner stops tracks, frames and timer.');
})().catch(e=>{console.error(e);process.exitCode=1});
