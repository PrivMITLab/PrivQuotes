/**
 * PrivQuotes – Image Export (High Quality Fix)
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildBackground, buildTextFragment, extractPlainText, resolveFont } from './parser.js';
import { showToast } from './helpers.js';

/* ══════════════════════════════════════════════════════
   LOADER STATE
══════════════════════════════════════════════════════ */
const S = { IDLE:'idle', LOADING:'loading', READY:'ready', FAILED:'failed' };
let state = S.IDLE;
const queue = [];

export function initImageExport() {
  if (typeof window.html2canvas === 'function') {
    state = S.READY;
    _setBtnReady(true);
    return;
  }
  document.addEventListener('h2c:ready',  _onReady,  { once: true });
  document.addEventListener('h2c:failed', _onFailed, { once: true });
  setTimeout(() => { if (state === S.IDLE) _load(0); }, 500);
  _setBtnReady(false);
}

function _onReady()  {
  state = S.READY;
  _setBtnReady(true);
  queue.forEach(cb => cb.resolve());
  queue.length = 0;
}

function _onFailed() {
  if (state === S.READY) return;
  state = S.FAILED;
  _setBtnReady(false, true);
  queue.forEach(cb => cb.reject(new Error('html2canvas unavailable')));
  queue.length = 0;
}

const SRCS = [
  'libs/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
];

function _load(idx) {
  if (state === S.READY || idx >= SRCS.length) {
    if (state !== S.READY) _onFailed();
    return;
  }
  state = S.LOADING;
  const s = document.createElement('script');
  s.src = SRCS[idx];
  let tid = setTimeout(() => { s.onload = s.onerror = null; _load(idx + 1); }, 8000);
  s.onload  = () => { clearTimeout(tid); typeof window.html2canvas === 'function' ? _onReady() : _load(idx + 1); };
  s.onerror = () => { clearTimeout(tid); _load(idx + 1); };
  document.head.appendChild(s);
}

function _wait() {
  return new Promise((resolve, reject) => {
    if (state === S.READY)  { resolve(); return; }
    if (state === S.FAILED) { reject(new Error('html2canvas unavailable')); return; }
    queue.push({ resolve, reject });
    if (state === S.IDLE) _load(0);
  });
}

/* ══════════════════════════════════════════════════════
   BUTTON STATE
══════════════════════════════════════════════════════ */
export function _setBtnReady(ready, failed = false) {
  const btn   = document.getElementById('downloadBtn');
  const icon  = document.getElementById('downloadBtnIcon');
  const label = document.getElementById('downloadBtnLabel');
  if (!btn) return;

  if (ready) {
    btn.dataset.ready = 'true';
    btn.disabled      = false;
    btn.style.opacity = '1';
    btn.title         = 'Download as PNG';
    if (icon)  icon.textContent  = '⬇️';
    if (label) label.textContent = 'Download';
  } else if (failed) {
    btn.dataset.ready = 'failed';
    btn.disabled      = true;
    btn.style.opacity = '0.4';
    if (icon)  icon.textContent  = '⚠️';
    if (label) label.textContent = 'Unavailable';
  } else {
    btn.dataset.ready = 'false';
    btn.disabled      = false;
    btn.style.opacity = '0.72';
    if (icon)  icon.textContent  = '⏳';
    if (label) label.textContent = 'Loading…';
  }
}

function _setBtnWorking(on) {
  const btn   = document.getElementById('downloadBtn');
  const icon  = document.getElementById('downloadBtnIcon');
  const label = document.getElementById('downloadBtnLabel');
  if (!btn) return;
  btn.disabled        = on;
  btn.style.opacity   = on ? '0.72' : '1';
  btn.style.cursor    = on ? 'wait' : '';
  if (icon)  icon.textContent  = on ? '🔄' : '⬇️';
  if (label) label.textContent = on ? 'Exporting…' : 'Download';
}

