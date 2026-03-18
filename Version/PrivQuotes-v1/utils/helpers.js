/**
 * PrivQuotes – General Helpers
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

/**
 * Debounce – limits function call rate.
 * @param {Function} fn
 * @param {number} delay (ms)
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle – ensures fn is called at most once per interval.
 * @param {Function} fn
 * @param {number} limit (ms)
 * @returns {Function}
 */
export function throttle(fn, limit = 200) {
    let inThrottle = false;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limit);
        }
    };
}

/**
 * Detect current viewport size.
 * @returns {'mobile'|'tablet'|'desktop'}
 */
export function getViewport() {
    const w = window.innerWidth;
    if (w <= 600) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='success']
 * @param {number} [duration=2800] ms
 */
export function showToast(message, type = 'success', duration = 2800) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Remove old classes/state
    toast.className = 'toast';
    toast.textContent = '';

    // Small forced reflow to restart animation
    void toast.offsetHeight;

    toast.textContent = message;
    toast.classList.add('active', `toast--${type}`);
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { toast.className = 'toast'; }, 350);
    }, duration);
}

/**
 * Copy text to clipboard.
 * Falls back to document.execCommand for older browsers.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    if (!text) return false;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    } catch {
        return false;
    }
}

/**
 * Lazy load observer – triggers callback when element enters viewport.
 * @param {Element} element
 * @param {Function} callback
 * @param {object} [options]
 * @returns {IntersectionObserver}
 */
export function observeLazyLoad(element, callback, options = {}) {
    const defaults = { root: null, rootMargin: '100px', threshold: 0.01 };
    const obs = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                callback(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { ...defaults, ...options });

    obs.observe(element);
    return obs;
}

/**
 * Escape text for safe use in regex.
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a unique element ID.
 * @param {string} [prefix='pq']
 * @returns {string}
 */
export function uid(prefix = 'pq') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Format a date string nicely.
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}