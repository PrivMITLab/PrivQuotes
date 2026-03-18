/**
 * PrivQuotes – Service Worker
 * Offline-First PWA support with Cache-First strategy
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

const CACHE_NAME = 'privquotes-v1.0.0';
const OFFLINE_URL = './index.html';

/**
 * Static assets to pre-cache on install.
 */
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './data/quotes.json',
    './components/gallery.js',
    './components/modal.js',
    './components/search.js',
    './components/renderer.js',
    './utils/parser.js',
    './utils/imageExport.js',
    './utils/helpers.js',
    // Fonts fallback (if available locally)
    // './fonts/Poppins-Regular.woff2',
    // html2canvas CDN will be cached on first request
];

/* ══════════════════════════════════════════════════════════
   INSTALL – Pre-cache core assets
   ══════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
    console.log('[SW] Installing PrivQuotes Service Worker…');

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching core assets');
            // Use addAll – fails if any resource fails
            // Use individual add with catch for resilience
            return Promise.allSettled(
                PRECACHE_ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn(`[SW] Failed to cache: ${url}`, err);
                    })
                )
            );
        }).then(() => {
            console.log('[SW] Install complete');
            // Take control immediately without waiting
            return self.skipWaiting();
        })
    );
});

/* ══════════════════════════════════════════════════════════
   ACTIVATE – Clean old caches
   ══════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
    console.log('[SW] Activating PrivQuotes Service Worker…');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            // Take control of all pages
            return self.clients.claim();
        })
    );
});

/* ══════════════════════════════════════════════════════════
   FETCH – Cache-First with Network Fallback
   ══════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and non-http requests
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(handleFetch(request));
});

/**
 * Fetch strategy:
 * - App shell / local assets → Cache First
 * - CDN resources (fonts, html2canvas) → Cache with Network fallback
 * - Navigation → Serve index.html from cache
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleFetch(request) {
    const url = new URL(request.url);

    // Navigation request → serve app shell
    if (request.mode === 'navigate') {
        try {
            // Try network first for navigate (fresh content)
            const networkResponse = await fetchWithTimeout(request, 3000);
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        } catch {
            // Offline → serve cached index.html
            const cached = await caches.match(OFFLINE_URL);
            return cached || new Response('Offline – PrivQuotes', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }

    // Cache-first for all other requests
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // Serve from cache, update cache in background (Stale-While-Revalidate)
        updateCacheInBackground(request);
        return cachedResponse;
    }

    // Not in cache → fetch from network and cache
    try {
        const networkResponse = await fetchWithTimeout(request, 5000);
        if (networkResponse.ok || networkResponse.type === 'opaque') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        console.warn('[SW] Fetch failed (offline?):', request.url);

        // Return a basic offline response for non-navigate requests
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'PrivQuotes is running offline. Some resources may be unavailable.'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Background cache update (Stale-While-Revalidate pattern).
 * @param {Request} request
 */
function updateCacheInBackground(request) {
    // Don't await – intentionally fire-and-forget
    fetch(request)
        .then(async response => {
            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, response);
            }
        })
        .catch(() => {
            // Silently fail in background
        });
}

/**
 * Fetch with timeout.
 * @param {Request} request
 * @param {number} timeout ms
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(request, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
        fetch(request)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/* ══════════════════════════════════════════════════════════
   MESSAGE – Handle app messages
   ══════════════════════════════════════════════════════════ */
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data?.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0]?.postMessage({ success: true });
        });
    }
});