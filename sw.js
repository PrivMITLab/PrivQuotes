/**
 * PrivQuotes – Service Worker
 * quotes.json → hamesha network se (fresh)
 * baaki sab → cache first (fast)
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

const CACHE_NAME   = 'privquotes-v1.0.0';
const OFFLINE_PAGE = './index.html';

/* quotes.json yahan NAHI hai — woh hamesha network se aayega */
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './components/gallery.js',
  './components/modal.js',
  './components/search.js',
  './components/renderer.js',
  './utils/parser.js',
  './utils/imageExport.js',
  './utils/helpers.js',
  './icons/icon.png',
];

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.allSettled(
          PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — purane caches delete karo ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── FETCH — smart routing ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  /* quotes.json → HAMESHA network se, kabhi cache nahi */
  if (url.pathname.includes('quotes.json')) {
    event.respondWith(networkOnly(request));
    return;
  }

  /* Navigation → network first */
  if (request.mode === 'navigate') {
    event.respondWith(navigateHandler(request));
    return;
  }

  /* Baaki sab → cache first */
  event.respondWith(cacheFirst(request));
});

/* ══════════════════════════════════════════════════════════
   STRATEGIES
   ══════════════════════════════════════════════════════════ */

/* quotes.json ke liye — sirf network, cache bilkul nahi */
async function networkOnly(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    console.log('[SW] quotes.json → network fresh ✓');
    return response;
  } catch (err) {
    console.warn('[SW] quotes.json network fail — offline fallback');
    /* Offline pe empty array do taaki app crash na ho */
    return new Response(
      JSON.stringify({ meta: { brand: 'PrivMITLab' }, quotes: [] }),
      {
        status:  200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/* HTML navigation ke liye */
async function navigateHandler(request) {
  try {
    const response = await fetch(request);
    const cache    = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return caches.match(OFFLINE_PAGE) ||
      new Response('<h1>Offline</h1>', {
        status:  503,
        headers: { 'Content-Type': 'text/html' },
      });
  }
}

/* Static assets ke liye — cache se fast load */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/* ── MESSAGES ── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});