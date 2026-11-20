const CACHE = 'skst-shell-v3-cards-mobile-pdf';
const FILES = ['./','./index.html','./styles.css?v=3','./config.js','./app.js?v=3','./manifest.webmanifest','./assets/logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-180.png','./cetak.html','./report.css?v=3','./report.js?v=3','./report-utils.js?v=3','./vendor/jspdf.umd.min.js','./vendor/jspdf.plugin.autotable.min.js'];
self.addEventListener('install',event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('skst-shell-') && key !== CACHE).map(key => caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event => {
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 event.respondWith(fetch(event.request).catch(() => caches.match(event.request,{ignoreSearch:event.request.mode==='navigate'}).then(response => response || new Response('Sila sambung internet untuk memuatkan aplikasi.',{status:503}))));
});
