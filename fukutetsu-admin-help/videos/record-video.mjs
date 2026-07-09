// 福鉄 さんぽ帳 richmenu admin 使い方動画 — Playwright 録画
// Neural2-C + SSML mark 完全同期 / editorial slide + 実admin操作
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/fukutetsu-admin-help/videos';
mkdirSync(OUT_DIR, { recursive: true });

const ADMIN_URL = 'http://localhost:8899/fukutetsu-stamp-rally/richmenu-admin.html?v=19';

// TTS timepoints
const TP = JSON.parse(readFileSync(
  '/Users/tsukasayoshida/Desktop/skeleton-demos/fukutetsu-admin-help/audio/timepoints.json', 'utf8'
));

// ============================================================
// CSS for overlays (カーソル / スポット / キャプション / スライド)
// ============================================================
const HIGHLIGHT_CSS = `
body { transition: transform 0.7s cubic-bezier(.4,0,.2,1); }
html.fk-zooming, html.fk-zooming body { overflow: hidden !important; }
.fk-spot {
  position: absolute !important; border: 3px solid #1a6e45 !important; border-radius: 10px !important;
  box-shadow: 0 0 0 6px rgba(26,110,69,0.22), 0 0 30px rgba(26,110,69,0.65) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: fk-pulse 1.3s ease-in-out infinite;
  transition: left .35s, top .35s, width .35s, height .35s;
}
.fk-hint {
  position: absolute !important; border: 2px solid rgba(26,110,69,0.45) !important; border-radius: 8px !important;
  box-shadow: 0 0 0 4px rgba(26,110,69,0.10) !important;
  pointer-events: none !important; z-index: 99997 !important;
  transition: left .35s, top .35s, width .35s, height .35s;
}
.fk-arrow {
  position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #0d2b1a; color: #f3f6f2;
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  font-weight: 700; font-size: 14px; padding: 8px 15px; border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,.35); white-space: nowrap;
  border-left: 3px solid #1a6e45;
  animation: fk-fadein .3s ease;
}
#fk-cursor {
  position: absolute; pointer-events: none; z-index: 99997;
  transition: left .55s cubic-bezier(.4,0,.2,1), top .55s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4));
}
.fk-ring {
  position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #1a6e45; border-radius: 50%;
  animation: fk-ring 0.6s cubic-bezier(.2,.8,.4,1) forwards;
}
.fk-caption {
  position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
  z-index: 99993; padding: 13px 24px;
  background: rgba(13,43,26,0.93); color: #f3f6f2;
  border-left: 3px solid #1a6e45; border-radius: 3px;
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  font-weight: 600; font-size: 15px; letter-spacing: 0.03em;
  box-shadow: 0 10px 28px rgba(0,0,0,.38);
  animation: fk-fadeup .3s ease;
  max-width: 1000px; line-height: 1.65;
}
@keyframes fk-pulse {
  0%,100% { box-shadow: 0 0 0 6px rgba(26,110,69,0.22), 0 0 30px rgba(26,110,69,0.65); }
  50%     { box-shadow: 0 0 0 11px rgba(26,110,69,0.10), 0 0 44px rgba(26,110,69,0.80); }
}
@keyframes fk-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fk-fadeup { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes fk-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.5);  opacity: 0; }
}
`;

