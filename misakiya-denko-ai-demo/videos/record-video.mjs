// 三崎屋電工AI デモ動画 録画スクリプト
// Playwright headed 1280x720 + editorial スライド + 発話完全同期
// ベース: sunchlorella-line-demo/videos/record-video.mjs パターン
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/misakiya-denko-ai-demo/videos';
mkdirSync(OUT_DIR, { recursive: true });

// ツール本番URL (GitHub Pages)
const BASE = 'https://t35ty6-rgb.github.io/skeleton-demos/misakiya-denko-ai';

// TTS timepoints
const TP = JSON.parse(readFileSync('/Users/tsukasayoshida/Desktop/skeleton-demos/misakiya-denko-ai-demo/audio/timepoints.json', 'utf8'));

// ────────────────────────────────────────────────────────────────────────────
//  Palette — ツールの navy blue tone に寄せた editorial スライドカラー
// ────────────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#f5f7fb',              // ツール --bg と統一
  bg2:      '#eef1f7',              // ツール --surface-2
  navy:     '#1a2547',              // ツール --nav-bg
  navyDk:   '#141c39',              // ツール --nav-bg-2
  ink:      '#1a2033',              // ツール --ink
  ink2:     '#3d4459',              // ツール --ink-2
  ink3:     '#6e7590',              // ツール --dim
  line:     '#e5e8f0',              // ツール --rule
  elec:     '#2563eb',              // electric blue primary
  elecHi:   '#1d4ed8',
  elecSoft: '#e0eaff',
  elecText: '#1e40af',
  warn:     '#f59e0b',              // amber (注意点)
  success:  '#10b981',              // green (完了)
  fBody:    "'Noto Sans JP','Hiragino Sans',system-ui,sans-serif",
  fNum:     "'Inter','Inter Tight',system-ui,sans-serif",
};