/* ══════════════════════════════════════════════════════
   EXPORT ELEMENT BUILDER
   1080 × 1080 — Instagram quality
   Fonts, padding, colors sab theek
══════════════════════════════════════════════════════ */

/* ── Canvas size options ── */
const SIZES = {
  '1x': { px: 800,  label: '800×800' },
  '2x': { px: 1080, label: '1080×1080' },
  '3x': { px: 1440, label: '1440×1440' },
};

/* Default export size — change karo yahan */
const EXPORT_SIZE = 1080;

function _buildElement(quote) {
  const { style: qs = {}, layout: ly = {}, text = '', id, type } = quote;
  const hlColor = qs.highlightColor || '#00ffd5';
  const fontFam = resolveFont(qs.font);
  const SIZE    = EXPORT_SIZE;

  /* ── Wrapper ── */
  const wrap = document.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');

  /* KEY FIX: position:absolute instead of fixed,
     exact pixel sizes, no transform, no scale tricks */
  wrap.style.cssText = `
    position: absolute;
    left: 0px;
    top: 0px;
    width: ${SIZE}px;
    height: ${SIZE}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: ${buildBackground(qs.background)};
    color: ${qs.textColor || '#ffffff'};
    padding: ${Math.round((ly.padding || 32) * (SIZE / 400))}px;
    box-sizing: border-box;
    overflow: hidden;
    font-family: ${fontFam};
    font-size: ${ly.fontSize?.desktop || 28}px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  `.replace(/\s+/g, ' ').trim();

  /* ── Off-screen container ── */
  const offscreen = document.createElement('div');
  offscreen.style.cssText = `
    position: fixed;
    top: -${SIZE + 100}px;
    left: 0;
    width: ${SIZE}px;
    height: ${SIZE}px;
    overflow: hidden;
    pointer-events: none;
    z-index: -1;
  `;
  offscreen.appendChild(wrap);

  /* ── Glow circles ── */
  _appendGlow(wrap, {
    w: `${SIZE * 0.4}px`, h: `${SIZE * 0.4}px`,
    t: `-${SIZE * 0.1}px`, r: `-${SIZE * 0.1}px`,
    color: hlColor, op: 0.15,
  });
  _appendGlow(wrap, {
    w: `${SIZE * 0.28}px`, h: `${SIZE * 0.28}px`,
    b: `-${SIZE * 0.06}px`, l: `-${SIZE * 0.06}px`,
    color: hlColor, op: 0.1,
  });

  /* ── Quote text ── */
  const fontScale  = SIZE / 800;
  const baseFontSz = ly.fontSize?.desktop || 26;
  const finalFontSz = Math.round(baseFontSz * fontScale);

  const para = document.createElement('p');
  para.style.cssText = `
    font-size: ${finalFontSz}px;
    line-height: 1.85;
    text-align: ${ly.align || 'center'};
    font-weight: 500;
    position: relative;
    z-index: 1;
    max-width: ${SIZE * 0.82}px;
    word-break: break-word;
    hyphens: auto;
    color: ${qs.textColor || '#ffffff'};
    font-family: ${fontFam};
    margin: 0 0 ${Math.round(28 * fontScale)}px 0;
    -webkit-font-smoothing: antialiased;
    letter-spacing: 0.2px;
  `.replace(/\s+/g, ' ').trim();

  para.appendChild(buildTextFragment(text, qs, false));
  wrap.appendChild(para);

  /* ── Divider ── */
  const divider = document.createElement('div');
  divider.style.cssText = `
    width: ${Math.round(60 * fontScale)}px;
    height: 2px;
    background: ${hlColor};
    opacity: 0.55;
    border-radius: 2px;
    margin: 0 auto ${Math.round(20 * fontScale)}px;
    position: relative;
    z-index: 1;
  `.replace(/\s+/g, ' ').trim();
  wrap.appendChild(divider);

  /* ── Brand watermark ── */
  const brand = document.createElement('div');
  brand.style.cssText = `
    position: absolute;
    bottom: ${Math.round(26 * fontScale)}px;
    right: ${Math.round(30 * fontScale)}px;
    font-size: ${Math.round(13 * fontScale)}px;
    font-weight: 700;
    letter-spacing: 1.5px;
    opacity: 0.38;
    color: ${qs.textColor || '#ffffff'};
    z-index: 2;
    text-transform: uppercase;
    font-family: ${fontFam};
    -webkit-font-smoothing: antialiased;
  `.replace(/\s+/g, ' ').trim();
  brand.textContent = '🔐 PrivMITLab';
  wrap.appendChild(brand);

  /* ── Quote ID ── */
  const badge = document.createElement('div');
  badge.style.cssText = `
    position: absolute;
    bottom: ${Math.round(26 * fontScale)}px;
    left: ${Math.round(30 * fontScale)}px;
    font-size: ${Math.round(11 * fontScale)}px;
    opacity: 0.28;
    color: ${qs.textColor || '#ffffff'};
    z-index: 2;
    font-family: ${fontFam};
  `.replace(/\s+/g, ' ').trim();
  badge.textContent = `#${id} · ${type}`;
  wrap.appendChild(badge);

  return offscreen;
}