// ============================================================
// injectHelper — 同じ page にヘルパを一度だけ注入
// ============================================================
async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.fkHelp) return;
    window.fkHelp = {};
    const style = document.createElement('style');
    style.id = 'fk-style';
    style.textContent = css;
    document.documentElement.appendChild(style);

    window.fkHelp.getTarget = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);

    window.fkHelp.ensureCursor = () => {
      if (window._fkCursor && document.body.contains(window._fkCursor)) return window._fkCursor;
      const c = document.createElement('div');
      c.id = 'fk-cursor';
      c.innerHTML = '<svg width="32" height="38" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 32 L10 24 L15 34 L20 32 L15 22 L26 22 Z" fill="#0d2b1a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
      c.style.left = '720px'; c.style.top = '450px';
      document.body.appendChild(c);
      window._fkCursor = c;
      return c;
    };

    window.fkHelp.moveCursor = (sel) => {
      const t = window.fkHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const c = window.fkHelp.ensureCursor();
      c.style.left = (r.left + r.width / 2 - 10) + 'px';
      c.style.top  = (r.top + r.height / 2 - 6) + 'px';
    };

    window.fkHelp.spot = (sel, label, kind) => {
      const t = window.fkHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = (kind === 'hint') ? 'fk-hint' : 'fk-spot';
      const pad = 6;
      spot.style.left   = (r.left - pad + window.scrollX) + 'px';
      spot.style.top    = (r.top  - pad + window.scrollY) + 'px';
      spot.style.width  = (r.width  + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';
      document.body.appendChild(spot);
      if (label) {
        const arr = document.createElement('div');
        arr.className = 'fk-arrow';
        arr.textContent = label;
        if (r.right + 260 > window.innerWidth) {
          arr.style.left = Math.max(10, r.left - 240 + window.scrollX) + 'px';
        } else {
          arr.style.left = (r.right + 20 + window.scrollX) + 'px';
        }
        arr.style.top = (r.top + r.height / 2 - 16 + window.scrollY) + 'px';
        document.body.appendChild(arr);
      }
      window.fkHelp.moveCursor(t);
    };

    window.fkHelp.clearSpots = () => {
      document.querySelectorAll('.fk-spot, .fk-hint, .fk-arrow, .fk-ring').forEach(el => el.remove());
    };

    window.fkHelp.zoom = (sel, label, scale) => {
      scale = scale || 1.6;
      const t = window.fkHelp.getTarget(sel); if (!t) return;
      document.documentElement.classList.add('fk-zooming');
      const r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const w = window.innerWidth, h = window.innerHeight;
      document.body.style.transformOrigin = 'top left';
      document.body.style.transform = `translate(${w/2 - cx}px, ${h/2 - cy}px) scale(${scale})`;
      setTimeout(() => { window.fkHelp.spot(t, label || ''); }, 750);
    };

    window.fkHelp.zoomOut = () => {
      window.fkHelp.clearSpots();
      document.body.style.transform = '';
      document.documentElement.classList.remove('fk-zooming');
    };

    window.fkHelp.clickRing = (sel) => {
      const t = window.fkHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const ring = document.createElement('div');
      ring.className = 'fk-ring';
      ring.style.left = (r.left + r.width/2 - 28 + window.scrollX) + 'px';
      ring.style.top  = (r.top + r.height/2 - 28 + window.scrollY) + 'px';
      ring.style.width = '56px'; ring.style.height = '56px';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    };

    window.fkHelp.caption = (text) => {
      document.querySelectorAll('.fk-caption').forEach(el => el.remove());
      const el = document.createElement('div');
      el.className = 'fk-caption';
      el.innerHTML = text;
      document.body.appendChild(el);
    };
    window.fkHelp.clearCaption = () => document.querySelectorAll('.fk-caption').forEach(el => el.remove());

    // ── editorial slide system ──
    window.fkHelp.slide = async (html) => {
      if (!document.getElementById('fk-fonts')) {
        const l = document.createElement('link');
        l.id = 'fk-fonts'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter+Tight:wght@300;400;500;700&display=swap';
        document.head.appendChild(l);
      }
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.load('900 88px "Noto Sans JP"');
          await document.fonts.load('400 120px "Inter Tight"');
          await document.fonts.ready;
        } catch (_) {}
      }
      if (!document.getElementById('fk-page-cover')) {
        const c = document.createElement('div');
        c.id = 'fk-page-cover';
        c.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483646 !important;background:oklch(0.985 0.005 145) !important;pointer-events:none !important;';
        document.body.appendChild(c);
      }
      const existing = Array.from(document.querySelectorAll('.fk-slide'));
      const el = document.createElement('div');
      el.className = 'fk-slide';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'background:oklch(0.985 0.005 145)',
        'font-family:\'Noto Sans JP\',system-ui,sans-serif',
        'color:oklch(0.18 0.010 145)',
        'display:flex', 'flex-direction:column',
        'padding:56px 80px 48px',
        'overflow:hidden', 'opacity:0',
        'transition:opacity .35s ease-out',
        'font-feature-settings:"palt" 1',
      ].join(';');
      el.innerHTML = html;
      el.querySelectorAll('[data-reveal]').forEach(x => {
        x.style.opacity = '0';
        x.style.transform = 'translateY(6px)';
        x.style.transition = 'opacity .15s ease-out, transform .18s cubic-bezier(.2,.8,.4,1)';
      });
      document.body.appendChild(el);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.style.opacity = '1';
      existing.forEach(old => {
        old.style.transition = 'opacity .30s ease-out';
        old.style.opacity = '0';
        setTimeout(() => { try { old.remove(); } catch (_) {} }, 320);
      });
      await new Promise(r => setTimeout(r, 350));
      return el;
    };

    window.fkHelp.reveal = (n) => {
      const el = document.querySelector('.fk-slide');
      if (!el) return;
      el.querySelectorAll(`[data-reveal="${n}"]`).forEach(x => {
        x.style.opacity = '1'; x.style.transform = 'translateY(0)';
      });
    };
    window.fkHelp.revealAll = () => {
      const el = document.querySelector('.fk-slide');
      if (!el) return;
      el.querySelectorAll('[data-reveal]').forEach(x => { x.style.opacity='1'; x.style.transform='translateY(0)'; });
    };
    window.fkHelp.removeSlide = () => {
      document.querySelectorAll('.fk-slide').forEach(el => el.remove());
      const cover = document.getElementById('fk-page-cover');
      if (cover) cover.remove();
    };
    window.fkHelp.clear = () => {
      window.fkHelp.clearSpots();
      window.fkHelp.clearCaption();
      window.fkHelp.removeSlide();
    };
  }, HIGHLIGHT_CSS);
}

