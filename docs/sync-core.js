'use strict';
// Three-way reconciliation uses the last successful shared fingerprint, never wall-clock dates.
const CarnetSyncCore=(()=>{
 function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
 async function hash(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function fingerprint(state){const recipes=Object.create(null);for(const recipe of state.recipes)recipes[recipe.id]=await hash(recipe);return {recipes,pantry:await hash(state.pantry||[])};}
 async function plan(local,remote,base){
  const left=await fingerprint(local),right=await fingerprint(remote),lm=new Map(local.recipes.map(r=>[r.id,r])),rm=new Map(remote.recipes.map(r=>[r.id,r]));
  const recipes=[],conflicts=[];
  for(const id of new Set([...lm.keys(),...rm.keys(),...Object.keys(base?.recipes||{})])){
   const l=left.recipes[id],r=right.recipes[id],b=Object.hasOwn(base?.recipes||{},id)?base.recipes[id]:undefined;let chosen;
   if(l===r)chosen=lm.get(id);else if(base&&l===b)chosen=rm.get(id);else if(base&&r===b)chosen=lm.get(id);else if(!base&&!l)chosen=rm.get(id);else if(!base&&!r)chosen=lm.get(id);else{conflicts.push({id,local:lm.get(id)||null,remote:rm.get(id)||null});continue;}
   if(chosen)recipes.push(chosen);
  }
  let pantry;
  if(left.pantry===right.pantry)pantry=local.pantry||[];else if(base&&left.pantry===base.pantry)pantry=remote.pantry||[];else if(base&&right.pantry===base.pantry)pantry=local.pantry||[];else pantry=[...new Set([...(local.pantry||[]),...(remote.pantry||[])])];
  return {state:{version:1,recipes,pantry},conflicts};
 }
 function endpoint(code){const match=String(code).trim().match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})\/([A-Za-z0-9_-]{32}|[0-9]{4})$/);if(!match)throw new Error('Collez le code complet affiché sur le Mac.');const ip=match[1].split('.').map(Number),port=Number(match[2]);if(match[1]!==ip.join('.')||ip.some(n=>n>255)||port<1024||port>65535||!(ip[0]===10||(ip[0]===192&&ip[1]===168)||(ip[0]===172&&ip[1]>=16&&ip[1]<=31)))throw new Error('Le code doit désigner un Mac sur votre réseau local.');return {url:'https://'+match[1]+':'+port,token:match[3],pairing:match[3].length===4};}
 return {canonical,hash,fingerprint,plan,endpoint};
})();
if(typeof module!=='undefined')module.exports=CarnetSyncCore;
