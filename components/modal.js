/**
 * PrivQuotes – Fullscreen Modal
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildTextFragment, buildBackground, extractPlainText, resolveFont } from '../utils/parser.js';
import { exportQuoteAsImage } from '../utils/imageExport.js';
import { copyToClipboard, showToast, formatDate, getViewport } from '../utils/helpers.js';
import { getFilteredQuotes } from './gallery.js';

const ms = { quote: null, index: 0 };
let E = {};

export function initModal() {
    E = {
        modal: document.getElementById('quoteModal'),
        overlay: document.getElementById('modalOverlay'),
        card: document.getElementById('modalCard'),
        wrap: document.getElementById('modalQuoteWrap'),
        text: document.getElementById('modalQuoteText'),
        tags: document.getElementById('modalTags'),
        info: document.getElementById('modalInfo'),
        close: document.getElementById('modalClose'),
        prev: document.getElementById('modalPrev'),
        next: document.getElementById('modalNext'),
        copyBtn: document.getElementById('copyBtn'),
        dlBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
    };
    _attachEvents();
}

export function openModal(quote) {
    if (!E.modal || !quote) return;
    const quotes = getFilteredQuotes();
    ms.index = quotes.findIndex(q => q.id === quote.id);
    ms.quote = quote;
    _render(quote);
    _show();
    _updateNav();
}

export function closeModal() {
    if (!E.modal) return;
    E.modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _onKey);
}

/* ── PRIVATE ── */

function _show() {
    E.modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', _onKey);
    requestAnimationFrame(() => E.close?.focus());
}

function _render(quote) {
    const { style: qs = {}, layout: ly = {}, text = '', meta = {}, type, language, id } = quote;
    const vp = getViewport();

    // Background on wrap
    if (E.wrap) {
        E.wrap.style.background = buildBackground(qs.background);
        E.wrap.style.padding = `${(ly.padding || 28) + 16}px 36px`;
    }

    // Text
    if (E.text) {
        const fontFam = resolveFont(qs.font);
        E.text.style.color = qs.textColor || '#fff';
        E.text.style.fontSize = `${ly.fontSize?.[vp] || 22}px`;
        E.text.style.textAlign = ly.align || 'center';
        E.text.style.fontFamily = fontFam;
        E.text.innerHTML = '';
        E.text.appendChild(buildTextFragment(text, qs, false));
    }

    // Tags
    if (E.tags) {
        E.tags.innerHTML = '';
        (meta.tags || []).forEach(tag => {
            const p = document.createElement('span');
            p.className = 'tag-pill';
            p.textContent = `#${tag}`;
            E.tags.appendChild(p);
        });
    }

    // Info
    if (E.info) {
        E.info.innerHTML = '';
        const langLabel = { english: '🇬🇧 English', hindi: '🇮🇳 Hindi', hinglish: '🔀 Hinglish' }[language] || language;
        [
            `✍️ ${meta.author || 'anonymous'}`,
            meta.date ? `📅 ${formatDate(meta.date)}` : null,
            `🏷️ ${type}`,
            `🌐 ${langLabel}`,
        ].filter(Boolean).forEach(s => {
            const span = document.createElement('span');
            span.textContent = s;
            E.info.appendChild(span);
        });
    }

    // Card border-radius + shadow
    if (E.card) {
        E.card.style.borderRadius = `${ly.borderRadius || 20}px`;
        E.card.style.overflow = 'hidden';
        if (ly.shadow) E.card.style.boxShadow = '0 24px 64px rgba(0,0,0,0.6)';
    }

    // Meta section background
    if (E.tags?.parentElement) {
        E.tags.parentElement.style.cssText =
            'padding:16px 28px;background:rgba(0,0,0,0.28);display:flex;flex-direction:column;gap:10px;';
    }
}

function _nav(dir) {
    const quotes = getFilteredQuotes();
    const ni = ms.index + dir;
    if (ni < 0 || ni >= quotes.length) return;
    ms.index = ni;
    ms.quote = quotes[ni];

    if (E.card) {
        E.card.style.transition = 'none';
        E.card.style.opacity = '0';
        E.card.style.transform = `translateX(${dir > 0 ? 30 : -30}px)`;
        requestAnimationFrame(() => {
            _render(ms.quote);
            requestAnimationFrame(() => {
                E.card.style.transition = 'opacity .22s ease, transform .22s ease';
                E.card.style.opacity = '1';
                E.card.style.transform = 'translateX(0)';
            });
        });
    } else {
        _render(ms.quote);
    }
    _updateNav();
}

function _updateNav() {
    const qs = getFilteredQuotes();
    if (E.prev) E.prev.disabled = ms.index <= 0;
    if (E.next) E.next.disabled = ms.index >= qs.length - 1;
}

function _onKey(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') _nav(-1);
    if (e.key === 'ArrowRight') _nav(+1);
}

function _attachEvents() {
    E.close?.addEventListener('click', closeModal);
    E.overlay?.addEventListener('click', closeModal);
    E.prev?.addEventListener('click', () => _nav(-1));
    E.next?.addEventListener('click', () => _nav(+1));

    // Copy
    E.copyBtn?.addEventListener('click', async () => {
        const plain = extractPlainText(ms.quote?.text || '');
        const ok = await copyToClipboard(plain);
        showToast(ok ? '📋 Copied!' : '❌ Copy failed.', ok ? 'success' : 'error');
    });

    // Download — passes full quote to exportQuoteAsImage
    E.dlBtn?.addEventListener('click', () => {
        if (ms.quote) exportQuoteAsImage(ms.quote);
    });

    // Share
    E.shareBtn?.addEventListener('click', async () => {
        const plain = extractPlainText(ms.quote?.text || '');
        const data = { title: 'PrivQuotes – PrivMITLab', text: plain, url: location.href };
        if (navigator.share && navigator.canShare?.(data)) {
            try { await navigator.share(data); showToast('✅ Shared!', 'success'); }
            catch (e) { if (e.name !== 'AbortError') showToast('❌ Share failed.', 'error'); }
        } else {
            const ok = await copyToClipboard(plain);
            showToast(ok ? '📋 Copied (share not supported)' : '❌ Failed', ok ? 'info' : 'error');
        }
    });

    // Touch swipe
    let sx = 0, sy = 0;
    E.modal?.addEventListener('touchstart', e => {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    E.modal?.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            _nav(dx < 0 ? 1 : -1);
        }
    }, { passive: true });
}