// ── wrappers ──
async function wait(p, ms) { await p.waitForTimeout(ms); }
async function hint(p, sel, label='')  { await p.evaluate(({s,l}) => window.fkHelp.spot(s, l, 'hint'), {s:sel,l:label}); }
async function spot(p, sel, label='')  { await p.evaluate(({s,l}) => { window.fkHelp.clearSpots(); window.fkHelp.spot(s, l); }, {s:sel,l:label}); }
async function clearSpots(p) { await p.evaluate(() => window.fkHelp.clearSpots()); }
async function zoomIn(p, sel, label='', scale=1.6) { await p.evaluate(({s,l,sc}) => window.fkHelp.zoom(s, l, sc), {s:sel,l:label,sc:scale}); }
async function zoomOut(p) { await p.evaluate(() => window.fkHelp.zoomOut()); }
async function clickRing(p, sel, doClick=true) {
  await p.evaluate(s => window.fkHelp.clickRing(s), sel);
  if (doClick) await p.evaluate(s => { const t = typeof s==='string' ? document.querySelector(s) : s; if (t) t.click(); }, sel);
}
async function caption(p, text) { await p.evaluate(t => window.fkHelp.caption(t), text); }
async function clearCaption(p) { await p.evaluate(() => window.fkHelp.clearCaption()); }
async function slide(p, html) { await p.evaluate(h => window.fkHelp.slide(h), html); }
async function reveal(p, n) { await p.evaluate(k => window.fkHelp.reveal(k), n); }
async function revealAll(p) { await p.evaluate(() => window.fkHelp.revealAll()); }
async function rmSlide(p) { await p.evaluate(() => window.fkHelp.removeSlide()); }
async function clearAll(p) { await p.evaluate(() => window.fkHelp.clear()); }

// ============================================================
// Sync helper — SSML mark timepoints 基準で待機
// ============================================================
class Sync {
  constructor(marks, duration) {
    this.marks = marks || {};
    this.duration = duration || 30;
    this.t0 = Date.now();
  }
  async waitFor(p, name, offsetMs = 0) {
    const t = this.marks[name];
    if (t == null) { console.log(`  warn: mark not found: ${name}`); return; }
    const target = t - offsetMs / 1000;
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = target - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
    else if (remain < -0.5) console.log(`  warn: late for ${name} by ${(-remain).toFixed(2)}s`);
  }
  async waitEnd(p) {
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = this.duration - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
  }
}

// ============================================================
// Editorial slide color palette (福鉄 = 沿線のみどり + 電車オレンジ)
// ============================================================
const C = {
  bg:       'oklch(0.985 0.005 145)',
  bg2:      'oklch(0.965 0.012 145)',
  ink:      'oklch(0.18 0.010 145)',
  ink2:     'oklch(0.35 0.016 145)',
  ink3:     'oklch(0.55 0.018 145)',
  line:     'oklch(0.86 0.012 145)',
  leaf:     'oklch(0.34 0.090 145)',      // 深い緑 (brand accent)
  leafTint: 'oklch(0.96 0.022 145)',
  leafInk:  'oklch(0.20 0.080 145)',
  rail:     'oklch(0.52 0.140 55)',       // 電車オレンジ (UI highlight, sparingly)
  railTint: 'oklch(0.97 0.025 55)',
  fBody:    "'Noto Sans JP','Hiragino Sans','Yu Gothic',system-ui,sans-serif",
  fNum:     "'Inter Tight','Inter',system-ui,sans-serif",
};

