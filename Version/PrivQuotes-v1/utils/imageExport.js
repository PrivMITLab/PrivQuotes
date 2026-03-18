/**
 * PrivQuotes – Image Export Utility
 * Uses html2canvas (open-source) for high-quality image generation
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildBackground, buildInlineStyles } from './parser.js';
import { showToast } from './helpers.js';

/**
 * Check if html2canvas is available.
 * @returns {boolean}
 */
function isHtml2CanvasReady() {
    return typeof window.html2canvas === 'function';
}

/**
 * Build an off-screen DOM element for quote rendering.
 * This gives us precise control over what gets captured.
 *
 * @param {object} quote - Full quote object from JSON
 * @param {Function} buildTextFragment - Parser function
 * @returns {HTMLElement}
 */
function buildExportElement(quote, buildTextFragment) {
    const { style: qStyle, layout, text } = quote;

    // Outer container
    const container = document.createElement('div');
    container.style.cssText = `
    width: 800px;
    height: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: -9999px;
    top: -9999px;
    font-family: 'Poppins', system-ui, -apple-system, sans-serif;
    background: ${buildBackground(qStyle?.background)};
    color: ${qStyle?.textColor || '#ffffff'};
    padding: ${(layout?.padding || 40) + 20}px;
    border-radius: 0;
    box-sizing: border-box;
    overflow: hidden;
  `;

    // Decorative glow circles (visual flair)
    const glowCircle1 = document.createElement('div');
    glowCircle1.style.cssText = `
    position: absolute;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, ${qStyle?.highlightColor || '#00ffd5'}22, transparent 70%);
    top: -60px; right: -60px;
    pointer-events: none;
  `;

    const glowCircle2 = document.createElement('div');
    glowCircle2.style.cssText = `
    position: absolute;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, ${qStyle?.highlightColor || '#00ffd5'}15, transparent 70%);
    bottom: -40px; left: -40px;
    pointer-events: none;
  `;

    container.appendChild(glowCircle1);
    container.appendChild(glowCircle2);

    // Quote text element
    const quotePara = document.createElement('p');
    quotePara.style.cssText = `
    font-size: ${layout?.fontSize?.desktop || 28}px;
    line-height: 1.8;
    text-align: ${layout?.align || 'center'};
    font-weight: 500;
    position: relative;
    z-index: 1;
    max-width: 680px;
    word-break: break-word;
    margin: 0 0 32px 0;
  `;

    // Append parsed text
    const frag = buildTextFragment(text, qStyle, false);
    quotePara.appendChild(frag);
    container.appendChild(quotePara);

    // Brand watermark
    const watermark = document.createElement('div');
    watermark.style.cssText = `
    position: absolute;
    bottom: 28px;
    right: 32px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    opacity: 0.45;
    color: ${qStyle?.textColor || '#ffffff'};
    z-index: 1;
  `;
    watermark.textContent = '🔐 PrivMITLab';
    container.appendChild(watermark);

    // Quote ID badge
    const idBadge = document.createElement('div');
    idBadge.style.cssText = `
    position: absolute;
    bottom: 28px;
    left: 32px;
    font-size: 11px;
    opacity: 0.35;
    color: ${qStyle?.textColor || '#ffffff'};
    z-index: 1;
  `;
    idBadge.textContent = `#${quote.id} · ${quote.type}`;
    container.appendChild(idBadge);

    return container;
}

/**
 * Export a quote as a PNG image.
 * @param {object} quote            - Full quote object
 * @param {Function} buildTextFrag  - Parser's buildTextFragment function
 */
export async function exportQuoteAsImage(quote, buildTextFrag) {
    if (!isHtml2CanvasReady()) {
        showToast('⚠️ Image export library not loaded yet. Try again.', 'error');
        return;
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.classList.add('loading');
        downloadBtn.querySelector('.btn__label').textContent = 'Preparing…';
    }

    let exportEl = null;

    try {
        // 1. Build the export element
        exportEl = buildExportElement(quote, buildTextFrag);
        document.body.appendChild(exportEl);

        // 2. Short timeout to allow fonts/styles to settle
        await new Promise(resolve => setTimeout(resolve, 150));

        // 3. Render to canvas
        const canvas = await window.html2canvas(exportEl, {
            scale: 2,           // 2× for high DPI / retina
            useCORS: false,        // No cross-origin requests
            allowTaint: false,
            backgroundColor: null,         // Transparent – we set our own bg
            imageTimeout: 0,
            logging: false,
            foreignObjectRendering: false,  // Better emoji support
            windowWidth: exportEl.offsetWidth,
            windowHeight: exportEl.offsetHeight,
        });

        // 4. Convert to PNG blob
        canvas.toBlob(blob => {
            if (!blob) {
                showToast('❌ Failed to generate image.', 'error');
                return;
            }

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            const fileName = `PrivQuotes-${quote.id}-${quote.type}.png`;

            anchor.href = url;
            anchor.download = fileName;
            anchor.style.display = 'none';

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            showToast('✅ Image downloaded!', 'success');
        }, 'image/png', 1.0);

    } catch (err) {
        console.error('[PrivQuotes] Image export failed:', err);
        showToast('❌ Export failed. Please try again.', 'error');
    } finally {
        // Cleanup the off-screen element
        if (exportEl && exportEl.parentNode) {
            document.body.removeChild(exportEl);
        }

        if (downloadBtn) {
            downloadBtn.classList.remove('loading');
            downloadBtn.querySelector('.btn__label').textContent = 'Download';
        }
    }
}