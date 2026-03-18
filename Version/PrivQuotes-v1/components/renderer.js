/**
 * PrivQuotes – Quote Renderer
 * Converts a quote JSON object into a gallery card DOM element
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildTextFragment, buildBackground } from '../utils/parser.js';
import { getViewport } from '../utils/helpers.js';

/**
 * Emoji label map for language badges.
 */
const LANG_LABELS = {
    english: '🇬🇧 EN',
    hindi: '🇮🇳 HI',
    hinglish: '🔀 HIN',
};

/**
 * Type emoji map.
 */
const TYPE_EMOJIS = {
    sad: '😢',
    love: '❤️',
    motivational: '💪',
    reality: '🧠',
    life: '🌿',
};

/**
 * Render a single quote as a gallery card.
 * @param {object}   quote     - Quote object from JSON
 * @param {number}   index     - Position in current filtered list
 * @param {Function} onClick   - Click handler (receives quote)
 * @returns {HTMLElement}      - .quote-card element
 */
export function renderCard(quote, index, onClick) {
    const { id, text, type, language, style: qStyle, layout, animation } = quote;
    const viewport = getViewport();

    // ── Card container
    const card = document.createElement('article');
    card.className = 'quote-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Quote ${id}: ${type}`);
    card.dataset.id = id;

    // ── Apply animation class
    if (animation?.entry) {
        card.classList.add(`anim--${animation.entry}`);
    }

    // ── Apply inline styles (background, colors, etc.)
    applyCardStyles(card, qStyle, layout, viewport);

    // ── Language badge
    if (language && LANG_LABELS[language]) {
        const langBadge = document.createElement('span');
        langBadge.className = 'quote-card__lang';
        langBadge.textContent = LANG_LABELS[language];
        card.appendChild(langBadge);
    }

    // ── Type badge
    if (type) {
        const typeBadge = document.createElement('span');
        typeBadge.className = 'quote-card__badge';
        const emoji = TYPE_EMOJIS[type] || '💬';
        typeBadge.textContent = `${emoji} ${type}`;
        card.appendChild(typeBadge);
    }

    // ── Quote text (parsed)
    const textEl = document.createElement('p');
    textEl.className = 'quote-card__text';

    if (qStyle?.font) {
        textEl.style.fontFamily = `'${qStyle.font}', system-ui, sans-serif`;
    }

    // Build and append safe DOM fragment
    const frag = buildTextFragment(text, qStyle, true);
    textEl.appendChild(frag);
    card.appendChild(textEl);

    // ── Expand indicator
    const expand = document.createElement('span');
    expand.className = 'quote-card__expand';
    expand.setAttribute('aria-hidden', 'true');
    expand.textContent = '⤢';
    card.appendChild(expand);

    // ── Event listeners
    card.addEventListener('click', () => onClick(quote));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(quote);
        }
    });

    return card;
}

/**
 * Apply background + text styles to a card element.
 * @param {HTMLElement} el
 * @param {object}      qStyle
 * @param {object}      layout
 * @param {string}      viewport
 */
export function applyCardStyles(el, qStyle = {}, layout = {}, viewport = 'desktop') {
    const bg = buildBackground(qStyle?.background);
    const padding = layout?.padding ?? 24;
    const radius = layout?.borderRadius ?? 16;

    el.style.background = bg;
    el.style.color = qStyle?.textColor || '#ffffff';
    el.style.padding = `${padding}px`;
    el.style.borderRadius = `${radius}px`;

    // Responsive font-size from layout.fontSize
    const fs = layout?.fontSize;
    if (fs) {
        el.style.fontSize = `${fs[viewport] || fs.desktop || 15}px`;
    }

    if (layout?.shadow) {
        el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.5)`;
    }
}

/**
 * Render loading skeletons (already in HTML, this just controls visibility).
 * @param {boolean} show
 */
export function toggleLoading(show) {
    const loadingEl = document.getElementById('loadingState');
    const galleryEl = document.getElementById('gallery');
    if (!loadingEl || !galleryEl) return;

    loadingEl.style.display = show ? 'block' : 'none';
    galleryEl.style.display = show ? 'none' : 'grid';
}

/**
 * Show/hide the empty state.
 * @param {boolean} show
 */
export function toggleEmptyState(show) {
    const emptyEl = document.getElementById('emptyState');
    const galleryEl = document.getElementById('gallery');
    if (!emptyEl || !galleryEl) return;

    if (show) {
        emptyEl.removeAttribute('hidden');
        galleryEl.style.display = 'none';
    } else {
        emptyEl.setAttribute('hidden', '');
        galleryEl.style.display = 'grid';
    }
}

/**
 * Update stats bar text.
 * @param {number} count
 * @param {number} total
 */
export function updateStatsBar(count, total) {
    const el = document.getElementById('quoteCount');
    if (!el) return;

    if (count === total) {
        el.textContent = `${total} quotes`;
    } else {
        el.textContent = `${count} of ${total} quotes`;
    }
}