// Slide chrome header
const chrome = (section) => `
  <div style="display:flex;align-items:baseline;gap:20px;padding-bottom:18px;border-bottom:1px solid ${C.line};">
    <div style="font-family:${C.fNum};font-size:11px;font-weight:500;color:${C.ink2};letter-spacing:0.10em;text-transform:uppercase;">
      Fukutetsu · さんぽ帳 admin
    </div>
    <div style="flex:1;"></div>
    ${section ? `<div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.02em;">${section}</div>` : ''}
  </div>`;

// ============================================================
// MAIN
// ============================================================
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// ── preload: goto admin (font warm-up / cache prime) ──
const recordStart = Date.now();
await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await injectHelper(page);

// 最初のスライドで fonts を事前ロード
await slide(page, `<div style="opacity:0">preload</div>`);
await page.waitForTimeout(1500);
await rmSlide(page);

const t0 = Date.now();
const preloadSec = (t0 - recordStart) / 1000;
console.log(`preload: ${preloadSec.toFixed(2)}s`);

// ============================================================
// Ch01: オープニング
// ============================================================
{
  const ch = '01-opening';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  await slide(page, `
    ${chrome('')}
    <div style="margin-top:60px;font-family:${C.fBody};font-weight:900;font-size:72px;line-height:1.12;letter-spacing:-0.04em;color:${C.ink};text-wrap:balance;">
      リッチメニュー<br>admin パネル
    </div>
    <div style="margin-top:24px;font-family:${C.fNum};font-weight:400;font-size:18px;color:${C.leaf};letter-spacing:0.02em;">
      Fukutetsu Sanpocho · 使い方ガイド
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;align-items:baseline;gap:16px;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
      <div style="flex:1;"></div>
      <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};">2026 · 07</div>
    </div>
  `);

  // 3つのアジェンダ reveal
  await sync.waitFor(page, 'agenda_intro', 150);
  await slide(page, `
    ${chrome('概要')}
    <div style="margin-top:40px;font-family:${C.fBody};font-weight:900;font-size:52px;line-height:1.2;letter-spacing:-0.035em;color:${C.ink};">
      説明する機能は<br>3つあります
    </div>
    <div style="margin-top:36px;display:flex;flex-direction:column;gap:16px;">
      <div data-reveal="1" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;background:${C.bg2};border-radius:6px;">
        <div style="font-family:${C.fNum};font-weight:500;font-size:13px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:3px;">01</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:17px;color:${C.ink};line-height:1.6;">画面の 全体構成</div>
      </div>
      <div data-reveal="2" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;background:${C.bg2};border-radius:6px;">
        <div style="font-family:${C.fNum};font-weight:500;font-size:13px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:3px;">02</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:17px;color:${C.ink};line-height:1.6;">タブ切替式リッチメニューの 設定方法</div>
      </div>
      <div data-reveal="3" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;background:${C.bg2};border-radius:6px;">
        <div style="font-family:${C.fNum};font-weight:500;font-size:13px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:3px;">03</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:17px;color:${C.ink};line-height:1.6;">LINE への反映手順と その他セクション</div>
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
      <div style="flex:1;"></div>
      <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};">2026 · 07</div>
    </div>
  `);
  await sync.waitFor(page, 'agenda_1', 150);
  await reveal(page, 1);
  await sync.waitFor(page, 'agenda_2', 150);
  await reveal(page, 2);
  await sync.waitFor(page, 'agenda_3', 150);
  await reveal(page, 3);
  await sync.waitEnd(page);
}

// ============================================================
// Ch02: 画面全体構成 — 実admin 画面を見せる
// ============================================================
{
  const ch = '02-layout';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  // 転入スライド
  await slide(page, `
    ${chrome('01 · 画面構成')}
    <div style="margin-top:60px;font-family:${C.fBody};font-weight:900;font-size:64px;line-height:1.15;letter-spacing:-0.038em;color:${C.ink};text-wrap:balance;">
      画面は<br>3分割に なっています
    </div>
    <div style="margin-top:24px;font-family:${C.fBody};font-weight:500;font-size:16px;line-height:1.75;color:${C.ink2};max-width:52ch;">
      左サイドバー / 中央フォーム / 右プレビュー の構成。<br>
      上部には「LINE に反映」ボタンが常駐します。
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  await sync.waitFor(page, 'title_end', 200);
  // 実画面に切替え
  await rmSlide(page);
  await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await injectHelper(page);
  await caption(page, '管理画面の全体構成');

  await sync.waitFor(page, 'layout_intro', 150);
  // サイドバーにスポット
  await sync.waitFor(page, 'sidebar_end', 1800);
  await spot(page, '.sidebar', '左サイドバー: セクション切替ナビ');

  await sync.waitFor(page, 'center_end', 1800);
  await clearSpots(page);
  // 中央フォームエリアにスポット
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    // 中央カラムを探す (main-content or similar)
    const main = document.querySelector('.main-content') || document.querySelector('main') || document.querySelector('.content-area');
    if (main) window.fkHelp.spot(main, '中央: 設定フォーム');
  });

  await sync.waitFor(page, 'preview_end', 1800);
  await clearSpots(page);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const preview = document.querySelector('.preview-panel') || document.querySelector('.right-panel') || document.querySelector('[class*="preview"]');
    if (preview) window.fkHelp.spot(preview, '右: LINEプレビュー');
  });

  await sync.waitFor(page, 'topbar_end', 1800);
  await clearSpots(page);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    // 「LINE に反映」ボタンを探す
    const btns = Array.from(document.querySelectorAll('button'));
    const applyBtn = btns.find(b => b.textContent.includes('反映') || b.textContent.includes('LINE'));
    if (applyBtn) window.fkHelp.spot(applyBtn, '「LINE に反映」ボタン');
  });

  await sync.waitEnd(page);
  await clearSpots(page);
  await clearCaption(page);
}

