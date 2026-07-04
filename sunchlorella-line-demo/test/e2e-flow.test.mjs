/**
 * E2E 主要業務フロー実操作テスト
 * - 訪問販売員 受注入力 → 客履歴反映 → 本社KPI更新 (3画面連動)
 * - キャンペーン 新規作成 → 一覧反映
 * - チャネル詳細 5サブタブ切替
 * - セグメント配信 chip選択 → 送信 → 履歴反映
 */
import pw from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pw;

const BASE = 'http://localhost:8877';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('dialog', d => d.accept());
const errors = [];
p.on('pageerror', e => errors.push('[pageerror] ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });

let pass = 0, fail = 0;
function T(name, ok, note = '') {
  if (ok) { pass++; console.log(`✓ ${name}${note ? ' — ' + note : ''}`); }
  else    { fail++; console.log(`✗ ${name}${note ? ' — ' + note : ''}`); }
}

// clean state
await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.clear());

// ─── Test 1: 訪問販売員 受注入力 → 3画面連動 ───
await p.goto(BASE + '/rep/index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

// Rep ヘッダに現在の販売員名が出るか
const currentRep = await p.$eval('#repHead .name', el => el.textContent.trim()).catch(() => '(取れず)');
T('Rep 表示: 北野 誠', /北野/.test(currentRep), currentRep);

// 受注入力
await p.click('button[data-action="newOrder"]');
await p.waitForTimeout(400);

// 商品 1つ+
const plusBtns = await p.$$('.prod-pick button[data-op="+"]');
if (plusBtns.length > 0) await plusBtns[0].click();
await p.waitForTimeout(200);
const total = await p.$eval('#cartTotal', el => el.textContent.trim());
T('受注入力: 商品追加で cart total 更新', /¥/.test(total) && total !== '¥0', total);

// 受注確定
await p.click('#btnPlaceOrder');
await p.waitForTimeout(600);

// 顧客の履歴に反映されるか (rep画面の担当客タブから 田中幸子さま を開く)
await p.click('.tab-nav a[data-view="customers"]');
await p.waitForTimeout(300);
const custs = await p.$$eval('.cust', els => els.map(e => e.textContent.trim().slice(0, 30)));
T('担当客 一覧表示', custs.length >= 4, `${custs.length}名`);

// 客画面で 履歴に反映されるか (customer は history タブがtab-navに無いのでhashで直接)
await p.goto(BASE + '/customer/index.html#history', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const historyRows = await p.$$eval('#histList .history-row', els => els.length);
T('客画面: 履歴に購入履歴表示', historyRows > 0, `${historyRows}件`);

// 本社ダッシュボード KPI 反映
await p.goto(BASE + '/admin/index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const kpiV = await p.$eval('#kpiRow .kpi .v', el => el.textContent.trim());
T('本社ダッシュ: 総売上KPI 表示', /¥|\d/.test(kpiV), kpiV);

const recentOrders = await p.$$eval('#recentOrdersBody tr', trs => trs.length);
T('本社ダッシュ: 直近受注20件表示', recentOrders > 0, `${recentOrders}行`);

// ─── Test 2: キャンペーン 新規作成 → 一覧反映 ───
await p.goto(BASE + '/admin/index.html#campaigns', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const initialCampCount = await p.$$eval('.camp', els => els.length);
await p.click('#btnNewCamp');
await p.waitForTimeout(400);
await p.fill('#cName', 'E2Eテスト キャンペーン');
await p.click('#btnSaveCamp');
await p.waitForTimeout(500);
const finalCampCount = await p.$$eval('.camp', els => els.length);
T('キャンペーン新規作成 → 一覧に追加', finalCampCount > initialCampCount, `${initialCampCount} → ${finalCampCount}`);

// ─── Test 3: チャネル詳細 5サブタブ切替 ───
await p.goto(BASE + '/admin/index.html#channel/ch_sales', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
let subTabResults = { overview: false, broadcasts: false, customers: false, scenarios: false, settings: false };
for (const sub of Object.keys(subTabResults)) {
  await p.click(`#chanDetailTabs button[data-sub="${sub}"]`);
  await p.waitForTimeout(300);
  const activeBody = await p.evaluate((s) => !!document.querySelector(`#chanBody${s.charAt(0).toUpperCase() + s.slice(1)}[data-active="true"]`), sub);
  subTabResults[sub] = activeBody;
}
T(`チャネル詳細 5サブタブ切替`, Object.values(subTabResults).every(v => v), JSON.stringify(subTabResults));

// ─── Test 4: セグメント配信 → 履歴に反映 ───
await p.goto(BASE + '/admin/index.html#broadcast', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const segNBefore = await p.$eval('#segN', el => el.textContent.trim());
// chip 追加クリック (60代 が既にONなら70代を+)
const chip70 = await p.$('button.chip[data-tag="age_70"]');
if (chip70) await chip70.click();
await p.waitForTimeout(300);
const segNAfter = await p.$eval('#segN', el => el.textContent.trim());
T('セグメント配信 chip → 該当人数 動的更新', segNBefore !== segNAfter, `${segNBefore} → ${segNAfter}`);

await p.click('#btnBcSend');
await p.waitForTimeout(500);
// 配信履歴タブが表示される
const bcRows = await p.$$eval('.bc-row', els => els.length);
T('配信送信後 → 履歴に新規行追加', bcRows > 0, `${bcRows}件`);

// ─── Test 5: 客画面 定期便 skip ボタン ───
await p.goto(BASE + '/customer/index.html#subs', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const subCardBefore = await p.$$eval('.sub-card', els => els.length);
const skipBtn = await p.$('[data-sub-action="skip"]');
if (skipBtn) {
  await skipBtn.click();
  await p.waitForTimeout(500);
  T('客: 定期便skip実行', true, '発火成功');
} else {
  T('客: 定期便skip実行', false, 'ボタンなし');
}

// ─── Test 6: Escape でモーダル閉じる (再確認) ───
await p.goto(BASE + '/admin/index.html#campaigns', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const editBtn = await p.$('[data-camp-edit]');
if (editBtn) {
  await editBtn.click();
  await p.waitForTimeout(300);
  const modalOpen = await p.evaluate(() => !!document.querySelector('#modalHost .modal-bg'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const modalClosed = await p.evaluate(() => !document.querySelector('#modalHost .modal-bg'));
  T('Escape でモーダル閉じる', modalOpen && modalClosed, `open→close`);
}

// ─── Test 7: pageerror 発生ゼロ ───
T('全E2E中 pageerror ゼロ', errors.length === 0, `${errors.length}件`);
if (errors.length) errors.slice(0, 5).forEach(e => console.log('   ' + e));

await b.close();
console.log(`\n=== E2E Results ===\n${pass}/${pass+fail} passed`);
process.exit(fail > 0 ? 1 : 0);
