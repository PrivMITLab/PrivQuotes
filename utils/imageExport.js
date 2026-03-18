/**
 * PrivQuotes – Image Export (Fixed & Production-Ready)
 * Local html2canvas → CDN fallback → Pure Canvas fallback
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { buildBackground, buildTextFragment, extractPlainText, resolveFont } from './parser.js';
import { showToast } from './helpers.js';

/* ─────────────────────────────────────────────────────────
   LOADER STATE
   ───────────────────────────────────────────────────────── */
const S = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', FAILED: 'failed' };
let state = S.IDLE;
const queue = [];  // { resolve, reject }

/* ─────────────────────────────────────────────────────────
   INIT — call from app.js on startup
   ───────────────────────────────────────────────────────── */
export function initImageExport() {
    // Already available (sync script tag in HTML worked)
    if (typeof window.html2canvas === 'function') {
        state = S.READY;
        _setBtnReady(true);
        return;
    }

    // Listen for events from inline script in index.html
    document.addEventListener('h2c:ready', _onReady, { once: true });
    document.addEventListener('h2c:failed', _onFailed, { once: true });

    // Start own load attempt after 600ms if still idle
    setTimeout(() => { if (state === S.IDLE) _load(0); }, 600);

    _setBtnReady(false);
}

/* ─────────────────────────────────────────────────────────
   EVENT HANDLERS
   ───────────────────────────────────────────────────────── */
function _onReady() {
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

/* ─────────────────────────────────────────────────────────
   DYNAMIC LOADER
   ───────────────────────────────────────────────────────── */
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
    s.onload = () => {
        clearTimeout(tid);
        typeof window.html2canvas === 'function' ? _onReady() : _load(idx + 1);
    };
    s.onerror = () => { clearTimeout(tid); _load(idx + 1); };
    document.head.appendChild(s);
}

function _wait() {
    return new Promise((resolve, reject) => {
        if (state === S.READY) { resolve(); return; }
        if (state === S.FAILED) { reject(new Error('html2canvas unavailable')); return; }
        queue.push({ resolve, reject });
        if (state === S.IDLE) _load(0);
    });
}

/* ─────────────────────────────────────────────────────────
   BUTTON STATE
   ───────────────────────────────────────────────────────── */
export function _setBtnReady(ready, failed = false) {
    const btn = document.getElementById('downloadBtn');
    const icon = document.getElementById('downloadBtnIcon');
    const label = document.getElementById('downloadBtnLabel');
    if (!btn) return;

    if (ready) {
        btn.dataset.ready = 'true';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.title = 'Download as PNG';
        if (icon) icon.textContent = '⬇️';
        if (label) label.textContent = 'Download';
    } else if (failed) {
        btn.dataset.ready = 'failed';
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.title = 'Place html2canvas.min.js in /libs/ for image export';
        if (icon) icon.textContent = '⚠️';
        if (label) label.textContent = 'Unavailable';
    } else {
        btn.dataset.ready = 'false';
        btn.disabled = false;
        btn.style.opacity = '0.72';
        if (icon) icon.textContent = '⏳';
        if (label) label.textContent = 'Loading…';
    }
}

function _setBtnWorking(on) {
    const btn = document.getElementById('downloadBtn');
    const icon = document.getElementById('downloadBtnIcon');
    const label = document.getElementById('downloadBtnLabel');
    if (!btn) return;
    btn.disabled = on;
    btn.style.opacity = on ? '0.72' : '1';
    btn.style.cursor = on ? 'wait' : '';
    if (icon) icon.textContent = on ? '🔄' : '⬇️';
    if (label) label.textContent = on ? 'Exporting…' : 'Download';
}

/* ─────────────────────────────────────────────────────────
   BUILD EXPORT ELEMENT (800×800 off-screen)
   ───────────────────────────────────────────────────────── */
function _buildElement(quote) {
    const { style: qs = {}, layout: ly = {}, text = '', id, type } = quote;
    const hlColor = qs.highlightColor || '#00ffd5';
    const fontFam = resolveFont(qs.font);

    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = [
        'position:fixed', 'left:-9999px', 'top:-9999px',
        'width:800px', 'height:800px',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        `background:${buildBackground(qs.background)}`,
        `color:${qs.textColor || '#fff'}`,
        `padding:${(ly.padding || 32) + 20}px`,
        'box-sizing:border-box', 'overflow:hidden',
        `font-family:${fontFam}`,
        'z-index:-1',
    ].join(';');

    // Glow circles
    _glow(wrap, { w: '320px', h: '320px', t: '-80px', r: '-80px', color: hlColor, op: 0.14 });
    _glow(wrap, { w: '200px', h: '200px', b: '-50px', l: '-50px', color: hlColor, op: 0.09 });

    // Quote text
    const p = document.createElement('p');
    p.style.cssText = [
        `font-size:${ly.fontSize?.desktop || 28}px`,
        'line-height:1.85',
        `text-align:${ly.align || 'center'}`,
        'font-weight:500',
        'position:relative', 'z-index:1',
        'max-width:680px',
        'word-break:break-word',
        'hyphens:auto',
        `color:${qs.textColor || '#fff'}`,
        `font-family:${fontFam}`,
        'margin:0 0 28px 0',
    ].join(';');

    p.appendChild(buildTextFragment(text, qs, false));
    wrap.appendChild(p);

    // Divider
    const div = document.createElement('div');
    div.style.cssText = `width:56px;height:2px;background:${hlColor};opacity:.55;border-radius:2px;margin:0 auto 18px;position:relative;z-index:1;`;
    wrap.appendChild(div);

    // Watermark
    const wm = document.createElement('div');
    wm.style.cssText = `position:absolute;bottom:22px;right:26px;font-size:12px;font-weight:700;letter-spacing:1.5px;opacity:.38;color:${qs.textColor || '#fff'};z-index:1;text-transform:uppercase;`;
    wm.textContent = '🔐 PrivMITLab';
    wrap.appendChild(wm);

    // Badge
    const bd = document.createElement('div');
    bd.style.cssText = `position:absolute;bottom:22px;left:26px;font-size:11px;opacity:.3;color:${qs.textColor || '#fff'};z-index:1;`;
    bd.textContent = `#${id} · ${type}`;
    wrap.appendChild(bd);

    return wrap;
}

