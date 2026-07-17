// Salonworks TVCM 録画スクリプト
// 1920x1080 headless Chromium + preload trim 対応
import { chromium } from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:8877/salonworks-tvcm/index.html';
const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/salonworks-tvcm';
const TOTAL_SEC = 46; // v2: 43.75s + バッファ2.25s

console.log('=== Salonworks TVCM Recorder ===');

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: OUT_DIR,
    size: { width: 1920, height: 1080 },
  },
  deviceScaleFactor: 1,
});

const page = await context.newPage();

// --- preload 計測開始 ---
const recordStart = Date.now();
console.log('Loading page (preload)...');
await page.goto(BASE_URL, { waitUntil: 'networkidle' });

// フォントロード待機
await page.waitForFunction(() => window.FONTS_LOADED === true, { timeout: 15000 });
console.log('Fonts loaded.');

const t0 = Date.now();
const preloadSec = (t0 - recordStart) / 1000;
console.log(`Preload: ${preloadSec.toFixed(2)}s`);

// --- TVCM 開始 ---
console.log('Starting TVCM animation...');
await page.evaluate(() => window.TVCM_START());

// 完了待機 (アニメ41秒 + バッファ5秒)
const WAIT_MS = 49000;
console.log(`Waiting ${WAIT_MS/1000}s for animation to complete...`);
await new Promise(r => setTimeout(r, WAIT_MS));
console.log('TVCM animation done (time-based wait).');

// 録画停止
const videoPath = await page.video().path();
await context.close();
await browser.close();

console.log(`Video saved: ${videoPath}`);

// timeline 保存
const timeline = { preloadSec, totalSec: TOTAL_SEC, videoPath };
writeFileSync(`${OUT_DIR}/_tvcm_timeline.json`, JSON.stringify(timeline, null, 2));
console.log('Timeline saved.');
console.log(JSON.stringify(timeline, null, 2));
