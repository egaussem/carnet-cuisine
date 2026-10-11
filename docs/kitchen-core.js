'use strict';
const CarnetKitchen=(()=>{
 const slots=['Déjeuner','Dîner','Autre'];
 const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 function validate(value){
  const result={};
  for(const key of ['planner','shopping']){
   const items=value[key]??[];if(!Array.isArray(items)||items.length>10000)throw new Error('Planning ou liste de courses invalide.');
   const ids=new Set();result[key]=items.map(x=>{
    if(!x||typeof x.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(x.id)||ids.has(x.id))throw new Error('Identifiant de planning ou de courses invalide.');ids.add(x.id);
    if(key==='planner'){
     if(!dateValid(x.date)||!slots.includes(x.slot)||typeof x.recipeID!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(x.recipeID)||!Number.isInteger(x.servings)||x.servings<1||x.servings>1000)throw new Error('Repas planifié invalide.');
     return {id:x.id,date:x.date,slot:x.slot,recipeID:x.recipeID,servings:x.servings};
    }
    if(typeof x.name!=='string'||!x.name.trim()||x.name.length>1000||typeof x.quantity!=='string'||x.quantity.length>5000||typeof x.checked!=='boolean'||typeof x.manual!=='boolean')throw new Error('Article de courses invalide.');
    return {id:x.id,name:x.name,quantity:x.quantity,checked:x.checked,manual:x.manual};
   });
  }return result;
 }
 const decimal=n=>String(Math.round((n+Number.EPSILON)*1000)/1000).replace('.',',');
 function scale(item,factor){const x={...item};if(factor===1)return x;
  if(x.mode==='exact'){const n=quantityNumber(x.amount);if(Number.isFinite(n)){x.amount=decimal(n*factor);delete x.originalLine;}}
  if(x.mode==='range'){const lo=quantityNumber(x.min),hi=quantityNumber(x.max);if(Number.isFinite(lo)&&Number.isFinite(hi)){x.min=decimal(lo*factor);x.max=decimal(hi*factor);delete x.originalLine;}}
  return x;
 }
 function scaled(recipe,servings){return ingredientItems(recipe).map(x=>scale(x,servings/recipe.servings));}
 function unitInfo(unit){const u=norm(unit).trim().replace(/\s+/g,' ');const conversions={kg:['g',1000],g:['g',1],mg:['g',.001],l:['ml',1000],dl:['ml',100],cl:['ml',10],ml:['ml',1]};if(conversions[u])return conversions[u];return [u.replace(/^(pieces?|gousses?|tranches?|sachets?|poignees?|branches?|boites?|bottes?|verres?)$/,s=>s.replace(/s$/,'')),1];}
 function groceries(picks,pantry=[],exclude=false){
  const groups=new Map();
  for(const {recipe,servings} of picks){for(const item of scaled(recipe,servings)){
   if(exclude&&pantry.some(name=>hasIngredient({ingredientItems:[item]},name)))continue;
   const [unit,multiplier]=unitInfo(item.unit),key=ingredientKey(item.name)+'|'+unit;let group=groups.get(key);
   if(!group){group={name:item.name,unit,min:0,max:0,hasNumeric:false,range:false,free:[]};groups.set(key,group);}
   if(item.mode==='exact'&&Number.isFinite(quantityNumber(item.amount))){group.min+=quantityNumber(item.amount)*multiplier;group.max+=quantityNumber(item.amount)*multiplier;group.hasNumeric=true;}
   else if(item.mode==='range'&&Number.isFinite(quantityNumber(item.min))&&Number.isFinite(quantityNumber(item.max))){group.min+=quantityNumber(item.min)*multiplier;group.max+=quantityNumber(item.max)*multiplier;group.hasNumeric=true;group.range=true;}
   else{const text=item.originalLine||item.note||'Quantité à préciser';if(!group.free.includes(text))group.free.push(text);}
  }}
  return [...groups.values()].map(g=>({name:g.name,quantity:[g.hasNumeric?[g.range?decimal(g.min)+' à '+decimal(g.max):decimal(g.min),g.unit].filter(Boolean).join(' '):'',...g.free].filter(Boolean).join(' + ')})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 }
 function week(start,offset=0){const d=new Date(start+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')});}
 return {validate,scale,scaled,groceries,week,dateValid,decimal,slots};
})();
if(typeof module!=='undefined')module.exports=CarnetKitchen;