// ────────────────────────────────────────────────────────────────────────────
//  CSS overlay injection
// ────────────────────────────────────────────────────────────────────────────
const HIGHLIGHT_CSS = `
.mk-spot {
  position: absolute !important; border: 2px solid ${C.elec} !important; border-radius: 8px !important;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.18), 0 0 20px rgba(37,99,235,0.5) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: mk-pulse 1.2s ease-in-out infinite;
  transition: left .3s, top .3s, width .3s, height .3s;
}
.mk-hint {
  position: absolute !important; border: 1.5px solid rgba(37,99,235,0.45) !important; border-radius: 7px !important;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.10) !important;
  pointer-events: none !important; z-index: 99997 !important;
  animation: mk-hintin .3s ease;
  transition: left .3s, top .3s, width .3s, height .3s;
}
.mk-label {
  position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: ${C.navy}; color: #fff; font-family: 'Noto Sans JP', system-ui; font-weight: 700;
  font-size: 13px; padding: 7px 14px; border-radius: 5px;
  box-shadow: 0 4px 16px rgba(0,0,0,.3); white-space: nowrap;
  border-left: 3px solid ${C.elec};
  animation: mk-fadein .25s ease;
}
.mk-ring {
  position: absolute; pointer-events: none; z-index: 100000;
  border: 3px solid ${C.elec}; border-radius: 50%;
  animation: mk-ring 0.55s cubic-bezier(.2,.8,.4,1) forwards;
}
@keyframes mk-pulse {
  0%,100% { box-shadow: 0 0 0 4px rgba(37,99,235,0.18), 0 0 20px rgba(37,99,235,0.5); }
  50%     { box-shadow: 0 0 0 8px rgba(37,99,235,0.10), 0 0 32px rgba(37,99,235,0.65); }
}
@keyframes mk-hintin { from { opacity: 0; } to { opacity: 1; } }
@keyframes mk-fadein { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
@keyframes mk-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.4);  opacity: 0; }
}
.mk-caption {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
  z-index: 99993; padding: 12px 22px;
  background: rgba(26,37,71,0.95); color: #fff;
  border-left: 3px solid ${C.elec}; border-radius: 4px;
  font-family: 'Noto Sans JP', system-ui; font-weight: 600; font-size: 15px; letter-spacing: 0.02em;
  box-shadow: 0 10px 28px rgba(0,0,0,.4);
  animation: mk-fadeup .3s ease; max-width: 960px; line-height: 1.6;
}
@keyframes mk-fadeup { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

// ────────────────────────────────────────────────────────────────────────────
//  Helper injection
// ────────────────────────────────────────────────────────────────────────────
async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.mkHelp && document.getElementById('mk-style')) return;
    window.mkHelp = {};
    let st = document.getElementById('mk-style');
    if (!st) { st = document.createElement('style'); st.id = 'mk-style'; st.textContent = css; document.documentElement.appendChild(st); }

    window.mkHelp.getTarget = (sel) => typeof sel === 'string' ? document.querySelector(sel) : sel;

    window.mkHelp.spot = (sel, label, kind) => {
      const t = window.mkHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect(); const pad = 5;
      const sp = document.createElement('div');
      sp.className = kind === 'hint' ? 'mk-hint' : 'mk-spot';
      sp.style.left = (r.left - pad + window.scrollX) + 'px';
      sp.style.top  = (r.top  - pad + window.scrollY) + 'px';
      sp.style.width  = (r.width  + pad * 2) + 'px';
      sp.style.height = (r.height + pad * 2) + 'px';
      document.body.appendChild(sp);
      if (label) {
        const lb = document.createElement('div'); lb.className = 'mk-label'; lb.textContent = label;
        if (r.right + 220 > window.innerWidth) lb.style.left = Math.max(10, r.left - 210 + window.scrollX) + 'px';
        else lb.style.left = (r.right + 16 + window.scrollX) + 'px';
        lb.style.top = (r.top + r.height / 2 - 16 + window.scrollY) + 'px';
        document.body.appendChild(lb);
      }
    };
    window.mkHelp.clearSpots = () => document.querySelectorAll('.mk-spot,.mk-hint,.mk-label,.mk-ring').forEach(e => e.remove());

    window.mkHelp.zoom = (sel, label, scale) => {
      scale = scale || 1.5; const t = window.mkHelp.getTarget(sel); if (!t) return;
      document.documentElement.classList.add('mk-zooming');
      const r = t.getBoundingClientRect();
      const tx = window.innerWidth / 2 - (r.left + r.width / 2);
      const ty = window.innerHeight / 2 - (r.top + r.height / 2);
      document.body.style.transformOrigin = 'top left';
      document.body.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
      setTimeout(() => window.mkHelp.spot(t, label || ''), 700);
    };
    window.mkHelp.zoomOut = () => {
      window.mkHelp.clearSpots();
      document.body.style.transform = '';
      document.documentElement.classList.remove('mk-zooming');
    };

    window.mkHelp.clickRing = (sel) => {
      const t = window.mkHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const ring = document.createElement('div'); ring.className = 'mk-ring';
      ring.style.left = (r.left + r.width / 2 - 28 + window.scrollX) + 'px';
      ring.style.top  = (r.top + r.height / 2 - 28 + window.scrollY) + 'px';
      ring.style.width = '56px'; ring.style.height = '56px';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 650);
    };

    window.mkHelp.caption = (text) => {
      document.querySelectorAll('.mk-caption').forEach(e => e.remove());
      const el = document.createElement('div'); el.className = 'mk-caption'; el.innerHTML = text;
      document.body.appendChild(el);
    };
    window.mkHelp.clearCaption = () => document.querySelectorAll('.mk-caption').forEach(e => e.remove());

    // editorial slide system (ported from sunchlorella pattern)
    window.mkHelp.slide = async (html) => {
      if (!document.getElementById('mk-fonts')) {
        const l = document.createElement('link'); l.id = 'mk-fonts'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter:wght@300;400;500;700;900&display=swap';
        document.head.appendChild(l);
      }
      if (document.fonts?.ready) {
        try {
          await document.fonts.load('900 88px "Noto Sans JP"');
          await document.fonts.load('700 88px "Inter"');
          await document.fonts.ready;
        } catch(_) {}
      }
      if (!document.getElementById('mk-page-cover')) {
        const c = document.createElement('div'); c.id = 'mk-page-cover';
        c.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483646 !important;background:#f5f7fb !important;pointer-events:none !important;';
        document.body.appendChild(c);
      }
      const existing = Array.from(document.querySelectorAll('.mk-slide'));
      const el = document.createElement('div'); el.className = 'mk-slide';
      el.style.cssText = [
        'position:fixed','inset:0','z-index:2147483647',
        'background:#f5f7fb',
        "font-family:'Noto Sans JP',system-ui,sans-serif",
        'color:#1a2033','display:flex','flex-direction:column',
        'padding:60px 80px 52px',
        'overflow:hidden','opacity:0',
        'transition:opacity .35s ease-out',
        'font-feature-settings:"palt" 1',
      ].join(';');
      el.innerHTML = html;
      el.querySelectorAll('[data-reveal]').forEach(x => {
        x.style.opacity = '0'; x.style.transform = 'translateY(5px)';
        x.style.transition = 'opacity .15s ease-out, transform .18s cubic-bezier(.2,.8,.4,1)';
      });
      document.body.appendChild(el);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.style.opacity = '1';
      existing.forEach(old => {
        old.style.transition = 'opacity .28s ease-out'; old.style.opacity = '0';
        setTimeout(() => { try { old.remove(); } catch(_) {} }, 300);
      });
      await new Promise(r => setTimeout(r, 360));
      return el;
    };
    window.mkHelp.reveal = (n) => {
      const el = document.querySelector('.mk-slide'); if (!el) return;
      el.querySelectorAll(`[data-reveal="${n}"]`).forEach(x => { x.style.opacity='1'; x.style.transform='translateY(0)'; });
    };
    window.mkHelp.revealAll = () => {
      const el = document.querySelector('.mk-slide'); if (!el) return;
      el.querySelectorAll('[data-reveal]').forEach(x => { x.style.opacity='1'; x.style.transform='translateY(0)'; });
    };
    window.mkHelp.removeSlide = () => {
      document.querySelectorAll('.mk-slide').forEach(e => e.remove());
      const c = document.getElementById('mk-page-cover'); if (c) c.remove();
    };
    window.mkHelp.clear = () => {
      window.mkHelp.clearSpots(); window.mkHelp.clearCaption(); window.mkHelp.removeSlide();
    };
  }, HIGHLIGHT_CSS);
}

async function wait(p, ms) { await p.waitForTimeout(ms); }

// Sync クラス (音声 timepoints 基準で待機)
class Sync {
  constructor(marks, duration) {
    this.marks = marks || {}; this.duration = duration || 30; this.t0 = Date.now();
  }
  async waitFor(p, name, offsetMs = 0) {
    const t = this.marks[name];
    if (t == null) { console.log(`    warn: mark not found: ${name}`); return; }
    const target = t - offsetMs / 1000;
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = target - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
    else if (remain < -0.5) console.log(`    late for ${name} by ${(-remain).toFixed(2)}s`);
  }
  async waitEnd(p) {
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = this.duration - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
  }
}

// Primitives
async function hint(p, sel, label='') { await p.evaluate(({s,l}) => window.mkHelp.spot(s,l,'hint'), {s:sel,l:label}); }
async function spot(p, sel, label='') { await p.evaluate(({s,l}) => { window.mkHelp.clearSpots(); window.mkHelp.spot(s,l); }, {s:sel,l:label}); }
async function clearSpots(p) { await p.evaluate(() => window.mkHelp.clearSpots()); }
async function zoomIn(p, sel, label='', scale=1.5) { await p.evaluate(({s,l,sc}) => window.mkHelp.zoom(s,l,sc), {s:sel,l:label,sc:scale}); }
async function zoomOut(p) { await p.evaluate(() => window.mkHelp.zoomOut()); }
async function clickRing(p, sel, doClick=true) {
  await p.evaluate((s) => window.mkHelp.clickRing(s), sel);
  if (doClick) await p.evaluate((s) => { const t = typeof s === 'string' ? document.querySelector(s) : null; if (t) t.click(); }, sel);
}
async function caption(p, text) { await p.evaluate((t) => window.mkHelp.caption(t), text); }
async function clearCaption(p) { await p.evaluate(() => window.mkHelp.clearCaption()); }
async function slide(p, html) { await p.evaluate((h) => window.mkHelp.slide(h), html); }
async function reveal(p, n) { await p.evaluate((k) => window.mkHelp.reveal(k), n); }
async function revealAll(p) { await p.evaluate(() => window.mkHelp.revealAll()); }
async function rmSlide(p) { await p.evaluate(() => window.mkHelp.removeSlide()); }
async function clearAll(p) { await p.evaluate(() => window.mkHelp.clear()); }

async function preloadFonts(p) {
  await p.evaluate(async () => {
    if (!document.getElementById('mk-fonts')) {
      const l = document.createElement('link'); l.id = 'mk-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(l);
      await new Promise(r => { let done=false; const fin=()=>{if(!done){done=true;r();}}; l.addEventListener('load',fin); l.addEventListener('error',fin); setTimeout(fin,5000); });
    }
    const jobs = [];
    for (const w of [400,500,700,900]) jobs.push(document.fonts.load(`${w} 16px "Noto Sans JP"`));
    for (const w of [400,500,700,900]) jobs.push(document.fonts.load(`${w} 16px "Inter"`));
    jobs.push(document.fonts.load('900 88px "Noto Sans JP"'));
    jobs.push(document.fonts.load('700 80px "Inter"'));
    await Promise.all(jobs);
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

async function gotoTool(p, hash='') {
  const url = BASE + (hash ? '/#' + hash : '/');
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    if (!document.getElementById('mk-page-cover')) {
      const c = document.createElement('div'); c.id = 'mk-page-cover';
      c.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483646 !important;background:#f5f7fb !important;pointer-events:none !important;';
      (document.body || document.documentElement).appendChild(c);
    }
  });
  await p.waitForLoadState('networkidle');
  await wait(p, 400);
  await injectHelper(p);
  await preloadFonts(p);
}

async function navTo(p, navName) {
  await p.evaluate((n) => {
    const a = document.querySelector(`[data-nav="${n}"]`);
    if (a) a.click();
  }, navName);
  await wait(p, 700);
}

// ────────────────────────────────────────────────────────────────────────────
//  Editorial slide templates  (navy + electric blue tone)
// ────────────────────────────────────────────────────────────────────────────

// Chrome bar (top identity line)
const chrome = (section='') => `
  <div style="display:flex;align-items:baseline;gap:18px;padding-bottom:20px;border-bottom:1px solid ${C.line};">
    <div style="font-family:${C.fNum};font-size:11px;font-weight:600;color:${C.ink3};letter-spacing:0.12em;text-transform:uppercase;">
      三崎屋電工AI · 技術を未来へ、人を育てる
    </div>
    <div style="flex:1;"></div>
    ${section ? `<div style="font-family:${C.fBody};font-size:12px;font-weight:600;color:${C.ink3};letter-spacing:0.02em;">${section}</div>` : ''}
  </div>`;

const foot = () => `
  <div style="margin-top:auto;padding-top:18px;border-top:1px solid ${C.line};display:flex;align-items:baseline;gap:14px;">
    <div style="font-family:${C.fNum};font-size:11px;font-weight:500;color:${C.ink3};">Skeleton Inc.</div>
    <div style="flex:1;"></div>
    <div style="font-family:${C.fNum};font-size:11px;font-weight:500;color:${C.ink3};">2026 · 07</div>
  </div>`;

// ────────────────────────────────────────────────────────────────────────────
//  Chapters
// ────────────────────────────────────────────────────────────────────────────
const chapters = [

  // ═══════════════════════════════════════════════════════════
  //  Ch01 · イントロ (29.4s)
  //  marks: greeting_end(5.7) intro_tool(13.2) intro_value(24.3) intro_end(29.3)
  // ═══════════════════════════════════════════════════════════
  { name: '01-intro', act: async (p, sync) => {
    await gotoTool(p);

    // 表紙スライド (0 → intro_tool 13.2s)
    await slide(p, `
      ${chrome()}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:860px;">
        <div data-reveal="1" style="font-family:${C.fNum};font-size:11px;color:${C.ink3};letter-spacing:0.18em;font-weight:500;">
          三崎屋電工株式会社 · 三崎 太郎 様 — 2026 / 07
        </div>
        <div data-reveal="2" style="margin-top:32px;font-family:${C.fBody};font-weight:900;font-size:76px;line-height:1.08;letter-spacing:-0.042em;color:${C.ink};">
          三崎屋電工AI
        </div>
        <div data-reveal="3" style="margin-top:10px;font-family:${C.fBody};font-weight:500;font-size:22px;color:${C.elec};letter-spacing:-0.01em;">
          技術を未来へ、人を育てる
        </div>
        <div data-reveal="4" style="margin-top:32px;font-family:${C.fBody};font-weight:500;font-size:16px;line-height:1.8;color:${C.ink2};max-width:52ch;">
          現場の作業ノウハウを動画と手順書で蓄積し、<br>
          スマホからいつでも参照できる、電気工事会社向けナレッジベース。
        </div>
        <div data-reveal="5" style="margin-top:44px;display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:2px;background:${C.elec};"></div>
          <div style="font-family:${C.fNum};font-size:12px;font-weight:600;color:${C.elec};letter-spacing:0.08em;">TOOL OVERVIEW · 6 MIN</div>
        </div>
      </div>
      ${foot()}`);

    await reveal(p, 1);
    await sync.waitFor(p, 'greeting_end', 150);
    await reveal(p, 2);
    await wait(p, 300);
    await reveal(p, 3);

    await sync.waitFor(p, 'intro_tool', 150);
    await reveal(p, 4);

    await sync.waitFor(p, 'intro_value', 150);
    await reveal(p, 5);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch02 · こんな課題ありませんか (30.2s)
  //  marks: issue_intro(7.8) issue_1(12.5) issue_2(18.7) issue_3(25.5) issue_end(30.1)
  // ═══════════════════════════════════════════════════════════
  { name: '02-issue', act: async (p, sync) => {

    // 課題 overview スライド
    await slide(p, `
      ${chrome('課題')}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:760px;gap:0;">
        <div style="font-family:${C.fBody};font-weight:900;font-size:48px;line-height:1.15;letter-spacing:-0.03em;color:${C.ink};text-wrap:balance;margin-bottom:36px;">
          こんな課題は<br>ありませんか?
        </div>

        <div data-reveal="1" style="display:flex;align-items:flex-start;gap:18px;padding:18px 22px;background:${C.bg2};border-radius:8px;margin-bottom:12px;">
          <div style="font-family:${C.fNum};font-size:18px;font-weight:700;color:${C.elec};letter-spacing:-0.02em;min-width:32px;">1</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:17px;color:${C.ink};line-height:1.4;">ベテランの技術を若手に伝えたい</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13.5px;color:${C.ink3};margin-top:4px;line-height:1.6;">口頭や紙で伝えるには限界がある</div>
          </div>
        </div>

        <div data-reveal="2" style="display:flex;align-items:flex-start;gap:18px;padding:18px 22px;background:${C.bg2};border-radius:8px;margin-bottom:12px;">
          <div style="font-family:${C.fNum};font-size:18px;font-weight:700;color:${C.elec};letter-spacing:-0.02em;min-width:32px;">2</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:17px;color:${C.ink};line-height:1.4;">作業手順書が紙・PDFで管理されていて現場で探せない</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13.5px;color:${C.ink3};margin-top:4px;line-height:1.6;">ファイルサーバーを探し回る時間が発生している</div>
          </div>
        </div>

        <div data-reveal="3" style="display:flex;align-items:flex-start;gap:18px;padding:18px 22px;background:${C.bg2};border-radius:8px;">
          <div style="font-family:${C.fNum};font-size:18px;font-weight:700;color:${C.elec};letter-spacing:-0.02em;min-width:32px;">3</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:17px;color:${C.ink};line-height:1.4;">ベテランが引退したら、誰が若手に教えるのか</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13.5px;color:${C.ink3};margin-top:4px;line-height:1.6;">属人的なノウハウが会社から消えるリスク</div>
          </div>
        </div>
      </div>
      ${foot()}`);

    await sync.waitFor(p, 'issue_intro', 150);
    await sync.waitFor(p, 'issue_1', 150);
    await reveal(p, 1);

    await sync.waitFor(p, 'issue_2', 150);
    await reveal(p, 2);

    await sync.waitFor(p, 'issue_3', 150);
    await reveal(p, 3);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch03 · ツール全体像 (52.5s)
  //  marks: overview_layout(7.3) overview_nav(10.4) overview_navlist(19.1)
  //         overview_cta(27.6) overview_home(35.8) overview_kpi(47.1) overview_end(52.5)
  // ═══════════════════════════════════════════════════════════
  { name: '03-overview', act: async (p, sync) => {
    // ツール画面に切り替え (slide 除去→ live UI)
    await rmSlide(p);
    await gotoTool(p);
    await injectHelper(p);

    // layout → サイドバー全体ハイライト
    await sync.waitFor(p, 'overview_layout', 0);
    await caption(p, '左: サイドバー (ナビ) ／ 右: コンテンツエリア');
    await hint(p, '.sidebar', '');
    await wait(p, 1800);
    await clearSpots(p);
    await clearCaption(p);

    // nav list
    await sync.waitFor(p, 'overview_nav', 0);
    await caption(p, '8つのナビゲーション');
    await spot(p, '.nav-group', '');
    await wait(p, 1500);
    await clearSpots(p);
    await clearCaption(p);

    // navlist: 各 nav-item をひとつずつ
    await sync.waitFor(p, 'overview_navlist', 0);
    const navItems = ['home','search','favorites','recent','mypage','database','courses','admin'];
    for (const nm of navItems) {
      await hint(p, `[data-nav="${nm}"]`, '');
      await wait(p, 400);
      await clearSpots(p);
    }

    // CTA ボタン
    await sync.waitFor(p, 'overview_cta', 0);
    await caption(p, '「動画から作る」 — AIで手順書を自動生成するメイン機能');
    await spot(p, '.sb-upload-btn', '');
    await zoomIn(p, '.sb-upload-btn', '', 1.6);
    await wait(p, 3000);
    await zoomOut(p);
    await clearCaption(p);

    // ホーム全体
    await sync.waitFor(p, 'overview_home', 0);
    await clearSpots(p);
    await caption(p, 'ホーム: おすすめ作業 / 最近の閲覧 / お知らせ');
    await wait(p, 2500);
    await clearCaption(p);

    // KPI
    await sync.waitFor(p, 'overview_kpi', 0);
    await caption(p, 'データ統計: 全作業件数 / カテゴリ数 / コース数 / 登録ユーザー数');
    const kpiSel = '.stat-item, .stat-card, .kpi-card, .home-stats, [class*="stat"]';
    await spot(p, '#view', '');
    await wait(p, 2800);
    await clearSpots(p);
    await clearCaption(p);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch04 · 作業手順書を見る (55.0s)
  //  marks: view_open(9.5) view_player(16.6) view_steps(21.9)
  //         view_steplist(32.0) view_step_detail(39.7) view_related(50.3) view_end(54.9)
  // ═══════════════════════════════════════════════════════════
  { name: '04-view-manual', act: async (p, sync) => {
    await injectHelper(p);
    await navTo(p, 'search');
    await injectHelper(p);

    // 「作業を探す」を開く
    await sync.waitFor(p, 'view_open', 0);
    await caption(p, '「作業を探す」から「分電盤の交換」を選択');

    // 最初の work card をクリック
    await wait(p, 800);
    const workClicked = await p.evaluate(() => {
      const card = document.querySelector('.work-card, [data-work-id], .card-title, .work-title');
      if (card) { card.click(); return true; }
      // fallback: first link in #view
      const link = document.querySelector('#view a');
      if (link) { link.click(); return true; }
      return false;
    });
    await wait(p, 900);
    await clearCaption(p);

    // 動画プレーヤー
    await sync.waitFor(p, 'view_player', 0);
    await caption(p, '作業動画: その場でストリーミング再生可能');
    const playerSel = '.video-player, .video-wrap, video, [class*="video"]';
    await spot(p, '#view', '');
    await wait(p, 2200);
    await clearSpots(p);
    await clearCaption(p);

    // 手順一覧
    await sync.waitFor(p, 'view_steps', 0);
    await caption(p, '8手順が一覧表示');
    const stepsSel = '.steps-list, .step-list, [class*="step"], .steps';
    await hint(p, '#view', '');
    await wait(p, 2000);
    await clearSpots(p);
    await clearCaption(p);

    // 手順名 列挙
    await sync.waitFor(p, 'view_steplist', 0);
    await caption(p, '停電確認 → 検電 → 養生 → 既設取外し → 新設取付 → 配線復旧 → 絶縁抵抗測定 → 通電確認');
    await wait(p, 5000);
    await clearCaption(p);

    // 手順クリック詳細
    await sync.waitFor(p, 'view_step_detail', 0);
    await caption(p, '各手順の詳細・注意点を確認');
    await p.evaluate(() => {
      const step = document.querySelector('.step-item, [class*="step-row"], [class*="step-li"]');
      if (step) step.click();
    });
    await wait(p, 2500);
    await clearCaption(p);

    // 関連データ
    await sync.waitFor(p, 'view_related', 0);
    await caption(p, '関連データ: 単線結線図PDF・施工図・現場写真が一画面に集約');
    await wait(p, 3500);
    await clearCaption(p);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch05 · 動画から手順を自動生成 (76.6s)  ← メインの売り
  //  marks: ai_intro(8.5) ai_click_btn(12.9) ai_tabs(22.0) ai_generate_btn(30.5)
  //         ai_analyzing(37.1) ai_generated(45.8) ai_save(51.5)
  //         ai_open_result(58.4) ai_seek(69.7) ai_end(76.6)
  // ═══════════════════════════════════════════════════════════
  { name: '05-ai-generate', act: async (p, sync) => {
    await injectHelper(p);
    await navTo(p, 'home');
    await injectHelper(p);

    // AI intro スライド
    await slide(p, `
      ${chrome('AI 自動生成')}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:800px;">
        <div data-reveal="1" style="font-family:${C.fBody};font-weight:900;font-size:54px;line-height:1.12;letter-spacing:-0.035em;color:${C.ink};text-wrap:balance;">
          動画から<br><span style="color:${C.elec};">30秒</span>で手順書が作れる
        </div>
        <div data-reveal="2" style="margin-top:24px;font-family:${C.fBody};font-weight:500;font-size:17px;line-height:1.8;color:${C.ink2};max-width:54ch;">
          AIが動画の映像を解析し、作業シーンを自動で区切り<br>
          各手順に動画の<strong style="color:${C.elec};">時刻タグ</strong>を付与して保存します。
        </div>
        <div data-reveal="3" style="margin-top:40px;display:flex;align-items:center;gap:24px;">
          <div style="display:flex;align-items:baseline;gap:6px;">
            <div style="font-family:${C.fNum};font-size:72px;font-weight:700;line-height:0.95;letter-spacing:-0.04em;color:${C.elec};">10</div>
            <div style="font-family:${C.fBody};font-size:15px;font-weight:600;color:${C.ink2};">分の動画</div>
          </div>
          <div style="font-family:${C.fNum};font-size:32px;color:${C.ink3};font-weight:300;">→</div>
          <div style="display:flex;align-items:baseline;gap:6px;">
            <div style="font-family:${C.fNum};font-size:72px;font-weight:700;line-height:0.95;letter-spacing:-0.04em;color:${C.success};">30</div>
            <div style="font-family:${C.fBody};font-size:15px;font-weight:600;color:${C.ink2};">秒で手順書完成</div>
          </div>
        </div>
      </div>
      ${foot()}`);

    await reveal(p, 1);
    await sync.waitFor(p, 'ai_intro', 150);
    await reveal(p, 2);
    await wait(p, 300);
    await reveal(p, 3);

    // 「動画から作る」ボタン
    await sync.waitFor(p, 'ai_click_btn', 200);
    await rmSlide(p);
    await injectHelper(p);
    await caption(p, '「動画から作る」ボタンをクリック');
    await spot(p, '.sb-upload-btn', '');
    await wait(p, 800);
    await clickRing(p, '.sb-upload-btn', true);
    await wait(p, 900);
    await clearSpots(p);
    await clearCaption(p);
    await injectHelper(p);

    // 資料タブ表示
    await sync.waitFor(p, 'ai_tabs', 0);
    await caption(p, '資料タブ: 添付資料 / 動画アップロード / 動画から自動生成');
    await wait(p, 3500);
    await clearCaption(p);

    // AI生成ボタン
    await sync.waitFor(p, 'ai_generate_btn', 0);
    await caption(p, '「AIで疑似生成」ボタン — 実際は動画ファイルをドロップするだけ');
    const aiBtn = await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(b => b.textContent.includes('AI') || b.textContent.includes('疑似') || b.textContent.includes('自動'));
      if (b) { b.scrollIntoView({block:'center'}); return true; }
      return false;
    });
    await wait(p, 800);
    // ボタンクリック
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(b => b.textContent.includes('AI') || b.textContent.includes('疑似') || b.textContent.includes('自動'));
      if (b) b.click();
    });
    await wait(p, 600);
    await clearCaption(p);

    // 解析中
    await sync.waitFor(p, 'ai_analyzing', 0);
    await caption(p, 'AIが映像を解析中 — キャプション認識・シーン区切り');
    await wait(p, 3500);
    await clearCaption(p);

    // 生成完了
    await sync.waitFor(p, 'ai_generated', 0);
    await caption(p, '8手順が自動生成 — 各手順に videoStart・videoEnd タイム付き');
    await wait(p, 3500);
    await clearCaption(p);

    // タイトル入力・保存
    await sync.waitFor(p, 'ai_save', 0);
    await caption(p, 'タイトルを入力して保存');
    await p.evaluate(() => {
      const inp = document.querySelector('input[placeholder*="タイトル"], input[name*="title"], input[id*="title"]');
      if (inp) { inp.focus(); inp.value = '分電盤の交換'; inp.dispatchEvent(new Event('input')); }
    });
    await wait(p, 1800);
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(b => b.textContent.includes('保存') || b.textContent.includes('作成') || b.textContent.includes('登録'));
      if (b) b.click();
    });
    await wait(p, 800);
    await clearCaption(p);

    // 生成結果を閲覧
    await sync.waitFor(p, 'ai_open_result', 0);
    await caption(p, '生成された手順書を確認 — 各手順に時刻タグが付与されている');
    await wait(p, 4500);
    await clearCaption(p);

    // 時刻シーク
    await sync.waitFor(p, 'ai_seek', 0);
    await caption(p, '「▶ 再生」ボタンで動画の該当シーンに一発ジャンプ');
    await p.evaluate(() => {
      const btn = document.querySelector('[class*="seek"], [class*="play-step"], button[data-time]');
      if (btn) btn.scrollIntoView({block:'center'});
    });
    await wait(p, 5000);
    await clearCaption(p);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch06 · 教材モード (31.7s)
  //  marks: course_intro(4.3) course_list(10.0) course_courses(19.2)
  //         course_quiz(26.8) course_end(31.6)
  // ═══════════════════════════════════════════════════════════
  { name: '06-course', act: async (p, sync) => {
    await injectHelper(p);
    await navTo(p, 'courses');
    await injectHelper(p);

    await sync.waitFor(p, 'course_intro', 0);
    await caption(p, '教材モード: 若手育成のためのコース学習');

    await sync.waitFor(p, 'course_list', 0);
    await clearCaption(p);
    await caption(p, '3つのカリキュラムコース');
    await hint(p, '#view', '');
    await wait(p, 2000);
    await clearSpots(p);
    await clearCaption(p);

    await sync.waitFor(p, 'course_courses', 0);
    await caption(p, '電気工事基礎 12章 / 高圧設備保守 8章 / 受変電設備施工 10章');
    await wait(p, 4500);
    await clearCaption(p);

    await sync.waitFor(p, 'course_quiz', 0);
    await caption(p, '各コースに理解度テストを内蔵 — 進捗を管理者が確認');
    // quiz/test ボタンがあればクリック
    await p.evaluate(() => {
      const btn = document.querySelector('[class*="quiz"], [class*="test"], button');
      if (btn) btn.scrollIntoView({block:'center'});
    });
    await wait(p, 3500);
    await clearCaption(p);

    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch07 · 導入イメージ (39.8s)
  //  marks: deploy_intro(3.1) deploy_mobile(9.4) deploy_pdf(16.0)
  //         deploy_asset(25.1) deploy_admin(34.7) deploy_end(39.8)
  // ═══════════════════════════════════════════════════════════
  { name: '07-deployment', act: async (p, sync) => {

    await slide(p, `
      ${chrome('導入イメージ')}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:820px;gap:0;">
        <div style="font-family:${C.fBody};font-weight:900;font-size:46px;line-height:1.15;letter-spacing:-0.03em;color:${C.ink};margin-bottom:32px;">
          三崎屋電工での使い方
        </div>

        <div data-reveal="1" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;border-bottom:1px solid ${C.line};">
          <div style="min-width:28px;font-family:${C.fNum};font-size:15px;font-weight:700;color:${C.elec};">01</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:16px;color:${C.ink};">スマホから現場で参照</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13px;color:${C.ink3};margin-top:3px;line-height:1.6;">工事中にスマホを取り出して手順を確認。インターネット接続のある現場ならどこでも使える</div>
          </div>
        </div>

        <div data-reveal="2" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;border-bottom:1px solid ${C.line};">
          <div style="min-width:28px;font-family:${C.fNum};font-size:15px;font-weight:700;color:${C.elec};">02</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:16px;color:${C.ink};">PDF印刷して現場に持参</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13px;color:${C.ink3};margin-top:3px;line-height:1.6;">電波が届かない場所でも安心。手順書を1クリックでPDF出力</div>
          </div>
        </div>

        <div data-reveal="3" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;border-bottom:1px solid ${C.line};">
          <div style="min-width:28px;font-family:${C.fNum};font-size:15px;font-weight:700;color:${C.elec};">03</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:16px;color:${C.ink};">ベテランの技術が会社の資産になる</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13px;color:${C.ink3};margin-top:3px;line-height:1.6;">一度動画を撮ってアップロードすれば、引退後も技術は残る</div>
          </div>
        </div>

        <div data-reveal="4" style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;">
          <div style="min-width:28px;font-family:${C.fNum};font-size:15px;font-weight:700;color:${C.elec};">04</div>
          <div>
            <div style="font-family:${C.fBody};font-weight:700;font-size:16px;color:${C.ink};">管理メニューで全社KPI管理</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:13px;color:${C.ink3};margin-top:3px;line-height:1.6;">ユーザー4名登録・閲覧権限管理・データエクスポート・バックアップ</div>
          </div>
        </div>
      </div>
      ${foot()}`);

    await sync.waitFor(p, 'deploy_intro', 150);
    await sync.waitFor(p, 'deploy_mobile', 150);
    await reveal(p, 1);
    await sync.waitFor(p, 'deploy_pdf', 150);
    await reveal(p, 2);
    await sync.waitFor(p, 'deploy_asset', 150);
    await reveal(p, 3);
    await sync.waitFor(p, 'deploy_admin', 150);
    await reveal(p, 4);
    await sync.waitEnd(p);
  }},

  // ═══════════════════════════════════════════════════════════
  //  Ch08 · まとめ + CTA (28.1s)
  //  marks: close_summary(9.0) close_value(18.7) close_end(28.0)
  // ═══════════════════════════════════════════════════════════
  { name: '08-close', act: async (p, sync) => {

    await slide(p, `
      ${chrome('まとめ')}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:780px;">
        <div data-reveal="1" style="font-family:${C.fBody};font-weight:900;font-size:56px;line-height:1.1;letter-spacing:-0.038em;color:${C.ink};text-wrap:balance;margin-bottom:32px;">
          現場の技術を、<br><span style="color:${C.elec};">未来の財産</span>に。
        </div>

        <div data-reveal="2" style="display:flex;gap:24px;margin-bottom:36px;">
          <div style="flex:1;padding:18px;background:${C.elecSoft};border-radius:8px;">
            <div style="font-family:${C.fBody};font-weight:700;font-size:14px;color:${C.elecText};margin-bottom:6px;">動画 → 手順書 30秒</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:12.5px;color:${C.elecText};line-height:1.6;">AIが動画を解析して自動生成。ベテランの負担ゼロ</div>
          </div>
          <div style="flex:1;padding:18px;background:${C.elecSoft};border-radius:8px;">
            <div style="font-family:${C.fBody};font-weight:700;font-size:14px;color:${C.elecText};margin-bottom:6px;">スマホで現場参照</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:12.5px;color:${C.elecText};line-height:1.6;">いつでもどこでも手順確認。紙探しの手間がゼロ</div>
          </div>
          <div style="flex:1;padding:18px;background:${C.elecSoft};border-radius:8px;">
            <div style="font-family:${C.fBody};font-weight:700;font-size:14px;color:${C.elecText};margin-bottom:6px;">技術継承が確実に</div>
            <div style="font-family:${C.fBody};font-weight:500;font-size:12.5px;color:${C.elecText};line-height:1.6;">ベテランが引退しても動画は残る。若手が独り立ちできる</div>
          </div>
        </div>

        <div data-reveal="3" style="padding:22px 28px;background:${C.navy};border-radius:10px;">
          <div style="font-family:${C.fBody};font-weight:700;font-size:17px;color:#fff;margin-bottom:8px;">まずは実際に触ってみてください</div>
          <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:rgba(255,255,255,0.65);letter-spacing:0.04em;">
            https://t35ty6-rgb.github.io/skeleton-demos/misakiya-denko-ai/
          </div>
          <div style="margin-top:10px;font-family:${C.fBody};font-weight:500;font-size:13px;color:rgba(255,255,255,0.55);">
            ご質問は Skeleton Inc. までお気軽にご連絡ください
          </div>
        </div>
      </div>
      ${foot()}`);

    await reveal(p, 1);
    await sync.waitFor(p, 'close_summary', 150);
    await reveal(p, 2);
    await sync.waitFor(p, 'close_value', 150);
    await reveal(p, 3);
    await sync.waitEnd(p);
  }},
];

// ────────────────────────────────────────────────────────────────────────────
//  メイン: 録画
// ────────────────────────────────────────────────────────────────────────────

// 章 timepoints を累積秒に変換
const chapterOrder = ['01-intro','02-issue','03-overview','04-view-manual','05-ai-generate','06-course','07-deployment','08-close'];
let cumulative = 0;
const absMarks = {};
for (const name of chapterOrder) {
  const ch = TP[name];
  if (ch) {
    absMarks[name] = { offset: cumulative, duration: ch.duration, marks: ch.marks };
    cumulative += ch.duration;
  }
}
console.log(`Total duration: ${cumulative.toFixed(1)}s (${(cumulative/60).toFixed(1)} min)`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();

// preload: navigate to tool first to warm up, measure preload time
const recordStart = Date.now();
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const t0 = Date.now();
const preloadSec = (t0 - recordStart) / 1000;
console.log(`preload: ${preloadSec.toFixed(2)}s`);

await injectHelper(page);
await preloadFonts(page);

// 章ごとにシナリオ実行
for (const ch of chapters) {
  const chData = TP[ch.name];
  if (!chData) { console.log(`skip ${ch.name} (no TP)`); continue; }
  console.log(`\n--- ${ch.name} (${chData.duration.toFixed(1)}s) ---`);
  const sync = new Sync(chData.marks, chData.duration);
  try {
    await ch.act(page, sync);
  } catch(e) {
    console.error(`  error in ${ch.name}:`, e.message);
  }
}

// 終了
await page.waitForTimeout(500);
await ctx.close();
await browser.close();

// webm ファイル特定
const webms = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm')).map(f => ({
  f, mtime: statSync(`${OUT_DIR}/${f}`).mtime
})).sort((a,b) => b.mtime - a.mtime);

if (webms.length > 0) {
  const srcWebm = `${OUT_DIR}/${webms[0].f}`;
  const dstWebm = `${OUT_DIR}/_all.webm`;
  if (srcWebm !== dstWebm) renameSync(srcWebm, dstWebm);
  console.log(`\nwebm: ${dstWebm}`);

  // timeline保存
  const timeline = { preloadSec, totalDuration: cumulative, chapters: chapterOrder.map(n => ({ name: n, duration: TP[n]?.duration || 0 })) };
  writeFileSync(`${OUT_DIR}/_timeline.json`, JSON.stringify(timeline, null, 2));
  console.log(`timeline.json saved (preload=${preloadSec.toFixed(2)}s)`);
} else {
  console.log('No webm found');
}
