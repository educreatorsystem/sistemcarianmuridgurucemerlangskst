/* PWA: cache shell statik SAHAJA — tidak pernah cache data pelajar atau URL Apps Script. */
const CACHE_NAME = 'skst-shell-v1';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event => {
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return; // Jangan cache Apps Script, Google Sheet atau API.
  if(!ASSETS.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  const isPage=url.pathname===new URL('./index.html',self.registration.scope).pathname || url.pathname===new URL('./',self.registration.scope).pathname;
  if(isPage){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,clone));}
      return response;
    }).catch(()=>caches.match(request)));
  }else{
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok){const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,clone));}
      return response;
    })));
  }
});
