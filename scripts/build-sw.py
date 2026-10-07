from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]/'docs'
files=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p.name not in ['sw.js','.nojekyll'])
digest=hashlib.sha256(b''.join((n.encode()+b'\0'+(root/n).read_bytes()) for n in files)).hexdigest()[:16]
code='''// Generated from the public app files. No recipes or personal photos are cached here.
'use strict';
const FILES=__FILES__;
const PREFIX='carnet-pwa:'+encodeURIComponent(new URL(self.registration.scope).pathname)+':';
const CACHE=PREFIX+'__HASH__';
const BASE=new URL(self.registration.scope);
const ASSETS=new Set(FILES.map(p=>new URL(p,BASE).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(p=>new Request(new URL(p,BASE),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==BASE.origin)return;url.search='';const home=url.href===BASE.href||url.href===new URL('index.html',BASE).href;if(!home&&!ASSETS.has(url.href))return;event.respondWith((async()=>{const cache=await caches.open(CACHE),key=home?new URL('index.html',BASE).href:url.href;const hit=await cache.match(key);if(hit)return hit;try{const response=await fetch(event.request);if(response.ok&&response.type!=='opaque')await cache.put(key,response.clone());return response;}catch{return new Response('Carnet n’est pas encore disponible hors connexion. Ouvrez-le une première fois avec Internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}})());});
'''.replace('__FILES__',json.dumps(files,ensure_ascii=False)).replace('__HASH__',digest)
(root/'sw.js').write_text(code)
print('Service worker:',len(files),'public assets, version',digest)
