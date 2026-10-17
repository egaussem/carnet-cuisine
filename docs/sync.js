'use strict';
let syncInfo=null,syncRunning=false,syncPoll=null,syncHostCommit=null,syncTrace=null,syncClock=null,syncRequest=null;
const syncDialog=document.createElement('dialog');syncDialog.id='local-sync';syncDialog.setAttribute('aria-labelledby','sync-title');
syncDialog.innerHTML='<div class="sync-body"><header><h2 id="sync-title">Synchroniser mes appareils</h2><button class="icon-button" id="sync-close" aria-label="Fermer">×</button></header><div id="sync-content"></div><p id="sync-status" role="status" aria-live="polite"></p><p id="sync-duration"></p><button type="button" class="secondary" id="sync-cancel-request" hidden>Arrêter l’attente</button><details id="sync-diagnostics"><summary>Diagnostic de la dernière tentative</summary><pre id="sync-log"></pre></details></div>';
document.body.append(syncDialog);
const syncButton=document.createElement('button');syncButton.className='quiet';syncButton.id='sync-open';syncButton.textContent='⇄ Synchroniser mes appareils';document.querySelector('.sidebar-bottom').prepend(syncButton);
const syncMessage=text=>document.querySelector('#sync-status').textContent=text;
const syncTraceKey=(typeof storageName==='string'?storageName:'carnet-native')+':sync-diagnostic';
function syncTraceRead(){try{return JSON.parse(localStorage.getItem(syncTraceKey))}catch{return null}}
function syncTraceSave(){try{localStorage.setItem(syncTraceKey,JSON.stringify(syncTrace))}catch{}syncTraceRender();}
function syncTraceRender(){
 const log=document.querySelector('#sync-log'),duration=document.querySelector('#sync-duration');
 if(!syncTrace){log.textContent='Aucune tentative enregistrée.';duration.textContent='';return;}
 const seconds=Math.floor(((syncTrace.ended||Date.now())-syncTrace.started)/1000);
 duration.textContent='Durée : '+seconds+' s'+(syncRequest?' · délai de réponse maximal : '+syncRequest.seconds+' s':'');
 log.textContent='Carnet 2.6.0 · '+new Date(syncTrace.started).toLocaleString('fr-FR')+'\n'+syncTrace.steps.map(x=>x.at+' s — '+x.text).join('\n');
}
function syncStage(text){syncMessage(text);if(syncTrace?.active){syncTrace.steps.push({at:Math.floor((Date.now()-syncTrace.started)/1000),text});syncTrace.steps=syncTrace.steps.slice(-16);syncTraceSave();}}
function syncTraceStart(){syncTrace={started:Date.now(),active:true,steps:[]};clearInterval(syncClock);syncClock=setInterval(syncTraceRender,1000);syncStage('Démarrage de la connexion.');}
function syncTraceEnd(){if(syncTrace){syncTrace.active=false;syncTrace.ended=Date.now();syncTraceSave();}clearInterval(syncClock);}
document.querySelector('#sync-cancel-request').onclick=()=>{if(syncRequest){syncRequest.cancelled=true;syncRequest.controller.abort();}};
function syncRecoverDiagnostic(){
 if(native)return;
 syncTrace=syncTraceRead();
 if(syncTrace?.active){syncTrace.active=false;syncTrace.ended=Date.now();syncTrace.steps.push({at:Math.floor((Date.now()-syncTrace.started)/1000),text:'INTERRUPTION : l’app a été rechargée ou fermée pendant cet échange. Relancez la connexion sur le Mac. Une transaction envoyée sera reprise lors de la prochaine tentative.'});syncTraceSave();syncButton.onclick().then(()=>{syncMessage('Tentative interrompue pendant « '+(syncTrace.steps.at(-2)?.text||'la connexion')+' ». Consultez le diagnostic ci-dessous, puis réessayez avec un nouveau code.');document.querySelector('#sync-diagnostics').open=true;});}
}
window.addEventListener('carnet-ready',syncRecoverDiagnostic,{once:true});
if(window.carnetReady)queueMicrotask(syncRecoverDiagnostic);
function syncStore(key,value){return new Promise((resolve,reject)=>{if(!db){reject(new Error('Le carnet n’est pas encore ouvert.'));return;}const tx=db.transaction('data',value===undefined?'readonly':'readwrite'),store=tx.objectStore('data'),req=value===undefined?store.get(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Le stockage de la synchronisation est plein.'));});}
async function syncSnapshot(){return validateState(await exportState());}
async function syncClose(){if(syncRunning)return;stopQRScan();clearInterval(syncPoll);if(native)await bridge('syncStop');syncInfo=null;window.carnetSyncLocked=false;syncDialog.close();}
syncDialog.addEventListener('cancel',e=>{e.preventDefault();syncClose().catch(e=>syncMessage(e.message));});
document.querySelector('#sync-close').onclick=()=>syncClose().catch(e=>syncMessage(e.message));
syncButton.onclick=async()=>{
 if(!window.carnetReady){toast('Attendez l’ouverture du carnet.');return;}
 if(saving||draft){toast('Enregistrez ou fermez la recette avant de synchroniser.');return;}
 window.carnetSyncLocked=true;syncDialog.showModal();syncMessage('');syncTraceRender();
 const content=document.querySelector('#sync-content');
 if(native){
  content.innerHTML='<p>Ouvrez Carnet sur l’iPhone, sur le même Wi-Fi, puis choisissez « Synchroniser mes appareils ».</p><p>La connexion dure 10 minutes et s’arrête à la fin de l’échange.</p><button class="primary" id="sync-start">Démarrer la connexion au Mac</button><section id="sync-pair" hidden><p>Dans Carnet sur l’iPhone, choisissez « Scanner le QR code du Mac ».</p><img id="sync-qr" alt="QR code de connexion temporaire à ce Mac" hidden><label>Code à coller dans Carnet sur l’iPhone<input id="sync-code" readonly spellcheck="false"></label><button class="secondary" id="sync-copy">Copier le code</button><details><summary>Première connexion : préparer l’iPhone</summary><p>Enregistrez le certificat, puis envoyez ce fichier à votre iPhone par AirDrop. Installez-le dans Réglages → Général → VPN et gestion de l’appareil. Puis activez « Carnet - connexion personnelle au Mac » dans Général → Informations → Réglages des certificats.</p><p>Ce certificat appartient à ce Mac. Cette configuration se fait une seule fois ; les recettes passent ensuite directement entre vos appareils.</p><button class="secondary" id="sync-profile">Enregistrer le certificat pour l’iPhone</button></details></section>';
  document.querySelector('#sync-start').onclick=async()=>{try{
   syncRunning=true;document.querySelector('#sync-close').disabled=true;window.carnetSyncLocked=true;syncMessage('Préparation de la connexion sécurisée…');document.querySelector('#sync-start').disabled=true;
   syncInfo=await bridge('syncStart');syncHostCommit=null;document.querySelector('#sync-code').value=syncInfo.addresses[0].replace('https://','')+'/'+(syncInfo.pin||syncInfo.token);document.querySelector('#sync-pair').hidden=false;if(syncInfo.qr){document.querySelector('#sync-qr').src=syncInfo.qr;document.querySelector('#sync-qr').hidden=false;}syncMessage('Prêt. PIN : '+(syncInfo.pin||'ancien code')+'. Connexion valable 10 minutes.');
   clearInterval(syncPoll);syncPoll=setInterval(async()=>{try{if(syncInfo?.expires)document.querySelector('#sync-duration').textContent='Code valable encore '+Math.max(0,Math.ceil((Date.parse(syncInfo.expires)-Date.now())/1000))+' s';if(!await bridge('syncStatus')){clearInterval(syncPoll);syncInfo=null;document.querySelector('#sync-start').disabled=false;document.querySelector('#sync-pair').hidden=true;window.carnetSyncLocked=false;if(!syncHostCommit)syncMessage('Connexion terminée. Vous pouvez en démarrer une nouvelle.');}}catch{}},2000);
  }catch(e){document.querySelector('#sync-start').disabled=false;syncMessage(e.message||String(e));}finally{syncRunning=false;document.querySelector('#sync-close').disabled=false;}};
  document.querySelector('#sync-copy').onclick=async()=>{const input=document.querySelector('#sync-code');input.select();try{await bridge('syncCopy',{text:input.value});syncMessage('Code copié. Collez-le dans l’app iPhone.')}catch{syncMessage('Sélectionnez le code et copiez-le avec ⌘C.')}};
  document.querySelector('#sync-profile').onclick=async()=>{try{if(await bridge('syncProfile'))syncMessage('Envoyez le certificat par AirDrop, installez-le sur l’iPhone, puis démarrez une nouvelle connexion si celle-ci a expiré.')}catch(e){syncMessage(e.message)}};
 }else{
  content.innerHTML='<p>Sur le Mac, ouvrez Carnet → Synchroniser mes appareils → Démarrer la connexion. Gardez les deux apps ouvertes sur le même Wi-Fi. La 4G/5G seule ne permet pas de joindre le Mac.</p><button type="button" class="primary" id="sync-scan">Scanner le QR code du Mac</button><div id="sync-camera" hidden><video autoplay muted playsinline></video><button type="button" class="secondary" id="sync-camera-stop">Arrêter la caméra</button></div><section id="sync-phone-form"><label>Code affiché sur le Mac<input id="sync-phone-code" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="192.168.1.12:12345/1234"></label><button type="button" class="primary" id="sync-connect">Connecter et synchroniser</button><button type="button" class="secondary" id="sync-test">Tester la connexion seulement</button></section><details><summary>Vérifier le certificat sur l’iPhone</summary><p>AirDrop transfère le fichier mais ne termine pas la configuration. Vérifiez le profil Carnet dans Réglages → Général → VPN et gestion de l’appareil, puis activez la confiance totale pour « Carnet - connexion personnelle au Mac » dans Général → Informations → Réglages des certificats. Le profil installé ne suffit pas : cette activation est également nécessaire.</p></details><div id="sync-conflicts"></div>';
  const connect=event=>{event?.preventDefault();event?.stopPropagation();return syncPhone().catch(e=>syncMessage(e.message||String(e)));};
  document.querySelector('#sync-scan').onclick=startQRScan;
  document.querySelector('#sync-connect').onclick=connect;
  document.querySelector('#sync-test').onclick=event=>{event.preventDefault();event.stopPropagation();syncPhone(true).catch(e=>syncMessage(e.message));};
  document.querySelector('#sync-phone-code').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();connect();}});
 }
 const recover=document.createElement('button');recover.className='text-button';recover.textContent='Récupérer le carnet avant la dernière synchronisation';content.append(recover);
 recover.onclick=async()=>{try{if(syncRunning)return;const previous=native?await bridge('syncBackupRead'):await syncStore('sync-before');if(!previous){syncMessage('Aucune copie de synchronisation disponible.');return;}if(!await confirmAction('Récupérer la copie avant synchronisation ?','Le carnet actuel sera remplacé sur cet appareil. Exportez-le d’abord si vous voulez conserver ses modifications.','Récupérer'))return;await syncClose();await commit(validateState(previous));detailId=null;render();toast('Copie avant synchronisation récupérée');}catch(e){syncMessage(e.message)}};
};
async function syncFetch(endpoint,path,body){
 const seconds=path==='/commit'?60:15,controller=new AbortController();
 syncRequest={controller,seconds,cancelled:false,timedOut:false};const request=syncRequest;
 document.querySelector('#sync-cancel-request').hidden=false;syncTraceRender();
 const timer=setTimeout(()=>{request.timedOut=true;controller.abort();},seconds*1000);
 try{
  const response=await fetch(endpoint.url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+endpoint.token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok){const value=await response.json().catch(()=>({}));throw new Error('HTTP '+response.status+' : '+(value.error||'Le Mac a refusé la connexion. Relancez-la sur le Mac.'));}
  try{return await response.json()}catch(e){if(e.name==='AbortError')throw e;throw new Error('RÉPONSE INVALIDE : le Mac n’a pas renvoyé un carnet lisible.');}
 }catch(e){
  if(request.cancelled)throw new Error('ATTENTE ARRÊTÉE : aucune nouvelle écriture ne sera envoyée. Si le Mac avait déjà reçu le carnet, réessayez pour terminer l’échange.');
  if(request.timedOut)throw new Error('DÉLAI DÉPASSÉ : le Mac n’a pas répondu en '+seconds+' s. Vérifiez que la connexion est démarrée sur le Mac et que les deux appareils sont sur le même Wi-Fi.');
  if(e instanceof TypeError||e.name==='AbortError')throw new Error('RÉSEAU / CERTIFICAT : le navigateur ne peut pas joindre le Mac. Vérifiez le même Wi-Fi, la confiance totale du certificat Carnet et l’accès au réseau local. Le navigateur ne permet pas de distinguer ces causes.');
  throw e;
 }finally{clearTimeout(timer);syncRequest=null;document.querySelector('#sync-cancel-request').hidden=true;syncTraceRender();}
}
function syncChoose(conflict){
 if(conflict.collection)return chooseKitchenConflict(conflict);
 return new Promise(resolve=>{
  const box=document.querySelector('#sync-conflicts');box.replaceChildren();const heading=document.createElement('h3');heading.textContent='Deux versions : '+(conflict.local?.title||conflict.remote?.title);box.append(heading);
  const caption=document.createElement('p');caption.textContent='Choisissez la version à conserver sur les deux appareils. Une copie avant synchronisation reste disponible.';box.append(caption);
  for(const [label,value] of [['Version iPhone',conflict.local],['Version Mac',conflict.remote]]){const section=document.createElement('section'),title=document.createElement('h4'),preview=document.createElement('pre');title.textContent=label+(value?'':' — supprimée');preview.textContent=value?[value.description,'Cuisine : '+(value.cuisines||[]).join(', '),`${value.category} · ${value.servings} personne(s) · préparation ${value.prep} min · cuisson ${value.cook} min · ${value.favorite?'favorite':'sans favori'}`,value.ingredients,value.steps,value.notes,value.jarEnabled?[value.jarMode,value.jarSize,value.jarInstructions,value.jarStorage,value.jarSource].join('\n'):'Sans bocaux',value.photos.length+' photo(s)',value.history.map(h=>h.date+' : '+h.note).join('\n'),JSON.stringify(value.waitItems||[]),'Sous-recettes : ' +(value.subRecipes||[]).map(x=>(state.recipes.find(r=>r.id===x.recipeID)?.title||x.recipeID)+' · '+x.servings+' portions').join(', ')].filter(Boolean).join('\n\n'):'La recette a été supprimée sur cet appareil.';const button=document.createElement('button');button.className='secondary';button.textContent=value?'Garder la '+label.toLowerCase():'Confirmer la suppression';button.onclick=()=>{box.replaceChildren();resolve(value?[value]:[])};section.append(title);if(value?.photos[0]){const image=document.createElement('img');image.src=value.photos[0];image.alt=label+' — couverture';image.className='sync-cover';section.append(image);}section.append(preview,button);box.append(section);}
  if(conflict.local&&conflict.remote){const both=document.createElement('button');both.className='primary';both.textContent='Garder les deux recettes';both.onclick=()=>{box.replaceChildren();const copy=structuredClone(conflict.remote);copy.id=crypto.randomUUID();copy.title+=' (version Mac)';resolve([conflict.local,copy]);};box.append(both);}
  const cancel=document.createElement('button');cancel.className='text-button';cancel.textContent='Annuler la synchronisation';cancel.onclick=()=>{box.replaceChildren();resolve(null)};box.append(cancel);box.scrollIntoView({block:'start'});
 });
}
async function syncPhone(testOnly=false){
 if(syncRunning)return;stopQRScan();syncRunning=true;syncTraceStart();document.querySelector('#sync-test').disabled=true;document.querySelector('#sync-connect').disabled=true;document.querySelector('#sync-close').disabled=true;
 try{
  if(navigator.onLine===false)throw new Error('HORS CONNEXION : connectez l’iPhone au Wi-Fi du Mac.');
  const endpoint=CarnetSyncCore.endpoint(document.querySelector('#sync-phone-code').value);
  if(endpoint.pairing){syncStage('Vérification du PIN à 4 chiffres…');const paired=await syncFetch(endpoint,'/pair',{});if(paired.protocol!==1||!/^[-_a-zA-Z0-9]{32}$/.test(paired.token))throw new Error('Version du Mac incompatible.');endpoint.token=paired.token;}
  syncStage('Connexion au Mac et réception du carnet…');
  const remote=await syncFetch(endpoint,'/snapshot');if(remote.protocol!==4||!/^[-a-zA-Z0-9]{36}$/.test(remote.hostID)||typeof remote.digest!=='string')throw new Error('Mettez à jour Carnet sur le Mac et l’iPhone vers la version 2.5.');
  const their=validateState(remote.state);if(await CarnetSyncCore.hash(their)!==remote.digest)throw new Error('Le carnet reçu est incomplet. Réessayez.');
  syncStage('Mac joignable. Carnet reçu : '+their.recipes.length+' recette(s).');
  if(testOnly){syncStage('TEST RÉUSSI : connexion sécurisée au Mac opérationnelle. Aucun carnet modifié.');return;}
  syncStage('Comparaison des deux carnets…');
  const mine=await syncSnapshot(),mineHash=await CarnetSyncCore.hash(mine),key='sync-baseline:'+remote.hostID,base=await syncStore(key),pending=await syncStore('sync-pending');let merged;
  if(pending?.hostID===remote.hostID&&pending.previous===mineHash&&await CarnetSyncCore.hash(pending.state)===remote.digest){merged=validateState(pending.state);syncStage('Reprise de l’échange interrompu…');}
  else{
   const result=await CarnetSyncCore.plan(mine,their,base);merged=result.state;
   for(const conflict of result.conflicts){syncStage('Choix nécessaire : une recette a changé sur les deux appareils.');const chosen=await syncChoose(conflict);if(chosen===null){syncMessage('Synchronisation annulée. Aucun carnet modifié.');return;}merged[conflict.collection||'recipes'].push(...chosen);}
   merged=validateState(merged);
   syncStage('En attente de votre confirmation : '+merged.recipes.length+' recette(s) sur chaque appareil.');
   if(!await confirmAction('Synchroniser les deux carnets ?',CarnetSyncCore.summary(mine,merged,'Sur l’iPhone')+'\n\n'+CarnetSyncCore.summary(their,merged,'Sur le Mac')+'\n\nUne copie des carnets actuels sera conservée, photos comprises.','Synchroniser')){syncMessage('Synchronisation annulée.');return;}
   syncStage('Sauvegarde de la copie iPhone avant échange…');
   await syncStore('sync-before',mine);await syncStore('sync-pending',{hostID:remote.hostID,previous:mineHash,state:merged});
   syncStage('Envoi des recettes et des photos au Mac…');
   const reply=await syncFetch(endpoint,'/commit',{expected:remote.digest,state:merged});if(reply.digest!==await CarnetSyncCore.hash(merged))throw new Error('La confirmation du Mac est incomplète. Réessayez pour reprendre.');
  }
  syncStage('Enregistrement du carnet sur l’iPhone…');
  const baseline=await CarnetSyncCore.fingerprint(merged);
  await commit(merged,{allowed:true,key,baseline});detailId=null;selectedIngredients=[];render();
  syncStage('Synchronisation terminée. Vos deux carnets sont à jour.');document.querySelector('#sync-phone-code').value='';
  try{await syncFetch(endpoint,'/finish',{})}catch{syncMessage('Carnets synchronisés. Vous pouvez fermer la connexion sur le Mac.');}
 }catch(e){syncStage((e.message||String(e))+' Vos copies locales sont conservées. Vous pouvez relancer pour reprendre.');}
 finally{syncTraceEnd();syncRunning=false;document.querySelector('#sync-test').disabled=false;document.querySelector('#sync-connect').disabled=false;document.querySelector('#sync-close').disabled=false;}
}
window.CarnetSyncHost={async handle(path,body){
 if(!native||!syncInfo||!window.carnetSyncLocked)throw new Error('La connexion au Mac est fermée.');
 if(path==='/snapshot'){const snapshot=await syncSnapshot();return {protocol:4,hostID:syncInfo.hostID,digest:await CarnetSyncCore.hash(snapshot),state:snapshot};}
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
