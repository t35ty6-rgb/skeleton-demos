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

const AUDIO_DUR = {
  '01-login': 19.3,
  '02-dashboard': 27.7,
  '03-clients': 24.4,
  '04-modal': 34.4,
  '05-survey': 24.2,
  '06-line': 24.5,
  '07-recording': 92.3,
  '08-timeline': 23.8,
  '09-meetings': 20.6,
  '10-zoom': 28.3,
  '11-calendar': 22.0,
  '12-liff': 23.1,
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
  await p.evaluate((t) => document.querySelector(`.tab[data-tab="${t}"], [data-tab="${t}"]`)?.click(), tab);
  await wait(p, 800);
}
async function openModal(p, regex) {
  return await p.evaluate((r) => {
    const list = window.DUMMY_CLIENTS || [];
    const re = new RegExp(r, 'i');
    const t = list.find(c => re.test(c.name || '')) || list[0];
    if (t && window.FpApp?.openClientModal) { window.FpApp.openClientModal(t.id); return t.id; }
  }, regex);
}
async function reset(p) {
  await p.evaluate(() => {
    document.querySelector('.cd-close')?.click();
    document.getElementById('fp-quick-inperson-modal')?.remove();
    document.getElementById('fp-help-toast')?.remove();
    document.querySelectorAll('.ar-help-title, .ar-help-caption, .ar-help-spot, .ar-help-hint, .ar-help-arrow, .ar-help-ring').forEach(el => el.remove());
    window.arHelp && window.arHelp.zoomOut && window.arHelp.zoomOut();
    window.arHelp && window.arHelp.clear && window.arHelp.clear();
    window.scrollTo(0, 0);
  });
  await goTab(p, 'clients');
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
// ★ 中央ポップは オーナー fb「見づらい」 で 廃止 → screen label (上部小さいバッジ) に
async function showTitle(p, text, eyebrow) {
  // 互換 用 no-op (旧 chapter 呼出 で 落ちない よう)
  await wait(p, 50);
}
async function removeTitle(p) {
  await p.evaluate(() => document.querySelectorAll('.ar-help-title, .ar-help-screen').forEach(el => el.remove()));
}
async function showScreen(p, label) {
  await p.evaluate((l) => {
    document.querySelectorAll('.ar-help-screen').forEach(el => el.remove());
    const el = document.createElement('div');
    el.className = 'ar-help-screen';
    el.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99994;padding:8px 22px;background:rgba(14,14,12,0.9);color:#F2EDE3;border-left:3px solid #B8893B;border-radius:2px;font-family:"Noto Sans JP",sans-serif;font-weight:700;font-size:14px;letter-spacing:.06em;box-shadow:0 8px 20px rgba(0,0,0,.4);animation:ar-fadein-up .3s ease;';
    el.textContent = '▶ ' + l;
    document.body.appendChild(el);
  }, label);
}

// ★★ 核心 helper: 全体→hint長め→ゆっくりズーム→hold→引き
// オーナー fb「全体表示 から アップ フォーカス 当てる」 対応: 全体+hint を 長く
async function focusFlow(p, sel, label, opts = {}) {
  const holdMs = opts.holdMs ?? 2500;
  const scale = opts.scale ?? 1.5;
  const doClick = opts.click === true;
  // Step 1: 全体状態 (spot なし、 目 が 追いつくよう 1.2s)
  await wait(p, 1200);
  // Step 2: hint (soft spot) 目線誘導 (1.5s = 前 の 2倍)
  await hint(p, sel, label);
  await wait(p, 1500);
  // Step 3: ゆっくりズーム (transition 0.7s + wait 1.0s = 前 より 長い)
  await zoomIn(p, sel, label, scale);
  await wait(p, 1000);
  // Step 4: hold (説明時間)
  await wait(p, holdMs);
  // Step 5: click (optional)
  if (doClick) { await clickRing(p, sel, true); await wait(p, 500); }
  // Step 6: zoom out
  await zoomOut(p);
  await wait(p, 400);
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

  // ─── 01 ログイン (19.3s) — ログイン済み state なので caption/screen のみ ───
  { name: '01-login', segments: [
    { dur: 4.5, act: async (p) => {
      await goTab(p, 'home');
      await wait(p, 400);
      await showScreen(p, 'ログイン');
      await caption(p, 'まいにち 使いはじめる 最初 の 手順');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await caption(p, 'ブラウザ で アプリ の URL に アクセス');
    }},
    { dur: 6, act: async (p) => {
      await caption(p, 'メール アドレス と パスワード を 入力');
    }},
    { dur: 3.8, act: async (p) => {
      await goTab(p, 'home');
      await wait(p, 300);
      await caption(p, '「ログイン」 を 押す と ダッシュボード に');
    }},
  ]},

  // ─── 02 ダッシュボード (27.7s) ───
  { name: '02-dashboard', segments: [
    { dur: 3.5, act: async (p) => {
      await goTab(p, 'home');
      await wait(p, 400);
      await showScreen(p, 'ダッシュボード');
    }},
    { dur: 6, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '.today-meetings, .home-today, [class*="today"], main .home-content > *:first-child', '今日 の Zoom 予定 が 上 から 順 に', { holdMs: 2500, scale: 1.25 });
    }},
    { dur: 8, act: async (p) => {
      await focusFlow(p, '.kpi-cards, .home-kpi, [class*="kpi"], main .home-content > *:nth-child(2)', '<strong>今月 顧客 数 / 面談 数 / 売上 見込</strong> KPI カード', { holdMs: 3500, scale: 1.25 });
    }},
    { dur: 7, act: async (p) => {
      await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await wait(p, 700);
      await caption(p, '下 に <strong style="color:#C1462C;">新着 メッセージ + 期限 が 近い タスク</strong>');
    }},
    { dur: 3.2, act: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await wait(p, 500);
      await caption(p, '朝 一番 に 開く だけ で 今日 が 見える');
    }},
  ]},

  // ─── 03 顧客台帳 (24.4s) ───
  { name: '03-clients', segments: [
    { dur: 3, act: async (p) => {
      await goTab(p, 'home');
      await wait(p, 400);
      await showScreen(p, '顧客台帳');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '.tab[data-tab="clients"]', '左 メニュー 「顧客」 タブ を 押す', { holdMs: 2000, scale: 1.6, click: true });
    }},
    { dur: 4, act: async (p) => {
      await caption(p, '登録 された 全 顧客 が 一覧 で 表示');
    }},
    { dur: 6, act: async (p) => {
      await focusFlow(p, 'input[type=search], #client-search, .search-input, input[placeholder*="検索"]', '名前 / メール で しぼりこみ', { holdMs: 2500, scale: 1.4 });
    }},
    { dur: 3, act: async (p) => {
      await caption(p, 'ステータス タブ で アクティブ / 休眠 / 解約 も');
    }},
    { dur: 3.4, act: async (p) => {
      await focusFlow(p, '.client-row:nth-child(2), .client-card:nth-child(2), tr:nth-child(3)', 'タップ で 詳細 カルテ が 開く', { holdMs: 1500, scale: 1.3 });
    }},
  ]},

  // ─── 04 顧客カルテ 6タブ (34.4s) ───
  { name: '04-modal', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, '顧客カルテ 6 タブ 構造');
    }},
    { dur: 4, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await caption(p, 'お客様 を 選ぶ と 詳細 カルテ が 開く');
    }},
    { dur: 3.5, act: async (p) => {
      await focusFlow(p, '.cd-tabs, [class*="tabs"]:has([data-cdtab])', '上 に 6 つ の タブ', { holdMs: 1500, scale: 1.4 });
    }},
    { dur: 5.5, act: async (p) => {
      await focusFlow(p, '[data-cdtab="overview"]', '概要 (基本 情報 + アンケート 結果)', { holdMs: 2500, scale: 1.5, click: true });
    }},
    { dur: 4.5, act: async (p) => {
      await focusFlow(p, '[data-cdtab="line"]', 'LINE (やり取り 履歴)', { holdMs: 1800, scale: 1.5, click: true });
    }},
    { dur: 4.5, act: async (p) => {
      await focusFlow(p, '[data-cdtab="timeline"]', '人生 年表 (進学 / 退職)', { holdMs: 1800, scale: 1.5, click: true });
    }},
    { dur: 4, act: async (p) => {
      await focusFlow(p, '[data-cdtab="meetings"]', '面談録 (過去 の 議事録)', { holdMs: 1500, scale: 1.5, click: true });
    }},
    { dur: 5.4, act: async (p) => {
      await focusFlow(p, '[data-cdtab="qa"]', 'Q & A + 家族 タブ', { holdMs: 1500, scale: 1.5, click: true });
      await wait(p, 300);
      await focusFlow(p, '[data-cdtab="family"]', '家族', { holdMs: 1500, scale: 1.5, click: true });
    }},
  ]},

  // ─── 05 アンケート結果 (24.2s) ───
  { name: '05-survey', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, '事前 アンケート 13 問 の 結果');
    }},
    { dur: 6, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await p.evaluate(() => document.querySelector('[data-cdtab="overview"]')?.click());
      await wait(p, 500);
      await focusFlow(p, '[data-cdpanel="overview"] .survey, [data-cdpanel="overview"] [class*="survey"], [data-cdpanel="overview"]', '「概要」 タブ 下半分 に 表示', { holdMs: 2000, scale: 1.15 });
    }},
    { dur: 8, act: async (p) => {
      await p.evaluate(() => {
        const panel = document.querySelector('[data-cdpanel="overview"]');
        if (panel) panel.scrollBy({ top: 300, behavior: 'smooth' });
      });
      await caption(p, '<strong style="color:#C1462C;">13 問</strong>: 年代 / 職業 / 家族 / 年収 / 住居 / 資産 / 相談テーマ');
    }},
    { dur: 7.2, act: async (p) => {
      await p.evaluate(() => {
        const panel = document.querySelector('[data-cdpanel="overview"]');
        if (panel) panel.scrollBy({ top: 250, behavior: 'smooth' });
      });
      await caption(p, '面談 前 に 見る だけ で アイスブレイク が スムーズ');
    }},
  ]},

  // ─── 06 LINE 送信 (24.5s) ───
  { name: '06-line', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, 'LINE で 送信');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await focusFlow(p, '[data-cdtab="line"]', 'カルテ の 「LINE」 タブ を 開く', { holdMs: 1500, scale: 1.5, click: true });
    }},
    { dur: 3, act: async (p) => {
      await focusFlow(p, '#cd-line-history, .line-messages, [data-cdpanel="line"]', '過去 の やり取り が 上 に', { holdMs: 1500, scale: 1.15 });
    }},
    { dur: 6, act: async (p) => {
      await focusFlow(p, '#cd-line-input', '下 の 入力 欄 を タップ して 入力', { holdMs: 2000, scale: 1.5 });
      await p.fill('#cd-line-input', 'テスト').catch(() => {});
    }},
    { dur: 4.5, act: async (p) => {
      await focusFlow(p, '#cd-line-send', '右 の 送信 ボタン を 押す', { holdMs: 1800, scale: 1.7 });
    }},
    { dur: 3, act: async (p) => {
      await caption(p, '数 秒 で お客様 の LINE に 届く');
    }},
  ]},

  // ─── 07 録音→AI議事録 (主役 92.3s) ───
  { name: '07-recording', segments: [
    { dur: 4.5, act: async (p) => {
      await goTab(p, 'clients');
      await wait(p, 400);
      await showScreen(p, '録音 → AI 議事録');
      await caption(p, '面談 の 録音 と AI 議事録 の 使い方');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '#sidebar-quick-inperson', '左 サイドバー 「急遽 面談 スタート」 を 押す', { holdMs: 2000, scale: 1.7 });
    }},
    { dur: 6, act: async (p) => {
      await p.evaluate(() => document.getElementById('sidebar-quick-inperson')?.click());
      await wait(p, 1200);
      await focusFlow(p, '#fp-qi-client', '上 の リスト から お客様 を 選ぶ', { holdMs: 2200, scale: 1.5 });
      await p.evaluate(() => {
        const sel = document.getElementById('fp-qi-client');
        if (sel && sel.options.length > 2) { sel.selectedIndex = 2; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    }},
    { dur: 3.5, act: async (p) => {
      await focusFlow(p, '.fp-qi-modes, [class*="qi-modes"], .fp-qi-mode:first-child', '面談 スタイル <strong style="color:#C1462C;">3 つ</strong> から', { holdMs: 1500, scale: 1.2 });
    }},
    { dur: 3, act: async (p) => {
      await focusFlow(p, '.fp-qi-mode[data-mode="zoom"]', 'Zoom → 一番 上', { holdMs: 1200, scale: 1.4 });
    }},
    { dur: 2.5, act: async (p) => {
      await focusFlow(p, '.fp-qi-mode[data-mode="audio"]', '対面 → まん中', { holdMs: 1000, scale: 1.4 });
    }},
    { dur: 4.5, act: async (p) => {
      await focusFlow(p, '.fp-qi-mode[data-mode="memo"]', '電話 / 訪問先 メモ → 一番 下', { holdMs: 1800, scale: 1.4 });
    }},
    { dur: 4.5, act: async (p) => {
      await p.evaluate(() => {
        const z = document.querySelector('.fp-qi-mode[data-mode="zoom"]');
        const r = z?.querySelector('input[type=radio]'); if (r) r.checked = true;
      });
      await focusFlow(p, '#fp-qi-start, .fp-qi-start, button[type=submit]', '下 の 「開始」 を 押す', { holdMs: 1800, scale: 1.6 });
    }},
    { dur: 6, act: async (p) => {
      await p.evaluate(() => document.getElementById('fp-quick-inperson-modal')?.remove());
      await caption(p, 'Zoom URL は <strong>お客様 の LINE に 自動 送信</strong> → そのまま 面談');
    }},
    { dur: 6, act: async (p) => {
      await caption(p, '対面 は 初回 のみ マイク 使用 許可 → 面談 開始');
    }},
    { dur: 5, act: async (p) => {
      await caption(p, '面談 終了 → Zoom を 閉じる or 停止 ボタン');
    }},
    { dur: 6, act: async (p) => {
      await clearCaption(p);
      await p.evaluate(() => {
        const t = document.createElement('div');
        t.id = 'fp-help-toast';
        t.style.cssText = 'position:fixed;top:22px;right:22px;background:#0E0E0C;color:#F2EDE3;padding:16px 22px;border-radius:4px;border-left:3px solid #C1462C;box-shadow:0 12px 32px rgba(0,0,0,.4);z-index:99997;display:flex;align-items:center;gap:14px;font-family:"Noto Sans JP",sans-serif;';
        t.innerHTML = '<div style="width:20px;height:20px;border:2.5px solid #B8893B;border-top-color:transparent;border-radius:50%;animation:sp .8s linear infinite;"></div><div style="font-weight:700;font-size:14px;">議事録 生成中... (30秒〜1分)</div>';
        const st = document.createElement('style'); st.textContent = '@keyframes sp { to { transform: rotate(360deg); } }'; document.head.appendChild(st);
        document.body.appendChild(t);
      });
      await p.evaluate(() => window.arHelp.spot('#fp-help-toast', '右上 に 「議事録 生成中」 の 通知'));
    }},
    { dur: 5, act: async (p) => {
      await p.evaluate(() => document.getElementById('fp-help-toast')?.remove());
      await p.evaluate(() => window.arHelp.clearSpots());
      await goTab(p, 'clients');
      await wait(p, 400);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await caption(p, '完成 → 顧客 一覧 から 該当 お客様 を 開く');
    }},
    { dur: 5, act: async (p) => {
      await focusFlow(p, '[data-cdtab="meetings"]', '左 から 3 番目 「面談録」 を 押す', { holdMs: 2000, scale: 1.6, click: true });
    }},
    { dur: 5, act: async (p) => {
      await p.evaluate(() => {
        const card = document.querySelector('.fp-meeting-card');
        if (card) window.arHelp.spot(card, '一番 上 に 新しい 議事録 カード → タップ');
      });
      await wait(p, 3500);
    }},
    { dur: 6, act: async (p) => {
      await p.evaluate(() => window.arHelp.clearSpots());
      await p.evaluate(() => document.querySelector('.fp-meeting-card')?.click());
      await wait(p, 1000);
      await caption(p, '<strong>6 セクション</strong>: プロフィール / 課題 / 提案 / 数字 / 次回 / 合意');
      await p.evaluate(() => document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 200, behavior: 'smooth' }));
    }},
    { dur: 5, act: async (p) => {
      await caption(p, '+ FP タスク + 次回 面談 提案 (全部 まとめて)');
      await p.evaluate(() => document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 260, behavior: 'smooth' }));
    }},
    { dur: 4, act: async (p) => {
      await caption(p, 'タスク は チェック で 完了、 LINE 下書き 自動');
    }},
    { dur: 6.3, act: async (p) => {
      await focusFlow(p, '[data-cdtab="qa"]', 'Q & A タブ → AI 予測 質問', { holdMs: 2500, scale: 1.6, click: true });
    }},
  ]},

  // ─── 08 ライフイベント (23.8s) ───
  { name: '08-timeline', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, 'ライフ イベント');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await focusFlow(p, '[data-cdtab="timeline"]', 'カルテ の 「人生 年表」 タブ', { holdMs: 1500, scale: 1.5, click: true });
    }},
    { dur: 3, act: async (p) => {
      await caption(p, '過去 → 未来 が 時系列 で 並ぶ');
    }},
    { dur: 4.5, act: async (p) => {
      await caption(p, '進学 / 退職 / 結婚 / 出産 など');
    }},
    { dur: 5, act: async (p) => {
      await caption(p, '議事録 から <strong style="color:#C1462C;">AI が 自動抽出</strong> した イベント も');
    }},
    { dur: 3.3, act: async (p) => {
      await caption(p, '右上 「追加」 で 新規 登録');
    }},
  ]},

  // ─── 09 過去の面談録 (20.6s) ───
  { name: '09-meetings', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, '過去 の 面談録');
    }},
    { dur: 5, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await focusFlow(p, '[data-cdtab="meetings"]', 'カルテ の 「面談録」 タブ', { holdMs: 1500, scale: 1.5, click: true });
    }},
    { dur: 3, act: async (p) => {
      await focusFlow(p, '[data-cdpanel="meetings"]', '日付 順 に カード で', { holdMs: 1200, scale: 1.15 });
    }},
    { dur: 5, act: async (p) => {
      await focusFlow(p, '.fp-meeting-card', 'カード を タップ', { holdMs: 1500, scale: 1.3, click: true });
    }},
    { dur: 4.6, act: async (p) => {
      await caption(p, '<strong>議事録 全文 + タスク + 次回 提案</strong> が 全部 開く');
      await p.evaluate(() => document.querySelector('[data-cdpanel="meetings"]')?.scrollBy({ top: 250, behavior: 'smooth' }));
    }},
  ]},

  // ─── 10 次回 Zoom 提案 (28.3s) ───
  { name: '10-zoom', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, '次回 Zoom 提案');
    }},
    { dur: 6, act: async (p) => {
      await removeTitle(p);
      await openModal(p, '徳佐|Jobs');
      await wait(p, 1200);
      await focusFlow(p, '[data-cdtab="line"]', 'カルテ 「LINE」 タブ → 候補日 提案', { holdMs: 1800, scale: 1.5, click: true });
    }},
    { dur: 4.5, act: async (p) => {
      await caption(p, '提案 ボタン → 候補 を <strong style="color:#C1462C;">3 つ</strong> 選ぶ');
    }},
    { dur: 6.5, act: async (p) => {
      await caption(p, '例: 火 14 時 / 水 10 時 / 木 19 時');
    }},
    { dur: 3.5, act: async (p) => {
      await caption(p, '送信 → お客様 LINE に <strong>3 つ の 候補</strong> が 届く');
    }},
    { dur: 4.8, act: async (p) => {
      await caption(p, 'お客様 が 選ぶ → <strong>自動 確定 + Zoom URL + カレンダー登録</strong>');
    }},
  ]},

  // ─── 11 カレンダー連携 (22.0s) ───
  { name: '11-calendar', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, 'Google カレンダー 連携');
    }},
    { dur: 4, act: async (p) => {
      await removeTitle(p);
      await caption(p, '設定 画面 から 連携');
    }},
    { dur: 4, act: async (p) => {
      await caption(p, '初回 のみ Google アカウント で 認証');
    }},
    { dur: 6, act: async (p) => {
      await caption(p, '<strong style="color:#C1462C;">確定 した 予定 が 自動 で Google カレンダー に 同期</strong>');
    }},
    { dur: 5, act: async (p) => {
      await caption(p, 'カレンダー 側 の 変更 も 反映 → 二重 管理 不要');
    }},
  ]},

  // ─── 12 お客様 LINE 画面 (23.1s) ───
  { name: '12-liff', segments: [
    { dur: 3, act: async (p) => {
      await showScreen(p, 'お客様 LINE 画面 (LIFF)');
    }},
    { dur: 3.5, act: async (p) => {
      await removeTitle(p);
      await caption(p, 'LINE 内 で お客様 が 見る 画面 (リフ)');
    }},
    { dur: 4.5, act: async (p) => {
      await caption(p, 'LINE リッチ メニュー から 開く');
    }},
    { dur: 7.5, act: async (p) => {
      await caption(p, 'メニュー: 事前 アンケート / 議事録 確認 / 次回 予約 / 質問 投稿');
    }},
    { dur: 4.6, act: async (p) => {
      await caption(p, 'FP 側 は 設定 の <strong>プレビュー モード</strong> で 見え方 確認');
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
