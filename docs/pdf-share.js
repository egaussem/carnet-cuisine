'use strict';
let sharedPDF=null,pdfShareGeneration=0,pdfShareBusy=false;
function pdfFileName(title){return (title.normalize('NFC').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,80)||'Recette')+'.pdf';}
function invalidateSharedPDF(){pdfShareGeneration++;sharedPDF=null;const share=$('#pdf-preview-share'),download=$('#pdf-preview-download'),status=$('#pdf-share-status');if(share){share.disabled=pdfShareBusy;share.textContent=native?'Partager le PDF':'Préparer le PDF à partager';}if(download)download.hidden=!native;if(status)status.textContent=pdfShareBusy?'Préparation en cours…':'';}
async function createRecipePDF(r,servings,options,onProgress=()=>{},isCurrent=()=>true){
 if(typeof html2canvas!=='function'||!window.jspdf?.jsPDF)throw Error('Le module PDF est indisponible. Fermez puis rouvrez Carnet avec Internet pour terminer sa mise à jour.');
 const host=document.createElement('div');host.className='pdf-document pdf-share-render';host.setAttribute('aria-hidden','true');host.setAttribute('inert','');host.innerHTML=pdfDocumentHTML(r,servings,options);document.body.append(host);
 try{
  if(document.fonts)await document.fonts.ready;
  await Promise.all([...host.querySelectorAll('img')].map(img=>img.decode()));
  if(!isCurrent())return null;
  host.innerHTML=paginatePDFHTML(host.innerHTML);
  // Canvas rendering does not implement object-fit: crop photos explicitly.
  for(const img of host.querySelectorAll('.print-cover,.pdf-gallery img')){
   await img.decode();const bounds=img.getBoundingClientRect(),canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.width*2);canvas.height=Math.ceil(bounds.height*2);const context=canvas.getContext('2d');if(!context)throw Error('Mémoire insuffisante pour préparer les photos.');
   const scale=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight),width=img.naturalWidth*scale,height=img.naturalHeight*scale;context.drawImage(img,(canvas.width-width)/2,(canvas.height-height)/2,width,height);img.src=canvas.toDataURL('image/jpeg',.95);canvas.width=canvas.height=1;await img.decode();
  }
  const pages=[...host.querySelectorAll('.pdf-sheet')];if(!pages.length)throw Error('Aucune page à partager.');
  const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});pdf.setProperties({title:r.title,creator:'Carnet'});
  for(let i=0;i<pages.length;i++){
   if(!isCurrent())return null;onProgress(i+1,pages.length);
   const canvas=await html2canvas(pages[i],{scale:2,backgroundColor:'#ffffff',logging:false,allowTaint:false,useCORS:false,windowWidth:1000,windowHeight:1200,scrollX:0,scrollY:0,onclone:async clone=>{await Promise.all([...document.querySelectorAll('link[rel=stylesheet]')].map(original=>new Promise((resolve,reject)=>{const link=clone.createElement('link');link.rel='stylesheet';link.href=original.href;link.onload=resolve;link.onerror=()=>reject(Error('Les styles du PDF ne peuvent pas être chargés.'));clone.head.append(link);})));}});
   try{if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,210,297,undefined,'FAST');}finally{canvas.width=canvas.height=1;}
  }
  if(!isCurrent())return null;
  return new File([pdf.output('arraybuffer')],pdfFileName(r.title),{type:'application/pdf'});
 }finally{host.remove();}
}
function downloadSharedPDF(){if(!sharedPDF)return;const url=URL.createObjectURL(sharedPDF),a=document.createElement('a');a.href=url;a.download=sharedPDF.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('#pdf-share-status').textContent='PDF enregistré. Vous pouvez l’envoyer depuis vos fichiers.';}
async function nativeRecipePDF(action){if(pdfPrinting)return;pdfPrinting=true;const status=$('#pdf-share-status');status.textContent='Création du PDF…';try{const r=state.recipes.find(x=>x.id===pdfRecipeID);if(!r)throw Error('Recette indisponible.');const result=await printRecipe(r,pdfServings,pdfOptions,action);status.textContent=result===false?'Enregistrement annulé.':action==='saveRecipePDF'?'PDF enregistré.':'Menu de partage ouvert.';}catch(e){status.textContent='PDF impossible : '+(e.message||e);}finally{pdfPrinting=false;}}
async function handlePDFShare(){
 if(native){await nativeRecipePDF('shareRecipePDF');return;}
 const button=$('#pdf-preview-share'),status=$('#pdf-share-status');if(pdfShareBusy||pdfPrinting)return;
 if(sharedPDF){
  // The prepared file is shared directly inside this click, preserving iOS user activation.
  if(!native&&navigator.canShare?.({files:[sharedPDF]})){
   const file=sharedPDF;button.disabled=true;
   try{await navigator.share({files:[file],title:file.name.replace(/\.pdf$/i,'')});status.textContent='Partage terminé.';}catch(e){if(e.name==='AbortError')status.textContent='Partage annulé. Le PDF reste prêt.';else{status.textContent='Partage indisponible. Utilisez « Enregistrer le PDF » pour l’envoyer depuis vos fichiers.';$('#pdf-preview-download').hidden=false;}}finally{button.disabled=false;}
  }else if(native){
   button.disabled=true;try{const bytes=new Uint8Array(await sharedPDF.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));await bridge('sharePDF',{name:sharedPDF.name,data:btoa(binary)});status.textContent='Choisissez comment envoyer le PDF.';}catch(e){status.textContent='Partage impossible : '+(e.message||e);}finally{button.disabled=false;}
  }else downloadSharedPDF();return;
 }
 const r=state.recipes.find(x=>x.id===pdfRecipeID);if(!r)return;
 const generation=++pdfShareGeneration;pdfShareBusy=true;button.disabled=true;button.textContent='Préparation du PDF…';
 try{
  const file=await createRecipePDF(r,pdfServings,{...pdfOptions},(page,total)=>{status.textContent='Création du PDF · page '+page+' / '+total;},()=>generation===pdfShareGeneration&&$('#pdf-preview').open);
  if(!file)return;sharedPDF=file;button.textContent=native||navigator.canShare?.({files:[file]})?'Partager le PDF':'Enregistrer le PDF';$('#pdf-preview-download').hidden=native||!navigator.canShare?.({files:[file]});status.textContent='PDF prêt · '+(file.size/1024/1024>=1?(file.size/1024/1024).toFixed(1)+' Mo':Math.max(1,Math.round(file.size/1024))+' Ko')+'. Appuyez sur « '+button.textContent+' ».';
 }catch(e){if(generation===pdfShareGeneration){button.textContent='Réessayer la création du PDF';status.textContent='Création impossible : '+(e.message||e)+'. Vous pouvez aussi utiliser l’impression / PDF.';}}
 finally{pdfShareBusy=false;button.disabled=false;if(generation!==pdfShareGeneration)invalidateSharedPDF();}
}
