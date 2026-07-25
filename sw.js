var CACHE_NAME = 'crm-oliveira-shell-v1';
var ARQUIVOS_SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(ARQUIVOS_SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(nomes){
      return Promise.all(nomes.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

/* Só cuida do "app shell" (HTML/manifest/ícones) para abrir mais rápido e funcionar offline na tela.
   Chamadas à API do Apps Script (POST) nunca passam por aqui — os dados sempre vêm ao vivo da planilha. */
self.addEventListener('fetch', function(event){
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(function(){ return caches.match(event.request); })
  );
});