// ============================================================
// Ch03: タブ切替機能の説明
// ============================================================
{
  const ch = '03-tabs';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  // 転入スライド
  await slide(page, `
    ${chrome('02 · タブ切替機能')}
    <div style="margin-top:52px;font-family:${C.fBody};font-weight:900;font-size:62px;line-height:1.16;letter-spacing:-0.038em;color:${C.ink};text-wrap:balance;">
      タブ切替式で<br>最大 4種類の<br>メニューを切替
    </div>
    <div style="margin-top:28px;padding:20px 24px;background:${C.leafTint};border-radius:6px;max-width:54ch;">
      <div style="font-family:${C.fBody};font-weight:700;font-size:14px;color:${C.leafInk};letter-spacing:0.02em;margin-bottom:8px;">タブ切替とは</div>
      <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.75;">
        LINE アプリ底面のタブバーをタップするだけで、<br>
        複数のリッチメニューを即座に切り替えられます。
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  await sync.waitFor(page, 'title_end', 200);

  // 実画面でタブ機能カードを示す
  await rmSlide(page);
  await injectHelper(page);
  await caption(page, 'タブ機能の概念説明');

  await sync.waitFor(page, 'concept_intro', 150);
  // スクロールしてタブ機能カードを探す
  await page.evaluate(() => {
    const tabCard = Array.from(document.querySelectorAll('div, section, .card'))
      .find(el => el.textContent.includes('タブ機能') || el.textContent.includes('複数メニュー切替'));
    if (tabCard) {
      tabCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => window.fkHelp.spot(tabCard, 'タブ機能カード'), 600);
    }
  });

  await sync.waitFor(page, 'single_end', 200);
  await clearSpots(page);

  await sync.waitFor(page, 'howto_intro', 150);
  await clearCaption(page);
  await caption(page, 'タブ数を選択 → 各タブが独立設定できるようになります');

  // セグメントコントロールにスポット
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    // タブ数の選択UI (1個/2個/3個/4個 のボタン群) を探す
    const segBtns = Array.from(document.querySelectorAll('button, .seg-btn, [class*="seg"]'))
      .filter(el => ['1個','2個','3個','4個'].some(t => el.textContent.trim().includes(t)));
    if (segBtns.length > 0) {
      const parent = segBtns[0].closest('.card') || segBtns[0].parentElement;
      window.fkHelp.spot(parent || segBtns[0], 'タブ数を選択 (1〜4)');
    }
  });

  await sync.waitFor(page, 'seg_end', 200);
  // 3個を選択してみる
  await clearSpots(page);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn3 = btns.find(b => b.textContent.trim() === '3個' || b.textContent.trim() === '3');
    if (btn3) {
      window.fkHelp.clickRing(btn3);
      setTimeout(() => btn3.click(), 200);
    }
  });
  await page.waitForTimeout(600);

  await sync.waitFor(page, 'tabs_appear', 200);
  // タブセレクタにスポット
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const tabStrip = document.querySelector('.tab-selector, .tab-strip, [class*="tab-nav"]') ||
      Array.from(document.querySelectorAll('div')).find(el =>
        el.textContent.includes('タブ 1') && el.textContent.includes('タブ 2')
      );
    if (tabStrip) window.fkHelp.spot(tabStrip, 'タブ 1/2/3 — クリックで切替');
  });

  await sync.waitFor(page, 'tabs_end', 200);
  await clearSpots(page);
  await clearCaption(page);
}

// ============================================================
// Ch04: タブごとの設定詳細
// ============================================================
{
  const ch = '04-tab-settings';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  // 転入スライド (title_end まで表示 → 3.5秒)
  await slide(page, `
    ${chrome('02 · タブ設定')}
    <div style="margin-top:48px;font-family:${C.fBody};font-weight:900;font-size:56px;line-height:1.18;letter-spacing:-0.036em;color:${C.ink};text-wrap:balance;">
      各タブに<br>4つの 基本情報<br>+ 画像 + アクション
    </div>
    <div style="margin-top:28px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${C.leaf};flex-shrink:0;"></div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink2};">タイトル / メニューバーテキスト / 表示期間 / デフォルト表示</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${C.leaf};flex-shrink:0;"></div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink2};">テンプレート 15種 (大12 + 小3)</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${C.leaf};flex-shrink:0;"></div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink2};">背景画像 (エリアごと個別 / 全体1枚)</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:6px;height:6px;border-radius:50%;background:${C.leaf};flex-shrink:0;"></div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink2};">アクション — エリア別にURLまたはテキスト送信</div>
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  // title_end (3.5s) まで転入スライド表示
  await sync.waitFor(page, 'title_end', 200);

  // 実画面に切替えてフォームを見せる
  await rmSlide(page);
  await injectHelper(page);
  await caption(page, '基本情報の設定');

  // タイトル入力フィールドにスポット (fields_intro 〜 title_field_end の 10秒間)
  await sync.waitFor(page, 'fields_intro', 150);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    const titleInput = inputs.find(el => {
      const parent = el.closest('.form-group, .field, .input-group');
      return parent && parent.textContent.includes('タイトル');
    });
    if (titleInput) {
      titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => window.fkHelp.spot(titleInput, 'タイトル (管理用ラベル)'), 500);
    }
  });

  await sync.waitFor(page, 'title_field_end', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    const menubarInput = inputs.find(el => {
      const parent = el.closest('.form-group, .field, .input-group');
      return parent && (parent.textContent.includes('メニューバー') || parent.textContent.includes('テキスト'));
    });
    if (menubarInput) window.fkHelp.spot(menubarInput, 'LINE底面タブの文字 (最大14文字)');
  });

  await sync.waitFor(page, 'menubar_end', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    // 表示期間 / 無期限チェックボックスを探す
    const periodEl = Array.from(document.querySelectorAll('.form-group, .field, .period-section'))
      .find(el => el.textContent.includes('表示期間') || el.textContent.includes('無期限'));
    if (periodEl) window.fkHelp.spot(periodEl, '表示期間 (通常は無期限)');
  });

  await sync.waitFor(page, 'period_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, 'テンプレート選択 — 15種類から選ぶ');

  // テンプレートグリッドにスポット
  await sync.waitFor(page, 'template_intro', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const tmplGrid = document.querySelector('.template-grid, .template-list, [class*="template-grid"], [class*="template-list"]')
      || Array.from(document.querySelectorAll('div')).find(el =>
          el.children.length >= 6 && Array.from(el.children).some(c => c.className.includes('template'))
        );
    if (tmplGrid) {
      tmplGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => window.fkHelp.spot(tmplGrid, 'テンプレート 15種'), 600);
    }
  });

  await sync.waitFor(page, 'template_count', 200);
  // テンプレートボタンをクリックしてプレビュー更新を見せる
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const tmplBtns = Array.from(document.querySelectorAll('.template-btn, .template-item, [class*="template-option"]'));
    if (tmplBtns.length >= 3) {
      const btnC = tmplBtns[2];
      window.fkHelp.spot(btnC, 'テンプレートC: hero上+下2分割');
      setTimeout(() => { window.fkHelp.clickRing(btnC); btnC.click(); }, 400);
    }
  });

  await sync.waitFor(page, 'template_asymm', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const allBtns = Array.from(document.querySelectorAll('.template-btn, .template-item, [class*="template-option"]'));
    // K テンプレ (上3+下4) を探す — data属性かテキストで判断
    const btnK = allBtns.find(b => {
      return b.dataset.template === 'K' || b.getAttribute('data-id') === 'K'
        || b.title === 'K' || b.textContent.trim() === 'K';
    });
    if (btnK) {
      window.fkHelp.spot(btnK, '非対称テンプレ: 上3+下4');
    } else if (allBtns.length >= 9) {
      window.fkHelp.spot(allBtns[8], '非対称テンプレ (上3+下4 等)');
    }
  });

  await sync.waitFor(page, 'template_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, '背景画像 — エリアごと個別 / 全体1枚の2モード');

  await sync.waitFor(page, 'bg_intro', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    // 背景セクションを探してスクロール
    const bgSection = document.querySelector('.bg-section, .background-section, [class*="background-"]')
      || Array.from(document.querySelectorAll('h2,h3,h4,.section-header'))
          .find(h => h.textContent.includes('背景'))?.closest('.section, .card, .form-group');
    if (bgSection) {
      bgSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => window.fkHelp.spot(bgSection, '背景画像設定'), 700);
    }
  });

  await sync.waitFor(page, 'bg_area_end', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const areaMode = Array.from(document.querySelectorAll('button, input[type="radio"], label'))
      .find(el => el.textContent.includes('エリアごと') || el.value === 'per-area' || el.htmlFor?.includes('per-area'));
    if (areaMode) window.fkHelp.spot(areaMode, 'エリアごとに個別画像');
  });

  await sync.waitFor(page, 'bg_full_end', 200);
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const fullMode = Array.from(document.querySelectorAll('button, input[type="radio"], label'))
      .find(el => el.textContent.includes('全体') && (el.textContent.includes('枚') || el.textContent.includes('1枚')));
    if (fullMode) window.fkHelp.spot(fullMode, '全体1枚 → ドラッグ&ズームで調整');
  });

  await sync.waitFor(page, 'action_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, 'アクション設定 — エリア別にURL / テキスト送信');
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const actionSection = document.querySelector('.action-section, [class*="action-"]')
      || Array.from(document.querySelectorAll('h2,h3,h4,.section-header'))
          .find(h => h.textContent.includes('アクション'))?.closest('.section, .card');
    if (actionSection) {
      actionSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => window.fkHelp.spot(actionSection, 'タップ時の動作 (URL/テキスト)'), 600);
    }
  });

  await sync.waitEnd(page);
  await clearSpots(page);
  await clearCaption(page);
}

