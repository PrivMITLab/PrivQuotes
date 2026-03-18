/**
 * PrivQuotes – Main App Entry
 * PrivMITLab · Open Source · Privacy First
 * No tracking. No analytics. No servers.
 */

'use strict';

import { initGallery } from './components/gallery.js';
import { initModal, openModal } from './components/modal.js';
import { initSearch } from './components/search.js';
import { toggleLoading } from './components/renderer.js';
import { showToast } from './utils/helpers.js';
import { initImageExport } from './utils/imageExport.js';

/* ══════════════════════════════════════════════════════════
   LOAD QUOTES — JSON se auto load, koi cache nahi
   Bas quotes.json mein add karo — yahan kuch nahi badalna
   ══════════════════════════════════════════════════════════ */
async function loadQuotes() {
    try {
        const response = await fetch('./data/quotes.json', {
            cache: 'no-store'   // ← YEHI THA PROBLEM. Ab hamesha fresh load hoga.
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.quotes)) {
            throw new Error('"quotes" array nahi mila quotes.json mein');
        }

        console.log(`[PrivQuotes] ✓ ${data.quotes.length} quotes loaded`);
        return data.quotes;

    } catch (err) {
        console.error('[PrivQuotes] Load failed:', err);
        showToast('⚠️ quotes.json load nahi hua', 'error', 5000);
        return [];
    }
}

/* ══════════════════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════════════════ */
function initTheme() {
    const saved = localStorage.getItem('pq-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    _updateThemeIcon(saved);
}

function _toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pq-theme', next);
    _updateThemeIcon(next);
}

function _updateThemeIcon(theme) {
    const el = document.getElementById('themeIcon');
    if (el) el.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ══════════════════════════════════════════════════════════
   SERVICE WORKER
   ══════════════════════════════════════════════════════════ */
async function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none',
        });
        console.log('[PrivQuotes] SW registered:', reg.scope);

        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
            });
        });

    } catch (err) {
        console.warn('[PrivQuotes] SW failed:', err);
    }
}

/* ══════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════ */
async function initApp() {
    initTheme();
    document.getElementById('themeToggle')?.addEventListener('click', _toggleTheme);

    initImageExport();
    toggleLoading(true);
    initModal();
    initSearch();

    const quotes = await loadQuotes();
    initGallery(quotes, openModal);

    registerSW();

    console.log(
        '%c🔐 PrivQuotes%c · PrivMITLab',
        'color:#00ffd5;font-weight:bold;font-size:14px;',
        'color:#777;font-size:11px;'
    );
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}