// FP Compass ヘルプ動画 全11本 bulk録画 (1 context 連続 → ffmpeg で時間分割)
// 1回 login → 11機能 連続実行 → 1 webm → 各機能 時間範囲 で 切り分け

import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/fp-compass-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const STG = 'https://stg.app.skeleton-inc.jp/';
const EMAIL = 't3.5ty6@gmail.com';
const PASS = 'tukasa2907';

const HIGHLIGHT_CSS = `
/* コンパちゃん (mebuki chatbot) は録画中は非表示 — ヘルプ動画 に映り込むのは不適切 */
.mb-fab-hint, .mb-fab, .mb-fab-img, [class^="mb-fab"], [id^="mbFab"], .mebuki-fab, #mebukiFab { display: none !important; }
.fp-help-spot { position: absolute !important; border: 3px solid #C89D3C !important; border-radius: 8px !important;
  box-shadow: 0 0 0 6px rgba(200,157,60,0.18), 0 0 24px rgba(200,157,60,0.4) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: fp-help-pulse 1.4s ease-in-out infinite; }
.fp-help-arrow { position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #15172B; color: #fff; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 15px; padding: 8px 14px; border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0,0,0,.28); white-space: nowrap; animation: fp-help-fadein .3s ease; }
.fp-help-arrow::after { content: ''; position: absolute; left: -6px; top: 50%;
  transform: translateY(-50%) rotate(45deg); width: 10px; height: 10px; background: #15172B; }
@keyframes fp-help-pulse { 0%,100% { box-shadow: 0 0 0 6px rgba(200,157,60,0.18), 0 0 24px rgba(200,157,60,0.4); }
  50% { box-shadow: 0 0 0 10px rgba(200,157,60,0.10), 0 0 32px rgba(200,157,60,0.6); } }
@keyframes fp-help-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
`;

async function injectHelper(p) {
  await p.evaluate((css) => {
    // コンパちゃん (mebuki chatbot) 削除 loop (毎回 呼ばれても 二重 setInterval しない)
    const killChatbot = () => {
      ['#mbFab', '#mbFabHint', '#mbPanel', '#mbClose', '#mbInput', '#mbMessages', '#mbResize', '#mbSend']
        .forEach(id => { const el = document.getElementById(id.slice(1)); if (el) try { el.remove(); } catch(_){} });
      document.querySelectorAll('[class^="mb-fab"], [class*=" mb-fab"], .mb-bubble, .mb-panel, .mb-head, .mb-quick, .mb-resize, .mb-close, .mb-input-row, .mb-messages')
        .forEach(el => { try { el.remove(); } catch(_){} });
    };
    killChatbot();
    if (!window._fpChatbotKillTimer) {
      window._fpChatbotKillTimer = setInterval(killChatbot, 800);
    }
    if (window.fpHelp) return;
    window.fpHelp = {};
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
    window.fpHelp.spot = (sel, label) => {
      try {
        const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
        if (!target) return false;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const spot = document.createElement('div');
        spot.className = 'fp-help-spot';
        spot.style.left = (window.scrollX + rect.left - 6) + 'px';
        spot.style.top  = (window.scrollY + rect.top - 6) + 'px';
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
        }
        return true;
      } catch (e) { return false; }
    };
    window.fpHelp.clear = () => {
      document.querySelectorAll('.fp-help-spot, .fp-help-arrow').forEach(el => el.remove());
    };
  }, HIGHLIGHT_CSS);
}

async function reset(p) {
  // モーダル閉じる + clientsタブ戻る + scroll top
  await p.evaluate(() => {
    document.querySelector('.cd-close')?.click();
    document.querySelector('.tab[data-tab="home"]')?.click();
    window.scrollTo(0, 0);
    window.fpHelp && window.fpHelp.clear();
  });
  await p.waitForTimeout(800);
}