function _appendGlow(parent, o) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    width: ${o.w}; height: ${o.h};
    border-radius: 50%;
    background: radial-gradient(circle, ${o.color} 0%, transparent 70%);
    opacity: ${o.op};
    ${o.t ? `top:${o.t};` : ''}
    ${o.b ? `bottom:${o.b};` : ''}
    ${o.l ? `left:${o.l};` : ''}
    ${o.r ? `right:${o.r};` : ''}
    pointer-events: none;
    z-index: 0;
  `.replace(/\s+/g, ' ').trim();
  parent.appendChild(el);
}

/* ══════════════════════════════════════════════════════
   CANVAS FALLBACK (no html2canvas)
══════════════════════════════════════════════════════ */
async function _canvasFallback(quote, plain) {
  const { style: qs = {}, layout: ly = {}, id, type } = quote;
  const SIZE = EXPORT_SIZE;
  const cv   = document.createElement('canvas');
  cv.width   = SIZE;
  cv.height  = SIZE;

  const ctx = cv.getContext('2d');
  if (!ctx) { showToast('❌ Canvas not supported.', 'error'); return; }

  /* Background */
  const bg = qs.background;
  if (bg?.type === 'gradient' && bg.colors?.length >= 2) {
    const grd = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.colors.forEach((c, i) => grd.addColorStop(i / (bg.colors.length - 1), c));
    ctx.fillStyle = grd;
  } else {
    ctx.fillStyle = bg?.colors?.[0] || '#1a1a28';
  }
  ctx.fillRect(0, 0, SIZE, SIZE);

  const fontScale = SIZE / 800;
  const fs  = Math.round((ly.fontSize?.desktop || 26) * fontScale);
  const tc  = qs.textColor || '#fff';
  const pad = Math.round(80 * fontScale);
  const mw  = SIZE - pad * 2;
  const cx  = SIZE / 2;

  ctx.fillStyle    = tc;
  ctx.font         = `500 ${fs}px system-ui, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const lines = _wrap(ctx, plain, mw);
  const lh    = fs * 1.85;
  let   y     = (SIZE - lines.length * lh) / 2 + lh / 2;
  lines.forEach(l => { ctx.fillText(l, cx, y); y += lh; });

  /* Divider */
  const hlc = qs.highlightColor || '#00ffd5';
  ctx.strokeStyle = hlc; ctx.lineWidth = Math.round(2 * fontScale);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - Math.round(28 * fontScale), y + 10);
  ctx.lineTo(cx + Math.round(28 * fontScale), y + 10);
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* Watermark */
  ctx.font      = `bold ${Math.round(13 * fontScale)}px system-ui`;
  ctx.fillStyle = tc; ctx.globalAlpha = 0.38;
  ctx.textAlign = 'right';
  ctx.fillText('🔐 PrivMITLab', SIZE - Math.round(28 * fontScale), SIZE - Math.round(28 * fontScale));
  ctx.textAlign = 'left';
  ctx.font      = `${Math.round(11 * fontScale)}px system-ui`;
  ctx.fillText(`#${id} · ${type}`, Math.round(28 * fontScale), SIZE - Math.round(28 * fontScale));
  ctx.globalAlpha = 1;

  cv.toBlob(blob => {
    if (!blob) { showToast('❌ Export failed.', 'error'); return; }
    _dl(blob, `PrivQuotes-${id}-fallback.png`);
    showToast('✅ Downloaded (basic mode)', 'info', 3500);
  }, 'image/png', 1.0);
}

