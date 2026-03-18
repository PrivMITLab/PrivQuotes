/**
 * PrivQuotes – Helpers
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

export function debounce(fn, delay = 300) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function getViewport() {
    const w = window.innerWidth;
    if (w <= 540) return 'mobile';
    if (w <= 900) return 'tablet';
    return 'desktop';
}

export function showToast(msg, type = 'success', duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;

    el.className = 'toast';
    el.textContent = '';
    void el.offsetHeight; // force reflow

    el.textContent = msg;
    el.classList.add('active', `toast--${type}`);

    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        setTimeout(() => { el.className = 'toast'; el.style = ''; }, 350);
    }, duration);
}

export async function copyToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch { return false; }
}

export function formatDate(str) {
    if (!str) return '';
    try {
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        }).format(new Date(str));
    } catch { return str; }
}

export function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
}