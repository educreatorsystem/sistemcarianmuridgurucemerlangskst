// Cache only the public PWA shell and school crest, not student/health/IC records.
var CACHE_NAME='skst-shell-android-compat-v4';
var ASSETS=['./','./index.html','./manifest.webmanifest','./favicon.ico','./assets/school-logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/maskable-192.png','./assets/maskable-512.png','./assets/apple-touch-icon.png','./assets/favicon-32.png','./assets/favicon-48.png'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key!==CACHE_NAME;}).map(function(key){return caches.delete(key);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(event){
 var req=event.request;if(req.method!=='GET')return;
 var u=new URL(req.url);if(u.origin!==self.location.origin)return; // No cache for Google Apps Script.
 var urls=ASSETS.map(function(path){return new URL(path,self.registration.scope).pathname;});
 if(urls.indexOf(u.pathname)===-1)return;
 var isHTML=u.pathname===new URL('./',self.registration.scope).pathname||u.pathname===new URL('./index.html',self.registration.scope).pathname;
 if(isHTML){event.respondWith(fetch(req,{cache:'no-store'}).then(function(response){if(response.ok){var clone=response.clone();caches.open(CACHE_NAME).then(function(c){c.put(req,clone);});}return response;}).catch(function(){return caches.match(req); }));return;}
 event.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(resp){if(resp.ok){var copy=resp.clone();caches.open(CACHE_NAME).then(function(c){c.put(req,copy);});}return resp;});}));
});
