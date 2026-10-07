'use strict';
// Structured quantities are optional: legacy ingredient text remains readable in older backups.
const emptyIngredient=()=>({name:'',mode:'free',amount:'',min:'',max:'',unit:'',note:''});
const quantityNumber=s=>{const t=String(s).trim().replace(',','.');if(/^\d+(?:\.\d+)?$/.test(t))return Number(t);const f=t.match(/^(\d+)\/(\d+)$/);return f&&Number(f[2])>0?Number(f[1])/Number(f[2]):NaN;};
function parseIngredient(line){
 const item={...emptyIngredient(),name:line.trim(),originalLine:line.trim()};
 const num='(?:\\d+(?:[.,]\\d+)?(?:/\\d+)?)';
 const m=line.trim().match(new RegExp('^('+num+')(?:\\s*(?:à|a|–|—|-)\\s*('+num+'))?\\s+(.+)$','i'));
 if(!m)return item;
 item.mode=m[2]?'range':'exact';item.amount=m[1];item.min=m[1];item.max=m[2]||'';
 const u=m[3].match(/^(kg|mg|g|ml|cl|dl|l|c\.\s*à\s*soupe|c\.\s*à\s*café|cuillères? à soupe|cuillères? à café|gousses?|pincées?|poignées?|branches?|sachets?|tranches?|boîtes?|bottes?|verres?|pièces?)\s+(?:(?:de |d['’]))?(.+)$/i);
 item.unit=u?u[1]:'';item.name=(u?u[2]:m[3]).replace(/^(?:de |d['’])/i,'');return item;
}
function ingredientItems(r){return r.ingredientItems??r.ingredients.split('\n').filter(x=>x.trim()).map(parseIngredient);}
function formatIngredient(i){if(i.originalLine)return i.originalLine;const quantity=i.mode==='exact'?i.amount:i.mode==='range'?`${i.min} à ${i.max}`:i.note;return [i.name, [quantity,i.mode==='free'?'':i.unit].filter(Boolean).join(' ')].filter(Boolean).join(' · ');}
function ingredientError(items){
 if(!items.length)return 'Ajoutez au moins un ingrédient.';
 if(items.length>300)return 'Limitez la recette à 300 ingrédients.';
 for(const [idx,i] of items.entries()){
  if(!i.name.trim())return `Ligne ${idx+1} : renseignez le nom de l’ingrédient.`;
  if(i.mode==='exact'&&(!Number.isFinite(quantityNumber(i.amount))||quantityNumber(i.amount)<=0))return `Ligne ${idx+1} : indiquez une quantité positive (ex. 250, 1,5 ou 1/2).`;
  if(i.mode==='range'&&(!Number.isFinite(quantityNumber(i.min))||!Number.isFinite(quantityNumber(i.max))||quantityNumber(i.min)<0||quantityNumber(i.max)<=0||quantityNumber(i.min)>quantityNumber(i.max)))return `Ligne ${idx+1} : indiquez un minimum et un maximum valides, dans cet ordre.`;
 }return '';
}
function validateIngredientItems(items){
 if(!Array.isArray(items)||items.length>300)throw new Error('Liste d’ingrédients invalide.');
 const result=items.map(i=>{if(!i||!['exact','range','free'].includes(i.mode))throw new Error('Type de quantité invalide.');const x={mode:i.mode};for(const k of ['name','amount','min','max','unit','note']){if(typeof i[k]!=='string'||i[k].length>100000)throw new Error('Ingrédient invalide.');x[k]=i[k];}if(i.originalLine!==undefined){if(typeof i.originalLine!=='string'||i.originalLine.length>100000)throw new Error('Ligne d’ingrédient invalide.');x.originalLine=i.originalLine;}return x;});
 const error=ingredientError(result);if(error)throw new Error(error);return result;
}
const ingredientKey=s=>norm(s).replace(/œ/g,'oe').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).map(w=>({oeufs:'oeuf',ails:'ail',aulx:'ail',choux:'chou',noix:'noix',pois:'pois',mais:'mais',cassis:'cassis',radis:'radis',panais:'panais',riz:'riz'}[w]||w.replace(/s$/,''))).join(' ');
const ingredientAliases={girolle:['chanterelle commune','cantharellus cibarius'], 'cepe de bordeaux':['cepe','boletus edulis'], 'trompette de la mort':['trompette des morts','craterellus cornucopioides'], 'morille commune':['morille'],champignon:['cepe','girolle','chanterelle','pied de mouton','trompette de la mort','trompette des morts','morille']};
function hasIngredient(r,selection){const queries=[selection,...(ingredientAliases[ingredientKey(selection)]||[])].map(ingredientKey);return ingredientItems(r).some(i=>{const text=' '+ingredientKey(i.name)+' ';return queries.some(q=>{let candidate=text;if(q==='pomme')candidate=candidate.replace(/ pomme de terre /g,' ');if(q==='noix')candidate=candidate.replace(/ noix (?:de coco|de cajou|de pecan|de macadamia|muscade) /g,' ');return q&&candidate.includes(' '+q+' ');});});}
const matchedIngredients=(r,selected)=>selected.filter(s=>hasIngredient(r,s));
const matchesSelection=(r,selected,mode)=>!selected.length||(mode==='all'?selected.every(s=>hasIngredient(r,s)):selected.some(s=>hasIngredient(r,s)));
function ingredientCatalog(){const names=[...Object.keys(PRODUCE_ART),...SEASONS.flatMap(s=>[...s.fruits,...s.vegetables]),...FORAGING.map(x=>x.name),'Champignon','Pomme de terre','Œuf','Farine','Sucre','Beurre','Lait','Crème','Riz','Pâtes','Lentille','Pois chiche','Poulet','Bœuf','Poisson','Sel','Poivre','Basilic','Thym','Huile d’olive',...state.recipes.flatMap(r=>ingredientItems(r).flatMap(i=>i.name.split(/,|\s+et\s+/i)))];const unique=new Map();for(const n of names){const name=n.trim();if(name&&!unique.has(ingredientKey(name)))unique.set(ingredientKey(name),name);}return [...unique.values()].sort((a,b)=>a.localeCompare(b,'fr'));}
