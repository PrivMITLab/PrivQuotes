/**
 * PrivQuotes – Main Application Entry
 * JSON-Driven Privacy-First Quotes Engine
 *
 * PrivMITLab · Open Source · Privacy First
 * No tracking. No analytics. No servers.
 */

'use strict';

import { initGallery } from './components/gallery.js';
import { initModal, openModal } from './components/modal.js';
import { initSearch } from './components/search.js';
import { toggleLoading } from './components/renderer.js';
import { showToast } from './utils/helpers.js';

/* ══════════════════════════════════════════════════════════
   APP BOOTSTRAP
   ══════════════════════════════════════════════════════════ */

/**
 * Fetch and parse quotes.json.
 * @returns {Promise<Array>}
 */
async function loadQuotes() {
    try {
        const response = await fetch('./data/quotes.json', {
            // Cache-first for offline support
            cache: 'force-cache',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate structure
        if (!data.quotes || !Array.isArray(data.quotes)) {
            throw new Error('Invalid quotes.json structure. Expected { "quotes": [...] }');
        }

        return data.quotes;
    } catch (err) {
        console.error('[PrivQuotes] Failed to load quotes:', err);
        showToast('⚠️ Failed to load quotes. Check quotes.json.', 'error', 5000);
        return [];
    }
}

/**
 * Initialise theme from localStorage.
 */
function initTheme() {
    const saved = localStorage.getItem('privquotes-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

/**
 * Toggle between dark and light themes.
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('privquotes-theme', next);
    updateThemeIcon(next);
}

/**
 * Update theme toggle button icon.
 * @param {string} theme
 */
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/**
 * Register Service Worker for PWA / offline support.
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
        const reg = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
        });
        console.log('[PrivQuotes] Service Worker registered:', reg.scope);
    } catch (err) {
        console.warn('[PrivQuotes] SW registration failed:', err);
    }
}

/**
 * Main application initialiser.
 */
async function initApp() {
    // 1. Theme
    initTheme();

    // 2. Theme toggle button
    document.getElementById('themeToggle')
        ?.addEventListener('click', toggleTheme);

    // 3. Show loading skeleton
    toggleLoading(true);

    // 4. Initialise modal
    initModal();

    // 5. Initialise search/filter
    initSearch();

    // 6. Load quotes
    const quotes = await loadQuotes();

    // 7. Initialise gallery
    initGallery(quotes, openModal);

    // 8. Register PWA Service Worker
    registerServiceWorker();

    // 9. Announce to screen readers
    const sr = document.createElement('div');
    sr.className = 'sr-only';
    sr.setAttribute('role', 'status');
    sr.setAttribute('aria-live', 'polite');
    sr.textContent = `PrivQuotes loaded. ${quotes.length} quotes available.`;
    document.body.appendChild(sr);
    setTimeout(() => document.body.removeChild(sr), 3000);

    console.log(
        '%c🔐 PrivQuotes%c by PrivMITLab — Feel the Words. Own the Experience.',
        'color:#00ffd5;font-weight:bold;font-size:14px;',
        'color:#aaa;font-size:12px;'
    );
}

/* ── Boot ── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}