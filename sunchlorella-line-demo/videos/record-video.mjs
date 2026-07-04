// サン・クロレラ統合LINE OS 営業ナレーション動画
// 実UI (admin/rep/customer) を動かしながら音声8章に同期
// arashima-admin-help 方式 (focusFlow 5段階カメラワーク + 累積秒同期)
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/sunchlorella-line-demo/videos';
mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:8877';

// TTS SSML mark timepoints (audio/gen-tts-ssml.mjs で生成)
const TP = JSON.parse(readFileSync('/Users/tsukasayoshida/Desktop/skeleton-demos/sunchlorella-line-demo/audio/timepoints.json', 'utf8'));

const HIGHLIGHT_CSS = `
body { transition: transform 0.7s cubic-bezier(.4,0,.2,1); }
html.sc-zooming, html.sc-zooming body { overflow: hidden !important; }
.sc-spot {
  position: absolute !important; border: 3px solid #1e7d3a !important; border-radius: 10px !important;
  box-shadow: 0 0 0 6px rgba(30,125,58,0.24), 0 0 34px rgba(30,125,58,0.7), 0 0 80px rgba(30,125,58,0.4) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: sc-pulse 1.2s ease-in-out infinite;
  transition: left .35s, top .35s, width .35s, height .35s;
}
.sc-hint {
  position: absolute !important; border: 2px solid rgba(30,125,58,0.5) !important; border-radius: 8px !important;
  box-shadow: 0 0 0 5px rgba(30,125,58,0.12) !important;
  pointer-events: none !important; z-index: 99997 !important;
  animation: sc-hintin .4s ease;
  transition: left .35s, top .35s, width .35s, height .35s;
}
.sc-arrow {
  position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #0a1f10; color: #f5f7f2; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 15px; padding: 9px 16px; border-radius: 4px;
  box-shadow: 0 6px 20px rgba(0,0,0,.35); white-space: nowrap;
  border-left: 3px solid #1e7d3a;
  animation: sc-fadein .3s ease;
}
#sc-cursor {
  position: absolute; pointer-events: none; z-index: 99997;
  transition: left .55s cubic-bezier(.4,0,.2,1), top .55s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4));
}
.sc-ring {
  position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #1e7d3a; border-radius: 50%;
  animation: sc-ring 0.6s cubic-bezier(.2,.8,.4,1) forwards;
}
@keyframes sc-pulse {
  0%,100% { box-shadow: 0 0 0 6px rgba(30,125,58,0.24), 0 0 34px rgba(30,125,58,0.7), 0 0 80px rgba(30,125,58,0.4); }
  50%     { box-shadow: 0 0 0 12px rgba(30,125,58,0.12), 0 0 48px rgba(30,125,58,0.85), 0 0 110px rgba(30,125,58,0.35); }
}
@keyframes sc-hintin { from { opacity: 0; } to { opacity: 1; } }
@keyframes sc-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes sc-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.6);  opacity: 0; }
}
.sc-title {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 99995; padding: 30px 44px;
  background: rgba(10,31,16,0.95); color: #f5f7f2;
  border-left: 4px solid #1e7d3a; border-radius: 4px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 800; font-size: 30px; letter-spacing: 0.02em;
  box-shadow: 0 30px 80px rgba(0,0,0,.5);
  animation: sc-fadein .35s ease;
  min-width: 440px; text-align: center; line-height: 1.55;
}
.sc-title small {
  display: block; font-size: 12px; color: #8fb87e;
  letter-spacing: 0.28em; font-weight: 700;
  margin-bottom: 12px;
}
.sc-caption {
  position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
  z-index: 99993; padding: 14px 26px;
  background: rgba(10,31,16,0.94); color: #f5f7f2;
  border-left: 3px solid #1e7d3a; border-radius: 3px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 600; font-size: 16px; letter-spacing: 0.03em;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  animation: sc-fadeup .3s ease;
  max-width: 980px; line-height: 1.65;
}
@keyframes sc-fadeup { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.scHelp && document.getElementById('sc-style')) return;
    window.scHelp = {};
    let style = document.getElementById('sc-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'sc-style';
      style.textContent = css;
      document.documentElement.appendChild(style);
    }
    window.scHelp.getTarget = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
    window.scHelp.ensureCursor = () => {
      if (window._scCursor && document.body.contains(window._scCursor)) return window._scCursor;
      const c = document.createElement('div');
      c.id = 'sc-cursor';
      c.innerHTML = '<svg width="34" height="40" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 32 L10 24 L15 34 L20 32 L15 22 L26 22 Z" fill="#0a1f10" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
      c.style.left = '640px'; c.style.top = '360px';
      document.body.appendChild(c);
      window._scCursor = c;
      return c;
    };
    window.scHelp.moveCursor = (sel) => {
      const t = window.scHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const c = window.scHelp.ensureCursor();
      c.style.left = (r.left + r.width / 2 - 10) + 'px';
      c.style.top  = (r.top + r.height / 2 - 6) + 'px';
    };
    window.scHelp.spot = (sel, label, kind) => {
      const t = window.scHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = (kind === 'hint') ? 'sc-hint' : 'sc-spot';
      const pad = 6;
      spot.style.left = (r.left - pad + window.scrollX) + 'px';
      spot.style.top  = (r.top  - pad + window.scrollY) + 'px';
      spot.style.width  = (r.width  + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';
      document.body.appendChild(spot);
      if (label) {
        const arr = document.createElement('div');
        arr.className = 'sc-arrow';
        arr.textContent = label;
        if (r.right + 260 > window.innerWidth) {
          arr.style.left = Math.max(10, r.left - 240 + window.scrollX) + 'px';
        } else {
          arr.style.left = (r.right + 20 + window.scrollX) + 'px';
        }
        arr.style.top  = (r.top + r.height / 2 - 18 + window.scrollY) + 'px';
        document.body.appendChild(arr);
      }
      window.scHelp.moveCursor(t);
    };
    window.scHelp.clearSpots = () => {
      document.querySelectorAll('.sc-spot, .sc-hint, .sc-arrow, .sc-ring').forEach(el => el.remove());
    };
    window.scHelp.zoom = (sel, label, opts) => {
      opts = opts || {};
      const scale = opts.scale || 1.5;
      const t = window.scHelp.getTarget(sel); if (!t) return;
      document.documentElement.classList.add('sc-zooming');
      const r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = window.innerWidth, h = window.innerHeight;
      const tx = w / 2 - cx;
      const ty = h / 2 - cy;
      document.body.style.transformOrigin = 'top left';
      document.body.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      setTimeout(() => {
        if (label) window.scHelp.spot(t, label);
        else window.scHelp.spot(t, '');
      }, 750);
    };
    window.scHelp.zoomOut = () => {
      window.scHelp.clearSpots();
      document.body.style.transform = '';
      document.documentElement.classList.remove('sc-zooming');
    };
    window.scHelp.clickRing = (sel) => {
      const t = window.scHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const ring = document.createElement('div');
      ring.className = 'sc-ring';
      ring.style.left = (r.left + r.width / 2 - 30 + window.scrollX) + 'px';
      ring.style.top  = (r.top + r.height / 2 - 30 + window.scrollY) + 'px';
      ring.style.width = '60px'; ring.style.height = '60px';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    };
    window.scHelp.title = (text, eyebrow) => {
      document.querySelectorAll('.sc-title').forEach(el => el.remove());
      const el = document.createElement('div');
      el.className = 'sc-title';
      el.innerHTML = (eyebrow ? `<small>${eyebrow}</small>` : '') + text;
      document.body.appendChild(el);
      return el;
    };
    window.scHelp.removeTitle = () => document.querySelectorAll('.sc-title').forEach(el => el.remove());
    window.scHelp.caption = (text) => {
      document.querySelectorAll('.sc-caption').forEach(el => el.remove());
      const el = document.createElement('div');
      el.className = 'sc-caption';
      el.innerHTML = text;
      document.body.appendChild(el);
      return el;
    };
    window.scHelp.clearCaption = () => document.querySelectorAll('.sc-caption').forEach(el => el.remove());
    window.scHelp.slide = async (html) => {
      document.querySelectorAll('.sc-slide').forEach(el => el.remove());
      // インジェクト: Google Fonts (Noto Sans JP weight range + Inter Tight numbers)
      if (!document.getElementById('sc-fonts')) {
        const l = document.createElement('link');
        l.id = 'sc-fonts'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter+Tight:wght@300;400;500;700&display=swap';
        document.head.appendChild(l);
      }
      // フォント読み込み完了を保証 (recording 前提)
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.load('900 88px "Noto Sans JP"'); await document.fonts.load('400 160px "Inter Tight"'); await document.fonts.ready; } catch (_) {}
      }
      const el = document.createElement('div');
      el.className = 'sc-slide';
      // Editorial: off-white bg, no cream tint, deep ink text, generous padding
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99994',
        'background:oklch(0.985 0.005 130)',
        'font-family:"Noto Sans JP",system-ui,sans-serif',
        'color:oklch(0.18 0.010 130)',
        'display:flex', 'flex-direction:column',
        'padding:64px 88px 56px',
        'overflow:hidden',
        'animation:sc-fadein .4s ease',
        'font-feature-settings:"palt" 1', // 日本語詰め文字
      ].join(';');
      el.innerHTML = html;
      // 段階リビール: data-reveal="N" 属性の要素を初期非表示に
      el.querySelectorAll('[data-reveal]').forEach(x => {
        x.style.opacity = '0';
        x.style.transform = 'translateY(14px)';
        x.style.transition = 'opacity .55s cubic-bezier(.2,.8,.4,1), transform .55s cubic-bezier(.2,.8,.4,1)';
      });
      document.body.appendChild(el);
      return el;
    };
    window.scHelp.reveal = (n) => {
      const el = document.querySelector('.sc-slide');
      if (!el) return;
      el.querySelectorAll(`[data-reveal="${n}"]`).forEach(x => {
        x.style.opacity = '1';
        x.style.transform = 'translateY(0)';
      });
    };
    window.scHelp.revealAll = () => {
      const el = document.querySelector('.sc-slide');
      if (!el) return;
      el.querySelectorAll('[data-reveal]').forEach(x => {
        x.style.opacity = '1'; x.style.transform = 'translateY(0)';
      });
    };
    window.scHelp.removeSlide = () => document.querySelectorAll('.sc-slide').forEach(el => el.remove());
    window.scHelp.clear = () => {
      window.scHelp.clearSpots();
      window.scHelp.removeTitle();
      window.scHelp.clearCaption();
      window.scHelp.removeSlide();
    };
  }, HIGHLIGHT_CSS);
}

async function wait(p, ms) { await p.waitForTimeout(ms); }

class Sync {
  constructor(marks, duration) {
    this.marks = marks || {};
    this.duration = duration || 30;
    this.t0 = Date.now();
  }
  // ナレーションの指定 mark 位置まで待機 (audio time-based)
  async waitFor(p, name) {
    const t = this.marks[name];
    if (t == null) { console.log(`    ⚠ mark not found: ${name}`); return; }
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = t - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
    else if (remain < -0.5) console.log(`    ⚠ late for ${name} by ${(-remain).toFixed(2)}s`);
  }
  async waitEnd(p) {
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = this.duration - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
  }
  now() { return (Date.now() - this.t0) / 1000; }
}

async function hint(p, sel, label = '') { await p.evaluate(({s,l}) => window.scHelp.spot(s, l, 'hint'), {s:sel,l:label}); }
async function spot(p, sel, label = '') { await p.evaluate(({s,l}) => { window.scHelp.clearSpots(); window.scHelp.spot(s, l); }, {s:sel,l:label}); }
async function clearSpots(p) { await p.evaluate(() => window.scHelp.clearSpots()); }
async function zoomIn(p, sel, label = '', scale = 1.5) { await p.evaluate(({s,l,sc}) => window.scHelp.zoom(s, l, {scale:sc}), {s:sel,l:label,sc:scale}); }
async function zoomOut(p) { await p.evaluate(() => window.scHelp.zoomOut()); }
async function clickRing(p, sel, doClick = true) {
  await p.evaluate((s) => window.scHelp.clickRing(s), sel);
  if (doClick) await p.evaluate((s) => { const t = typeof s === 'string' ? document.querySelector(s) : s; if (t) t.click(); }, sel);
}
async function title(p, text, eye) { await p.evaluate(({t,e}) => window.scHelp.title(t, e), {t:text, e:eye}); }
async function rmTitle(p) { await p.evaluate(() => window.scHelp.removeTitle()); }
async function caption(p, text) { await p.evaluate((t) => window.scHelp.caption(t), text); }
async function clearCaption(p) { await p.evaluate(() => window.scHelp.clearCaption()); }
async function slide(p, html) { await p.evaluate((h) => window.scHelp.slide(h), html); }
async function reveal(p, n) { await p.evaluate((k) => window.scHelp.reveal(k), n); }
async function revealAll(p) { await p.evaluate(() => window.scHelp.revealAll()); }
async function rmSlide(p) { await p.evaluate(() => window.scHelp.removeSlide()); }
async function clearAll(p) { await p.evaluate(() => window.scHelp.clear()); }

// ============ Editorial slide primitives ============
// 設計方針:
//  - 眉ラベル (SOLUTION · 01 等) は使わない (impeccable ban)
//  - 数字連番 01/02/03 は実際の順序である時だけ
//  - Hero-metric テンプレ (デカ数字+小ラベル+アクセント色) 禁止
//  - カードグリッド反復禁止 (weight/spacing/rule で階層)
//  - 絵文字禁止 (SVG icon か純粋タイポ)
//  - Palette: off-white bg (--bg) + 墨 ink + 深緑 leaf (accent <10%)
const C = {
  bg:      'oklch(0.985 0.005 130)',
  bg2:     'oklch(0.965 0.010 130)',
  ink:     'oklch(0.18 0.010 130)',       // near-black body
  ink2:    'oklch(0.35 0.015 130)',       // secondary text
  ink3:    'oklch(0.55 0.018 130)',       // tertiary / captions
  line:    'oklch(0.86 0.012 130)',       // dividers
  lineDim: 'oklch(0.92 0.010 130)',
  leaf:    'oklch(0.36 0.085 145)',       // deep chlorella brand green
  leafInk: 'oklch(0.22 0.075 145)',       // deeper leaf for text on light
  leafTint:'oklch(0.96 0.020 145)',       // faint tint bg
  alert:   'oklch(0.42 0.140 27)',        // deep terracotta, used sparingly
  alertTint: 'oklch(0.96 0.020 27)',
  fBody:   "'Noto Sans JP','Hiragino Sans','Yu Gothic',system-ui,sans-serif",
  fNum:    "'Inter Tight','Inter',system-ui,sans-serif",
};

const SL = {
  // Slide chrome: fine top overline + running foot (identity, not eyebrow)
  chrome: (ordinal, section) => `
    <div style="display:flex;align-items:baseline;gap:20px;padding-bottom:22px;border-bottom:1px solid ${C.line};">
      <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.10em;text-transform:uppercase;">
        Sun Chlorella Japan · 統合LINE OS
      </div>
      <div style="flex:1;"></div>
      ${section ? `<div style="font-family:${C.fBody};font-size:13px;font-weight:500;color:${C.ink2};letter-spacing:0.02em;">${section}</div>` : ''}
      ${ordinal ? `<div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.12em;">${ordinal}</div>` : ''}
    </div>`,
  foot: `
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;align-items:baseline;gap:16px;font-family:${C.fBody};">
      <div style="font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.02em;">Skeleton Inc.</div>
      <div style="flex:1;height:1px;"></div>
      <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.06em;">2026 · 07</div>
    </div>`,

  // Big editorial title (no eyebrow — the title carries itself)
  title: (text, opts = {}) => `
    <div style="font-family:${C.fBody};font-weight:900;font-size:${opts.size || '58px'};line-height:1.18;letter-spacing:-0.035em;color:${C.ink};text-wrap:balance;max-width:22ch;">
      ${text}
    </div>`,

  // Small lead-in for what follows (a sentence, not a label)
  lead: (text) => `
    <div style="font-family:${C.fBody};font-weight:500;font-size:16px;line-height:1.75;color:${C.ink2};max-width:60ch;">
      ${text}
    </div>`,

  // Body prose paragraph
  body: (text, opts = {}) => `
    <div style="font-family:${C.fBody};font-weight:${opts.weight || 500};font-size:${opts.size || '16px'};line-height:1.85;color:${opts.color || C.ink};max-width:${opts.width || '60ch'};text-wrap:pretty;">
      ${text}
    </div>`,

  // Data figure: big number + descriptor. Use ONLY when the number IS the point.
  // Avoids hero-metric SaaS cliche by pairing number with prose reason inline.
  figure: (num, unit, descriptor) => `
    <div style="display:flex;align-items:baseline;gap:6px;">
      <div style="font-family:${C.fNum};font-weight:500;font-size:88px;line-height:0.95;letter-spacing:-0.045em;color:${C.leaf};">${num}</div>
      ${unit ? `<div style="font-family:${C.fNum};font-weight:400;font-size:22px;color:${C.leaf};letter-spacing:-0.01em;">${unit}</div>` : ''}
    </div>
    <div style="margin-top:8px;font-family:${C.fBody};font-weight:500;font-size:14px;color:${C.ink2};letter-spacing:0.01em;">${descriptor}</div>`,

  // Rule divider
  rule: (opts = {}) => `<div style="height:1px;background:${opts.color || C.line};margin:${opts.my || '18px'} 0;"></div>`,

  // Ordinal marker (I / II / III) — used ONLY where numbering is meaningful
  ordinal: (n) => `<div style="font-family:${C.fNum};font-weight:300;font-size:14px;color:${C.ink3};letter-spacing:0.14em;">${n}</div>`,

  // Small caption below data
  cap: (text) => `<div style="font-family:${C.fBody};font-weight:500;font-size:12.5px;color:${C.ink3};letter-spacing:0.02em;line-height:1.6;">${text}</div>`,
};

async function focusFlow(p, sel, label, opts = {}) {
  const holdMs = opts.holdMs ?? 2200;
  const scale = opts.scale ?? 1.5;
  const doClick = opts.click === true;
  await wait(p, 300);
  await hint(p, sel, label);
  await wait(p, 550);
  await zoomIn(p, sel, label, scale);
  await wait(p, 800);
  await wait(p, holdMs);
  if (doClick) { await clickRing(p, sel, true); await wait(p, 500); }
  await zoomOut(p);
  await wait(p, 300);
}

async function pointAt(p, sel, label, holdMs = 1200) {
  await hint(p, sel, label); await wait(p, 300);
  await spot(p, sel, label); await wait(p, holdMs);
  await clearSpots(p); await wait(p, 200);
}

async function preloadFonts(p) {
  await p.evaluate(async () => {
    if (!document.getElementById('sc-fonts')) {
      const link = document.createElement('link');
      link.id = 'sc-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter+Tight:wght@300;400;500;700&display=swap';
      document.head.appendChild(link);
      await new Promise(r => {
        let done = false;
        const fin = () => { if (!done) { done = true; r(); } };
        link.addEventListener('load', fin);
        link.addEventListener('error', fin);
        setTimeout(fin, 5000);
      });
    }
    // 明示的に全 weight を preload
    const jobs = [];
    for (const w of [300, 400, 500, 700, 900]) jobs.push(document.fonts.load(`${w} 16px "Noto Sans JP"`));
    for (const w of [300, 400, 500, 700]) jobs.push(document.fonts.load(`${w} 16px "Inter Tight"`));
    // 大サイズ数字も (レンダリング用の実 metric を確保)
    jobs.push(document.fonts.load('900 88px "Noto Sans JP"'));
    jobs.push(document.fonts.load('400 160px "Inter Tight"'));
    await Promise.all(jobs);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
}

async function goto(p, url) {
  await p.goto(url, { waitUntil: 'networkidle' });
  await wait(p, 500);
  await injectHelper(p);
  await preloadFonts(p);
}

async function goView(p, view) {
  await p.evaluate((v) => { location.hash = '#' + v; }, view);
  await wait(p, 700);
  await injectHelper(p);
}

// ============ 章シナリオ (音声8章 = 258.9秒) ============
const chapters = [

  // ═══════════════════════════════════════════════════════
  //  Ch 01 · 課題 (86.6s)  editorial rewrite
  // ═══════════════════════════════════════════════════════
  { name: '01-issue', act: async (p, sync) => {
    await goto(p, `${BASE}/admin/index.html`);

    // ── 表紙 (0 → 7.2) — restrained typographic cover ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:820px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.18em;font-weight:400;">FOR SUN CHLORELLA JAPAN — 2026 / 07</div>
        <div data-reveal="2" style="margin-top:36px;font-family:${C.fBody};font-weight:900;font-size:88px;line-height:1.05;letter-spacing:-0.045em;color:${C.ink};">統合<span style="color:${C.leaf};">LINE OS</span></div>
        <div data-reveal="3" style="margin-top:14px;font-family:${C.fBody};font-weight:500;font-size:22px;line-height:1.5;color:${C.ink2};letter-spacing:-0.005em;">訪問販売員 62名と、 4本の公式アカウントと、<br>京都本社の経営会議を、一本の数字で繋ぐ提案書</div>
        <div data-reveal="4" style="margin-top:56px;display:flex;align-items:baseline;gap:14px;">
          <div style="width:56px;height:1px;background:${C.ink};"></div>
          <div style="font-family:${C.fBody};font-size:14px;color:${C.ink2};font-weight:500;letter-spacing:0.02em;">株式会社スケルトン</div>
        </div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2); await reveal(p, 3); await reveal(p, 4);

    // ── アジェンダ: 3課題 (thanks_end 7.2 → intro_end 14.2) ──
    await sync.waitFor(p, 'thanks_end');
    await slide(p, `
      ${SL.chrome('01 / 05', '課題')}
      <div style="margin-top:36px;">${SL.title('御社の現場でいま、<br>起きていること', { size: '52px' })}</div>
      <div style="margin-top:44px;display:grid;grid-template-columns:56px 1fr;gap:24px;row-gap:26px;max-width:900px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:22px;font-weight:400;color:${C.leaf};letter-spacing:-0.02em;">01</div>
        <div data-reveal="1" style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.5;">訪問販売員の実績が、 EC化によって消えていく</div>
        <div data-reveal="2" style="font-family:${C.fNum};font-size:22px;font-weight:400;color:${C.leaf};letter-spacing:-0.02em;">02</div>
        <div data-reveal="2" style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.5;">4本の公式LINE が部署別で運用され、本社が数字を横断把握できない</div>
        <div data-reveal="3" style="font-family:${C.fNum};font-size:22px;font-weight:400;color:${C.leaf};letter-spacing:-0.02em;">03</div>
        <div data-reveal="3" style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.5;">中高齢のお客様の半数が、メールアドレス入力で離脱する</div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await wait(p, 1500);
    await reveal(p, 2); await wait(p, 1500);
    await reveal(p, 3);

    // ── 課題① 具体シナリオ: 北野さん × 田中さま (intro_end 14.2 → issue1_end 37.4) ──
    await sync.waitFor(p, 'intro_end');
    await slide(p, `
      ${SL.chrome('02 / 05', '課題 · 一')}
      <div style="margin-top:32px;">${SL.title('販売員の実績が、<br><span style="color:${C.leaf}">消える</span>', { size: '52px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:repeat(4, 1fr);gap:0;position:relative;">
        <!-- horizontal spine -->
        <div style="position:absolute;top:34px;left:5%;right:5%;height:1px;background:${C.line};"></div>

        <div data-reveal="1" style="text-align:center;padding-right:20px;">
          <div style="margin:0 auto;width:14px;height:14px;border:2px solid ${C.ink};border-radius:50%;background:${C.bg};position:relative;z-index:1;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">TIME 01</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};line-height:1.4;">3ヶ月通う</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.7;">販売員北野さんが、田中家に通い続け、商品の価値を丁寧に伝える。</div>
        </div>

        <div data-reveal="2" style="text-align:center;padding-right:20px;">
          <div style="margin:0 auto;width:14px;height:14px;border:2px solid ${C.ink};border-radius:50%;background:${C.bg};position:relative;z-index:1;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">TIME 02</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};line-height:1.4;">週末の夜</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.7;">田中さまが、スマホで ECサイトを開き、定期便に申し込む。</div>
        </div>

        <div data-reveal="3" style="text-align:center;padding-right:20px;">
          <div style="margin:0 auto;width:14px;height:14px;border:2px solid ${C.ink};border-radius:50%;background:${C.bg};position:relative;z-index:1;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">TIME 03</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};line-height:1.4;">その瞬間</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.7;">売上は、 EC部門の実績として計上される。</div>
        </div>

        <div data-reveal="4" style="text-align:center;">
          <div style="margin:0 auto;width:14px;height:14px;background:${C.alert};border-radius:50%;position:relative;z-index:1;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.alert};letter-spacing:0.14em;font-weight:400;">RESULT</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.alert};line-height:1.4;">実績は残らない</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.7;">北野さんの 3ヶ月の努力は、どこにも記録されない。</div>
        </div>
      </div>

      <div data-reveal="5" style="margin-top:52px;padding:24px 28px;border-left:none;background:${C.bg2};">
        <div style="font-family:${C.fBody};font-size:15px;color:${C.ink};line-height:1.85;">この光景が、今月も、全国 <span style="font-family:${C.fNum};font-weight:700;">62名</span> の訪問販売員の現場で、起きています。</div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await wait(p, 400);
    await sync.waitFor(p, 'issue1_scene_visit'); await reveal(p, 2);
    await sync.waitFor(p, 'issue1_scene_ec'); await reveal(p, 3);
    await sync.waitFor(p, 'issue1_result'); await reveal(p, 4);
    await sync.waitFor(p, 'issue1_end'); await reveal(p, 5);

    // ── 課題② (issue1_end 37.4 → issue2_end 61.2) editorial diagram ──
    await slide(p, `
      ${SL.chrome('03 / 05', '課題 · 二')}
      <div style="margin-top:28px;">${SL.title('4本の公式LINE が、<br>本社で <span style="color:${C.leaf}">合算できない</span>', { size: '48px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1px 1fr;gap:40px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">CURRENT · 部署別運用</div>
          <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid ${C.line};">
            ${[
              ['営業部','販売員追跡'],
              ['お客様サポート','問い合わせ応答'],
              ['定期便お知らせ','出荷連絡'],
              ['キャンペーン','季節企画'],
            ].map(([n,r],i) => `
              <div data-reveal="${2+i}" style="padding:16px 4px 16px 0;border-bottom:1px solid ${C.line};${i%2===0?`border-right:1px solid ${C.line};padding-right:16px;`:'padding-left:16px;'}">
                <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.12em;">L / ${String(i+1).padStart(2,'0')}</div>
                <div style="margin-top:4px;font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};">${n}</div>
                <div style="margin-top:2px;font-family:${C.fBody};font-size:12px;color:${C.ink3};">${r}</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:16px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.75;">配信ツールが部署ごとに別。数字はそれぞれの部署で手集計。</div>
        </div>

        <div style="width:1px;background:${C.line};"></div>

        <div data-reveal="6" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.alert};letter-spacing:0.16em;font-weight:400;">HEAD OFFICE · 本社視点</div>
          <div style="margin-top:20px;font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink};line-height:1.9;">
            経営会議で「LINE経由の総売上、総友達数、平均開封率」を見たくても、 <span style="font-weight:700;background:linear-gradient(transparent 65%,${C.leafTint} 65%);">4部署から数字を集めて、手作業で合算する必要があります</span>。
          </div>
          <div data-reveal="7" style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">
            統合したいが、既存の友達を失うリスクがこわい。<br>このままでは、統合判断の材料も、手に入らない。
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2); await reveal(p, 3); await reveal(p, 4); await reveal(p, 5);
    await sync.waitFor(p, 'issue2_hq'); await reveal(p, 6);
    await sync.waitFor(p, 'issue2_end'); await reveal(p, 7);

    // ── 課題③ (issue2_end 61.2 → issue3_end 80.6) ──
    await slide(p, `
      ${SL.chrome('04 / 05', '課題 · 三')}
      <div style="margin-top:28px;">${SL.title('中高齢の半数が、<br>メール入力で <span style="color:${C.leaf}">諦める</span>', { size: '48px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1.3fr 1fr;gap:56px;flex:1;">
        <div data-reveal="1" style="display:flex;flex-direction:column;">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">EC PURCHASE FLOW</div>
          <div style="margin-top:18px;font-family:${C.fBody};font-size:15px;line-height:2.3;">
            <div style="display:flex;gap:14px;align-items:baseline;border-bottom:1px solid ${C.line};padding:8px 0;">
              <span style="font-family:${C.fNum};color:${C.ink3};font-size:12px;letter-spacing:0.1em;width:22px;">01</span>
              <span style="color:${C.ink};">商品選択</span>
              <span style="margin-left:auto;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;">通過</span>
            </div>
            <div style="display:flex;gap:14px;align-items:baseline;border-bottom:1px solid ${C.line};padding:8px 0;">
              <span style="font-family:${C.fNum};color:${C.ink3};font-size:12px;letter-spacing:0.1em;width:22px;">02</span>
              <span style="color:${C.ink};">カート</span>
              <span style="margin-left:auto;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;">通過</span>
            </div>
            <div data-reveal="2" style="display:flex;gap:14px;align-items:baseline;border-bottom:2px solid ${C.alert};padding:12px 0;background:linear-gradient(90deg, transparent, ${C.alertTint} 60%);">
              <span style="font-family:${C.fNum};color:${C.alert};font-size:12px;letter-spacing:0.1em;width:22px;font-weight:700;">03</span>
              <span style="color:${C.alert};font-weight:700;">メールアドレス入力</span>
              <span style="margin-left:auto;font-family:${C.fNum};font-size:11px;color:${C.alert};letter-spacing:0.14em;font-weight:700;">半数離脱</span>
            </div>
            <div style="display:flex;gap:14px;align-items:baseline;border-bottom:1px solid ${C.line};padding:8px 0;color:${C.ink3};">
              <span style="font-family:${C.fNum};font-size:12px;letter-spacing:0.1em;width:22px;">04</span>
              <span>決済</span>
            </div>
            <div style="display:flex;gap:14px;align-items:baseline;padding:8px 0;color:${C.ink3};">
              <span style="font-family:${C.fNum};font-size:12px;letter-spacing:0.1em;width:22px;">05</span>
              <span>完了</span>
            </div>
          </div>
        </div>

        <div data-reveal="3" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">MEASURED DROP-OFF</div>
          <div style="margin-top:14px;display:flex;align-items:baseline;gap:8px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:140px;line-height:0.9;letter-spacing:-0.05em;color:${C.alert};">50</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:36px;color:${C.alert};letter-spacing:-0.02em;">%</div>
          </div>
          <div data-reveal="4" style="margin-top:20px;font-family:${C.fBody};font-size:15px;line-height:1.85;color:${C.ink2};max-width:32ch;">
            御社の中心顧客層 = 60代〜 70代の女性。メール登録を求められた瞬間、半数が購入をあきらめる。販売員がいくら ECサイトをご案内しても、「登録がわからない」の声で、追加購入につながらない。
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2); await reveal(p, 3);
    await sync.waitFor(p, 'issue3_scene'); await reveal(p, 4);

    // ── 解決策 intro (issue3_end 80.6 → 86.6) ──
    await sync.waitFor(p, 'issue3_end');
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.18em;font-weight:400;">05 / 05 — TOWARD ONE SYSTEM</div>
        <div data-reveal="2" style="margin-top:28px;font-family:${C.fBody};font-weight:900;font-size:76px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">3つの課題を、<br><span style="color:${C.leaf};">1つの運用OS</span> で解く</div>
        <div data-reveal="3" style="margin-top:36px;display:flex;align-items:baseline;gap:14px;">
          <div style="width:56px;height:1px;background:${C.leaf};"></div>
          <div style="font-family:${C.fBody};font-size:18px;color:${C.leaf};font-weight:700;letter-spacing:-0.005em;">統合 LINE OS</div>
        </div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2); await wait(p, 3000); await reveal(p, 3);
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 02 · 販売員実績 (63.4s) — QR mechanics + LTV
  // ═══════════════════════════════════════════════════════
  { name: '02-solution-1-rep', act: async (p, sync) => {
    await goto(p, `${BASE}/rep/index.html`);

    // ── 表紙 (0 → 5.2) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:16px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.12em;font-weight:400;"><span>01</span><span style="flex:1;height:1px;background:${C.line};max-width:80px;"></span><span>解決策</span></div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:72px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">訪問販売員の実績を、<br><span style="color:${C.leaf};">永続的に守る</span></div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── QR 4-step mechanics (title_end 5.2 → step_engrave 25.8) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('I · 01', '仕組み')}
      <div style="margin-top:26px;">${SL.title('玄関先で、 3秒で、<br><span style="color:${C.leaf};">担当ID</span> を顧客に刻印', { size: '44px' })}</div>

      <div style="margin-top:36px;flex:1;display:grid;grid-template-columns:80px 1fr;column-gap:30px;row-gap:14px;align-content:start;">
        <div data-reveal="1" style="padding-top:6px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">01</div>
        <div data-reveal="1" style="padding-bottom:16px;border-bottom:1px solid ${C.line};">
          <div style="font-family:${C.fBody};font-size:18px;font-weight:700;color:${C.ink};line-height:1.4;">対面 · 玄関先で 信頼を 積む</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.8;">販売員が 商品を 説明する。 これまでの 訪問販売と 同じ 動作。</div>
        </div>

        <div data-reveal="2" style="padding-top:6px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">02</div>
        <div data-reveal="2" style="padding-bottom:16px;border-bottom:1px solid ${C.line};">
          <div style="font-family:${C.fBody};font-size:18px;font-weight:700;color:${C.ink};line-height:1.4;">QR 提示</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.8;">タブレット、 名刺、 チラシ印刷 のいずれかで 販売員個別の QR を 見せる。</div>
        </div>

        <div data-reveal="3" style="padding-top:6px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">03</div>
        <div data-reveal="3" style="padding-bottom:16px;border-bottom:1px solid ${C.line};">
          <div style="font-family:${C.fBody};font-size:18px;font-weight:700;color:${C.ink};line-height:1.4;">スキャン</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.8;">お客様が LINE で QR を 読み取る。 タップ 1回で 友達追加が 完了する。</div>
        </div>

        <div data-reveal="4" style="padding-top:6px;font-family:${C.fNum};font-size:12px;color:${C.leaf};letter-spacing:0.14em;font-weight:700;">04</div>
        <div data-reveal="4">
          <div style="font-family:${C.fBody};font-size:18px;font-weight:700;color:${C.leaf};line-height:1.4;">刻印</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.8;">担当販売員 ID が、 お客様 レコード に 永久に 書き込まれる。</div>
          <div data-reveal="5" style="margin-top:12px;display:inline-block;padding:6px 12px;background:${C.leafTint};font-family:${C.fNum};font-size:12px;color:${C.leafInk};letter-spacing:0.02em;">customer.repId = "北野誠"</div>
        </div>
      </div>

      <div data-reveal="6" style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">友達追加 と rep_id 刻印は、 同時に 完了 します。 お客様側は、 QR を スキャンする 1動作 だけ。</div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2);
    await sync.waitFor(p, 'step_show_qr'); await reveal(p, 3);
    await sync.waitFor(p, 'step_scan'); await reveal(p, 4);
    await wait(p, 3500); await reveal(p, 5); await reveal(p, 6);

    // ── 4チャネル全帰属 (step_engrave 25.8 → ltv_end 42.5) ──
    await sync.waitFor(p, 'step_engrave');
    await slide(p, `
      ${SL.chrome('I · 02', '帰属')}
      <div style="margin-top:26px;">${SL.title('以降の <span style="color:${C.leaf};">全チャネル</span> の購入が、<br>担当販売員の実績になる', { size: '42px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1.4fr 1fr;gap:56px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">田中幸子さま · 生涯購入 4チャネル</div>
          <div style="margin-top:18px;font-family:${C.fBody};">
            <div data-reveal="2" style="display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.06em;">2026 · 07 · 04</div>
              <div style="font-size:14px;color:${C.ink};">玄関先訪問 · 対面注文</div>
              <div style="font-family:${C.fNum};font-size:15px;font-weight:500;color:${C.ink};">¥ 8,640</div>
            </div>
            <div data-reveal="3" style="display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.06em;">2026 · 08 · 15</div>
              <div style="font-size:14px;color:${C.ink};">ECサイト · 定期便</div>
              <div style="font-family:${C.fNum};font-size:15px;font-weight:500;color:${C.ink};">¥ 12,800</div>
            </div>
            <div data-reveal="4" style="display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.06em;">2026 · 10 · 22</div>
              <div style="font-size:14px;color:${C.ink};">LINE · 追加購入</div>
              <div style="font-family:${C.fNum};font-size:15px;font-weight:500;color:${C.ink};">¥ 5,400</div>
            </div>
            <div data-reveal="5" style="display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:baseline;padding:12px 0;border-bottom:2px solid ${C.ink};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.06em;">2027 · 02 · 11</div>
              <div style="font-size:14px;color:${C.ink};">電話 · 追加注文</div>
              <div style="font-family:${C.fNum};font-size:15px;font-weight:500;color:${C.ink};">¥ 18,900</div>
            </div>
            <div data-reveal="6" style="display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:baseline;padding:14px 0;">
              <div></div>
              <div style="font-size:14px;color:${C.ink2};font-weight:500;">累計 · 生涯LTV</div>
              <div style="font-family:${C.fNum};font-size:22px;font-weight:500;color:${C.leaf};letter-spacing:-0.02em;">¥ 45,740</div>
            </div>
          </div>
        </div>

        <div data-reveal="7" style="display:flex;flex-direction:column;justify-content:center;padding-left:40px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">担当販売員 · 北野誠実績</div>
          <div style="margin-top:20px;font-family:${C.fNum};font-weight:400;font-size:56px;line-height:0.95;letter-spacing:-0.03em;color:${C.leaf};">¥ 45,740</div>
          <div style="margin-top:16px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.9;">4チャネルの全購入が、担当販売員の実績として、本社ダッシュボードに集計されます。</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2);
    await sync.waitFor(p, 'ltv_channels');
    await reveal(p, 3); await wait(p, 1400);
    await reveal(p, 4); await wait(p, 1400);
    await reveal(p, 5);
    await sync.waitFor(p, 'ltv_end'); await reveal(p, 6); await reveal(p, 7);

    // ── 実UI rep画面 (ltv_end 42.5 → end 63.3) ──
    await rmSlide(p);
    await p.evaluate(() => { document.querySelector('a[data-view="perf"]')?.click(); });
    await wait(p, 400);
    await caption(p, '実画面: 販売員個人成績 · 月次売上 / 継続率 / ランキング / 前月比 / 目標達成率');
    await focusFlow(p, '.view[data-view="perf"]', '販売員 62名のスマホアプリ', { holdMs: 6500, scale: 1.2 });
    await sync.waitFor(p, 'app_realtime');
    await caption(p, '本人がリアルタイムで確認 · 「努力が見えない」モヤモヤを解消');
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 03 · 4アカ統合 (53.1s)
  // ═══════════════════════════════════════════════════════
  { name: '03-solution-2-account', act: async (p, sync) => {
    await goto(p, `${BASE}/admin/index.html`);
    await p.evaluate(() => { location.hash = '#channels'; });
    await wait(p, 400);

    // ── 表紙 (0 → 4.8) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:16px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.12em;font-weight:400;"><span>02</span><span style="flex:1;height:1px;background:${C.line};max-width:80px;"></span><span>解決策</span></div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:72px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">4本の公式LINE を、<br><span style="color:${C.leaf};">1画面で束ねる</span></div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── Before / After 統合ダッシュ (title_end 4.8 → unified 20.7) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('II · 01', '統合ダッシュ')}
      <div style="margin-top:26px;">${SL.title('4本の数字を、本社の <span style="color:${C.leaf};">1画面</span> に', { size: '42px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1px 1.1fr;gap:44px;flex:1;">
        <div>
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">SOURCES · 4アカ</div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:0;">
            ${[
              ['営業部','販売員追跡'],
              ['お客様サポート','問い合わせ'],
              ['定期便お知らせ','出荷連絡'],
              ['キャンペーン','季節企画'],
            ].map(([n,r],i) => `
              <div data-reveal="${2+i}" style="display:grid;grid-template-columns:24px 1fr auto;gap:14px;align-items:baseline;padding:14px 0;border-bottom:1px solid ${C.line};">
                <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.06em;">${String(i+1).padStart(2,'0')}</div>
                <div>
                  <div style="font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};">${n}</div>
                  <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};margin-top:2px;">${r}</div>
                </div>
                <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">→ 集計</div>
              </div>`).join('')}
          </div>
        </div>

        <div style="width:1px;background:${C.line};"></div>

        <div data-reveal="6" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.leaf};letter-spacing:0.16em;font-weight:400;">HEAD OFFICE · 統合サマリー</div>
          <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:22px 40px;">
            <div>
              <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};">総友達数</div>
              <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.ink};line-height:1;letter-spacing:-0.03em;margin-top:4px;">28,470</div>
            </div>
            <div>
              <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};">アカ経由売上</div>
              <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.ink};line-height:1;letter-spacing:-0.03em;margin-top:4px;">¥ 42.8<span style="font-size:22px;">M</span></div>
            </div>
            <div>
              <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};">開封率 · 平均</div>
              <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.ink};line-height:1;letter-spacing:-0.03em;margin-top:4px;">36<span style="font-size:22px;">%</span></div>
            </div>
            <div>
              <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};">獲得顧客</div>
              <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.ink};line-height:1;letter-spacing:-0.03em;margin-top:4px;">3,102</div>
            </div>
          </div>
          <div data-reveal="7" style="margin-top:28px;padding-top:16px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">既存友達の喪失リスクゼロのまま、 4本の数字を一元化します。</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'acc_sales'); await reveal(p, 2);
    await sync.waitFor(p, 'acc_support'); await reveal(p, 3);
    await sync.waitFor(p, 'acc_sub'); await reveal(p, 4);
    await sync.waitFor(p, 'acc_camp'); await reveal(p, 5);
    await wait(p, 4500); await reveal(p, 6);
    await wait(p, 3000); await reveal(p, 7);

    // ── 実UI channels (unified 20.7 → detail_end 34.2) ──
    await sync.waitFor(p, 'unified');
    await rmSlide(p);
    await caption(p, '実画面: 4アカ合算サマリー + アカ別カード');
    await focusFlow(p, '#chanSummary', '4アカ合算 KPI', { holdMs: 4000, scale: 1.2 });
    await sync.waitFor(p, 'detail_intro');
    await caption(p, 'アカウントカードクリック → 個別詳細ダッシュボード');
    await focusFlow(p, '#chanGrid', 'アカウントカード', { holdMs: 4500, scale: 1.15 });

    // ── 統合判断 A/B (detail_end 34.2 → end 53.0) ──
    await sync.waitFor(p, 'detail_end');
    await slide(p, `
      ${SL.chrome('II · 02', '判断')}
      <div style="margin-top:26px;">${SL.title('統合するか、<br>4本のままか。数字を見てから決める', { size: '38px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:48px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">OPTION A</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.4;">4本のまま + 統合ダッシュだけ</div>
          <div style="margin-top:24px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.95;">
            既存友達喪失ゼロ。部署の独立性は維持。本社は横断 KPI を把握できる。部署間の調整コストが最小。
          </div>
        </div>
        <div data-reveal="2">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">OPTION B</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.4;">1本に完全統合</div>
          <div style="margin-top:24px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.95;">
            運用工数削減。顧客にとってシンプルな窓口。部署間の役割調整が必要。統合移行時に一定の友達喪失リスクあり。
          </div>
        </div>
      </div>
      <div data-reveal="3" style="margin-top:32px;padding:24px 28px;background:${C.leafTint};">
        <div style="font-family:${C.fBody};font-size:15px;color:${C.ink};line-height:1.85;">3ヶ月の統合ダッシュ数字を見た上で、経営会議で御判断いただけます。</div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2);
    await sync.waitFor(p, 'decision'); await reveal(p, 3);
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 04 · LIFF EC (58.5s)
  // ═══════════════════════════════════════════════════════
  { name: '04-solution-3-liff', act: async (p, sync) => {
    await goto(p, `${BASE}/customer/index.html`);

    // ── 表紙 (0 → 7.1) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:16px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.12em;font-weight:400;"><span>03</span><span style="flex:1;height:1px;background:${C.line};max-width:80px;"></span><span>解決策</span></div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:72px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">LINE 内だけで、<br><span style="color:${C.leaf};">閲覧から会計まで</span></div>
        <div data-reveal="3" style="margin-top:28px;font-family:${C.fBody};font-size:18px;color:${C.ink2};font-weight:500;">メールアドレス入力は、一切求めません。</div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);
    await sync.waitFor(p, 'no_email'); await reveal(p, 3);

    // ── 顧客ジャーニー 4step (rich_menu 20.3 → checkout 29.3) ──
    await sync.waitFor(p, 'rich_menu');
    await slide(p, `
      ${SL.chrome('III · 01', '顧客ジャーニー')}
      <div style="margin-top:26px;">${SL.title('全てが <span style="color:${C.leaf};">LINE アプリ内</span> で完結する', { size: '42px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;position:relative;">
        <div style="position:absolute;top:22px;left:6%;right:6%;height:1px;background:${C.line};"></div>

        <div data-reveal="1" style="padding-right:24px;">
          <div style="width:12px;height:12px;background:${C.ink};border-radius:50%;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">STEP 01</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};line-height:1.4;">リッチメニュー</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.8;">「商品を見る」をタップ。</div>
        </div>
        <div data-reveal="2" style="padding-right:24px;">
          <div style="width:12px;height:12px;background:${C.ink};border-radius:50%;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">STEP 02</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};line-height:1.4;">閲覧 · カート</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.8;">LINE アプリ内で商品選択、数量指定、カートに追加。</div>
        </div>
        <div data-reveal="3" style="padding-right:24px;">
          <div style="width:12px;height:12px;background:${C.ink};border-radius:50%;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">STEP 03</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};line-height:1.4;">決済</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.8;">Stripe 経由。クレジットカード、銀行振込。</div>
        </div>
        <div data-reveal="4">
          <div style="width:12px;height:12px;background:${C.leaf};border-radius:50%;"></div>
          <div style="margin-top:24px;font-family:${C.fNum};font-size:11px;color:${C.leaf};letter-spacing:0.14em;font-weight:400;">STEP 04</div>
          <div style="margin-top:6px;font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.leaf};line-height:1.4;">完了 · 通知</div>
          <div style="margin-top:8px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.8;">LINE に決済完了の通知が届く。領収書も同チャンネル。</div>
        </div>
      </div>
      <div data-reveal="5" style="margin-top:48px;padding-top:20px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">外部サイトへの遷移はありません。お客様は LINE を閉じる必要がない。</div>
      ${SL.foot}
    `);
    await reveal(p, 1); await wait(p, 1800); await reveal(p, 2);
    await wait(p, 2500); await reveal(p, 3); await reveal(p, 4); await reveal(p, 5);

    // ── 初回のみ入力 (checkout 29.3 → no_pass 42.8) ──
    await sync.waitFor(p, 'checkout');
    await slide(p, `
      ${SL.chrome('III · 02', '入力')}
      <div style="margin-top:26px;">${SL.title('初回の <span style="color:${C.leaf};">3項目</span> だけ。<br>次回以降は自動継承', { size: '40px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:56px;flex:1;">
        <div>
          <div style="font-family:${C.fNum};font-size:11px;color:${C.leaf};letter-spacing:0.16em;font-weight:400;">STATUM · 初回入力</div>
          <div style="margin-top:18px;">
            <div data-reveal="1" style="display:grid;grid-template-columns:32px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:14px;color:${C.leaf};letter-spacing:0.06em;">01</div>
              <div style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};">お名前</div>
            </div>
            <div data-reveal="2" style="display:grid;grid-template-columns:32px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:14px;color:${C.leaf};letter-spacing:0.06em;">02</div>
              <div style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};">ご住所</div>
            </div>
            <div data-reveal="3" style="display:grid;grid-template-columns:32px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px solid ${C.line};">
              <div style="font-family:${C.fNum};font-size:14px;color:${C.leaf};letter-spacing:0.06em;">03</div>
              <div style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};">電話番号</div>
            </div>
          </div>
          <div data-reveal="4" style="margin-top:20px;padding:14px 18px;background:${C.leafTint};font-family:${C.fBody};font-size:13px;color:${C.leafInk};line-height:1.75;">次回以降の注文は、これらの情報を自動で引き継ぎます。</div>
        </div>

        <div data-reveal="5" style="padding-left:40px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.alert};letter-spacing:0.16em;font-weight:400;">REMOVED · 従来 EC の壁</div>
          <div style="margin-top:18px;font-family:${C.fBody};font-size:15px;color:${C.ink2};line-height:2;">
            メールアドレス<br>パスワード<br>会員登録の手続き<br>メールでログイン<br>パスワードリセットの迷路
          </div>
          <div data-reveal="6" style="margin-top:22px;padding-top:16px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">上記は、統合 LINE OS では <span style="color:${C.ink};font-weight:700;">全て撤廃</span> します。</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await wait(p, 1400);
    await reveal(p, 2); await wait(p, 1400);
    await reveal(p, 3); await wait(p, 1400);
    await reveal(p, 4);
    await sync.waitFor(p, 'no_pass'); await reveal(p, 5); await reveal(p, 6);

    // ── 実UI 定期便 (no_pass 42.8 → end 58.4) ──
    await sync.waitFor(p, 'no_pass');
    await rmSlide(p);
    await p.evaluate(() => { location.hash = '#subs'; });
    await wait(p, 400);
    await caption(p, '実画面: 定期便 · スキップ / 数量変更 / 停止 / 再開 · 全て 1タップ');
    await focusFlow(p, '.sub-card', '定期便カード', { holdMs: 6500, scale: 1.15 });
    await sync.waitFor(p, 'sub_ops');
    await caption(p, '中高齢の「メール登録の壁」を完全に撤廃');
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 05 · キャンペーン LTV (62.3s)
  // ═══════════════════════════════════════════════════════
  { name: '05-solution-4-attr', act: async (p, sync) => {
    await goto(p, `${BASE}/admin/index.html`);
    await p.evaluate(() => { location.hash = '#campaigns'; });
    await wait(p, 400);

    // ── 表紙 (0 → 6.9) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:16px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.12em;font-weight:400;"><span>04</span><span style="flex:1;height:1px;background:${C.line};max-width:80px;"></span><span>解決策</span></div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:66px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">キャンペーンごとに、<br><span style="color:${C.leaf};">獲得顧客の LTV</span> を別々 に計測</div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── 3チャネル発行 (title_end 6.9 → data_lakes 32.3) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('IV · 01', 'チャネル')}
      <div style="margin-top:26px;">${SL.title('3つの現場に、<br>別々 の <span style="color:${C.leaf};">QRコード</span> を発行', { size: '42px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:repeat(3,1fr);gap:36px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">CHANNEL · 01</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:20px;font-weight:700;color:${C.ink};line-height:1.4;">滋賀レイクス<br>協賛試合</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.85;">会場で配布する QR。バスケットボール観戦客に直接リーチ。</div>
          <div data-reveal="4" style="margin-top:22px;padding-top:14px;border-top:1px solid ${C.line};">
            <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.06em;">友達追加実績</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:42px;line-height:1;color:${C.ink};letter-spacing:-0.03em;margin-top:4px;">500<span style="font-size:20px;color:${C.ink3};"> 名</span></div>
          </div>
        </div>

        <div data-reveal="2">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">CHANNEL · 02</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:20px;font-weight:700;color:${C.ink};line-height:1.4;">大阪関西万博<br>出展ブース</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.85;">出展ブースで配布する QR。国内外の一般来場者。</div>
          <div data-reveal="5" style="margin-top:22px;padding-top:14px;border-top:1px solid ${C.line};">
            <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.06em;">友達追加実績</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:42px;line-height:1;color:${C.ink};letter-spacing:-0.03em;margin-top:4px;">200<span style="font-size:20px;color:${C.ink3};"> 名</span></div>
          </div>
        </div>

        <div data-reveal="3">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">CHANNEL · 03</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:20px;font-weight:700;color:${C.ink};line-height:1.4;">新聞広告<br>紙面 QR</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.85;">全国紙に掲載する紙面 QR。中高齢の定期購読者が中心。</div>
          <div data-reveal="6" style="margin-top:22px;padding-top:14px;border-top:1px solid ${C.line};">
            <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.06em;">友達追加実績</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:42px;line-height:1;color:${C.ink};letter-spacing:-0.03em;margin-top:4px;">80<span style="font-size:20px;color:${C.ink3};"> 名</span></div>
          </div>
        </div>
      </div>

      <div data-reveal="7" style="margin-top:36px;padding-top:20px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">管理画面でワンクリックで QR を発行。各 QR に獲得数、 LTV、継続率が紐づいて集計されます。</div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'ch_lakes'); await reveal(p, 2);
    await sync.waitFor(p, 'ch_expo'); await reveal(p, 3);
    await sync.waitFor(p, 'ch_paper'); await reveal(p, 4); await reveal(p, 5); await reveal(p, 6);
    await sync.waitFor(p, 'qr_issue'); await reveal(p, 7);

    // ── LTV 比較 (data_lakes 32.3 → end 62.2) ──
    await sync.waitFor(p, 'data_lakes');
    await slide(p, `
      ${SL.chrome('IV · 02', 'ROI')}
      <div style="margin-top:26px;">${SL.title('平均LTV × 継続率で、<br><span style="color:${C.leaf};">投資判定</span> を数字で', { size: '40px' })}</div>

      <div style="margin-top:36px;flex:1;">
        <div style="display:grid;grid-template-columns:2.5fr repeat(3,1fr) 1.4fr;gap:0;">
          <!-- Header row -->
          <div style="padding:12px 0 12px 0;border-bottom:2px solid ${C.ink};font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;">CHANNEL</div>
          <div style="padding:12px 8px 12px 24px;border-bottom:2px solid ${C.ink};font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;text-align:right;">獲得</div>
          <div style="padding:12px 8px;border-bottom:2px solid ${C.ink};font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;text-align:right;">平均 LTV</div>
          <div style="padding:12px 8px;border-bottom:2px solid ${C.ink};font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;text-align:right;">継続率 (6M)</div>
          <div style="padding:12px 0 12px 24px;border-bottom:2px solid ${C.ink};font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;text-align:right;">判定</div>

          <!-- Row: レイクス -->
          <div data-reveal="1" style="padding:22px 0;border-bottom:1px solid ${C.line};">
            <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};">滋賀レイクス協賛試合</div>
            <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};margin-top:3px;">CHANNEL · 01</div>
          </div>
          <div data-reveal="1" style="padding:22px 8px 22px 24px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:17px;color:${C.ink};">500 名</div>
          <div data-reveal="1" style="padding:22px 8px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:28px;font-weight:700;color:${C.leaf};letter-spacing:-0.02em;">¥ 18,400</div>
          <div data-reveal="1" style="padding:22px 8px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:20px;color:${C.leaf};letter-spacing:-0.01em;">52<span style="font-size:14px;">%</span></div>
          <div data-reveal="4" style="padding:22px 0 22px 24px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fBody};font-size:13px;font-weight:700;color:${C.leaf};">継続</div>

          <!-- Row: 万博 -->
          <div data-reveal="2" style="padding:22px 0;border-bottom:1px solid ${C.line};">
            <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};">大阪関西万博出展</div>
            <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};margin-top:3px;">CHANNEL · 02</div>
          </div>
          <div data-reveal="2" style="padding:22px 8px 22px 24px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:17px;color:${C.ink};">200 名</div>
          <div data-reveal="2" style="padding:22px 8px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:28px;font-weight:700;color:${C.ink};letter-spacing:-0.02em;">¥ 9,200</div>
          <div data-reveal="2" style="padding:22px 8px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fNum};font-size:20px;color:${C.ink};letter-spacing:-0.01em;">28<span style="font-size:14px;">%</span></div>
          <div data-reveal="5" style="padding:22px 0 22px 24px;border-bottom:1px solid ${C.line};text-align:right;font-family:${C.fBody};font-size:13px;font-weight:700;color:${C.ink2};">再考</div>

          <!-- Row: 新聞 -->
          <div data-reveal="3" style="padding:22px 0;">
            <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};">新聞広告紙面 QR</div>
            <div style="font-family:${C.fBody};font-size:12px;color:${C.ink3};margin-top:3px;">CHANNEL · 03</div>
          </div>
          <div data-reveal="3" style="padding:22px 8px 22px 24px;text-align:right;font-family:${C.fNum};font-size:17px;color:${C.ink};">80 名</div>
          <div data-reveal="3" style="padding:22px 8px;text-align:right;font-family:${C.fNum};font-size:28px;font-weight:700;color:${C.ink};letter-spacing:-0.02em;">¥ 6,700</div>
          <div data-reveal="3" style="padding:22px 8px;text-align:right;font-family:${C.fNum};font-size:20px;color:${C.ink};letter-spacing:-0.01em;">19<span style="font-size:14px;">%</span></div>
          <div data-reveal="6" style="padding:22px 0 22px 24px;text-align:right;font-family:${C.fBody};font-size:13px;font-weight:700;color:${C.alert};">見直し</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'data_expo'); await reveal(p, 2);
    await sync.waitFor(p, 'data_paper'); await reveal(p, 3);
    await wait(p, 4500); await reveal(p, 4);
    await wait(p, 2500); await reveal(p, 5);
    await wait(p, 2500); await reveal(p, 6);
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 06 · シナリオ (53.6s)
  // ═══════════════════════════════════════════════════════
  { name: '06-solution-5-scenario', act: async (p, sync) => {
    await goto(p, `${BASE}/admin/index.html`);
    await p.evaluate(() => { location.hash = '#scenarios'; });
    await wait(p, 400);

    // ── 表紙 (0 → 4.9) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:16px;font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.12em;font-weight:400;"><span>05</span><span style="flex:1;height:1px;background:${C.line};max-width:80px;"></span><span>解決策</span></div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:66px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">ステップ配信<br><span style="color:${C.leaf};">シナリオビルダー</span> を標準装備</div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── LSTEP 代替コスト比較 (title_end 4.9 → sc_a 20.9) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('V · 01', 'コスト')}
      <div style="margin-top:26px;">${SL.title('外部 LSTEP の中核機能を、<br><span style="color:${C.leaf};">追加費用なし</span> で内蔵', { size: '42px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:56px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">CURRENT · 外部ツール</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};">LSTEP を別契約</div>
          <div style="margin-top:28px;display:flex;align-items:baseline;gap:8px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:76px;line-height:0.9;letter-spacing:-0.04em;color:${C.ink};">¥30<span style="font-size:32px;color:${C.ink3};letter-spacing:-0.02em;">〜</span>50</div>
            <div style="font-family:${C.fBody};font-size:16px;color:${C.ink3};font-weight:500;">万 / 月</div>
          </div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:13px;color:${C.ink3};letter-spacing:0.02em;">年間換算 ¥360万〜 ¥600万</div>
          <div style="margin-top:24px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.9;">
            別ツール · データ連携の手間 · 学習コストがそれぞれ発生
          </div>
        </div>

        <div data-reveal="2" style="padding-left:56px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.leaf};letter-spacing:0.14em;font-weight:400;">SOLUTION · 統合LINE OS</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};">シナリオビルダー内蔵</div>
          <div style="margin-top:28px;display:flex;align-items:baseline;gap:8px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:76px;line-height:0.9;letter-spacing:-0.04em;color:${C.leaf};">¥0</div>
          </div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:13px;color:${C.ink3};letter-spacing:0.02em;">統合 LINE OS に標準装備</div>
          <div style="margin-top:24px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.9;">
            1 画面で完結 · 顧客データ直結 · マウス操作のみで組立
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'lstep_intro'); await reveal(p, 2);

    // ── 3典型シナリオ (sc_a 20.9 → sc_intro_end 34.1) ──
    await sync.waitFor(p, 'sc_a');
    await slide(p, `
      ${SL.chrome('V · 02', '典型シナリオ')}
      <div style="margin-top:26px;">${SL.title('御社で使える<br><span style="color:${C.leaf};">3つの自動配信</span> 例', { size: '40px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:repeat(3,1fr);gap:44px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">SCENARIO · A</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.4;">友達追加<br>3日プログラム</div>
          <div style="margin-top:22px;">
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">0 分</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">歓迎メッセージ + 担当販売員紹介</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">1 日後</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">商品ストーリー配信</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">3 日後</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">初回クーポン ¥1,000</div>
            </div>
          </div>
        </div>

        <div data-reveal="2">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">SCENARIO · B</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.4;">初回購入後<br>継続育成</div>
          <div style="margin-top:22px;">
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">購入直後</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">御礼 + 担当販売員挨拶</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">7 日後</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">使い方ガイド動画</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">25 日後</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">定期便割引提案</div>
            </div>
          </div>
        </div>

        <div data-reveal="3">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">SCENARIO · C</div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.4;">休眠 60日<br>復帰オファー</div>
          <div style="margin-top:22px;">
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">60 日</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">特別クーポン ¥3,000</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;border-bottom:1px solid ${C.lineDim};">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">+ 7 日</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">担当販売員から電話</div>
            </div>
            <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:10px 0;">
              <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.02em;">+ 14 日</div>
              <div style="font-family:${C.fBody};font-size:13px;color:${C.ink2};line-height:1.65;">配信停止判定</div>
            </div>
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'sc_b'); await reveal(p, 2);
    await sync.waitFor(p, 'sc_c'); await reveal(p, 3);

    // ── 6標準ステップ (sc_intro_end 34.1 → steps_list 44.1) ──
    await sync.waitFor(p, 'sc_intro_end');
    await slide(p, `
      ${SL.chrome('V · 03', '部品')}
      <div style="margin-top:26px;">${SL.title('6つの <span style="color:${C.leaf};">標準ステップ</span> を、<br>マウスで縦に並べる', { size: '40px' })}</div>

      <div style="margin-top:44px;display:grid;grid-template-columns:repeat(6,1fr);gap:24px;flex:1;">
        ${[
          ['01','待機','N日後に進める'],
          ['02','送信','Flex / 動画 / 画像'],
          ['03','タグ付与','セグメント自動'],
          ['04','分岐','条件で分ける'],
          ['05','購入判定','買った / 買わない'],
          ['06','終了','シナリオ完了'],
        ].map(([n,t,d],i) => `
          <div data-reveal="${1+Math.floor(i/2)}" style="padding-top:24px;border-top:1px solid ${C.ink};">
            <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">${n}</div>
            <div style="margin-top:10px;font-family:${C.fBody};font-size:18px;font-weight:700;color:${C.ink};line-height:1.35;">${t}</div>
            <div style="margin-top:8px;font-family:${C.fBody};font-size:12px;color:${C.ink2};line-height:1.7;">${d}</div>
          </div>`).join('')}
      </div>
      <div data-reveal="4" style="margin-top:44px;padding-top:20px;border-top:1px solid ${C.line};font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">エクセルは使えるけれど、プログラミングはできない、という前提で設計されています。</div>
      ${SL.foot}
    `);
    await reveal(p, 1); await wait(p, 1800);
    await reveal(p, 2); await wait(p, 1800);
    await reveal(p, 3); await wait(p, 1800);
    await reveal(p, 4);

    // ── 実UI scenarios (steps_list 44.1 → end 53.5) ──
    await sync.waitFor(p, 'steps_list');
    await rmSlide(p);
    await caption(p, '実画面: シナリオ管理 · マウス操作だけで組み立て');
    await focusFlow(p, '.view[data-view="scenarios"]', 'シナリオビルダー', { holdMs: 6500, scale: 1.15 });
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 07 · Impact (69.6s)
  // ═══════════════════════════════════════════════════════
  { name: '07-impact', act: async (p, sync) => {
    await goto(p, `${BASE}/admin/index.html`);

    // ── 表紙 (0 → 8.8) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.18em;font-weight:400;">IMPACT · MEASURED</div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:60px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">同規模健康食品ブランド<br><span style="color:${C.leaf};">導入 6ヶ月後</span> の実測</div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── KPI 01: +18% (title_end 8.8 → kpi2 35.7) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('KPI · 01', '6ヶ月後実測')}
      <div style="margin-top:26px;">${SL.title('販売員 1人あたり月次売上', { size: '32px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1.4fr;gap:56px;flex:1;">
        <div data-reveal="1" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:10px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.leaf};letter-spacing:-0.02em;">+</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:160px;line-height:0.9;letter-spacing:-0.05em;color:${C.leaf};">18</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.leaf};letter-spacing:-0.02em;">%</div>
          </div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:14px;color:${C.ink2};letter-spacing:0.02em;">6ヶ月後、平均増加</div>
        </div>

        <div data-reveal="2" style="display:flex;flex-direction:column;justify-content:center;padding-left:44px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">WHY · この数字が出た理由</div>
          <div style="margin-top:20px;font-family:${C.fBody};font-size:16px;line-height:2;color:${C.ink};">
            担当顧客の EC · LINE 追加購入も、販売員実績に帰属する。<br>
            「自分の顧客が、見えない所でも買ってくれている」実感が生まれる。<br>
            モチベーションが向上、訪問質が向上、追加購入の循環につながる。
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'kpi1_reason'); await reveal(p, 2);

    // ── KPI 02: +12pt (kpi2 35.7 → kpi3 55.9) ──
    await sync.waitFor(p, 'kpi2');
    await slide(p, `
      ${SL.chrome('KPI · 02', '6ヶ月後実測')}
      <div style="margin-top:26px;">${SL.title('定期便半年継続率', { size: '32px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1.4fr;gap:56px;flex:1;">
        <div data-reveal="1" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:10px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.leaf};letter-spacing:-0.02em;">+</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:160px;line-height:0.9;letter-spacing:-0.05em;color:${C.leaf};">12</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.leaf};letter-spacing:-0.02em;">pt</div>
          </div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:14px;color:${C.ink2};letter-spacing:0.02em;">6ヶ月後、継続率上昇</div>
        </div>

        <div data-reveal="2" style="display:flex;flex-direction:column;justify-content:center;padding-left:44px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">WHY · この数字が出た理由</div>
          <div style="margin-top:20px;font-family:${C.fBody};font-size:16px;line-height:2;color:${C.ink};">
            「解約」タップ前の引き止めシナリオが自動発火する。<br>
            定期便スキップが 1タップ、「面倒だからやめる」の手前で継続に戻せる。<br>
            担当販売員から直接電話でフォローできる体制が整う。
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'kpi2_reason'); await reveal(p, 2);

    // ── KPI 03: 2-3x (kpi3 55.9 → calc_setup 62.5) ──
    await sync.waitFor(p, 'kpi3');
    await slide(p, `
      ${SL.chrome('KPI · 03', '6ヶ月後実測')}
      <div style="margin-top:26px;">${SL.title('LINE 経由購入 CVR', { size: '32px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1.4fr;gap:56px;flex:1;">
        <div data-reveal="1" style="display:flex;flex-direction:column;justify-content:center;">
          <div style="display:flex;align-items:baseline;gap:10px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:160px;line-height:0.9;letter-spacing:-0.05em;color:${C.leaf};">2〜3</div>
            <div style="font-family:${C.fNum};font-weight:400;font-size:44px;color:${C.leaf};letter-spacing:-0.02em;">倍</div>
          </div>
          <div style="margin-top:12px;font-family:${C.fBody};font-size:14px;color:${C.ink2};letter-spacing:0.02em;">従来比、 6ヶ月後の CVR</div>
        </div>

        <div data-reveal="2" style="display:flex;flex-direction:column;justify-content:center;padding-left:44px;border-left:1px solid ${C.line};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.16em;font-weight:400;">WHY · この数字が出た理由</div>
          <div style="margin-top:20px;font-family:${C.fBody};font-size:16px;line-height:2;color:${C.ink};">
            メール登録が不要になり、中高齢層の離脱が撤廃される。<br>
            LIFF が LINE 内完結、外部サイトへの遷移がゼロになる。
          </div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── 御社インパクト計算 (calc_setup 62.5 → end 69.5) ──
    await sync.waitFor(p, 'calc_setup');
    await slide(p, `
      ${SL.chrome('YOUR IMPACT', '想定売上')}
      <div style="margin-top:32px;">${SL.title('御社に当てはめた場合', { size: '32px' })}</div>

      <div style="margin-top:44px;flex:1;display:flex;flex-direction:column;justify-content:center;">
        <div data-reveal="1" style="display:flex;align-items:baseline;gap:24px;font-family:${C.fNum};font-weight:400;font-size:52px;line-height:1;letter-spacing:-0.03em;color:${C.ink};">
          <span>62<span style="font-size:22px;color:${C.ink3};letter-spacing:0;"> 名</span></span>
          <span style="color:${C.ink3};font-size:38px;">×</span>
          <span>¥ 500<span style="font-size:22px;color:${C.ink3};letter-spacing:0;"> 万 / 月</span></span>
          <span style="color:${C.ink3};font-size:38px;">×</span>
          <span>15<span style="font-size:22px;color:${C.ink3};letter-spacing:0;"> %</span></span>
        </div>
        <div data-reveal="1" style="margin-top:16px;font-family:${C.fBody};font-size:14px;color:${C.ink3};letter-spacing:0.02em;">販売員数 · 平均月商 · 増分</div>

        <div data-reveal="2" style="margin-top:44px;padding-top:32px;border-top:1px solid ${C.ink};display:flex;align-items:baseline;gap:24px;">
          <div style="font-family:${C.fBody};font-size:16px;color:${C.ink2};font-weight:500;">月商増分</div>
          <div style="font-family:${C.fNum};font-weight:400;font-size:88px;line-height:0.95;letter-spacing:-0.04em;color:${C.leaf};">+ ¥ 4.7<span style="font-size:32px;color:${C.leaf};letter-spacing:-0.02em;"> 億</span></div>
        </div>
        <div data-reveal="3" style="margin-top:14px;display:flex;align-items:baseline;gap:24px;">
          <div style="font-family:${C.fBody};font-size:16px;color:${C.ink2};font-weight:500;">年商換算</div>
          <div style="font-family:${C.fNum};font-weight:400;font-size:88px;line-height:0.95;letter-spacing:-0.04em;color:${C.leaf};">+ ¥ 56<span style="font-size:32px;color:${C.leaf};letter-spacing:-0.02em;"> 億</span></div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'monthly'); await reveal(p, 2);
    await wait(p, 1600); await reveal(p, 3);
  }},

  // ═══════════════════════════════════════════════════════
  //  Ch 08 · Close (49.4s)
  // ═══════════════════════════════════════════════════════
  { name: '08-close', act: async (p, sync) => {
    // ── PoC 表紙 (0 → 6.3) ──
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.18em;font-weight:400;">PHASE 1 · PROOF OF CONCEPT</div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:900;font-size:72px;line-height:1.1;letter-spacing:-0.04em;color:${C.ink};">京都本社 1営業所、<br><span style="color:${C.leaf};">3ヶ月試験運用</span></div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2);

    // ── PoC 条件 (title_end 6.3 → scale_end 14.6) ──
    await sync.waitFor(p, 'title_end');
    await slide(p, `
      ${SL.chrome('PHASE 1', '条件')}
      <div style="margin-top:26px;">${SL.title('実効果検証の具体条件', { size: '36px' })}</div>

      <div style="margin-top:48px;display:grid;grid-template-columns:repeat(3,1fr);gap:40px;flex:1;align-items:start;">
        <div data-reveal="1" style="padding-top:32px;border-top:2px solid ${C.ink};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">初期費用</div>
          <div style="margin-top:16px;display:flex;align-items:baseline;gap:6px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:96px;line-height:0.9;letter-spacing:-0.04em;color:${C.ink};">800</div>
            <div style="font-family:${C.fBody};font-size:20px;color:${C.ink2};font-weight:500;">万円</div>
          </div>
          <div style="margin-top:16px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.75;">3ヶ月分の一括。 追加費用なし。</div>
        </div>
        <div data-reveal="2" style="padding-top:32px;border-top:2px solid ${C.ink};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">対象販売員</div>
          <div style="margin-top:16px;display:flex;align-items:baseline;gap:6px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:96px;line-height:0.9;letter-spacing:-0.04em;color:${C.ink};">5</div>
            <div style="font-family:${C.fBody};font-size:20px;color:${C.ink2};font-weight:500;">名</div>
          </div>
          <div style="margin-top:16px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.75;">京都本社の 1営業所に 所属する 販売員。</div>
        </div>
        <div data-reveal="3" style="padding-top:32px;border-top:2px solid ${C.ink};">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">対象顧客</div>
          <div style="margin-top:16px;display:flex;align-items:baseline;gap:6px;">
            <div style="font-family:${C.fNum};font-weight:400;font-size:96px;line-height:0.9;letter-spacing:-0.04em;color:${C.ink};">500</div>
            <div style="font-family:${C.fBody};font-size:20px;color:${C.ink2};font-weight:500;">名</div>
          </div>
          <div style="margin-top:16px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.75;">既存の 定期便顧客 から 選定。</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await reveal(p, 1);
    await sync.waitFor(p, 'cost'); await reveal(p, 2); await wait(p, 1500); await reveal(p, 3);

    // ── 4検証項目 (scale_end 14.6 → phase_after 39.3) ──
    await sync.waitFor(p, 'scale_end');
    await slide(p, `
      ${SL.chrome('PHASE 1', '検証項目')}
      <div style="margin-top:26px;">${SL.title('3ヶ月で見ていただく<br><span style="color:${C.leaf};">4つの数字</span>', { size: '38px' })}</div>

      <div style="margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:44px 56px;flex:1;">
        <div data-reveal="1">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">METRIC · 01</div>
          <div style="margin-top:10px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.35;">販売員月次売上</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">導入前平均と 3ヶ月目平均の比較。 <span style="color:${C.leaf};font-weight:700;">+18% 到達</span> を判定基準に。</div>
        </div>
        <div data-reveal="2">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">METRIC · 02</div>
          <div style="margin-top:10px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.35;">LINE 経由定期便加入率</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">既存顧客 500名のうち、 LIFF EC 経由で定期便加入する比率。</div>
        </div>
        <div data-reveal="3">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">METRIC · 03</div>
          <div style="margin-top:10px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.35;">解約阻止率</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">「解約」タップ前の引き止めシナリオで、どれだけ継続に戻せるか。</div>
        </div>
        <div data-reveal="4">
          <div style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.14em;font-weight:400;">METRIC · 04</div>
          <div style="margin-top:10px;font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.35;">販売員満足度スコア</div>
          <div style="margin-top:14px;font-family:${C.fBody};font-size:14px;color:${C.ink2};line-height:1.85;">「自分の実績が見える」「業務が楽になった」の NPS ヒアリング。</div>
        </div>
      </div>
      ${SL.foot}
    `);
    await sync.waitFor(p, 'm1'); await reveal(p, 1);
    await sync.waitFor(p, 'm2'); await reveal(p, 2);
    await sync.waitFor(p, 'm3'); await reveal(p, 3);
    await sync.waitFor(p, 'm4'); await reveal(p, 4);

    // ── Phase 後 (phase_after 39.3 → schedule 42.5) ──
    await sync.waitFor(p, 'phase_after');
    await caption(p, '全社展開 / 4アカ統合 / 保守契約は、 3ヶ月の数字を見た上で御判断ください');

    // ── クロージング (schedule 42.5 → end 49.4) ──
    await sync.waitFor(p, 'schedule');
    await clearCaption(p);
    await slide(p, `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:900px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:12px;color:${C.ink3};letter-spacing:0.18em;font-weight:400;">SKELETON INC.</div>
        <div data-reveal="2" style="margin-top:32px;font-family:${C.fBody};font-weight:900;font-size:64px;line-height:1.15;letter-spacing:-0.04em;color:${C.ink};">サン・クロレラジャパン様の<br><span style="color:${C.leaf};">100年先の事業</span> を、一緒に</div>
        <div data-reveal="3" style="margin-top:44px;display:flex;align-items:baseline;gap:14px;">
          <div style="width:56px;height:1px;background:${C.ink};"></div>
          <div style="font-family:${C.fBody};font-size:14px;color:${C.ink2};font-weight:500;letter-spacing:0.02em;">お打ち合わせをお待ちしております</div>
        </div>
      </div>
    `);
    await reveal(p, 1); await reveal(p, 2); await reveal(p, 3);
  }},
];

// ─── main ───
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  deviceScaleFactor: 1,
});
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PE:', e.message.slice(0, 80)));

console.log('🎬 recording start');
await goto(p, `${BASE}/admin/index.html`);
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle' });
await wait(p, 1000);
await injectHelper(p);

const timeline = [];
const t0 = Date.now();
const ONLY = process.argv[2] || '';

for (const f of chapters) {
  if (ONLY && !f.name.includes(ONLY)) continue;
  const start = (Date.now() - t0) / 1000;
  const tp = TP[f.name];
  const target = tp?.duration || 30;
  console.log(`  [${start.toFixed(1)}s] ${f.name} (target ${target.toFixed(1)}s)`);
  const sync = new Sync(tp?.marks, target);
  try {
    if (f.act) {
      await f.act(p, sync);
    } else if (f.segments) {
      // legacy fallback (should not be used)
      for (const seg of f.segments) { await seg.act(p, sync); }
    }
    await sync.waitEnd(p);
  } catch (e) {
    console.log(`    err: ${e.message.slice(0, 120)}`);
  }
  const end = (Date.now() - t0) / 1000;
  const dur = end - start;
  console.log(`    actual ${dur.toFixed(1)}s (diff ${(dur - target).toFixed(1)})`);
  timeline.push({ name: f.name, start, end, dur });
}

await ctx.close();
await b.close();

writeFileSync(`${OUT_DIR}/_timeline.json`, JSON.stringify(timeline, null, 2));
const webms = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
if (webms.length) {
  const newest = webms.sort((a,b) => statSync(`${OUT_DIR}/${b}`).mtimeMs - statSync(`${OUT_DIR}/${a}`).mtimeMs)[0];
  const target = `${OUT_DIR}/_all.webm`;
  if (existsSync(target)) unlinkSync(target);
  renameSync(`${OUT_DIR}/${newest}`, target);
  console.log(`\n✅ saved: _all.webm + _timeline.json`);
} else {
  console.log('\n✗ no webm');
}
