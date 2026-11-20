/* Cache isolated to launcher and crest; no student data stored on device. */
const CACHE_NAME='carian-sekolah-crest-v20261120v7';
const STATIC=["./", "./index.html", "./manifest-20261120v7.webmanifest", "./favicon.ico", "./assets/lencana-sekolah-20261120v7.png", "./assets/logo-favicon-48-20261120v7.png", "./assets/logo-apple-180-20261120v7.png", "./assets/logo-pwa-192-20261120v7.png", "./assets/logo-pwa-512-20261120v7.png", "./assets/logo-maskable-192-20261120v7.png", "./assets/logo-maskable-512-20261120v7.png"];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 let req=event.request;
 if(req.method!=='GET')return;
 let url=new URL(req.url);
 if(url.origin!==self.location.origin)return; // never intercept Google Apps Script requests.
 if(req.mode==='navigate' || url.pathname.endsWith('/config.js')){
  event.respondWith(fetch(req,{cache:'no-store'}).then(resp=>{
   if(resp.ok){let copy=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}
   return resp;
  }).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html'))));
  return;
 }
 event.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(resp=>{
   if(resp.ok){let copy=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}
   return resp;
 })));
});
