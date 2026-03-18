/**
 * PrivQuotes – Text Parser Utility
 * Handles: *highlight* syntax → styled spans
 * Handles: Emoji-safe rendering + XSS prevention
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

/**
 * Sanitize text – strip HTML tags to prevent XSS.
 * We intentionally do NOT use innerHTML with raw user text.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    // Remove HTML tags
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Unsanitize for text nodes (used after sanitize, before DOM insertion)
 * Actually we build DOM nodes directly – this is for clean text extraction.
 * @param {string} html
 * @returns {string}
 */
export function decodeEntities(html) {
    return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * Parse *highlighted* text segments.
 * Returns array of token objects: { type: 'text'|'highlight', value: string }
 *
 * @param {string} rawText - Raw text from JSON
 * @returns {Array<{type:string, value:string}>}
 */
export function parseHighlights(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    const tokens = [];
    // Regex: match *word(s)* — greedy within delimiters, avoid nesting
    const pattern = /\*([^*\n]+)\*/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(rawText)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
            tokens.push({
                type: 'text',
                value: rawText.slice(lastIndex, match.index)
            });
        }

        // The highlighted segment (captured group 1)
        tokens.push({
            type: 'highlight',
            value: match[1]
        });

        lastIndex = pattern.lastIndex;
    }

    // Remaining text after last match
    if (lastIndex < rawText.length) {
        tokens.push({
            type: 'text',
            value: rawText.slice(lastIndex)
        });
    }

    return tokens;
}

/**
 * Build a DocumentFragment of text/highlight nodes.
 * SAFE: Uses createTextNode – zero innerHTML, zero XSS risk.
 *
 * @param {string}  rawText       - Raw JSON text with *markup*
 * @param {object}  style         - Quote style config
 * @param {boolean} [compact=false] - Shorter rendering for gallery cards
 * @returns {DocumentFragment}
 */
export function buildTextFragment(rawText, style = {}, compact = false) {
    const tokens = parseHighlights(rawText);
    const frag = document.createDocumentFragment();
    const hlColor = style.highlightColor || '#00ffd5';
    const hlStyle = style.highlightStyle || 'glow';

    tokens.forEach(token => {
        if (token.type === 'text') {
            // Plain text – safe text node
            // Split by newlines to support line breaks
            const lines = token.value.split('\n');
            lines.forEach((line, i) => {
                frag.appendChild(document.createTextNode(line));
                if (i < lines.length - 1) {
                    frag.appendChild(document.createElement('br'));
                }
            });
        } else if (token.type === 'highlight') {
            const span = document.createElement('span');
            span.classList.add('highlight');

            // Apply highlight style class
            span.classList.add(`highlight--${hlStyle}`);

            // Color the highlight
            span.style.color = hlColor;

            // Glow text-shadow uses currentColor
            if (hlStyle === 'glow') {
                span.style.textShadow =
                    `0 0 8px ${hlColor}99, 0 0 18px ${hlColor}55`;
            }

            // Safe: use textContent
            span.textContent = token.value;
            frag.appendChild(span);
        }
    });

    return frag;
}

/**
 * Extract plain text (no markup, no emojis stripped) for clipboard.
 * @param {string} rawText
 * @returns {string}
 */
export function extractPlainText(rawText) {
    if (!rawText) return '';
    // Remove *...* markers but keep the inner text
    return rawText.replace(/\*([^*]+)\*/g, '$1').trim();
}

/**
 * Detect emoji presence in string.
 * @param {string} text
 * @returns {boolean}
 */
export function hasEmoji(text) {
    const emojiRegex =
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/u;
    return emojiRegex.test(text);
}

/**
 * Generate CSS background string from JSON background config.
 * @param {object} bg - { type, colors }
 * @returns {string} CSS background value
 */
export function buildBackground(bg) {
    if (!bg) return '#1a1a28';

    switch (bg.type) {
        case 'gradient': {
            const colors = Array.isArray(bg.colors) && bg.colors.length >= 2
                ? bg.colors
                : ['#1a1a28', '#2a2a42'];
            const deg = bg.angle || 135;
            const stops = colors.join(', ');
            return `linear-gradient(${deg}deg, ${stops})`;
        }
        case 'solid':
            return bg.colors?.[0] || '#1a1a28';
        default:
            return bg.colors?.[0] || '#1a1a28';
    }
}

/**
 * Build inline style object for a quote card/modal.
 * @param {object} quoteStyle - style block from JSON
 * @param {object} layout     - layout block from JSON
 * @param {string} [viewport] - 'mobile'|'tablet'|'desktop'
 * @returns {object} Plain style key/value pairs
 */
export function buildInlineStyles(quoteStyle, layout = {}, viewport = 'desktop') {
    const bg = buildBackground(quoteStyle?.background);
    const textColor = quoteStyle?.textColor || '#ffffff';
    const padding = layout?.padding ?? 24;
    const radius = layout?.borderRadius ?? 16;
    const fontSize = layout?.fontSize?.[viewport] || 18;
    const shadowProp = layout?.shadow
        ? '0 8px 32px rgba(0,0,0,0.4)'
        : 'none';

    return {
        background: bg,
        color: textColor,
        padding: `${padding}px`,
        borderRadius: `${radius}px`,
        boxShadow: shadowProp,
        fontSize: `${fontSize}px`,
        textAlign: layout?.align || 'center',
    };
}