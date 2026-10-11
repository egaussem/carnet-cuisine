'use strict';
let syncInfo=null,syncRunning=false,syncPoll=null,syncHostCommit=null;
const syncDialog=document.createElement('dialog');syncDialog.id='local-sync';syncDialog.setAttribute('aria-labelledby','sync-title');
syncDialog.innerHTML='<div class="sync-body"><header><h2 id="sync-title">Synchroniser mes appareils</h2><button class="icon-button" id="sync-close" aria-label="Fermer">×</button></header><div id="sync-content"></div><p id="sync-status" role="status" aria-live="polite"></p></div>';
document.body.append(syncDialog);
const syncButton=document.createElement('button');syncButton.className='quiet';syncButton.id='sync-open';syncButton.textContent='⇄ Synchroniser mes appareils';document.querySelector('.sidebar-bottom').prepend(syncButton);
const syncMessage=text=>document.querySelector('#sync-status').textContent=text;
function syncStore(key,value){return new Promise((resolve,reject)=>{if(!db){reject(new Error('Le carnet n’est pas encore ouvert.'));return;}const tx=db.transaction('data',value===undefined?'readonly':'readwrite'),store=tx.objectStore('data'),req=value===undefined?store.get(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Le stockage de la synchronisation est plein.'));});}
async function syncSnapshot(){return validateState(await exportState());}
async function syncClose(){if(syncRunning)return;clearInterval(syncPoll);if(native)await bridge('syncStop');syncInfo=null;window.carnetSyncLocked=false;syncDialog.close();}
syncDialog.addEventListener('cancel',e=>{e.preventDefault();syncClose().catch(e=>syncMessage(e.message));});
document.querySelector('#sync-close').onclick=()=>syncClose().catch(e=>syncMessage(e.message));
syncButton.onclick=async()=>{
 if(!window.carnetReady){toast('Attendez l’ouverture du carnet.');return;}
 if(saving||draft){toast('Enregistrez ou fermez la recette avant de synchroniser.');return;}
 window.carnetSyncLocked=true;syncDialog.showModal();syncMessage('');
 const content=document.querySelector('#sync-content');
 if(native){
  content.innerHTML='<p>Ouvrez Carnet sur l’iPhone, sur le même Wi-Fi, puis choisissez « Synchroniser mes appareils ».</p><p>La connexion dure 10 minutes et s’arrête à la fin de l’échange.</p><button class="primary" id="sync-start">Démarrer la connexion au Mac</button><section id="sync-pair" hidden><label>Code à coller dans Carnet sur l’iPhone<input id="sync-code" readonly spellcheck="false"></label><button class="secondary" id="sync-copy">Copier le code</button><details><summary>Première connexion : préparer l’iPhone</summary><p>Enregistrez le certificat, puis envoyez ce fichier à votre iPhone par AirDrop. Installez-le dans Réglages → Général → VPN et gestion de l’appareil. Puis activez « Carnet - connexion personnelle au Mac » dans Général → Informations → Réglages des certificats.</p><p>Ce certificat appartient à ce Mac. Cette configuration se fait une seule fois ; les recettes passent ensuite directement entre vos appareils.</p><button class="secondary" id="sync-profile">Enregistrer le certificat pour l’iPhone</button></details></section>';
  document.querySelector('#sync-start').onclick=async()=>{try{
   syncRunning=true;document.querySelector('#sync-close').disabled=true;window.carnetSyncLocked=true;syncMessage('Préparation de la connexion sécurisée…');document.querySelector('#sync-start').disabled=true;
   syncInfo=await bridge('syncStart');syncHostCommit=null;document.querySelector('#sync-code').value=syncInfo.addresses[0].replace('https://','')+'/'+syncInfo.token;document.querySelector('#sync-pair').hidden=false;syncMessage('Prêt. Collez le code sur l’iPhone.');
   clearInterval(syncPoll);syncPoll=setInterval(async()=>{try{if(!await bridge('syncStatus')){clearInterval(syncPoll);syncInfo=null;document.querySelector('#sync-start').disabled=false;document.querySelector('#sync-pair').hidden=true;window.carnetSyncLocked=false;if(!syncHostCommit)syncMessage('Connexion terminée. Vous pouvez en démarrer une nouvelle.');}}catch{}},2000);
  }catch(e){document.querySelector('#sync-start').disabled=false;syncMessage(e.message||String(e));}finally{syncRunning=false;document.querySelector('#sync-close').disabled=false;}};
  document.querySelector('#sync-copy').onclick=async()=>{const input=document.querySelector('#sync-code');input.select();try{await bridge('syncCopy',{text:input.value});syncMessage('Code copié. Collez-le dans l’app iPhone.')}catch{syncMessage('Sélectionnez le code et copiez-le avec ⌘C.')}};
  document.querySelector('#sync-profile').onclick=async()=>{try{if(await bridge('syncProfile'))syncMessage('Envoyez le certificat par AirDrop, installez-le sur l’iPhone, puis démarrez une nouvelle connexion si celle-ci a expiré.')}catch(e){syncMessage(e.message)}};
 }else{
  content.innerHTML='<p>Sur le Mac, ouvrez Carnet → Synchroniser mes appareils → Démarrer la connexion. Gardez les deux apps ouvertes sur le même Wi-Fi.</p><form id="sync-phone-form"><label>Code affiché sur le Mac<input id="sync-phone-code" required autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="192.168.1.12:12345/code…"></label><button class="primary" id="sync-connect">Connecter et synchroniser</button></form><p class="muted">À la première connexion, suivez les instructions du Mac pour installer son certificat sur l’iPhone.</p><div id="sync-conflicts"></div>';
  document.querySelector('#sync-phone-form').onsubmit=event=>{event.preventDefault();syncPhone().catch(e=>syncMessage(e.message||String(e)));};
 }
 const recover=document.createElement('button');recover.className='text-button';recover.textContent='Récupérer le carnet avant la dernière synchronisation';content.append(recover);
 recover.onclick=async()=>{try{if(syncRunning)return;const previous=native?await bridge('syncBackupRead'):await syncStore('sync-before');if(!previous){syncMessage('Aucune copie de synchronisation disponible.');return;}if(!await confirmAction('Récupérer la copie avant synchronisation ?','Le carnet actuel sera remplacé sur cet appareil. Exportez-le d’abord si vous voulez conserver ses modifications.','Récupérer'))return;await syncClose();await commit(validateState(previous));detailId=null;render();toast('Copie avant synchronisation récupérée');}catch(e){syncMessage(e.message)}};
};
async function syncFetch(endpoint,path,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch(endpoint.url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+endpoint.token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});const value=await response.json();if(!response.ok)throw new Error(value.error||'Le Mac a refusé la connexion. Relancez la connexion sur le Mac.');return value;}catch(e){if(e instanceof TypeError||e.name==='AbortError')throw new Error('Connexion au Mac impossible. Vérifiez le Wi-Fi, le certificat de Carnet et l’autorisation Réseau local. Gardez Carnet ouvert sur les deux appareils, puis réessayez.');throw e;}finally{clearTimeout(timer);}
}
function syncChoose(conflict){
 return new Promise(resolve=>{
  const box=document.querySelector('#sync-conflicts');box.replaceChildren();const heading=document.createElement('h3');heading.textContent='Deux versions : '+(conflict.local?.title||conflict.remote?.title);box.append(heading);
  const caption=document.createElement('p');caption.textContent='Choisissez la version à conserver sur les deux appareils. Une copie avant synchronisation reste disponible.';box.append(caption);
  for(const [label,value] of [['Version iPhone',conflict.local],['Version Mac',conflict.remote]]){const section=document.createElement('section'),title=document.createElement('h4'),preview=document.createElement('pre');title.textContent=label+(value?'':' — supprimée');preview.textContent=value?[value.description,`${value.category} · ${value.servings} personne(s) · préparation ${value.prep} min · cuisson ${value.cook} min · ${value.favorite?'favorite':'sans favori'}`,value.ingredients,value.steps,value.notes,value.jarEnabled?[value.jarMode,value.jarSize,value.jarInstructions,value.jarStorage,value.jarSource].join('\n'):'Sans bocaux',value.photos.length+' photo(s)',value.history.map(h=>h.date+' : '+h.note).join('\n'),JSON.stringify(value.waitItems||[])].filter(Boolean).join('\n\n'):'La recette a été supprimée sur cet appareil.';const button=document.createElement('button');button.className='secondary';button.textContent=value?'Garder la '+label.toLowerCase():'Confirmer la suppression';button.onclick=()=>{box.replaceChildren();resolve(value?[value]:[])};section.append(title);if(value?.photos[0]){const image=document.createElement('img');image.src=value.photos[0];image.alt=label+' — couverture';image.className='sync-cover';section.append(image);}section.append(preview,button);box.append(section);}
  if(conflict.local&&conflict.remote){const both=document.createElement('button');both.className='primary';both.textContent='Garder les deux recettes';both.onclick=()=>{box.replaceChildren();const copy=structuredClone(conflict.remote);copy.id=crypto.randomUUID();copy.title+=' (version Mac)';resolve([conflict.local,copy]);};box.append(both);}
  const cancel=document.createElement('button');cancel.className='text-button';cancel.textContent='Annuler la synchronisation';cancel.onclick=()=>{box.replaceChildren();resolve(null)};box.append(cancel);box.scrollIntoView({block:'start'});
 });
}
async function syncPhone(){
 if(syncRunning)return;syncRunning=true;document.querySelector('#sync-connect').disabled=true;document.querySelector('#sync-close').disabled=true;
 try{
  const endpoint=CarnetSyncCore.endpoint(document.querySelector('#sync-phone-code').value);syncMessage('Connexion au Mac…');
  const remote=await syncFetch(endpoint,'/snapshot');if(remote.protocol!==1||!/^[-a-zA-Z0-9]{36}$/.test(remote.hostID)||typeof remote.digest!=='string')throw new Error('Version du Mac incompatible.');
  const their=validateState(remote.state);if(await CarnetSyncCore.hash(their)!==remote.digest)throw new Error('Le carnet reçu est incomplet. Réessayez.');
  const mine=await syncSnapshot(),mineHash=await CarnetSyncCore.hash(mine),key='sync-baseline:'+remote.hostID,base=await syncStore(key),pending=await syncStore('sync-pending');let merged;
  if(pending?.hostID===remote.hostID&&pending.previous===mineHash&&await CarnetSyncCore.hash(pending.state)===remote.digest){merged=validateState(pending.state);syncMessage('Reprise de l’échange interrompu…');}
  else{
   const result=await CarnetSyncCore.plan(mine,their,base);merged=result.state;
   for(const conflict of result.conflicts){syncMessage('Une recette a changé sur les deux appareils.');const chosen=await syncChoose(conflict);if(chosen===null){syncMessage('Synchronisation annulée. Aucun carnet modifié.');return;}merged.recipes.push(...chosen);}
   merged=validateState(merged);
   if(!await confirmAction('Synchroniser les deux carnets ?',`${merged.recipes.length} recette(s) seront présentes sur chaque appareil, photos comprises. Les ingrédients du frigo seront également réunis. Une copie des carnets actuels sera conservée.`,'Synchroniser')){syncMessage('Synchronisation annulée.');return;}
   await syncStore('sync-before',mine);await syncStore('sync-pending',{hostID:remote.hostID,previous:mineHash,state:merged});
   syncMessage('Envoi des recettes et des photos au Mac…');
   const reply=await syncFetch(endpoint,'/commit',{expected:remote.digest,state:merged});if(reply.digest!==await CarnetSyncCore.hash(merged))throw new Error('La confirmation du Mac est incomplète. Réessayez pour reprendre.');
  }
  const baseline=await CarnetSyncCore.fingerprint(merged);
  await commit(merged,{allowed:true,key,baseline});detailId=null;selectedIngredients=[];render();
  syncMessage('Synchronisation terminée. Vos deux carnets sont à jour.');document.querySelector('#sync-phone-code').value='';
  try{await syncFetch(endpoint,'/finish',{})}catch{syncMessage('Carnets synchronisés. Vous pouvez fermer la connexion sur le Mac.');}
 }catch(e){syncMessage((e.message||String(e))+' Vos copies locales sont conservées. Vous pouvez relancer pour reprendre.');}
 finally{syncRunning=false;document.querySelector('#sync-connect').disabled=false;document.querySelector('#sync-close').disabled=false;}
}
window.CarnetSyncHost={async handle(path,body){
 if(!native||!syncInfo||!window.carnetSyncLocked)throw new Error('La connexion au Mac est fermée.');
 if(path==='/snapshot'){const snapshot=await syncSnapshot();return {protocol:1,hostID:syncInfo.hostID,digest:await CarnetSyncCore.hash(snapshot),state:snapshot};}
 if(path==='/commit'){
  if(syncRunning)throw new Error('Un échange est déjà en cours.');
  syncRunning=true;document.querySelector('#sync-close').disabled=true;
  try{const merged=validateState(body?.state),digest=await CarnetSyncCore.hash(merged),current=await syncSnapshot(),currentHash=await CarnetSyncCore.hash(current);
   if(syncHostCommit===digest&&currentHash===digest)return {digest};
   if(body?.expected!==currentHash)throw new Error('Le carnet du Mac a changé. Relancez la synchronisation.');
   await bridge('syncBackup',{state:current});await commit(merged,{allowed:true});syncHostCommit=digest;detailId=null;selectedIngredients=[];render();syncMessage('Recettes reçues. Attente de la confirmation de l’iPhone…');return {digest};
  }finally{syncRunning=false;document.querySelector('#sync-close').disabled=false;}
 }
 if(path==='/finish'){syncMessage('Synchronisation terminée. Vos deux carnets sont à jour.');return {ok:true};}
 throw new Error('Requête inconnue.');
}};