async function openModal(p, regex) {
  return await p.evaluate((r) => {
    const list = window.DUMMY_CLIENTS || [];
    const re = new RegExp(r, 'i');
    const target = list.find(c => re.test(c.name || '')) || list[0];
    if (target && window.FpApp?.openClientModal) {
      window.FpApp.openClientModal(target.id);
      return { id: target.id, name: target.name };
    }
    return null;
  }, regex);
}

// 各機能 操作 (前後 reset で 状態リセット)
const features = [
  { name: '02-dashboard', fn: async (p) => {
    await p.evaluate(() => document.querySelector('.tab[data-tab="home"]')?.click());
    await p.waitForTimeout(2000);
    await p.evaluate(() => window.fpHelp.spot('.today-section, [data-section="today"], .dashboard-today, .home-today, .main-content, main', '今日 の 予定'));
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.fpHelp.spot('.kpi, .stats, .home-kpi, .kpi-row', '今月 の 数字'));
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('.notifications, .home-notice, .alert-list, .recent-line', '新着 通知'));
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '03-clients', fn: async (p) => {
    await p.evaluate(() => window.fpHelp.spot('.tab[data-tab="clients"]', '顧客 タブ'));
    await p.waitForTimeout(3500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => document.querySelector('.tab[data-tab="clients"]')?.click());
    await p.waitForTimeout(2000);
    await p.evaluate(() => window.fpHelp.spot('input[type=search], #client-search, .search-input, input[placeholder*="検索"]', '名前 で 検索'));
    await p.waitForTimeout(4000);
    await p.evaluate(() => window.fpHelp.clear());
    await openModal(p, '徳佐|Jobs|お');
    await p.waitForTimeout(3500);
    await p.waitForTimeout(2500);
  }},

  { name: '04-modal', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(2500);
    for (const k of ['overview','line','timeline','meetings','qa','family']) {
      try { await p.click(`[data-cdtab="${k}"]`, { timeout: 2000 }); } catch (_) {}
      await p.waitForTimeout(4500);
    }
    await p.waitForTimeout(2500);
  }},

  { name: '05-survey', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1500);
    try { await p.click('[data-cdtab="overview"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const panel = document.querySelector('[data-cdpanel="overview"]');
      if (panel) panel.scrollTo({ top: panel.scrollHeight / 3, behavior: 'smooth' });
    });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const sels = ['.survey-result', '.survey-answers', '[data-section="survey"]', '[data-cdpanel="overview"]'];
      for (const s of sels) if (window.fpHelp.spot(s, 'アンケート 13問')) return;
    });
    await p.waitForTimeout(7000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '06-line', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1500);
    try { await p.click('[data-cdtab="line"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('#cd-line-chat, [data-cdpanel="line"]', '過去 の やり取り'));
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.fpHelp.spot('#cd-line-input', 'ここに 入力'));
    try { await p.fill('#cd-line-input', 'テスト送信', { timeout: 1500 }); } catch (_) {}
    await p.waitForTimeout(4000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.fpHelp.spot('#cd-line-send', '送信'));
    await p.waitForTimeout(3500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '07-recording', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('#cd-record-btn, .record-fab, button.record, [data-action="record-start"]', '録音 ボタン'));
    await p.waitForTimeout(6500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.fpHelp.spot('#cd-record-btn, .record-fab, button.record', '面談中 ...'));
    await p.waitForTimeout(6500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => window.fpHelp.spot('#cd-record-btn, .record-fab, button.record', '面談 後 もう一度 押して 停止'));
    await p.waitForTimeout(6500);
    await p.evaluate(() => window.fpHelp.clear());
    try { await p.click('[data-cdtab="meetings"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('[data-cdpanel="meetings"]', 'AI が 30 秒 〜 1 分 で 議事録 生成'));
    await p.waitForTimeout(7000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => {
      const card = document.querySelector('[data-cdpanel="meetings"] .meeting-card, [data-cdpanel="meetings"] .fp-meeting-card, [data-cdpanel="meetings"] article');
      if (card) card.click();
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('[data-cdpanel="meetings"]', '6 セクション + タスク + 次回提案'));
    await p.waitForTimeout(8000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '08-timeline', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1500);
    try { await p.click('[data-cdtab="timeline"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('[data-cdpanel="timeline"]', '時系列 で 全部'));
    await p.waitForTimeout(6000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => {
      const item = document.querySelector('[data-cdpanel="timeline"] .cd-tl-list > *, [data-cdpanel="timeline"] li, [data-cdpanel="timeline"] article');
      if (item) window.fpHelp.spot(item, '進学 / 退職 等');
    });
    await p.waitForTimeout(5000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(3000);
  }},

  { name: '09-meetings', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1500);
    try { await p.click('[data-cdtab="meetings"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('[data-cdpanel="meetings"]', '面談録 一覧'));
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => {
      const card = document.querySelector('[data-cdpanel="meetings"] .meeting-card, [data-cdpanel="meetings"] .fp-meeting-card, [data-cdpanel="meetings"] article');
      if (card) card.click();
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('[data-cdpanel="meetings"]', '議事録 全文 + タスク'));
    await p.waitForTimeout(6000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '10-zoom', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1500);
    try { await p.click('[data-cdtab="line"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('#cd-line-propose, .propose-slots, [data-action="propose"], button[onclick*="propose"]', '候補日 提案'));
    await p.waitForTimeout(6000);
    await p.evaluate(() => window.fpHelp.clear());
    try { await p.click('#cd-line-propose, .propose-slots, [data-action="propose"]', { timeout: 2000 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      const sels = ['.slot-picker', '.propose-modal', '[data-modal="propose"]', '.modal-overlay .modal'];
      for (const s of sels) if (window.fpHelp.spot(s, '候補 を 3 つ 選ぶ')) return;
      window.fpHelp.spot('body', '候補 を 3 つ 選ぶ');
    });
    await p.waitForTimeout(8000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '11-calendar', fn: async (p) => {
    await p.waitForTimeout(1500);
    const ok = await p.evaluate(() => {
      const tab = document.querySelector('.tab[data-tab="settings"]') || document.querySelector('.tab[data-tab="config"]');
      if (tab) { tab.click(); return true; }
      return false;
    });
    await p.waitForTimeout(3000);
    await p.evaluate(() => {
      const sels = ['.calendar-integration', '.google-calendar', '[data-section="calendar"]', '.settings-calendar', 'main'];
      for (const s of sels) if (window.fpHelp.spot(s, 'Google カレンダー 連携')) return;
    });
    await p.waitForTimeout(7000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.fpHelp.spot('.calendar-status, .connected-badge, .calendar-info, main', '連携 状態'));
    await p.waitForTimeout(5000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(2500);
  }},

  { name: '12-liff', fn: async (p) => {
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.style = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);width:390px;height:600px;background:#fff;border:8px solid #333;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;display:flex;flex-direction:column;';
      overlay.innerHTML = `
        <div style="background:#06C755;color:#fff;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;">
          <span>FP Compass</span><span>×</span>
        </div>
        <div style="padding:18px;flex:1;background:#F8F8F8;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#fff;padding:18px;border-radius:8px;text-align:center;"><div style="font-size:24px;">📋</div><div style="font-size:13px;font-weight:600;margin-top:6px;">アンケート</div></div>
          <div style="background:#fff;padding:18px;border-radius:8px;text-align:center;"><div style="font-size:24px;">📄</div><div style="font-size:13px;font-weight:600;margin-top:6px;">議事録 確認</div></div>
          <div style="background:#fff;padding:18px;border-radius:8px;text-align:center;"><div style="font-size:24px;">📅</div><div style="font-size:13px;font-weight:600;margin-top:6px;">次回 予約</div></div>
          <div style="background:#fff;padding:18px;border-radius:8px;text-align:center;"><div style="font-size:24px;">💬</div><div style="font-size:13px;font-weight:600;margin-top:6px;">質問 する</div></div>
        </div>`;
      document.body.appendChild(overlay);
      window._fpLiffOverlay = overlay;
    });
    await p.waitForTimeout(4000);
    await p.evaluate(() => {
      if (window._fpLiffOverlay) window.fpHelp.spot(window._fpLiffOverlay, 'お客様 が 見る 画面');
    });
    await p.waitForTimeout(10000);
    await p.evaluate(() => window.fpHelp.clear());
    await p.waitForTimeout(3000);
    await p.evaluate(() => { if (window._fpLiffOverlay) window._fpLiffOverlay.remove(); });
  }},
];

// ─── main ───
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
// ★ addInitScript で 各 navigation 直後 に mebuki chatbot を 完全排除 (CSS + MutationObserver)
await ctx.addInitScript(() => {
  const KILL_SELECTORS = '#mbFab, #mbFabHint, #mbPanel, #mbClose, #mbInput, #mbMessages, #mbResize, #mbSend, .mb-fab, .mb-fab-hint, .mb-fab-img, .mb-fab-badge, .mb-fab-avatar, .mb-fab-pulse, .mb-fab-label, .mb-bubble, .mb-panel, .mb-head, .mb-head-avatar, .mb-head-img, .mb-messages, .mb-msg, .mb-quick, .mb-q, .mb-input, .mb-input-row, .mb-close, .mb-resize';
  // CSS で 表示阻止 (fallback)
  const style = document.createElement('style');
  style.id = 'fp-hide-mebuki';
  style.textContent = KILL_SELECTORS + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
  (document.head || document.documentElement).appendChild(style);
  // 削除関数
  const kill = () => {
    try { document.querySelectorAll(KILL_SELECTORS).forEach(el => el.remove()); } catch(_){}
  };
  kill();
  // MutationObserver で 追加された瞬間 削除
  const startObserver = () => {
    if (window._fpChatbotObs) return;
    window._fpChatbotObs = new MutationObserver(kill);
    window._fpChatbotObs.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  // 保険: interval
  setInterval(kill, 400);
});
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PE:', e.message.slice(0, 80)));

console.log('🔑 stg login...');
await p.goto(STG + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=email]', { timeout: 15000 });
await p.fill('input[type=email]', EMAIL);
await p.fill('input[type=password]#fp-pw-input, input[type=password]:not(#fp-pwconfirm-input)', PASS);
await p.click('#fp-gate-btn');
await p.waitForFunction(() => window.FP_VERSION && window.DUMMY_CLIENTS && window.DUMMY_CLIENTS.length > 0, { timeout: 30000 });
await p.waitForTimeout(3000);
await injectHelper(p);
console.log('  ✓ logged in');

// 各 feature の 開始/終了 時刻 を 記録
const timeline = [];
const t0 = Date.now();
for (const f of features) {
  await reset(p);
  await injectHelper(p);  // reset で消える可能性 → 再注入
  const start = (Date.now() - t0) / 1000;
  console.log(`🎬 [${start.toFixed(1)}s] ${f.name}`);
  try {
    await f.fn(p);
  } catch (e) {
    console.log(`  err: ${e.message.slice(0, 80)}`);
  }
  const end = (Date.now() - t0) / 1000;
  timeline.push({ name: f.name, start, end, dur: end - start });
}

await ctx.close();
await b.close();

// 1個 webm 取れた → timeline.json として 書出し
writeFileSync(`${OUT_DIR}/_timeline.json`, JSON.stringify(timeline, null, 2));
const files = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm') && !f.match(/^\d{2}-/));
if (files.length) {
  const newest = files.sort((a,b) => statSync(`${OUT_DIR}/${b}`).mtimeMs - statSync(`${OUT_DIR}/${a}`).mtimeMs)[0];
  const target = `${OUT_DIR}/_all.webm`;
  if (existsSync(target)) unlinkSync(target);
  renameSync(`${OUT_DIR}/${newest}`, target);
  console.log(`\n✅ saved: _all.webm + _timeline.json`);
} else {
  console.log('\n✗ no webm');
}
