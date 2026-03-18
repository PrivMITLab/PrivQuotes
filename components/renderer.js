/**
 * PrivQuotes – Renderer
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildTextFragment, buildBackground, resolveFont } from '../utils/parser.js';
import { getViewport } from '../utils/helpers.js';

const LANG_LABELS = {
    english: '🇬🇧 EN',
    hindi: '🇮🇳 HI',
    hinglish: '🔀 HIN',
};

const TYPE_EMOJIS = {
    sad: '😢',
    love: '❤️',
    motivational: '💪',
    reality: '🧠',
    life: '🌿',
};

/**
 * Render a single quote card.
 * @param {object}   quote
 * @param {number}   index
 * @param {Function} onClick
 * @returns {HTMLElement}
 */
export function renderCard(quote, index, onClick) {
    const { id, text, type, language, style: qs = {}, layout: ly = {}, animation } = quote;
    const viewport = getViewport();

    const card = document.createElement('article');
    card.className = 'quote-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Quote ${id}: ${type}`);
    card.dataset.id = id;

    // Entry animation
    if (animation?.entry) card.classList.add(`anim--${animation.entry}`);

    // Background + color
    card.style.background = buildBackground(qs.background);
    card.style.color = qs.textColor || '#ffffff';
    card.style.borderRadius = `${ly.borderRadius ?? 18}px`;
    card.style.padding = `${ly.padding ?? 22}px 20px`;
    if (ly.shadow) card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.45)';

    // Font (multi-font support)
    const fontFam = resolveFont(qs.font);
    card.style.fontFamily = fontFam;

    // Font size responsive
    const fs = ly.fontSize;
    if (fs) card.style.fontSize = `${fs[viewport] || fs.desktop || 15}px`;

    // Language badge
    if (language && LANG_LABELS[language]) {
        const lb = document.createElement('span');
        lb.className = 'quote-card__lang';
        lb.textContent = LANG_LABELS[language];
        card.appendChild(lb);
    }

    // Type badge
    if (type) {
        const tb = document.createElement('span');
        tb.className = 'quote-card__badge';
        tb.textContent = `${TYPE_EMOJIS[type] || '💬'} ${type}`;
        card.appendChild(tb);
    }

    // Quote text — safe parsed fragment
    const p = document.createElement('p');
    p.className = 'quote-card__text';
    p.style.fontFamily = fontFam;
    p.appendChild(buildTextFragment(text, qs, true));
    card.appendChild(p);

    // Expand indicator
    const ex = document.createElement('span');
    ex.className = 'quote-card__expand';
    ex.setAttribute('aria-hidden', 'true');
    ex.textContent = '⤢';
    card.appendChild(ex);

    // Events
    card.addEventListener('click', () => onClick(quote));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(quote); }
    });

    return card;
}

export function toggleLoading(show) {
    const ld = document.getElementById('loadingState');
    const gl = document.getElementById('gallery');
    if (!ld || !gl) return;
    ld.style.display = show ? 'block' : 'none';
    gl.style.display = show ? 'none' : 'block';
}

export function toggleEmptyState(show) {
    const em = document.getElementById('emptyState');
    const gl = document.getElementById('gallery');
    if (!em || !gl) return;
    if (show) { em.removeAttribute('hidden'); gl.style.display = 'none'; }
    else { em.setAttribute('hidden', ''); gl.style.display = 'block'; }
}

export function updateStatsBar(count, total) {
    const el = document.getElementById('quoteCount');
    if (!el) return;
    el.textContent = count === total
        ? `${total} quotes`
        : `${count} of ${total} quotes`;
}