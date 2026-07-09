// Ch03 だけ再録画スクリプト
// 白画面フラッシュ修正版: gotoTool 前に page-cover を即設置 + networkidle + waitForSelector
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/misakiya-denko-ai-demo/videos';
const BASE = 'https://t35ty6-rgb.github.io/skeleton-demos/misakiya-denko-ai';

const TP = JSON.parse(readFileSync('/Users/tsukasayoshida/Desktop/skeleton-demos/misakiya-denko-ai-demo/audio/timepoints.json', 'utf8'));

const C = {
  bg:       '#f5f7fb',
  bg2:      '#eef1f7',
  navy:     '#1a2547',
  ink:      '#1a2033',
  ink2:     '#3d4459',
  ink3:     '#6e7590',
  line:     '#e5e8f0',
  elec:     '#2563eb',
  elecHi:   '#1d4ed8',
  elecSoft: '#e0eaff',
  elecText: '#1e40af',
  warn:     '#f59e0b',
  success:  '#10b981',
  fBody:    "'Noto Sans JP','Hiragino Sans',system-ui,sans-serif",
  fNum:     "'Inter','Inter Tight',system-ui,sans-serif",
};

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

async function hint(p, sel, label='') { await p.evaluate(({s,l}) => window.mkHelp.spot(s,l,'hint'), {s:sel,l:label}); }
async function spot(p, sel, label='') { await p.evaluate(({s,l}) => { window.mkHelp.clearSpots(); window.mkHelp.spot(s,l); }, {s:sel,l:label}); }
async function clearSpots(p) { await p.evaluate(() => window.mkHelp.clearSpots()); }
async function zoomIn(p, sel, label='', scale=1.5) { await p.evaluate(({s,l,sc}) => window.mkHelp.zoom(s,l,sc), {s:sel,l:label,sc:scale}); }
async function zoomOut(p) { await p.evaluate(() => window.mkHelp.zoomOut()); }
async function caption(p, text) { await p.evaluate((t) => window.mkHelp.caption(t), text); }
async function clearCaption(p) { await p.evaluate(() => window.mkHelp.clearCaption()); }
async function slide(p, html) { await p.evaluate((h) => window.mkHelp.slide(h), html); }
async function reveal(p, n) { await p.evaluate((k) => window.mkHelp.reveal(k), n); }
async function rmSlide(p) { await p.evaluate(() => window.mkHelp.removeSlide()); }

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

// ★ 修正版 gotoTool:
//   1. goto 前に whiteCover を JS で即設置 (page が blank になる前に)
//   2. goto waitUntil: 'networkidle' (domcontentloaded ではなく)
//   3. waitForSelector で主要 UI が描画されるまで待機
//   4. 追加バッファ 1000ms (旧: 400ms)
async function gotoToolFixed(p, hash='') {
  const url = BASE + (hash ? '/#' + hash : '/');

  // Step1: goto 直前に cover を設置 (goto 中の白画面を隠す)
  // (もし既にページがあれば cover を先置き)
  try {
    await p.evaluate(() => {
      if (!document.getElementById('mk-page-cover')) {
        const c = document.createElement('div'); c.id = 'mk-page-cover';
        c.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483646 !important;background:#f5f7fb !important;pointer-events:none !important;';
        (document.body || document.documentElement).appendChild(c);
      }
    });
  } catch(_) {}

  // Step2: goto (networkidle まで待つ)
  await p.goto(url, { waitUntil: 'networkidle' });

  // Step3: goto 直後、DOM に cover が消えている可能性があるので再設置
  await p.evaluate(() => {
    if (!document.getElementById('mk-page-cover')) {
      const c = document.createElement('div'); c.id = 'mk-page-cover';
      c.style.cssText = 'position:fixed !important;inset:0 !important;z-index:2147483646 !important;background:#f5f7fb !important;pointer-events:none !important;';
      (document.body || document.documentElement).appendChild(c);
    }
  });

  // Step4: 主要 UI の描画完了を待つ (sidebar か nav か body 要素)
  // ツールの DOM 構造に合わせて複数セレクタを試す
  const selectors = ['.sidebar', '.nav-group', '[data-nav]', '.app-layout', '#app', '.app', 'main', 'nav'];
  for (const sel of selectors) {
    try {
      await p.waitForSelector(sel, { timeout: 5000 });
      console.log(`  UI ready: ${sel}`);
      break;
    } catch(_) {}
  }

  // Step5: 追加バッファ 1000ms (旧: 400ms)
  await wait(p, 1000);

  await injectHelper(p);
  await preloadFonts(p);
}