// ============================================================
// Ch05: LINE への反映
// ============================================================
{
  const ch = '05-apply';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  // 転入スライド
  await slide(page, `
    ${chrome('03 · LINE への反映')}
    <div style="margin-top:52px;font-family:${C.fBody};font-weight:900;font-size:60px;line-height:1.16;letter-spacing:-0.038em;color:${C.ink};">
      「LINE に反映」<br>ボタン 1クリック
    </div>
    <div style="margin-top:28px;font-family:${C.fBody};font-weight:500;font-size:16px;line-height:1.85;color:${C.ink2};max-width:54ch;">
      クリックするとJSONファイルがダウンロードされ、<br>
      30秒以内に監視プログラムが自動で LINE API へ送信します。
    </div>
    <div style="margin-top:28px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-family:${C.fNum};font-weight:500;font-size:13px;color:${C.leaf};letter-spacing:0.04em;">反映後の確認手順</div>
      <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.7;">
        LINEアプリを完全終了 → 再起動 → 福鉄さんぽ帳トーク → 「メニュー」タップ
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  await sync.waitFor(page, 'title_end', 200);

  // 実画面で反映ボタンを示す
  await rmSlide(page);
  await injectHelper(page);
  // 画面上部にスクロール
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);
  await caption(page, '「LINE に反映」ボタンをクリックします');

  await sync.waitFor(page, 'click_end', 1500);
  // 「LINE に反映」ボタンにスポット
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const btns = Array.from(document.querySelectorAll('button'));
    const applyBtn = btns.find(b => b.textContent.includes('反映') && b.textContent.includes('LINE'));
    if (applyBtn) {
      window.fkHelp.spot(applyBtn, 'ここをクリック');
      window.fkHelp.clickRing(applyBtn);
    }
  });

  // 反映フローをスライドで説明
  await sync.waitFor(page, 'download_end', 200);
  await clearSpots(page);
  await clearCaption(page);

  await slide(page, `
    ${chrome('03 · 反映フロー')}
    <div style="margin-top:36px;font-family:${C.fBody};font-weight:700;font-size:18px;color:${C.ink};letter-spacing:0.01em;">
      自動反映の流れ
    </div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:0;">
      <div data-reveal="1" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid ${C.line};">
        <div style="font-family:${C.fNum};font-weight:500;font-size:11px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:4px;width:24px;">1</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.65;">「LINE に反映」クリック → JSONファイルが Downloads に保存される</div>
      </div>
      <div data-reveal="2" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid ${C.line};">
        <div style="font-family:${C.fNum};font-weight:500;font-size:11px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:4px;width:24px;">2</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.65;">30秒以内に監視プログラムが検知 → LINE API に自動アップロード</div>
      </div>
      <div data-reveal="3" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid ${C.line};">
        <div style="font-family:${C.fNum};font-weight:500;font-size:11px;color:${C.leaf};letter-spacing:0.08em;flex-shrink:0;margin-top:4px;width:24px;">3</div>
        <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.65;">完了通知が LINE から届く</div>
      </div>
      <div data-reveal="4" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;">
        <div style="font-family:${C.fNum};font-weight:500;font-size:11px;color:${C.rail};letter-spacing:0.08em;flex-shrink:0;margin-top:4px;width:24px;">4</div>
        <div style="font-family:${C.fBody};font-weight:700;font-size:15px;color:${C.ink};line-height:1.65;">LINE アプリを完全終了 → 再起動 → タブバーを確認</div>
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  await sync.waitFor(page, 'auto_end', 200);
  await reveal(page, 1);
  await reveal(page, 2);
  await reveal(page, 3);
  await sync.waitFor(page, 'restart_end', 200);
  await reveal(page, 4);

  await sync.waitEnd(page);
}

// ============================================================
// Ch06: 他のセクション
// ============================================================
{
  const ch = '06-other-sections';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  // 転入スライド
  await slide(page, `
    ${chrome('その他のセクション')}
    <div style="margin-top:48px;font-family:${C.fBody};font-weight:900;font-size:60px;line-height:1.16;letter-spacing:-0.038em;color:${C.ink};text-wrap:balance;">
      景品 / ルーレット<br>スポット / 一般設定
    </div>
    <div style="margin-top:24px;font-family:${C.fBody};font-weight:500;font-size:15px;line-height:1.8;color:${C.ink2};max-width:52ch;">
      左サイドバーから各セクションに切り替えて設定します。
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
    </div>
  `);

  await sync.waitFor(page, 'title_end', 200);

  // 実画面で景品セクションへ
  await rmSlide(page);
  await injectHelper(page);
  await caption(page, '景品セクション — スタンプ達成時の景品を設定');

  // 景品セクションに遷移
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const sideItems = Array.from(document.querySelectorAll('.sidebar-item, nav a, [class*="nav-item"], .menu-item'));
    const prizeItem = sideItems.find(el => el.textContent.includes('景品'));
    if (prizeItem) {
      window.fkHelp.spot(prizeItem, '景品セクション');
      setTimeout(() => prizeItem.click(), 400);
    }
  });
  await page.waitForTimeout(700);

  await sync.waitFor(page, 'prize_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, 'ルーレットセクション — 6枠の内容・確率を設定');

  // ルーレットセクションへ
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const sideItems = Array.from(document.querySelectorAll('.sidebar-item, nav a, [class*="nav-item"], .menu-item'));
    const rouletteItem = sideItems.find(el => el.textContent.includes('ルーレット'));
    if (rouletteItem) {
      window.fkHelp.spot(rouletteItem, 'ルーレットセクション');
      setTimeout(() => rouletteItem.click(), 400);
    }
  });
  await page.waitForTimeout(700);

  await sync.waitFor(page, 'roulette_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, 'スポットセクション — 10か所の写真・説明を管理');

  // スポットセクションへ
  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const sideItems = Array.from(document.querySelectorAll('.sidebar-item, nav a, [class*="nav-item"], .menu-item'));
    const spotItem = sideItems.find(el => el.textContent.includes('スポット'));
    if (spotItem) {
      window.fkHelp.spot(spotItem, 'スポットセクション');
      setTimeout(() => spotItem.click(), 400);
    }
  });
  await page.waitForTimeout(700);

  await sync.waitFor(page, 'spot_end', 200);
  await clearSpots(page);
  await clearCaption(page);
  await caption(page, '一般設定 — チャンネルアクセストークンなど基本情報');

  await page.evaluate(() => {
    window.fkHelp.clearSpots();
    const sideItems = Array.from(document.querySelectorAll('.sidebar-item, nav a, [class*="nav-item"], .menu-item'));
    const genItem = sideItems.find(el => el.textContent.includes('一般設定') || el.textContent.includes('設定'));
    if (genItem) {
      window.fkHelp.spot(genItem, '一般設定');
      setTimeout(() => genItem.click(), 400);
    }
  });
  await page.waitForTimeout(700);

  await sync.waitEnd(page);
  await clearSpots(page);
  await clearCaption(page);
}

