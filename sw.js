const CACHE='skst-shell-v4-1-new-endpoint';
const FILES=['./','./index.html','./styles.css?v=4.1','./compat.js?v=4.1','./config.js?v=4.1','./data.js?v=4.1','./app.js?v=4.1','./manifest.webmanifest','./assets/logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-180.png','./cetak.html','./report.css?v=4.1','./report.js?v=4.1','./report-utils.js?v=4.1','./vendor/jspdf.umd.min.js','./vendor/jspdf.plugin.autotable.min.js'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(FILES);}));self.skipWaiting();});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key.indexOf('skst-shell-')===0&&key!==CACHE;}).map(function(key){return caches.delete(key);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(event){
 var url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 event.respondWith(fetch(event.request,{cache:'no-store'}).catch(function(){return caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'}).then(function(response){return response||new Response('Sila sambung internet untuk memuatkan aplikasi.',{status:503});});}));
});
