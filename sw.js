/* ============================================================
   FibroVida — Service Worker
   Cache-first para assets estáticos | Network-first para API
   ============================================================ */

const CACHE_NAME  = 'fibrovida-v4.0';
const STATIC_URLS = [
  './',
  './index.html',
  './style.css?v=12',
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
  if (event.request.method === 'GET' && !url.pathname.includes('/functions/')) {
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

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'FibroVida', body: 'Lembrete do seu app de saúde 💊', icon: './icons/icon-192.png' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || './icons/icon-192.png',
      badge:   './icons/icon-72.png',
      tag:     data.tag || 'fibrovida-reminder',
      data:    { url: data.url || './' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ── NOTIFICAÇÕES LOCAIS AGENDADAS (via postMessage) ──────────
// O app envia { type:'SCHEDULE_MED_ALERT', med, delayMs } ao SW
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SCHEDULE_MED_ALERT') return;
  const { med, delayMs } = event.data;
  setTimeout(() => {
    self.registration.showNotification('💊 FibroVida — Medicamento', {
      body:    `Hora de tomar: ${med.name}${med.dosage ? ' — ' + med.dosage : ''}`,
      icon:    './icons/icon-192.png',
      badge:   './icons/icon-72.png',
      tag:     `med-${med.id}`,
      vibrate: [150, 80, 150, 80, 150],
      data:    { url: './#medicamentos' },
    });
  }, delayMs);
});