// ============================================================
// Ch07: エンディング
// ============================================================
{
  const ch = '07-ending';
  console.log(`\n[${ch}]`);
  const sync = new Sync(TP[ch].marks, TP[ch].duration);

  await slide(page, `
    ${chrome('まとめ')}
    <div style="margin-top:52px;font-family:${C.fBody};font-weight:900;font-size:62px;line-height:1.15;letter-spacing:-0.038em;color:${C.ink};">
      ご確認<br>ありがとう<br>ございました
    </div>
    <div style="margin-top:32px;padding:22px 24px;background:${C.bg2};border-radius:6px;max-width:56ch;">
      <div style="font-family:${C.fBody};font-weight:700;font-size:13px;color:${C.leaf};letter-spacing:0.04em;margin-bottom:10px;">
        反映されない時は
      </div>
      <div style="font-family:${C.fBody};font-weight:500;font-size:15px;color:${C.ink};line-height:1.75;">
        LINE アプリを完全終了 (スイッチャーで上スワイプ) してから再起動してください。
      </div>
    </div>
    <div style="margin-top:24px;padding:16px 24px;background:${C.leafTint};border-radius:6px;max-width:56ch;">
      <div style="font-family:${C.fNum};font-weight:400;font-size:12px;color:${C.leafInk};letter-spacing:0.06em;word-break:break-all;">
        https://t35ty6-rgb.github.io/skeleton-demos/fukutetsu-stamp-rally/richmenu-admin.html?v=19
      </div>
    </div>
    <div style="margin-top:auto;padding-top:20px;border-top:1px solid ${C.line};display:flex;">
      <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink2};">Skeleton Inc.</div>
      <div style="flex:1;"></div>
      <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};">2026 · 07</div>
    </div>
  `);

  await sync.waitEnd(page);
}

// ── 録画終了 ──
await page.waitForTimeout(1500);
console.log('\nclosing...');
await context.close();
await browser.close();

// rename webm
const { readdirSync, renameSync } = await import('node:fs');
const webms = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
if (webms.length > 0) {
  const src = `${OUT_DIR}/${webms[0]}`;
  const dst = `${OUT_DIR}/_all.webm`;
  renameSync(src, dst);
  console.log(`webm saved: ${dst}`);
}

// _timeline.json にpreloadSec を書く
writeFileSync(`${OUT_DIR}/_timeline.json`, JSON.stringify({ preloadSec }, null, 2));
console.log(`preloadSec: ${preloadSec.toFixed(2)}s`);
console.log('\nDone. Next: ffmpeg mux');
