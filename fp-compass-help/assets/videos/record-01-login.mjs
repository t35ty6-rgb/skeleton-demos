// FP Compass ヘルプ動画 01: ログイン
// stg環境で ログイン操作 を 録画。 操作箇所 を 黄色ハイライト で 注目誘導。
// 出力: assets/videos/01-login.webm → ffmpeg で mp4 化

import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/fp-compass-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const STG = 'https://stg.app.skeleton-inc.jp/';
const EMAIL = 't3.5ty6@gmail.com';
const PASS = 'tukasa2907';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
const p = await ctx.newPage();

// ─── 録画開始 ───
// 0-3s: ブラウザ で URL 開く
await p.goto(STG + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=email]', { timeout: 15000 });

// ★ ハイライト用 CSS + helper 関数 を ページに直接注入 (addInitScript は タイミング不安定)
await p.evaluate(() => {
  window.fpHelp = {};
  const style = document.createElement('style');
  style.textContent = `
    .fp-help-spot {
      position: absolute !important;
      border: 3px solid #C89D3C !important;
      border-radius: 8px !important;
      box-shadow: 0 0 0 6px rgba(200,157,60,0.18), 0 0 24px rgba(200,157,60,0.4) !important;
      pointer-events: none !important;
      z-index: 99998 !important;
      transition: all .3s ease;
      animation: fp-help-pulse 1.4s ease-in-out infinite;
    }
    .fp-help-arrow {
      position: absolute !important;
      pointer-events: none !important;
      z-index: 99999 !important;
      background: #15172B;
      color: #fff;
      font-family: "Noto Sans JP", system-ui, sans-serif;
      font-weight: 700;
      font-size: 15px;
      padding: 8px 14px;
      border-radius: 6px;
      box-shadow: 0 6px 20px rgba(0,0,0,.28);
      white-space: nowrap;
      animation: fp-help-fadein .3s ease;
    }
    .fp-help-arrow::after {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%) rotate(45deg);
      width: 10px; height: 10px;
      background: #15172B;
    }
    @keyframes fp-help-pulse {
      0%,100% { box-shadow: 0 0 0 6px rgba(200,157,60,0.18), 0 0 24px rgba(200,157,60,0.4); }
      50%     { box-shadow: 0 0 0 10px rgba(200,157,60,0.10), 0 0 32px rgba(200,157,60,0.6); }
    }
    @keyframes fp-help-fadein {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.documentElement.appendChild(style);

  window.fpHelp.spot = (sel, label) => {
    const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const spot = document.createElement('div');
    spot.className = 'fp-help-spot';
    spot.style.left   = (window.scrollX + rect.left - 6) + 'px';
    spot.style.top    = (window.scrollY + rect.top - 6) + 'px';
    spot.style.width  = (rect.width + 12) + 'px';
    spot.style.height = (rect.height + 12) + 'px';
    document.body.appendChild(spot);
    if (label) {
      const arrow = document.createElement('div');
      arrow.className = 'fp-help-arrow';
      arrow.textContent = label;
      arrow.style.left = (window.scrollX + rect.right + 16) + 'px';
      arrow.style.top  = (window.scrollY + rect.top + rect.height / 2 - 18) + 'px';
      document.body.appendChild(arrow);
      window.fpHelp._arrow = arrow;
    }
    window.fpHelp._spot = spot;
  };
  window.fpHelp.clear = () => {
    document.querySelectorAll('.fp-help-spot, .fp-help-arrow').forEach(el => el.remove());
  };
});

await p.waitForTimeout(2500);  // 「朝、 FP コンパス を 開きます」

// 3-9s: URL周り 紹介 → メアド入力 ハイライト
await p.evaluate(() => window.fpHelp.spot('input[type=email]', 'ここに メアド'));
await p.waitForTimeout(1800);
await p.locator('input[type=email]').focus();
await p.locator('input[type=email]').pressSequentially(EMAIL, { delay: 50 });
await p.waitForTimeout(800);
await p.evaluate(() => window.fpHelp.clear());

// 9-15s: パスワード入力 ハイライト
await p.evaluate(() => window.fpHelp.spot('input[type=password]#fp-pw-input, input[type=password]:not(#fp-pwconfirm-input)', 'パスワード'));
await p.waitForTimeout(1200);
await p.locator('input[type=password]#fp-pw-input, input[type=password]:not(#fp-pwconfirm-input)').focus();
await p.locator('input[type=password]#fp-pw-input, input[type=password]:not(#fp-pwconfirm-input)').pressSequentially(PASS, { delay: 60 });
await p.waitForTimeout(800);
await p.evaluate(() => window.fpHelp.clear());

// 15-22s: ログインボタン ハイライト → クリック
await p.evaluate(() => window.fpHelp.spot('#fp-gate-btn', 'ここを押す'));
await p.waitForTimeout(2000);
await p.evaluate(() => window.fpHelp.clear());
await p.click('#fp-gate-btn');

// 22-30s: ダッシュボード 遷移 → 落ち着いた フレームで終了
await p.waitForFunction(() => window.FP_VERSION && window.DUMMY_CLIENTS && window.DUMMY_CLIENTS.length > 0, { timeout: 30000 });
await p.waitForTimeout(3500);

// 録画 終了
await ctx.close();

// rename newest webm
const files = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
if (files.length) {
  const newest = files.sort((a,b) => statSync(`${OUT_DIR}/${b}`).mtimeMs - statSync(`${OUT_DIR}/${a}`).mtimeMs)[0];
  renameSync(`${OUT_DIR}/${newest}`, `${OUT_DIR}/01-login.webm`);
  console.log(`saved: ${OUT_DIR}/01-login.webm`);
}

await b.close();
