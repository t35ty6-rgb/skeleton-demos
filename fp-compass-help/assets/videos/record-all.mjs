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
/* コンパちゃん (mebuki chatbot) は録画中は非表示 */
.mb-fab-hint, .mb-fab, .mb-fab-img, [class^="mb-fab"], [id^="mbFab"], .mebuki-fab, #mebukiFab { display: none !important; }
/* body が zoom時に transformされる — スクロールバー隠す */
html.fp-help-zooming, html.fp-help-zooming body { overflow: hidden !important; }
body { transition: transform 0.55s cubic-bezier(.4,0,.2,1); }
.fp-help-spot { position: absolute !important; border: 4px solid #EF4444 !important; border-radius: 8px !important;
  box-shadow: 0 0 0 8px rgba(239,68,68,0.28), 0 0 40px rgba(239,68,68,0.85), 0 0 90px rgba(239,68,68,0.5) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: fp-help-pulse 1.1s ease-in-out infinite; }
.fp-help-arrow { position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #EF4444; color: #fff; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 800; font-size: 15px; padding: 9px 16px; border-radius: 4px;
  box-shadow: 0 8px 24px rgba(239,68,68,.45); white-space: nowrap; animation: fp-help-fadein .25s ease; }
.fp-help-arrow::after { content: ''; position: absolute; left: -6px; top: 50%;
  transform: translateY(-50%) rotate(45deg); width: 12px; height: 12px; background: #EF4444; }
/* カーソル (大きめSVG) */
#fp-help-cursor { position: absolute; pointer-events: none; z-index: 99997;
  transition: left .45s cubic-bezier(.4,0,.2,1), top .45s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4)); }
/* クリックリング */
.fp-help-ring { position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #4338CA; border-radius: 50%;
  animation: fp-help-ring 0.65s cubic-bezier(.2,.8,.4,1) forwards; }
@keyframes fp-help-pulse { 0%,100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.28), 0 0 40px rgba(239,68,68,0.85), 0 0 90px rgba(239,68,68,0.5); }
  50% { box-shadow: 0 0 0 14px rgba(239,68,68,0.14), 0 0 55px rgba(239,68,68,0.95), 0 0 120px rgba(239,68,68,0.4); } }
@keyframes fp-help-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fp-help-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.6);  opacity: 0; }
}
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
    window.fpHelp.getTarget = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
    window.fpHelp.ensureCursor = () => {
      if (window._fpCursor) return window._fpCursor;
      const c = document.createElement('div');
      c.id = 'fp-help-cursor';
      c.innerHTML = '<svg width="36" height="42" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 32 L10 24 L15 34 L20 32 L15 22 L26 22 Z" fill="#15172B" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
      c.style.left = '640px'; c.style.top = '360px';
      document.body.appendChild(c);
      window._fpCursor = c;
      return c;
    };
    window.fpHelp.moveCursor = (sel) => {
      const t = window.fpHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const c = window.fpHelp.ensureCursor();
      c.style.left = (window.scrollX + r.left + r.width / 2 - 6) + 'px';
      c.style.top  = (window.scrollY + r.top + r.height / 2 - 4) + 'px';
    };
    window.fpHelp.spot = (sel, label) => {
      try {
        const target = window.fpHelp.getTarget(sel);
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
    // ★ 2026-07-02 dim廃止: 「グレースケール見づらい」 fb → dim overlay OFF、 赤枠+吹き出し+scale だけ で フォーカス
    window.fpHelp.zoom = (sel, label, opts) => {
      opts = opts || {};
      const scale = opts.scale || 1.35;
      const t = window.fpHelp.getTarget(sel);
      if (!t) return false;
      const r = t.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      // 該当要素 拡大 + z-index up
      const oldPos = window.getComputedStyle(t).position;
      window._fpZoomSaved = { el: t, position: t.style.position, zIndex: t.style.zIndex, transform: t.style.transform, transition: t.style.transition, background: t.style.background };
      t.style.transition = 'transform 0.42s cubic-bezier(.34,1.2,.5,1), box-shadow 0.4s';
      t.style.transform = 'scale(' + scale + ')';
      t.style.transformOrigin = 'center center';
      if (oldPos === 'static') t.style.position = 'relative';
      t.style.zIndex = '99993';
      // 背景 上書き は しない (元 の色 保持、 dim overlay なし なので 不要)
      window.fpHelp.spot(sel, label);
      window.fpHelp.moveCursor(sel);
      return true;
    };
    window.fpHelp.zoomOut = () => {
      const s = window._fpZoomSaved;
      if (s && s.el) {
        s.el.style.transform = s.transform || '';
        s.el.style.zIndex = s.zIndex || '';
        s.el.style.position = s.position || '';
        s.el.style.transition = s.transition || '';
        s.el.style.background = s.background || '';
        window._fpZoomSaved = null;
      }
    };
    // ★ クリック直前 の リング アニメ (紫)
    window.fpHelp.clickRing = (sel) => {
      const t = window.fpHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const cx = window.scrollX + r.left + r.width / 2;
      const cy = window.scrollY + r.top + r.height / 2;
      const ring = document.createElement('div');
      ring.className = 'fp-help-ring';
      ring.style.left = (cx - 30) + 'px';
      ring.style.top  = (cy - 30) + 'px';
      ring.style.width = '60px';
      ring.style.height = '60px';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    };
    window.fpHelp.clear = () => {
      document.querySelectorAll('.fp-help-spot, .fp-help-arrow, .fp-help-ring').forEach(el => el.remove());
    };
  }, HIGHLIGHT_CSS);
}

