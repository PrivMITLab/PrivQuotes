/**
 * PrivQuotes – Fullscreen Modal Component
 * Handles: open/close, quote display, navigation, actions
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildTextFragment, buildBackground, extractPlainText } from '../utils/parser.js';
import { applyCardStyles } from './renderer.js';
import { exportQuoteAsImage } from '../utils/imageExport.js';
import { copyToClipboard, showToast, formatDate, getViewport } from '../utils/helpers.js';
import { getFilteredQuotes } from './gallery.js';

/**
 * Modal state.
 */
const modalState = {
    currentQuote: null,
    currentIndex: 0,
};

/**
 * DOM references (cached after init).
 */
let els = {};

/**
 * Initialise the modal component.
 */
export function initModal() {
    els = {
        modal: document.getElementById('quoteModal'),
        overlay: document.getElementById('modalOverlay'),
        card: document.getElementById('modalCard'),
        quoteWrap: document.getElementById('modalQuoteWrap'),
        quoteText: document.getElementById('modalQuoteText'),
        tags: document.getElementById('modalTags'),
        info: document.getElementById('modalInfo'),
        closeBtn: document.getElementById('modalClose'),
        prevBtn: document.getElementById('modalPrev'),
        nextBtn: document.getElementById('modalNext'),
        copyBtn: document.getElementById('copyBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
    };

    attachModalEvents();
}

/**
 * Open modal with a specific quote.
 * @param {object} quote
 */
export function openModal(quote) {
    if (!els.modal || !quote) return;

    const quotes = getFilteredQuotes();
    modalState.currentIndex = quotes.findIndex(q => q.id === quote.id);
    modalState.currentQuote = quote;

    renderModalContent(quote);
    showModal();
    updateNavButtons();
}

/**
 * Close the modal.
 */
export function closeModal() {
    const { modal } = els;
    if (!modal) return;

    modal.setAttribute('hidden', '');
    modal.classList.remove('modal--visible');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalKeydown);
}

/* ══════════════════════════════════════════════════════
   PRIVATE FUNCTIONS
   ══════════════════════════════════════════════════════ */

function showModal() {
    const { modal } = els;
    if (!modal) return;

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleModalKeydown);

    // Focus trap: focus the close button
    requestAnimationFrame(() => {
        els.closeBtn?.focus();
    });
}

/**
 * Render quote content into modal.
 * @param {object} quote
 */
function renderModalContent(quote) {
    const { style: qStyle, layout, text, meta, type, language } = quote;
    const viewport = getViewport();

    // ── Background + text styles on the card wrapper
    const { quoteWrap, card, quoteText, tags, info } = els;
    if (!quoteWrap) return;

    // Apply background to quoteWrap
    quoteWrap.style.background = buildBackground(qStyle?.background);
    quoteWrap.style.padding = `${(layout?.padding || 24) + 16}px`;

    // Apply text styles
    if (quoteText) {
        quoteText.style.color = qStyle?.textColor || '#ffffff';
        quoteText.style.fontSize = `${layout?.fontSize?.[viewport] || 22}px`;
        quoteText.style.textAlign = layout?.align || 'center';
        quoteText.style.fontFamily = qStyle?.font
            ? `'${qStyle.font}', system-ui, sans-serif`
            : 'inherit';

        // Clear and re-render parsed text
        quoteText.innerHTML = '';
        const frag = buildTextFragment(text, qStyle, false);
        quoteText.appendChild(frag);
    }

    // ── Meta tags
    if (tags) {
        tags.innerHTML = '';
        (meta?.tags || []).forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.textContent = `#${tag}`;
            tags.appendChild(pill);
        });
    }

    // ── Meta info
    if (info) {
        const author = meta?.author || 'anonymous';
        const date = formatDate(meta?.date || '');
        const langLabel = {
            english: '🇬🇧 English',
            hindi: '🇮🇳 Hindi',
            hinglish: '🔀 Hinglish'
        }[language] || language;

        info.innerHTML = '';

        [
            `✍️ ${author}`,
            date ? `📅 ${date}` : null,
            `🏷️ ${type}`,
            `🌐 ${langLabel}`,
        ].filter(Boolean).forEach(item => {
            const span = document.createElement('span');
            span.textContent = item;
            info.appendChild(span);
        });
    }

    // ── Modal meta section background
    const metaEl = document.getElementById('modalMeta');
    if (metaEl) {
        metaEl.style.background = 'rgba(0,0,0,0.3)';
        metaEl.style.padding = '16px 28px';
    }

    // ── Card border radius
    if (card) {
        card.style.borderRadius = `${layout?.borderRadius || 20}px`;
        card.style.overflow = 'hidden';
        if (layout?.shadow) {
            card.style.boxShadow = '0 24px 64px rgba(0,0,0,0.6)';
        }
    }
}