// ────────────────────────────────────────────────────────────────────────────
//  Ch03 だけ録画
// ────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR + '/ch03-tmp', size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();

mkdirSync(OUT_DIR + '/ch03-tmp', { recursive: true });

// preload (カバーのため)
console.log('preload: navigating to tool...');
const recordStart = Date.now();
// preload 用 goto (ch03 と同じ URL)
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const t0 = Date.now();
const preloadSec = (t0 - recordStart) / 1000;
console.log(`preload: ${preloadSec.toFixed(2)}s`);

await injectHelper(page);
await preloadFonts(page);

// ── Ch03 act ──
const chData = TP['03-overview'];
const sync = new Sync(chData.marks, chData.duration);
console.log(`\n--- 03-overview (${chData.duration.toFixed(1)}s) ---`);

const C_LOCAL = {
  bg:      '#f5f7fb',
  bg2:     '#eef1f7',
  navy:    '#1a2547',
  ink:     '#1a2033',
  ink2:    '#3d4459',
  ink3:    '#6e7590',
  line:    '#e5e8f0',
  elec:    '#2563eb',
  fBody:   "'Noto Sans JP','Hiragino Sans',system-ui,sans-serif",
  fNum:    "'Inter','Inter Tight',system-ui,sans-serif",
};
const chrome_local = (section='') => `
  <div style="display:flex;align-items:baseline;gap:18px;padding-bottom:20px;border-bottom:1px solid ${C_LOCAL.line};">
    <div style="font-family:${C_LOCAL.fNum};font-size:11px;font-weight:600;color:${C_LOCAL.ink3};letter-spacing:0.12em;text-transform:uppercase;">
      三崎屋電工AI · 技術を未来へ、人を育てる
    </div>
    <div style="flex:1;"></div>
    ${section ? `<div style="font-family:${C_LOCAL.fBody};font-size:12px;font-weight:600;color:${C_LOCAL.ink3};letter-spacing:0.02em;">${section}</div>` : ''}
  </div>`;
const foot_local = () => `
  <div style="margin-top:auto;padding-top:18px;border-top:1px solid ${C_LOCAL.line};display:flex;align-items:baseline;gap:14px;">
    <div style="font-family:${C_LOCAL.fNum};font-size:11px;font-weight:500;color:${C_LOCAL.ink3};">Skeleton Inc.</div>
    <div style="flex:1;"></div>
    <div style="font-family:${C_LOCAL.fNum};font-size:11px;font-weight:500;color:${C_LOCAL.ink3};">2026 · 07</div>
  </div>`;

// ★ 修正: 正しい順序
// 1. まず gotoToolFixed でツールをロード (cover で隠す)
// 2. ロード完了後に cover の上に遷移スライドを表示
// 3. overview_layout で rmSlide + cover 除去 → live UI を見せる
// (goto() はページを unload するので、goto() 前の slide() は消える)

await gotoToolFixed(page);
await injectHelper(page);

// ロード完了後に cover の上にスライドを重ねる
await slide(page, `
  ${chrome_local('ツール全体像')}
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:820px;">
    <div style="font-family:${C_LOCAL.fBody};font-weight:900;font-size:62px;line-height:1.08;letter-spacing:-0.038em;color:${C_LOCAL.ink};">
      ツール全体像
    </div>
    <div style="margin-top:14px;font-family:${C_LOCAL.fBody};font-weight:500;font-size:20px;color:${C_LOCAL.elec};letter-spacing:-0.01em;">
      実際の画面をご覧ください
    </div>
    <div style="margin-top:32px;font-family:${C_LOCAL.fBody};font-weight:500;font-size:16px;line-height:1.85;color:${C_LOCAL.ink2};max-width:52ch;">
      左サイドバーに8つのナビゲーションが並び、<br>
      右のコンテンツエリアに各機能が表示されます。
    </div>
  </div>
  ${foot_local()}`);

