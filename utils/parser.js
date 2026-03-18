/**
 * PrivQuotes – Text Parser
 * Handles: *highlight* syntax, Hindi/Devanagari, emojis, XSS prevention
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

/* ─────────────────────────────────────────────────────────
   FONT REGISTRY
   Maps font name strings (from JSON) → Google Fonts family names.
   Fonts are already loaded globally via index.html <link>.
   ───────────────────────────────────────────────────────── */
export const FONT_MAP = {
    'Poppins': "'Poppins', sans-serif",
    'Hind': "'Hind', sans-serif",           // Hindi / Devanagari
    'Playfair Display': "'Playfair Display', serif",
    'Space Mono': "'Space Mono', monospace",
    'Raleway': "'Raleway', sans-serif",
    'Montserrat': "'Montserrat', sans-serif",
    // Fallback for any unlisted font
    'default': "system-ui, -apple-system, sans-serif",
};

/**
 * Resolve font-family CSS string from JSON font name.
 * @param {string} fontName
 * @returns {string}
 */
export function resolveFont(fontName) {
    if (!fontName) return FONT_MAP['default'];
    return FONT_MAP[fontName] || `'${fontName}', ${FONT_MAP['default']}`;
}

/* ─────────────────────────────────────────────────────────
   TEXT PARSING
   ───────────────────────────────────────────────────────── */

/**
 * Parse *highlighted* segments from raw text.
 * Returns token array: [{type:'text'|'highlight', value:string}]
 *
 * @param {string} rawText
 * @returns {Array<{type:string, value:string}>}
 */
export function parseHighlights(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    const tokens = [];
    const pattern = /\*([^*\n]+)\*/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(rawText)) !== null) {
        if (match.index > last) {
            tokens.push({ type: 'text', value: rawText.slice(last, match.index) });
        }
        tokens.push({ type: 'highlight', value: match[1] });
        last = pattern.lastIndex;
    }

    if (last < rawText.length) {
        tokens.push({ type: 'text', value: rawText.slice(last) });
    }

    return tokens;
}

/**
 * Build a safe DocumentFragment from parsed tokens.
 * Uses createTextNode — zero innerHTML, zero XSS risk.
 * Supports:
 *  - Hindi / Devanagari text (native Unicode rendering)
 *  - Emoji (native Unicode rendering)
 *  - \n line breaks
 *  - *highlight* markup
 *
 * @param {string}  rawText
 * @param {object}  style     – quote style object
 * @param {boolean} compact   – true for gallery card (smaller)
 * @returns {DocumentFragment}
 */
export function buildTextFragment(rawText, style = {}, compact = false) {
    const tokens = parseHighlights(rawText);
    const frag = document.createDocumentFragment();
    const hlColor = style.highlightColor || '#00ffd5';
    const hlStyle = style.highlightStyle || 'glow';

    tokens.forEach(token => {
        if (token.type === 'text') {
            // Handle \n as <br> — supports multiline JSON strings
            const lines = token.value.split('\n');
            lines.forEach((line, i) => {
                frag.appendChild(document.createTextNode(line));
                if (i < lines.length - 1) {
                    frag.appendChild(document.createElement('br'));
                }
            });

        } else if (token.type === 'highlight') {
            const span = document.createElement('span');
            span.classList.add('highlight', `highlight--${hlStyle}`);
            span.style.color = hlColor;

            if (hlStyle === 'glow') {
                span.style.textShadow =
                    `0 0 8px ${hlColor}bb, 0 0 20px ${hlColor}66`;
            }

            // Safe text assignment — covers Hindi, emoji, all Unicode
            span.textContent = token.value;
            frag.appendChild(span);
        }
    });

    return frag;
}

/**
 * Extract plain text (no *markers*, no HTML) for clipboard.
 * @param {string} rawText
 * @returns {string}
 */
export function extractPlainText(rawText) {
    if (!rawText) return '';
    return rawText
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\n/g, ' ')
        .trim();
}

/**
 * Build CSS background string from JSON background config.
 * @param {object} bg – { type, colors, angle? }
 * @returns {string}
 */
export function buildBackground(bg) {
    if (!bg) return '#1a1a28';

    switch (bg.type) {
        case 'gradient': {
            const colors = Array.isArray(bg.colors) && bg.colors.length >= 2
                ? bg.colors
                : ['#1a1a28', '#2a2a42'];
            const deg = bg.angle ?? 135;
            return `linear-gradient(${deg}deg, ${colors.join(', ')})`;
        }
        case 'solid':
            return bg.colors?.[0] ?? '#1a1a28';
        default:
            return bg.colors?.[0] ?? '#1a1a28';
    }
}