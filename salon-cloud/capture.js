#!/usr/bin/env node
// SalonCloud 全画面 スクリーンショット
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const targets = [
  { name: 'dashboard',        file: 'dashboard.html',         vp: { w: 1440, h: 900 } },
  { name: 'customers',        file: 'customers.html',         vp: { w: 1440, h: 900 } },
  { name: 'customer-detail',  file: 'customer-detail.html',   vp: { w: 1440, h: 900 } },
  { name: 'campaigns',        file: 'campaigns.html',         vp: { w: 1440, h: 900 } },
  { name: 'invoices',         file: 'invoices.html',          vp: { w: 1440, h: 900 } },
  { name: 'line-richmenu',    file: 'line-richmenu.html',     vp: { w: 390, h: 844 } },
  { name: 'line-booking',     file: 'line-booking.html',      vp: { w: 390, h: 844 } },
  { name: 'line-survey',      file: 'line-survey.html',       vp: { w: 390, h: 844 } },
];

(async () => {
  const browser = await chromium.launch();
  const outDir = path.join(__dirname, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  for (const t of targets) {
    const ctx = await browser.newContext({
      viewport: { width: t.vp.w, height: t.vp.h },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const url = 'file://' + path.join(__dirname, t.file);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const out = path.join(outDir, `${t.name}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: t.vp.w, height: t.vp.h } });
    console.log(`✓ ${t.name}.png (${t.vp.w}x${t.vp.h})`);
    await ctx.close();
  }

  await browser.close();
  console.log('done');
})();