// layout → サイドバー全体ハイライト
// overview_layout (7.3s) で rmSlide → live UI を表示
await sync.waitFor(page, 'overview_layout', 200);
await rmSlide(page);
await wait(page, 200);
await caption(page, '左: サイドバー (ナビ) ／ 右: コンテンツエリア');
await hint(page, '.sidebar', '');
await wait(page, 1800);
await clearSpots(page);
await clearCaption(page);

// nav list
await sync.waitFor(page, 'overview_nav', 0);
await caption(page, '8つのナビゲーション');
await spot(page, '.nav-group', '');
await wait(page, 1500);
await clearSpots(page);
await clearCaption(page);

// navlist: 各 nav-item をひとつずつ
await sync.waitFor(page, 'overview_navlist', 0);
const navItems = ['home','search','favorites','recent','mypage','database','courses','admin'];
for (const nm of navItems) {
  await hint(page, `[data-nav="${nm}"]`, '');
  await wait(page, 400);
  await clearSpots(page);
}

// CTA ボタン
await sync.waitFor(page, 'overview_cta', 0);
await caption(page, '「動画から作る」 — AIで手順書を自動生成するメイン機能');
await spot(page, '.sb-upload-btn', '');
await zoomIn(page, '.sb-upload-btn', '', 1.6);
await wait(page, 3000);
await zoomOut(page);
await clearCaption(page);

// ホーム全体
await sync.waitFor(page, 'overview_home', 0);
await clearSpots(page);
await caption(page, 'ホーム: おすすめ作業 / 最近の閲覧 / お知らせ');
await wait(page, 2500);
await clearCaption(page);

// KPI
await sync.waitFor(page, 'overview_kpi', 0);
await caption(page, 'データ統計: 全作業件数 / カテゴリ数 / コース数 / 登録ユーザー数');
await spot(page, '#view', '');
await wait(page, 2800);
await clearSpots(page);
await clearCaption(page);

await sync.waitEnd(page);

// ──────────────────────────────────────────
// ctx.close() が webm を finalize するまで待つ
await page.waitForTimeout(1000);

// ctx.close() より先に video path を取得
const videoPath = await page.video()?.path();
console.log(`\nvideo path before close: ${videoPath}`);

await ctx.close();
await browser.close();

// Playwright は ctx.close() 後に webm を書き込む → 最大 15 秒待つ
async function waitForFile(filePath, maxMs = 15000) {
  const step = 500;
  let elapsed = 0;
  while (elapsed < maxMs) {
    await new Promise(r => setTimeout(r, step));
    elapsed += step;
    try {
      const sz = statSync(filePath).size;
      if (sz > 10000) {
        console.log(`  file ready: ${filePath} (${sz} bytes, ${elapsed}ms)`);
        return true;
      }
      console.log(`  waiting... ${sz} bytes (${elapsed}ms)`);
    } catch(_) {}
  }
  return false;
}

let srcWebm = null;

// 優先: videoPath から直接
if (videoPath) {
  const ok = await waitForFile(videoPath);
  if (ok) srcWebm = videoPath;
}

// フォールバック: ch03-tmp dir をスキャン
if (!srcWebm) {
  await new Promise(r => setTimeout(r, 2000));
  const webms = readdirSync(OUT_DIR + '/ch03-tmp')
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ f, mtime: statSync(`${OUT_DIR}/ch03-tmp/${f}`).mtime, size: statSync(`${OUT_DIR}/ch03-tmp/${f}`).size }))
    .filter(x => x.size > 10000)
    .sort((a,b) => b.mtime - a.mtime);
  if (webms.length > 0) srcWebm = `${OUT_DIR}/ch03-tmp/${webms[0].f}`;
}

if (srcWebm) {
  const dstWebm = `${OUT_DIR}/_ch03.webm`;
  renameSync(srcWebm, dstWebm);
  console.log(`\nCh03 webm: ${dstWebm} (${statSync(dstWebm).size} bytes)`);
  writeFileSync(`${OUT_DIR}/_ch03-preload.txt`, preloadSec.toFixed(4));
  console.log(`preload saved: ${preloadSec.toFixed(4)}s`);
} else {
  console.log('ERROR: No valid webm found');
  process.exit(1);
}