// ★ ズーム → 静止 → クリックリング → 引き の 3段カメラワーク
async function focusClick(p, sel, label, opts) {
  opts = opts || {};
  const scale = opts.scale || 1.5;
  const holdMs = opts.hold || 1600;    // ズーム後 静止時間 (ナレとの同期)
  const afterMs = opts.after || 1400;  // クリック後 (遷移確認)
  const doClick = opts.click !== false;
  await p.evaluate(({ s, l, sc }) => window.fpHelp.zoom(s, l, { scale: sc }), { s: sel, l: label || '', sc: scale });
  await p.waitForTimeout(holdMs);
  if (doClick) {
    await p.evaluate((s) => window.fpHelp.clickRing(s), sel);
    // zoom中は body scale なのでネイティブclick座標ズレる → JS click に切替
    await p.evaluate((s) => { const t = typeof s === 'string' ? document.querySelector(s) : s; if (t) t.click(); }, sel);
  }
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
  await p.waitForTimeout(afterMs);
}
// ズームなし の spot (該当要素 が 大きすぎる or 全体紹介用)
async function highlight(p, sel, label, holdMs = 3500) {
  await p.evaluate(({ s, l }) => window.fpHelp.spot(s, l), { s: sel, l: label || '' });
  await p.evaluate((s) => window.fpHelp.moveCursor(s), sel);
  await p.waitForTimeout(holdMs);
  await p.evaluate(() => window.fpHelp.clear());
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
// ★ 新カメラワーク: 「ここ を 押す」 前 に ズームイン → 静止 → クリック → 引き
const features = [
  { name: '02-dashboard', fn: async (p) => {
    await p.evaluate(() => document.querySelector('.tab[data-tab="home"]')?.click());
    await p.waitForTimeout(2000);
    await highlight(p, 'main, .main-content, .home-content', '今日 の 全体', 3500);
    // KPI カード は 小さいので zoom で 拡大
    await focusClick(p, '.kpi, .stats, .home-kpi, .kpi-row, main', '今月 の 数字', { scale: 1.4, hold: 2500, after: 800, click: false });
    // scroll下 で 新着通知
    await p.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await p.waitForTimeout(1200);
    await highlight(p, '.notifications, .home-notice, .alert-list, .recent-line, main', '新着 の 通知', 3500);
    await p.waitForTimeout(2000);
  }},

  { name: '03-clients', fn: async (p) => {
    await focusClick(p, '.tab[data-tab="clients"]', '顧客 タブ を 押す', { scale: 1.7, hold: 1800, after: 1800 });
    await highlight(p, 'input[type=search], #client-search, .search-input, input[placeholder*="検索"], main', '名前 で 検索', 3200);
    // 顧客1人 選択 (openModal で 開く 前 に spot)
    await p.evaluate(() => {
      const rows = document.querySelectorAll('.client-row, [data-customer-id], tr[data-id]');
      if (rows[0]) window.fpHelp.zoom(rows[0], 'タップ で カルテ 開く', { scale: 1.3 });
    });
    await p.waitForTimeout(1800);
    await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
    await openModal(p, '徳佐|Jobs|お');
    await p.waitForTimeout(3000);
  }},

  { name: '04-modal', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(2000);
    // 各タブ を zoomイン → 押す → 引く
    for (const [k, l] of [['overview','概要'],['line','LINE'],['timeline','人生年表'],['meetings','面談録'],['qa','Q&A'],['family','家族']]) {
      await focusClick(p, `[data-cdtab="${k}"]`, l, { scale: 1.9, hold: 1400, after: 2200 });
    }
  }},

  { name: '05-survey', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1200);
    await focusClick(p, '[data-cdtab="overview"]', '概要 タブ', { scale: 1.6, hold: 1000, after: 1800 });
    await p.evaluate(() => {
      const panel = document.querySelector('[data-cdpanel="overview"]');
      if (panel) panel.scrollTo({ top: panel.scrollHeight / 3, behavior: 'smooth' });
    });
    await p.waitForTimeout(1200);
    await highlight(p, '.survey-result, .survey-answers, [data-section="survey"], [data-cdpanel="overview"]', 'アンケート 13問 の 回答', 6500);
    await p.waitForTimeout(2500);
  }},

  { name: '06-line', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1200);
    await focusClick(p, '[data-cdtab="line"]', 'LINE タブ', { scale: 1.6, hold: 1200, after: 1500 });
    await highlight(p, '#cd-line-chat, [data-cdpanel="line"]', '過去 の やり取り', 3500);
    await focusClick(p, '#cd-line-input', 'ここ に 入力', { scale: 1.5, hold: 1500, after: 300, click: false });
    try { await p.fill('#cd-line-input', 'テスト送信', { timeout: 1500 }); } catch (_) {}
    await p.waitForTimeout(2500);
    await focusClick(p, '#cd-line-send', '送信 ボタン', { scale: 1.9, hold: 1600, after: 1800, click: false });
  }},

  { name: '07-recording', fn: async (p) => {
    // ★ 2026-07-02 全工程 丁寧化: 「初めて 見る人 が 分かる」 レベル で
    await p.waitForTimeout(1500);

    // === step 1: サイドバー 「急遽 面談スタート」 (実DOM: #sidebar-quick-inperson) ===
    await focusClick(p, '#sidebar-quick-inperson',
      '「急遽 面談スタート」 を 押す', { scale: 1.9, hold: 2800, after: 300, click: false });
    await p.evaluate(() => document.getElementById('sidebar-quick-inperson')?.click());
    await p.waitForTimeout(2500);   // モーダル open 見せる

    // === step 2: お客様 プルダウン ===
    await focusClick(p, '#fp-qi-client', 'お客様 を 選ぶ', { scale: 1.6, hold: 2500, after: 200, click: false });
    // JS で option を 選択状態に (dropdown 開かず 選択済 視覚化)
    await p.evaluate(() => {
      const sel = document.getElementById('fp-qi-client');
      if (sel && sel.options.length > 2) {
        sel.selectedIndex = 2;   // 最初 の 顧客
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.style.borderColor = '#9A5A18';
      }
    });
    await p.waitForTimeout(1800);

    // === step 3: Zoom即発行 モード zoom + 選択 ===
    await focusClick(p, '.fp-qi-mode[data-mode="zoom"], label[data-mode="zoom"]',
      'Zoom 即 発行 を 選ぶ', { scale: 1.5, hold: 3500, after: 200, click: false });
    await p.evaluate(() => {
      const mode = document.querySelector('.fp-qi-mode[data-mode="zoom"]');
      if (mode) {
        mode.style.borderColor = '#9A5A18';
        mode.style.background = '#FFF9EB';
        const r = mode.querySelector('input[type="radio"]');
        if (r) r.checked = true;
      }
    });
    await p.waitForTimeout(1200);

    // === step 4: 「対面 で 録音」 モード (対比 説明) ===
    await focusClick(p, '.fp-qi-mode[data-mode="audio"], label[data-mode="audio"]',
      '対面 なら 「対面 録音」', { scale: 1.5, hold: 3500, after: 300, click: false });

    // === step 5: 「選んだ スタイル で 開始」 zoom ===
    await focusClick(p, '#fp-qi-start, .fp-qi-start, button[type="submit"]',
      '「選んだ スタイル で 開始」', { scale: 1.7, hold: 2800, after: 500, click: false });

    // === step 6: モーダル 閉じる (Zoom発行 相当 の 説明 は ナレで) ===
    await p.evaluate(() => document.getElementById('fp-quick-inperson-modal')?.remove());
    await p.waitForTimeout(800);

    // === step 7: 「議事録 生成中」 通知 の 模擬表示 (右上) ===
    await p.evaluate(() => {
      const toast = document.createElement('div');
      toast.id = 'fp-help-toast';
      toast.style.cssText = 'position:fixed;top:22px;right:22px;background:#1F2A3F;color:#fff;padding:14px 20px;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,0.35);z-index:99997;display:flex;align-items:center;gap:12px;font-family:"Noto Sans JP",sans-serif;';
      toast.innerHTML = '<div style="width:18px;height:18px;border:2.5px solid #FBBF24;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div style="font-weight:700;font-size:13.5px;">議事録 生成中... (30秒〜1分)</div>';
      const st = document.createElement('style');
      st.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(st);
      document.body.appendChild(toast);
    });
    await p.evaluate(() => window.fpHelp.spot('#fp-help-toast', '右上 に 通知'));
    await p.waitForTimeout(3500);
    await p.evaluate(() => window.fpHelp.clear());
    await p.evaluate(() => {
      const t = document.getElementById('fp-help-toast');
      if (t) t.innerHTML = '<div style="width:18px;height:18px;background:#10B981;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;">✓</div><div style="font-weight:700;font-size:13.5px;">議事録 完成 しました</div>';
    });
    await p.waitForTimeout(2000);
    await p.evaluate(() => document.getElementById('fp-help-toast')?.remove());

    // === step 8: 顧客カルテ 開く ===
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1800);

    // === step 9: 「面談録」 タブ zoom + 実クリック ===
    await focusClick(p, '[data-cdtab="meetings"]', '「面談録」 タブ を タップ', { scale: 2.0, hold: 2200, after: 500 });
    await p.waitForTimeout(1200);

    // === step 10: 議事録カード (.fp-meeting-card 実DOM) zoom + click 展開 ===
    await p.evaluate(() => {
      const card = document.querySelector('.fp-meeting-card');
      if (card) window.fpHelp.zoom(card, '新しい 議事録 カード', { scale: 1.3 });
    });
    await p.waitForTimeout(2800);
    // カード click で 展開 (fp-compass-app で is-open クラス切替)
    await p.evaluate(() => {
      window.fpHelp.zoomOut(); window.fpHelp.clear();
      const card = document.querySelector('.fp-meeting-card');
      if (card) card.click();
    });
    await p.waitForTimeout(2200);

    // === step 11: 展開後 モーダル本体 (.cd-modal-body 相当) を scroll で 中身見せる ===
    // fp-meeting-card 展開で 本文が下に出る → モーダル / panel を scroll
    for (const dy of [200, 240, 260, 280, 280, 260]) {
      await p.evaluate((y) => {
        // モーダル 本体 or panel を scroll
        const targets = document.querySelectorAll('.cd-modal-body, .cd-content, [data-cdpanel="meetings"], .modal-body, .cd-body');
        targets.forEach(t => t.scrollBy({ top: y, behavior: 'smooth' }));
        window.scrollBy({ top: y * 0.5, behavior: 'smooth' });
      }, dy);
      await p.waitForTimeout(2500);
    }
    // 末尾: 議事録カード 全体 highlight (見えた事を 確認)
    await highlight(p, '.fp-meeting-card', '議事録 完成', 3000);
  }},

  { name: '08-timeline', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1200);
    await focusClick(p, '[data-cdtab="timeline"]', '人生年表 タブ', { scale: 1.9, hold: 1300, after: 1800 });
    await highlight(p, '[data-cdpanel="timeline"]', '時系列 で 全部', 5000);
    await p.evaluate(() => {
      const item = document.querySelector('[data-cdpanel="timeline"] .cd-tl-list > *, [data-cdpanel="timeline"] li, [data-cdpanel="timeline"] article');
      if (item) window.fpHelp.zoom(item, '進学 / 退職 等', { scale: 1.3 });
    });
    await p.waitForTimeout(4500);
    await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
    await p.waitForTimeout(2500);
  }},

  { name: '09-meetings', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1200);
    await focusClick(p, '[data-cdtab="meetings"]', '面談録 タブ', { scale: 1.9, hold: 1300, after: 1800 });
    await highlight(p, '[data-cdpanel="meetings"]', '日付順 に カード 表示', 4000);
    await p.evaluate(() => {
      const card = document.querySelector('[data-cdpanel="meetings"] .meeting-card, [data-cdpanel="meetings"] .fp-meeting-card, [data-cdpanel="meetings"] article');
      if (card) { window.fpHelp.zoom(card, 'タップ で 詳細', { scale: 1.4 }); }
    });
    await p.waitForTimeout(1800);
    await p.evaluate(() => {
      const card = document.querySelector('[data-cdpanel="meetings"] .meeting-card, [data-cdpanel="meetings"] .fp-meeting-card, [data-cdpanel="meetings"] article');
      if (card) card.click();
    });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
    await highlight(p, '[data-cdpanel="meetings"]', '議事録 全文 + タスク', 5500);
    await p.waitForTimeout(2000);
  }},

  { name: '10-zoom', fn: async (p) => {
    await openModal(p, '徳佐|Jobs');
    await p.waitForTimeout(1200);
    await focusClick(p, '[data-cdtab="line"]', 'LINE タブ', { scale: 1.9, hold: 1300, after: 1800 });
    await focusClick(p, '#cd-line-propose, .propose-slots, [data-action="propose"], button[onclick*="propose"], [data-cdpanel="line"]', '候補日 提案', { scale: 1.7, hold: 2500, after: 1500, click: false });
    // クリック できる場合のみ
    try { await p.click('#cd-line-propose, .propose-slots, [data-action="propose"]', { timeout: 1500 }); } catch (_) {}
    await p.waitForTimeout(2000);
    await highlight(p, '.slot-picker, .propose-modal, [data-modal="propose"], .modal-overlay .modal, body', '候補 を 3 つ 選ぶ', 6500);
    await p.waitForTimeout(2500);
  }},

  { name: '11-calendar', fn: async (p) => {
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      const tab = document.querySelector('.tab[data-tab="settings"]') || document.querySelector('.tab[data-tab="config"]');
      if (tab) tab.click();
    });
    await p.waitForTimeout(2500);
    await highlight(p, '.calendar-integration, .google-calendar, [data-section="calendar"], .settings-calendar, main', 'Google カレンダー 連携', 6500);
    await p.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
    await p.waitForTimeout(1500);
    await highlight(p, '.calendar-status, .connected-badge, .calendar-info, main', '連携 済 の 状態', 4500);
    await p.waitForTimeout(2000);
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
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.fpHelp.clear());
    // 各メニュー を zoom で 拡大
    await p.evaluate(() => {
      const menus = window._fpLiffOverlay?.querySelectorAll('div[style*="text-align:center"]');
      if (menus && menus[0]) window.fpHelp.zoom(menus[0], 'アンケート', { scale: 1.5 });
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const menus = window._fpLiffOverlay?.querySelectorAll('div[style*="text-align:center"]');
      if (menus && menus[1]) window.fpHelp.zoom(menus[1], '議事録 確認', { scale: 1.5 });
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { window.fpHelp.zoomOut(); window.fpHelp.clear(); });
    await p.waitForTimeout(2500);
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
  const KILL_SELECTORS = '#mbFab, #mbFabHint, #mbPanel, #mbClose, #mbInput, #mbMessages, #mbResize, #mbSend, .mb-fab, .mb-fab-hint, .mb-fab-img, .mb-fab-badge, .mb-fab-avatar, .mb-fab-pulse, .mb-fab-label, .mb-bubble, .mb-panel, .mb-head, .mb-head-avatar, .mb-head-img, .mb-messages, .mb-msg, .mb-quick, .mb-q, .mb-input, .mb-input-row, .mb-close, .mb-resize, .chatbot-widget, [class*="mebuki"], [id*="mebuki"]';
  // ★ 早期 CSS 注入 (documentElement に直接 style tag で 最速で有効化)
  const earlyStyle = 'html:not(.fp-help-allow-chatbot) ' + KILL_SELECTORS.split(',').map(s => s.trim()).join(', html:not(.fp-help-allow-chatbot) ') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; left: -9999px !important; }';
  const st0 = document.createElement('style');
  st0.id = 'fp-hide-mebuki-early';
  st0.textContent = earlyStyle;
  (document.head || document.documentElement).appendChild(st0);
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
  setInterval(kill, 50);
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
const ONLY_ARG = process.argv[2] || '';
for (const f of features) {
  if (ONLY_ARG && !f.name.includes(ONLY_ARG)) continue;
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