/**
 * Navigate to previous/next quote.
 * @param {number} direction - -1 (prev) or +1 (next)
 */
function navigateModal(direction) {
    const quotes = getFilteredQuotes();
    if (quotes.length === 0) return;

    const newIndex = modalState.currentIndex + direction;
    if (newIndex < 0 || newIndex >= quotes.length) return;

    modalState.currentIndex = newIndex;
    modalState.currentQuote = quotes[newIndex];

    // Animate transition
    const { card } = els;
    if (card) {
        card.style.opacity = '0';
        card.style.transform = direction > 0
            ? 'translateX(30px)'
            : 'translateX(-30px)';

        setTimeout(() => {
            renderModalContent(modalState.currentQuote);
            card.style.transition = 'all 0.25s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 150);
    } else {
        renderModalContent(modalState.currentQuote);
    }

    updateNavButtons();
}

/**
 * Update nav button disabled state.
 */
function updateNavButtons() {
    const quotes = getFilteredQuotes();
    const { prevBtn, nextBtn } = els;

    if (prevBtn) prevBtn.disabled = modalState.currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = modalState.currentIndex >= quotes.length - 1;
}

/**
 * Attach all modal event listeners.
 */
function attachModalEvents() {
    // Close via button
    els.closeBtn?.addEventListener('click', closeModal);

    // Close via overlay click
    els.overlay?.addEventListener('click', closeModal);

    // Navigation
    els.prevBtn?.addEventListener('click', () => navigateModal(-1));
    els.nextBtn?.addEventListener('click', () => navigateModal(1));

    // Copy action
    els.copyBtn?.addEventListener('click', async () => {
        const plain = extractPlainText(modalState.currentQuote?.text || '');
        const success = await copyToClipboard(plain);
        showToast(success ? '📋 Copied to clipboard!' : '❌ Copy failed.', success ? 'success' : 'error');
    });

    // Download action
    els.downloadBtn?.addEventListener('click', () => {
        if (!modalState.currentQuote) return;
        exportQuoteAsImage(modalState.currentQuote, buildTextFragment);
    });

    // Share action (Web Share API with fallback)
    els.shareBtn?.addEventListener('click', async () => {
        const plain = extractPlainText(modalState.currentQuote?.text || '');
        const shareData = {
            title: 'PrivQuotes – PrivMITLab',
            text: plain,
            url: window.location.href,
        };

        if (navigator.share && navigator.canShare?.(shareData)) {
            try {
                await navigator.share(shareData);
                showToast('✅ Shared successfully!', 'success');
            } catch (e) {
                if (e.name !== 'AbortError') {
                    showToast('❌ Share failed.', 'error');
                }
            }
        } else {
            // Fallback: copy
            const success = await copyToClipboard(plain);
            showToast(success ? '📋 Link copied (Share not supported)' : '❌ Failed', success ? 'info' : 'error');
        }
    });

    // Touch/swipe support for mobile
    attachSwipeSupport();
}

/**
 * Keyboard navigation inside modal.
 * @param {KeyboardEvent} e
 */
function handleModalKeydown(e) {
    switch (e.key) {
        case 'Escape': closeModal(); break;
        case 'ArrowLeft': navigateModal(-1); break;
        case 'ArrowRight': navigateModal(+1); break;
    }
}

/**
 * Touch swipe support for mobile navigation.
 */
function attachSwipeSupport() {
    const { modal } = els;
    if (!modal) return;

    let startX = 0;
    let startY = 0;

    modal.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    modal.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        // Only handle horizontal swipes
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx < 0) navigateModal(+1);  // swipe left → next
            else navigateModal(-1);  // swipe right → prev
        }
    }, { passive: true });
}