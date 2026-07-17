// Salonworks TVCM v2 録画スクリプト
// 1920x1080 headless Chromium + preload trim 対応
import { chromium } from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:8877/salonworks-tvcm/index-v2.html';
const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/salonworks-tvcm';
const NARRATION = `${OUT_DIR}/tvcm-v2-narration.mp3`;
const FINAL_MP4 = '/Users/tsukasayoshida/Desktop/クロード/事業/Skel-EC×Femoon統合/営業動画/videos/salonworks-tvcm-30s-v2.mp4';

// ナレーション 51.68s + バッファ 4s = 55s
const WAIT_MS = 56000;

console.log('=== Salonworks TVCM v2 Recorder ===');

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security', // Lottie CDN cross-origin
    '--autoplay-policy=no-user-gesture-required',
  ],
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

// preload 計測
const recordStart = Date.now();
console.log('Loading page (preload)...');
await page.goto(BASE_URL, { waitUntil: 'networkidle' });

// フォントロード待機
await page.waitForFunction(() => window.FONTS_LOADED === true, { timeout: 20000 });
console.log('Fonts loaded.');

const t0 = Date.now();
const preloadSec = (t0 - recordStart) / 1000;
console.log(`Preload: ${preloadSec.toFixed(2)}s`);

// TVCM 開始
console.log('Starting TVCM v2 animation...');
await page.evaluate(() => window.TVCM_START());

// 完了待機
console.log(`Waiting ${WAIT_MS/1000}s for animation...`);
await new Promise(r => setTimeout(r, WAIT_MS));

// DONE check
const done = await page.evaluate(() => window.TVCM_DONE);
console.log(`TVCM_DONE: ${done}`);

const videoPath = await page.video().path();
await context.close();
await browser.close();
console.log(`Raw video: ${videoPath}`);

// timeline 保存
const timeline = { preloadSec, videoPath, totalSec: WAIT_MS / 1000 };
writeFileSync(`${OUT_DIR}/_tvcm_v2_timeline.json`, JSON.stringify(timeline, null, 2));

// ── ffmpeg mux ──────────────────────────────────
// preload trim + narration mux → H.264 mp4
console.log('\n=== ffmpeg mux ===');
console.log(`preloadSec: ${preloadSec.toFixed(2)}s`);

import { mkdirSync } from 'node:fs';
mkdirSync('/Users/tsukasayoshida/Desktop/クロード/事業/Skel-EC×Femoon統合/営業動画/videos', { recursive: true });

const ffCmd = [
  'ffmpeg -y',
  `-ss ${preloadSec.toFixed(3)}`,
  `-i "${videoPath}"`,
  `-i "${NARRATION}"`,
  '-map 0:v:0 -map 1:a:0',
  '-c:v libx264 -pix_fmt yuv420p -preset medium -crf 20',
  '-c:a aac -b:a 192k -shortest',
  `"${FINAL_MP4}"`,
].join(' ');

console.log(`cmd: ${ffCmd}`);
execSync(ffCmd, { stdio: 'inherit' });

console.log(`\nFinal MP4: ${FINAL_MP4}`);

// ffprobe
const probe = execSync(`ffprobe -v quiet -print_format json -show_streams -show_format "${FINAL_MP4}"`, { encoding: 'utf8' });
const info = JSON.parse(probe);
const fmt = info.format;
const vid = info.streams.find(s => s.codec_type === 'video');
const aud = info.streams.find(s => s.codec_type === 'audio');
console.log('\n=== ffprobe ===');
console.log(`Duration:   ${parseFloat(fmt.duration).toFixed(2)}s`);
console.log(`Size:       ${(fmt.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`Video:      ${vid?.codec_name} ${vid?.width}x${vid?.height} @ ${eval(vid?.r_frame_rate).toFixed(1)}fps`);
console.log(`Audio:      ${aud?.codec_name} ${aud?.sample_rate}Hz ${aud?.channel_layout}`);
console.log('DONE');