function _wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  });
  if (cur) lines.push(cur);
  return lines;
}

/* ══════════════════════════════════════════════════════
   DOWNLOAD TRIGGER
══════════════════════════════════════════════════════ */
function _dl(blob, name) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION
══════════════════════════════════════════════════════ */
export async function exportQuoteAsImage(quote) {
  if (!quote) return;
  _setBtnWorking(true);

  const plain = extractPlainText(quote.text || '');

  /* 1. Wait for html2canvas */
  try {
    await _wait();
  } catch {
    try   { await _canvasFallback(quote, plain); }
    catch { showToast('❌ Export failed.', 'error'); }
    finally { _setBtnWorking(false); }
    return;
  }

  let offscreen = null;

  try {
    /* 2. Build off-screen element */
    offscreen = _buildElement(quote);
    document.body.appendChild(offscreen);

    /* 3. Wait for fonts + paint */
    await _waitFrames(5);   /* ← 5 frames for font load */

    /* Optional: wait for fonts explicitly */
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    /* 4. html2canvas capture
       KEY: scale:1 kyunki element already EXPORT_SIZE mein hai
       scale:2 karte toh 2x bada ho jaata (2160x2160 for 1080)
       Agar chahiye 2x quality toh scale:2 karo aur element 540px rakho
    */
    const wrap = offscreen.querySelector('div');

    const canvas = await window.html2canvas(wrap, {
      scale:                  1,      /* ← 1x (element already full size) */
      useCORS:                false,
      allowTaint:             false,
      backgroundColor:        null,
      imageTimeout:           0,
      logging:                false,
      foreignObjectRendering: false,
      removeContainer:        false,  /* ← hum khud remove karenge */
      width:                  EXPORT_SIZE,
      height:                 EXPORT_SIZE,
      x:                      0,
      y:                      0,
      scrollX:                0,
      scrollY:                0,
      windowWidth:            EXPORT_SIZE,
      windowHeight:           EXPORT_SIZE,
    });

    /* 5. Verify canvas size */
    console.log(`[PrivQuotes] Canvas: ${canvas.width}×${canvas.height}px`);

    /* 6. Download */
    await new Promise((res, rej) => {
      canvas.toBlob(blob => {
        if (!blob) { rej(new Error('toBlob null')); return; }
        _dl(blob, `PrivQuotes-${quote.id}-${quote.type}-${EXPORT_SIZE}px.png`);
        showToast(`✅ Downloaded! (${EXPORT_SIZE}×${EXPORT_SIZE}px)`, 'success');
        res();
      }, 'image/png', 1.0);
    });

  } catch (err) {
    console.error('[PrivQuotes] Export error:', err);
    try   { await _canvasFallback(quote, plain); }
    catch { showToast('❌ Export failed. Check console.', 'error'); }
  } finally {
    if (offscreen?.parentNode) {
      offscreen.parentNode.removeChild(offscreen);
    }
    _setBtnWorking(false);
  }
}

/* ── Utility ── */
function _waitFrames(n) {
  return new Promise(resolve => {
    let count = 0;
    function frame() {
      if (++count >= n) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
