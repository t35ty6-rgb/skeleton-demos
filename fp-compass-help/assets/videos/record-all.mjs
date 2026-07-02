// 荒島 admin ヘルプ動画 v3 — 全体→spot→zoom→hold→zoomOut の 5段階カメラワーク
// + 累積秒同期 (timeline drift 防止)
// + segments 細分化 (2-4秒/segに)
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/fp-compass-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const URL = 'https://stg.app.skeleton-inc.jp/';
const EMAIL = 't3.5ty6@gmail.com';
const PASS = 'tukasa2907';

// mp3 実測時間
const AUDIO_DUR = {
  '01-login': 15,
  '02-dashboard': 25,
  '03-clients': 22,
  '04-modal': 32,
  '05-survey': 22,
  '06-line': 23,
  '07-recording': 84,
  '08-timeline': 22,
  '09-meetings': 19,
  '10-zoom': 26,
  '11-calendar': 21,
  '12-liff': 22,
};

const HIGHLIGHT_CSS = `
body { transition: transform 0.7s cubic-bezier(.4,0,.2,1); }
html.ar-help-zooming, html.ar-help-zooming body { overflow: hidden !important; }
.ar-help-spot {
  position: absolute !important; border: 4px solid #C1462C !important; border-radius: 8px !important;
  box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: ar-pulse 1.1s ease-in-out infinite;
  transition: left .35s, top .35s, width .35s, height .35s;
}
/* soft spot: zoom前の目線誘導用 (spotより弱い) */
.ar-help-hint {
  position: absolute !important; border: 2px solid rgba(193,70,44,0.55) !important; border-radius: 6px !important;
  box-shadow: 0 0 0 6px rgba(193,70,44,0.14) !important;
  pointer-events: none !important; z-index: 99997 !important;
  animation: ar-hint-in .4s ease;
  transition: left .35s, top .35s, width .35s, height .35s;
}
.ar-help-arrow {
  position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #0E0E0C; color: #F2EDE3; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 15px; padding: 9px 16px; border-radius: 3px;
  box-shadow: 0 6px 20px rgba(0,0,0,.35); white-space: nowrap;
  border-left: 3px solid #C1462C;
  animation: ar-fadein .3s ease;
}
#ar-help-cursor {
  position: absolute; pointer-events: none; z-index: 99997;
  transition: left .6s cubic-bezier(.4,0,.2,1), top .6s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4));
}
.ar-help-ring {
  position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #C1462C; border-radius: 50%;
  animation: ar-ring 0.6s cubic-bezier(.2,.8,.4,1) forwards;
}
@keyframes ar-pulse {
  0%,100% { box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5); }
  50%     { box-shadow: 0 0 0 14px rgba(193,70,44,0.14), 0 0 55px rgba(193,70,44,0.95), 0 0 120px rgba(193,70,44,0.4); }
}
@keyframes ar-hint-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ar-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes ar-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.6);  opacity: 0; }
}
.ar-help-title {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 99995; padding: 32px 48px;
  background: rgba(14,14,12,0.95); color: #F2EDE3;
  border-left: 4px solid #C1462C;
  border-radius: 3px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 34px; letter-spacing: 0.02em;
  box-shadow: 0 30px 80px rgba(0,0,0,.5);
  animation: ar-fadein .35s ease;
  min-width: 400px; text-align: center; line-height: 1.5;
}
.ar-help-title small {
  display: block; font-size: 13px; color: #B8893B;
  letter-spacing: 0.24em; font-weight: 700;
  margin-bottom: 12px;
}
.ar-help-caption {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 99993; padding: 12px 24px;
  background: rgba(14,14,12,0.92); color: #F2EDE3;
  border-left: 3px solid #B8893B;
  border-radius: 3px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 500; font-size: 15px; letter-spacing: 0.03em;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  animation: ar-fadein-up .3s ease;
  max-width: 900px; line-height: 1.7;
}
@keyframes ar-fadein-up { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.arHelp && document.getElementById('ar-help-style')) return;
    window.arHelp = {};
    let style = document.getElementById('ar-help-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'ar-help-style';
      style.textContent = css;
      document.documentElement.appendChild(style);
    }
    window.arHelp.getTarget = (sel) => (typeof sel === 'string' ? document.querySelector(sel) : sel);
    window.arHelp.ensureCursor = () => {
      if (window._arCursor && document.body.contains(window._arCursor)) return window._arCursor;
      const c = document.createElement('div');
      c.id = 'ar-help-cursor';
      c.innerHTML = '<svg width="36" height="42" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 32 L10 24 L15 34 L20 32 L15 22 L26 22 Z" fill="#0E0E0C" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
      c.style.left = '640px'; c.style.top = '360px';
      document.body.appendChild(c);
      window._arCursor = c;
      return c;
    };
    window.arHelp.moveCursor = (sel) => {
      const t = window.arHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const c = window.arHelp.ensureCursor();
      c.style.left = (r.left + r.width / 2 - 10) + 'px';
      c.style.top  = (r.top + r.height / 2 - 6) + 'px';
    };
    window.arHelp.spot = (sel, label, kind) => {
      const t = window.arHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = (kind === 'hint') ? 'ar-help-hint' : 'ar-help-spot';
      const pad = 6;
      spot.style.left = (r.left - pad + window.scrollX) + 'px';
      spot.style.top  = (r.top  - pad + window.scrollY) + 'px';
      spot.style.width  = (r.width  + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';
      document.body.appendChild(spot);
      if (label) {
        const arr = document.createElement('div');
        arr.className = 'ar-help-arrow';
        arr.textContent = label;
        const preferredLeft = r.right + 20 + window.scrollX;
        // 右端超えなら 左に配置
        if (r.right + 260 > window.innerWidth) {
          arr.style.left = Math.max(10, r.left - 240 + window.scrollX) + 'px';
        } else {
          arr.style.left = preferredLeft + 'px';
        }
        arr.style.top  = (r.top + r.height / 2 - 18 + window.scrollY) + 'px';
        document.body.appendChild(arr);
      }
      window.arHelp.moveCursor(t);
    };
    window.arHelp.clearSpots = () => {
      document.querySelectorAll('.ar-help-spot, .ar-help-hint, .ar-help-arrow, .ar-help-ring').forEach(el => el.remove());
    };
    window.arHelp.zoom = (sel, label, opts) => {
      opts = opts || {};
      const scale = opts.scale || 1.5;
      const t = window.arHelp.getTarget(sel); if (!t) return;
      document.documentElement.classList.add('ar-help-zooming');
      const r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = window.innerWidth, h = window.innerHeight;
      const tx = w / 2 - cx;
      const ty = h / 2 - cy;
      document.body.style.transformOrigin = 'top left';
      document.body.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      setTimeout(() => {
        // zoom 完了後に spot (label は zoom後のview に合わせる)
        if (label) window.arHelp.spot(t, label);
        else window.arHelp.spot(t, '');
      }, 750);
    };
    window.arHelp.zoomOut = () => {
      window.arHelp.clearSpots();
      document.body.style.transform = '';
      document.documentElement.classList.remove('ar-help-zooming');
    };
    window.arHelp.clickRing = (sel) => {
      const t = window.arHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const ring = document.createElement('div');
      ring.className = 'ar-help-ring';
      ring.style.left = (r.left + r.width / 2 - 30 + window.scrollX) + 'px';
      ring.style.top  = (r.top + r.height / 2 - 30 + window.scrollY) + 'px';
      ring.style.width = '60px';
      ring.style.height = '60px';
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    };
    window.arHelp.clear = () => {
      window.arHelp.clearSpots();
      document.querySelectorAll('.ar-help-caption').forEach(el => el.remove());
    };
    window.arHelp.title = (text, eyebrow) => {
      const el = document.createElement('div');
      el.className = 'ar-help-title';
      el.innerHTML = (eyebrow ? `<small>${eyebrow}</small>` : '') + text;
      document.body.appendChild(el);
      return el;
    };
    window.arHelp.caption = (text) => {
      document.querySelectorAll('.ar-help-caption').forEach(el => el.remove());
      const el = document.createElement('div');
      el.className = 'ar-help-caption';
      el.innerHTML = text;
      document.body.appendChild(el);
      return el;
    };
  }, HIGHLIGHT_CSS);
}

// ========== helper (playwright side) ==========
async function wait(p, ms) { await p.waitForTimeout(ms); }

// 累積秒同期: 各 segment の end 時刻に合わせて wait
class Sync {
  constructor(p) { this.p = p; this.t0 = Date.now(); this.acc = 0; }
  async segEnd(dur) {
    this.acc += dur;
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = this.acc - elapsed;
    if (remain > 0.05) await wait(this.p, remain * 1000);
  }
  now() { return (Date.now() - this.t0) / 1000; }
  target() { return this.acc; }
}

async function goTab(p, tab) {
  await p.evaluate((t) => {
    document.querySelector(`.tab[data-tab="${t}"], [data-tab="${t}"]`)?.click();
  }, tab);
  await wait(p, 800);
}
async function openModal(p, regex) {
  return await p.evaluate((r) => {
    const list = window.DUMMY_CLIENTS || [];
    const re = new RegExp(r, 'i');
    const target = list.find(c => re.test(c.name || '')) || list[0];
    if (target && window.FpApp?.openClientModal) {
      window.FpApp.openClientModal(target.id);
      return target.id;
    }
  }, regex);
}
async function reset(p) {
  await p.evaluate(() => {
    document.querySelector('.cd-close')?.click();
    document.getElementById('fp-quick-inperson-modal')?.remove();
    document.querySelectorAll('.ar-help-title, .ar-help-caption, .ar-help-spot, .ar-help-hint, .ar-help-arrow, .ar-help-ring').forEach(el => el.remove());
    window.arHelp && window.arHelp.zoomOut && window.arHelp.zoomOut();
    window.arHelp && window.arHelp.clear && window.arHelp.clear();
    window.scrollTo(0, 0);
  });
  await goTab(p, 'clients');   // 顧客タブ (明るいUI)
  await wait(p, 500);
}

// 高レベル helper
async function caption(p, text) { await p.evaluate((t) => window.arHelp.caption(t), text); }
async function clearCaption(p) { await p.evaluate(() => document.querySelectorAll('.ar-help-caption').forEach(el => el.remove())); }
async function hint(p, sel, label = '') { await p.evaluate(({ s, l }) => window.arHelp.spot(s, l, 'hint'), { s: sel, l: label }); }
async function spot(p, sel, label = '') { await p.evaluate(({ s, l }) => { window.arHelp.clearSpots(); window.arHelp.spot(s, l); }, { s: sel, l: label }); }
async function clearSpots(p) { await p.evaluate(() => window.arHelp.clearSpots()); }
async function zoomIn(p, sel, label = '', scale = 1.5) {
  await p.evaluate(({ s, l, sc }) => window.arHelp.zoom(s, l, { scale: sc }), { s: sel, l: label, sc: scale });
}
async function zoomOut(p) {
  await p.evaluate(() => window.arHelp.zoomOut());
}
async function clickRing(p, sel, doClick = true) {
  await p.evaluate((s) => window.arHelp.clickRing(s), sel);
  if (doClick) {
    await p.evaluate((s) => { const t = typeof s === 'string' ? document.querySelector(s) : s; if (t) t.click(); }, sel);
  }
}
async function showTitle(p, text, eyebrow) {
  await p.evaluate(({ t, e }) => window.arHelp.title(t, e), { t: text, e: eyebrow || '' });
}
async function removeTitle(p) { await p.evaluate(() => document.querySelectorAll('.ar-help-title').forEach(el => el.remove())); }

// ★★ 核心 helper: 5段階カメラワーク (全体→hint→zoom→hold→引き)
// 使い方: await focusFlow(p, sel, label, { hintMs, holdMs, scale })
// 合計時間 = 0.5 (全体) + 0.5 (hint) + 0.8 (zoom-in) + holdMs + 0.5 (zoom-out) + 0.3 (引き)
async function focusFlow(p, sel, label, opts = {}) {
  const holdMs = opts.holdMs ?? 2500;
  const scale = opts.scale ?? 1.5;
  const doClick = opts.click === true;
  // Step 1: 全体状態を軽く見せる (spot なし、cursor だけ静止 = "全体表示")
  await wait(p, 400);
  // Step 2: hint (soft spot) で目線誘導 (zoom前)
  await hint(p, sel, label);
  await wait(p, 700);
  // Step 3: zoom in (0.7s transition + 0.05s buffer)
  await zoomIn(p, sel, label, scale);
  await wait(p, 800);
  // Step 4: hold (ここで説明)
  await wait(p, holdMs);
  // Step 5: click (optional)
  if (doClick) { await clickRing(p, sel, true); await wait(p, 500); }
  // Step 6: zoom out
  await zoomOut(p);
  await wait(p, 350);
}

// ★ シンプル focus (zoom なし、spot + cursor 移動のみ) — 小さい要素・短い説明用
async function pointAt(p, sel, label, holdMs = 1200) {
  await hint(p, sel, label);
  await wait(p, 350);
  await spot(p, sel, label);
  await wait(p, holdMs);
  await clearSpots(p);
  await wait(p, 200);
}

// ========== 各章シナリオ ==========
// 各 segment: { dur: 秒数, act: 実行するアクション }
// segments の合計秒 ≒ AUDIO_DUR

const chapters = [

  // ─────────────── 07 録音→AI議事録 (84s、 主役) ───────────────
  { name: '07-recording', segments: [

    // 「面談 の 録音 と AI 議事録 の 使い方 を、 最初 から 最後 まで ご説明 します。」 (6.5s)
    { dur: 6.5, act: async (p) => {
      await goTab(p, 'clients');
      await wait(p, 400);
      await showTitle(p, '録音 と<br>AI 議事録', 'CHAPTER 07 · 主 機 能');
    }},

    // 「まず、 画面 左 の サイドバー に ある、 『急遽 面談 スタート』 を 押します。」 (6.5s)
    { dur: 6.5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '#sidebar-quick-inperson', 'サイドバー 「急遽 面談 スタート」', { holdMs: 3800, scale: 1.7 });
    }},

    // 「入力 画面 が 開いたら、 上 の リスト から、 面談 する お客様 を 選びます。」 (6.5s)
    { dur: 6.5, act: async (p) => {
      await p.evaluate(() => document.getElementById('sidebar-quick-inperson')?.click());
      await wait(p, 1500);
      await focusFlow(p, '#fp-qi-client', 'お客様 を 選ぶ', { holdMs: 2800, scale: 1.5 });
      await p.evaluate(() => {
        const sel = document.getElementById('fp-qi-client');
        if (sel && sel.options.length > 2) { sel.selectedIndex = 2; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    }},

    // 「次 に、 面談 スタイル を 3 つ から 選びます。」 (5.5s)
    { dur: 5.5, act: async (p) => {
      await caption(p, '面談 スタイル は <strong style="color:#C1462C;">3 つ</strong> から 選択');
    }},

    // 「Zoom で 面談 する 場合 は 一番 上、」 (5s)
    { dur: 5.0, act: async (p) => {
      await clearCaption(p);
      await focusFlow(p, '.fp-qi-mode[data-mode="zoom"]', 'Zoom 即 発行 (双方 参加)', { holdMs: 2500, scale: 1.4 });
    }},

    // 「対面 録音 は 真ん中、」 (4s)
    { dur: 4.0, act: async (p) => {
      await focusFlow(p, '.fp-qi-mode[data-mode="audio"]', '対面 で 録音 だけ', { holdMs: 1800, scale: 1.4 });
    }},

    // 「電話 や 訪問先 で メモ だけ 残す 場合 は 一番 下 です。」 (6s)
    { dur: 6.0, act: async (p) => {
      await focusFlow(p, '.fp-qi-mode[data-mode="memo"]', '録音 せず メモ だけ 書く', { holdMs: 3800, scale: 1.4 });
    }},

    // 「選んだ ら、 下 の 『選んだ スタイル で 開始』 を 押します。」 (6s)
    { dur: 6.0, act: async (p) => {
      await p.evaluate(() => {
        const zoom = document.querySelector('.fp-qi-mode[data-mode="zoom"]');
        const r = zoom?.querySelector('input[type=radio]'); if (r) r.checked = true;
      });
      await focusFlow(p, '#fp-qi-start, .fp-qi-start, button[type=submit]', '「選んだ スタイル で 開始」', { holdMs: 3800, scale: 1.6 });
    }},

    // 「Zoom を 選ぶ と、 お客様 の LINE に URL が 自動 で 届き、 そのまま 面談 を 始められます。」 (8s)
    { dur: 8.0, act: async (p) => {
      await p.evaluate(() => document.getElementById('fp-quick-inperson-modal')?.remove());
      await caption(p, 'Zoom URL は <strong>お客様 の LINE に 自動 送信</strong> → 双方 参加');
    }},

    // 「面談 が 終わったら、 Zoom を 閉じる か、 対面 の 場合 は 停止 ボタン を 押します。」 (7s)
    { dur: 7.0, act: async (p) => {
      await caption(p, '面談 終了 → <strong>Zoom を 閉じる or 停止 ボタン</strong>');
    }},

    // 「画面 の 右上 に、 『議事録 生成中』 の 通知 が 出て、 30 秒 から 1 分 で 完成 します。」 (8s)
    { dur: 8.0, act: async (p) => {
      await clearCaption(p);
      await p.evaluate(() => {
        const toast = document.createElement('div');
        toast.id = 'fp-help-toast';
        toast.style.cssText = 'position:fixed;top:22px;right:22px;background:#0E0E0C;color:#F2EDE3;padding:16px 22px;border-radius:4px;border-left:3px solid #C1462C;box-shadow:0 12px 32px rgba(0,0,0,.4);z-index:99997;display:flex;align-items:center;gap:14px;font-family:"Noto Sans JP",sans-serif;';
        toast.innerHTML = '<div style="width:20px;height:20px;border:2.5px solid #B8893B;border-top-color:transparent;border-radius:50%;animation:sp .8s linear infinite;"></div><div style="font-weight:700;font-size:14px;">議事録 生成中... (30秒〜1分)</div>';
        const st = document.createElement('style'); st.textContent = '@keyframes sp { to { transform: rotate(360deg); } }'; document.head.appendChild(st);
        document.body.appendChild(toast);
      });
      await p.evaluate(() => window.arHelp.spot('#fp-help-toast', '右上 に 通知'));
    }},

    // 「完成 したら、 顧客一覧 から 該当 の お客様 を 開き、」 (5.5s)
    { dur: 5.5, act: async (p) => {
      await p.evaluate(() => document.getElementById('fp-help-toast')?.remove());
      await clearCaption(p);
      await goTab(p, 'clients');
      await wait(p, 400);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1600);
    }},

    // 「上部 タブ の 左 から 3 番目、 『面談録』 を 押します。」 (5.5s)
    { dur: 5.5, act: async (p) => {
      await focusFlow(p, '[data-cdtab="meetings"]', '「面談録」 タブ (左 から 3 番目)', { holdMs: 2500, scale: 1.6, click: true });
    }},

    // 「一番 上 に、 新しい 議事録 カード が 並ぶ ので、」 (5s)
    { dur: 5.0, act: async (p) => {
      await p.evaluate(() => {
        const card = document.querySelector('.fp-meeting-card');
        if (card) window.arHelp.spot(card, '新しい 議事録');
      });
      await caption(p, '新しい 議事録 が カード 形式 で 一番 上 に');
    }},

    // 「タップ する と、 プロフィール、 課題、 提案、 数字、 次回 アクション、 合意 事項 の 6 セクション と、」 (10s)
    { dur: 10.0, act: async (p) => {
      await p.evaluate(() => window.arHelp.clearSpots());
      await p.evaluate(() => document.querySelector('.fp-meeting-card')?.click());
      await wait(p, 1200);
      await caption(p, '<strong>6 セクション</strong>: プロフィール / 課題 / 提案 / 数字 / 次回 アクション / 合意 事項');
      await p.evaluate(() => { document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 240, behavior: 'smooth' }); });
    }},

    // 「FP が 次 に やる タスク、 そして 次回 面談 の 提案 まで、 全部 まとめて 表示 されます。」 (9s)
    { dur: 9.0, act: async (p) => {
      await caption(p, '+ FP タスク + 次回 面談 提案 (全部 まとめて 表示)');
      await p.evaluate(() => { document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 280, behavior: 'smooth' }); });
      await wait(p, 3000);
      await p.evaluate(() => { document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 280, behavior: 'smooth' }); });
    }},

    // 「タスク は チェック で 完了、 LINE 下書き も 自動 で 付いて きます。」 (6s)
    { dur: 6.0, act: async (p) => {
      await caption(p, 'タスク は <strong>チェック で 完了</strong>、 <strong>LINE 下書き</strong> も 自動生成');
    }},

    // 「Q & A タブ に は、 お客様 が 次 に 聞き そう な 質問 も、 AI が 予測 して 並びます。」 (8s)
    { dur: 8.0, act: async (p) => {
      await focusFlow(p, '[data-cdtab="qa"]', 'Q & A タブ (AI 予測 質問)', { holdMs: 4500, scale: 1.6 });
      await clearCaption(p);
    }},

  ]},

];

// ─── main ───
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
// ★ FP Compass 特別対応: mebuki chatbot hide + modal-overlay 透明化
await ctx.addInitScript(() => {
  const KILL = '#mbFab, #mbFabHint, #mbPanel, #mbClose, #mbInput, #mbMessages, #mbResize, #mbSend, .mb-fab, .mb-fab-hint, .mb-fab-img, .mb-fab-badge, .mb-fab-avatar, .mb-fab-pulse, .mb-fab-label, .mb-bubble, .mb-panel, .mb-head, .mb-head-avatar, .mb-head-img, .mb-messages, .mb-msg, .mb-quick, .mb-q, .mb-input, .mb-input-row, .mb-close, .mb-resize';
  const st = document.createElement('style');
  st.textContent = KILL + ' { display: none !important; } .modal-overlay, #modal-overlay, #form-overlay, #fp-quick-inperson-modal { background: transparent !important; backdrop-filter: none !important; }';
  (document.head || document.documentElement).appendChild(st);
  const kill = () => {
    try { document.querySelectorAll(KILL).forEach(el => el.remove()); } catch(_){}
    try {
      document.querySelectorAll('.modal-overlay, #modal-overlay, #form-overlay, #fp-quick-inperson-modal').forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('backdrop-filter', 'none', 'important');
      });
    } catch(_){}
  };
  if (document.body) { kill(); new MutationObserver(kill).observe(document.documentElement, { childList: true, subtree: true }); }
  else document.addEventListener('DOMContentLoaded', () => { kill(); new MutationObserver(kill).observe(document.documentElement, { childList: true, subtree: true }); }, { once: true });
  setInterval(kill, 50);
});
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PE:', e.message.slice(0, 80)));

console.log('🔑 stg login...');
await p.goto(URL + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
await p.waitForSelector('input[type=email]', { timeout: 15000 });
await p.fill('input[type=email]', EMAIL);
await p.fill('input[type=password]#fp-pw-input, input[type=password]:not(#fp-pwconfirm-input)', PASS);
await p.click('#fp-gate-btn');
await p.waitForFunction(() => window.FP_VERSION && window.DUMMY_CLIENTS && window.DUMMY_CLIENTS.length > 0, { timeout: 30000 });
await p.waitForTimeout(2500);
await injectHelper(p);
console.log('  ✓ logged in');

const timeline = [];
const t0 = Date.now();
const ONLY_ARG = process.argv[2] || '';
for (const f of chapters) {
  if (ONLY_ARG && !f.name.includes(ONLY_ARG)) continue;
  await reset(p);
  await injectHelper(p);
  const start = (Date.now() - t0) / 1000;
  const target = AUDIO_DUR[f.name] || 30;
  console.log(`🎬 [${start.toFixed(1)}s] ${f.name} (target ${target}s, ${f.segments.length} seg)`);

  // 累積秒同期
  const sync = new Sync(p);
  try {
    for (let i = 0; i < f.segments.length; i++) {
      const seg = f.segments[i];
      await seg.act(p, sync);
      await sync.segEnd(seg.dur);
    }
  } catch (e) {
    console.log(`  err: ${e.message.slice(0, 120)}`);
  }
  const end = (Date.now() - t0) / 1000;
  const actualDur = end - start;
  console.log(`  actual ${actualDur.toFixed(1)}s (target ${target.toFixed(1)}, diff ${(actualDur - target).toFixed(1)})`);
  timeline.push({ name: f.name, start, end, dur: actualDur });
}

await ctx.close();
await b.close();

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
