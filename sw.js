/* ============================================================
   FibroVida — Service Worker
   Cache-first para assets estáticos | Network-first para API
   ============================================================ */

const CACHE_NAME  = 'fibrovida-v3.0';
const STATIC_URLS = [
  './',
  './index.html',
  './style.css?v=5',
  './app.js',
  './icons/fibrovida.svg',
  './manifest.json',
  './Images/login-bg.jpg.png',
];

// ── INSTALL: pré-cache dos assets estáticos ───────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estratégia híbrida ─────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first: Supabase API e Stripe (dados em tempo real)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('cancaonova.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Retorna resposta de erro legível para a app
          return new Response(
            JSON.stringify({ error: 'offline', message: 'Sem conexão com a internet.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Cache-first: assets estáticos da app shell
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          // Armazena novas respostas bem-sucedidas no cache
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Fallback para HTML se offline e não há cache
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