function _glow(parent, o) {
    const el = document.createElement('div');
    el.style.cssText = [
        'position:absolute',
        `width:${o.w}`, `height:${o.h}`, 'border-radius:50%',
        `background:radial-gradient(circle,${o.color} 0%,transparent 70%)`,
        `opacity:${o.op}`,
        o.t ? `top:${o.t}` : '', o.b ? `bottom:${o.b}` : '',
        o.l ? `left:${o.l}` : '', o.r ? `right:${o.r}` : '',
        'pointer-events:none', 'z-index:0',
    ].filter(Boolean).join(';');
    parent.appendChild(el);
}

/* ─────────────────────────────────────────────────────────
   CANVAS FALLBACK (no external dep)
   ───────────────────────────────────────────────────────── */
async function _canvasFallback(quote, plain) {
    const { style: qs = {}, layout: ly = {}, id, type } = quote;
    const SIZE = 800;
    const cv = document.createElement('canvas');
    cv.width = SIZE; cv.height = SIZE;
    const ctx = cv.getContext('2d');
    if (!ctx) { showToast('❌ Canvas not supported.', 'error'); return; }

    // Background
    const bg = qs.background;
    if (bg?.type === 'gradient' && bg.colors?.length >= 2) {
        const grd = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        bg.colors.forEach((c, i) => grd.addColorStop(i / (bg.colors.length - 1), c));
        ctx.fillStyle = grd;
    } else {
        ctx.fillStyle = bg?.colors?.[0] || '#1a1a28';
    }
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Text
    const fs = ly.fontSize?.desktop || 28;
    const tc = qs.textColor || '#fff';
    const pad = 80;
    const mw = SIZE - pad * 2;
    const cx = SIZE / 2;

    ctx.fillStyle = tc;
    ctx.font = `500 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = _wrap(ctx, plain, mw);
    const lh = fs * 1.85;
    let y = (SIZE - lines.length * lh) / 2 + lh / 2;

    lines.forEach(l => { ctx.fillText(l, cx, y); y += lh; });

    // Divider
    const hlc = qs.highlightColor || '#00ffd5';
    ctx.strokeStyle = hlc; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(cx - 28, y + 10); ctx.lineTo(cx + 28, y + 10); ctx.stroke();
    ctx.globalAlpha = 1;

    // Watermark
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = tc; ctx.globalAlpha = 0.38;
    ctx.textAlign = 'right'; ctx.fillText('🔐 PrivMITLab', SIZE - 26, SIZE - 26);
    ctx.textAlign = 'left'; ctx.font = '11px system-ui';
    ctx.fillText(`#${id} · ${type}`, 26, SIZE - 26);
    ctx.globalAlpha = 1;

    cv.toBlob(blob => {
        if (!blob) { showToast('❌ Export failed.', 'error'); return; }
        _dl(blob, `PrivQuotes-${id}-fallback.png`);
        showToast('✅ Downloaded (basic mode)', 'info', 3500);
    }, 'image/png');
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

/* ─────────────────────────────────────────────────────────
   DOWNLOAD TRIGGER
   ───────────────────────────────────────────────────────── */
function _dl(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ─────────────────────────────────────────────────────────
   MAIN EXPORT FUNCTION
   ───────────────────────────────────────────────────────── */
export async function exportQuoteAsImage(quote) {
    if (!quote) return;
    _setBtnWorking(true);

    const plain = extractPlainText(quote.text || '');

    // 1. Wait for html2canvas
    try {
        await _wait();
    } catch {
        // Fallback to canvas
        try { await _canvasFallback(quote, plain); }
        catch (e) { showToast('❌ Export failed.', 'error'); }
        finally { _setBtnWorking(false); }
        return;
    }

    // 2. Build off-screen element
    let el = null;
    try {
        el = _buildElement(quote);
        document.body.appendChild(el);

        // Wait 3 frames for paint
        await new Promise(r => {
            let n = 0;
            const f = () => { if (++n >= 3) r(); else requestAnimationFrame(f); };
            requestAnimationFrame(f);
        });

        // 3. Capture
        const canvas = await window.html2canvas(el, {
            scale: 2, useCORS: false, allowTaint: false,
            backgroundColor: null, imageTimeout: 0,
            logging: false, foreignObjectRendering: false,
            removeContainer: true,
            windowWidth: 800, windowHeight: 800,
        });

        // 4. Download
        await new Promise((res, rej) => {
            canvas.toBlob(blob => {
                if (!blob) { rej(new Error('toBlob null')); return; }
                _dl(blob, `PrivQuotes-${quote.id}-${quote.type}.png`);
                showToast('✅ Image downloaded!', 'success');
                res();
            }, 'image/png', 1.0);
        });

    } catch (err) {
        console.error('[PrivQuotes] Export error:', err);
        try { await _canvasFallback(quote, plain); }
        catch { showToast('❌ Export failed. Check console.', 'error'); }
    } finally {
        if (el?.parentNode) el.parentNode.removeChild(el);
        _setBtnWorking(false);
    }
}