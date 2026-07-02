// 荒島 admin ヘルプ動画 v3 — 全体→spot→zoom→hold→zoomOut の 5段階カメラワーク
// + 累積秒同期 (timeline drift 防止)
// + segments 細分化 (2-4秒/segに)
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/arashima-admin-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const SECRET = readFileSync('/Users/tsukasayoshida/.skeleton-arashima/.env', 'utf8').match(/ADMIN_SECRET=(\S+)/)[1];
const URL = `https://arashima-admin.web.app/?secret=${SECRET}`;

// mp3 実測時間 (ffprobe) + 少しバッファ
const AUDIO_DUR = {
  '01-overview': 37.5,
  '02-login': 37.1,
  '03-today': 37.2,
  '04-tasks': 38.5,
  '05-week-shift': 35.8,
  '06-month-shift': 38.6,
  '07-staff-editor': 41.5,
  '08-line-pairing': 66.2,
  '09-publish': 40.2,
  '10-auto-notify': 67.7,
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
  await p.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), tab);
  await wait(p, 800);
}
async function reset(p) {
  await p.evaluate(() => {
    if (document.querySelector('#opsModal')) document.querySelector('#opsModal').hidden = true;
    if (document.querySelector('#shiftPicker')) document.querySelector('#shiftPicker').hidden = true;
    document.querySelectorAll('.ar-help-title, .ar-help-caption, .ar-help-spot, .ar-help-hint, .ar-help-arrow, .ar-help-ring, #ar-help-urlbar, #ar-help-phone, #ar-help-flex, #ar-help-flow, #ar-help-reminder').forEach(el => el.remove());
    window.arHelp && window.arHelp.zoomOut && window.arHelp.zoomOut();
    window.arHelp && window.arHelp.clear && window.arHelp.clear();
    window.scrollTo(0, 0);
  });
  await goTab(p, 'today');
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

  // ─────────────── 01 概要 (37s) ───────────────
  { name: '01-overview', segments: [
    // "この どうが は、荒島 ホステル の うんえい かんり ツール、ぜんたい の つかいかた ガイド です。" (6s)
    { dur: 6.0, act: async (p, s) => {
      await goTab(p, 'today');
      await wait(p, 300);
      await showTitle(p, '運営 管理 ツール<br>使い方 ガイド', 'ARASHIMA HOSTEL · v1.0');
    }},
    // "できる こと は、大きく 4 つ あります。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await removeTitle(p);
      await caption(p, 'このツール で できる こと は <strong style="color:#C1462C;">4 つ</strong>');
    }},
    // "1つ目、お客様 が LINE から 予約 できる 仕組み。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await caption(p, '<span style="color:#B8893B;font-weight:700;">① お客様 の LINE 予約</span><br>LINE リッチメニュー → LIFF フォーム → 完了');
    }},
    // "2つ目、予約 が はいる と、その日 に 出勤 する スタッフ の LINE に、自動 で 通知。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await caption(p, '<span style="color:#B8893B;font-weight:700;">② 予約 発生 時 自動 通知</span><br>該当 日 出勤 スタッフ の LINE に Flex メッセージ');
    }},
    // "3つ目、シフト を、週 と 月 の 両方 で 一目 で 管理。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await caption(p, '<span style="color:#B8893B;font-weight:700;">③ シフト 管理</span><br>週ビュー と 月ビュー、 個別 / 一括 / キーボード 入力');
    }},
    // "4つ目、月次 シフト を 全員 の LINE に 一斉 配信 → Google カレンダー 一括 登録。" (7s)
    { dur: 7.0, act: async (p) => {
      await caption(p, '<span style="color:#B8893B;font-weight:700;">④ 月次 一斉 配信</span><br>LINE に Flex + Google カレンダー に 全件 一括 登録');
    }},
    // "順番 に ご案内 します。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clearCaption(p);
      await showTitle(p, 'では、 順番 に', 'START');
    }},
  ]},

  // ─────────────── 02 ログイン (37s) ───────────────
  { name: '02-login', segments: [
    // "まず、うんえい かんり がめん を ひらきます。" (4s)
    { dur: 4.0, act: async (p) => {
      await removeTitle(p);
      await goTab(p, 'today');
      await showTitle(p, 'STEP 1<br>ログイン', 'CHAPTER 1');
    }},
    // "ブラウザ の アドレスバー に、arashima-admin.web.app と 入力 して、" (5s)
    { dur: 5.0, act: async (p) => {
      await removeTitle(p);
      await p.evaluate(() => {
        const bar = document.createElement('div');
        bar.id = 'ar-help-urlbar';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#0E0E0C;color:#F2EDE3;padding:18px 32px;font-family:"Noto Sans JP",monospace;font-size:20px;z-index:99996;display:flex;align-items:center;gap:18px;border-bottom:3px solid #C1462C;box-shadow:0 8px 24px rgba(0,0,0,.5);';
        bar.innerHTML = '<span style="color:#B8893B;font-weight:700;letter-spacing:0.14em;font-size:12px;">URL</span><span style="font-family:monospace;font-weight:700;">https://arashima-admin.web.app/</span>';
        document.body.appendChild(bar);
      });
    }},
    // "アクセス してください。" (3s)
    { dur: 3.0, act: async (p) => {
      await caption(p, 'ブラウザ に URL を 入力 → Enter');
    }},
    // "しょかい だけ、パスワード の 入力 が ひつよう です。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '<strong>初回 のみ</strong> パスワード 入力');
    }},
    // "一度 入力 すれば、同じ ブラウザ では、次回 から 自動 ログイン。" (6s)
    { dur: 6.0, act: async (p) => {
      await caption(p, '2 回目 以降 は <strong style="color:#C1462C;">自動 ログイン</strong> (パスワード 不要)');
    }},
    // "ログイン すると、画面 の 上 に、タブ が 7 つ 並んでいます。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await p.evaluate(() => document.getElementById('ar-help-urlbar')?.remove());
      await clearCaption(p);
      await focusFlow(p, '.head__nav', '7 つ の タブ', { holdMs: 2500, scale: 1.5 });
    }},
    // "きょう、しゅうかん、こんご、ぜんよやく、こうてい、ゲスト、OTA、ログ の 7つ。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '今日 / 週間 / 今後 / 全予約 / 工程 / ゲスト / OTA / ログ');
    }},
    // "よく つかう の は、「きょう」 と 「こうてい」 の 2 つ です。" (3.6s)
    { dur: 3.6, act: async (p) => {
      await clearCaption(p);
      await hint(p, '[data-tab="today"]', '① 今日');
      await hint(p, '[data-tab="ops"]', '② 工程');
      await caption(p, 'よく 使う: <strong style="color:#C1462C;">「今日」</strong> と <strong style="color:#C1462C;">「工程」</strong>');
    }},
  ]},

  // ─────────────── 03 今日タブ (37s) ───────────────
  { name: '03-today', segments: [
    // "ログイン すると、まず 「きょう」 タブ が 開きます。" (4s)
    { dur: 4.0, act: async (p) => {
      await clearSpots(p);
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'today');
      await showTitle(p, '「今日」 タブ', 'CHAPTER 2');
    }},
    // "ここ には、3 つ の 情報 が まとめて 表示 されます。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await removeTitle(p);
      await caption(p, 'ここ に <strong>3 つ の 情報</strong> が まとめて 表示');
    }},
    // "1つ目、きょう チェックイン、アウト、とまって いる お客様 が カード で 一覧。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await focusFlow(p, 'section[data-pane="today"] .section-head', '① 予約 カード 一覧', { holdMs: 3500, scale: 1.35 });
    }},
    // "2つ目 は、きゃくしつ マップ。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await p.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
      await wait(p, 500);
      await caption(p, '② 客室 マップ');
    }},
    // "全 8 室 の 状態 が 色 で 一目 で わかります。" (5s)
    { dur: 5.0, act: async (p) => {
      await focusFlow(p, '.roommap, main', '全 8 室 の 状態', { holdMs: 1900, scale: 1.25 });
    }},
    // "空 いて いる 部屋 は 白、予約 が 入って いる 部屋 は 色 が 変わり、" (5.5s)
    { dur: 5.5, act: async (p) => {
      await caption(p, '<span style="color:#0E0E0C;background:#fff;padding:3px 10px;">白</span> = 空 / <span style="color:#fff;background:#C1462C;padding:3px 10px;">色付き</span> = 予約 あり');
    }},
    // "誰 が とまって いる か が ひとめ で わかります。" (4s)
    { dur: 4.0, act: async (p) => {
      await caption(p, '誰 が どの 部屋 に とまって いる か が 一目');
    }},
    // "朝 いちばん に、この 画面 を 開くだけ で、動き が すべて 把握 できます。" (4s)
    { dur: 4.0, act: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await caption(p, '朝 一番 に 開くだけ で 今日 の 動き 全 把握');
    }},
  ]},

  // ─────────────── 04 タスク (38s) ───────────────
  { name: '04-tasks', segments: [
    // "「こうてい」 タブ を 開くと、" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await showTitle(p, '本日 やること<br>(タスク 管理)', 'CHAPTER 3');
    }},
    // "一番 上 に 「本日 やること」 が 表示。" (4s)
    { dur: 4.0, act: async (p) => {
      await removeTitle(p);
      await goTab(p, 'ops');
      await wait(p, 500);
      await hint(p, '#opsTasks', '本日 やること');
    }},
    // "予約 が 入る と、その日 に 必要 な タスク、たとえば 受付 や、ベッドメイキング が、" (6.5s)
    { dur: 6.5, act: async (p) => {
      await clearSpots(p);
      await caption(p, '受付 / ベッドメイキング は <strong style="color:#C1462C;">予約 から 自動 生成</strong>');
    }},
    // "自動 で 生成 されます。" (2.5s)
    { dur: 2.5, act: async (p) => {
      await wait(p, 100);
    }},
    // "手動 で 追加 したい 場合 は、上 の 入力 欄 に、" (4.5s)
    { dur: 4.5, act: async (p) => {
      await clearCaption(p);
      await focusFlow(p, '#opsQuickInput', 'ここ に 入力', { holdMs: 1200, scale: 1.5 });
    }},
    // "「せんたく タオル 12 まい」 と 入力 して、" (4.5s)
    { dur: 4.5, act: async (p) => {
      await p.fill('#opsQuickInput', '洗濯 タオル 12 枚').catch(() => {});
      await caption(p, '例: 洗濯 タオル 12 枚');
    }},
    // "エンター キー を 押すだけ で 追加 されます。" (4s)
    { dur: 4.0, act: async (p) => {
      await clickRing(p, '#opsQuickAdd');
      await wait(p, 1500);
      await caption(p, 'Enter で 即 追加 (モーダル 不要)');
    }},
    // "追加 された タスク は、3 つ の 列 に 分かれて 表示。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await clearCaption(p);
      await focusFlow(p, '#opsTasks', '3 列 進捗 カンバン', { holdMs: 1900, scale: 1.15 });
    }},
    // "まだ 誰も、担当 あり、終わり の 3 つ です。" (4s)
    { dur: 4.0, act: async (p) => {
      await caption(p, '<strong>まだ 誰も</strong> / <strong>担当 あり</strong> / <strong>終わり</strong>');
    }},
  ]},

  // ─────────────── 05 週シフト (36s) ───────────────
  { name: '05-week-shift', segments: [
    // "次 は、シフト 表 の 週 ビュー です。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'ops');
      await wait(p, 300);
      await p.evaluate(() => document.querySelector('#shiftGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      await wait(p, 800);
      await showTitle(p, 'シフト 表<br>週 ビュー', 'CHAPTER 4');
    }},
    // "上 に、「週」 と 「月」 の タブ が あり、好きな 方 を 選べます。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '.shift-mode-tabs', '週 / 月 切替', { holdMs: 2400, scale: 1.8 });
    }},
    // "縦 に スタッフ、横 に 一週間 の 曜日 が 並んでいます。" (5s)
    { dur: 5.0, act: async (p) => {
      await focusFlow(p, '#shiftGrid', 'スタッフ × 曜日', { holdMs: 2000, scale: 1.1 });
    }},
    // "各 セル を タップ すると、5 つ の ボタン が 出てきます。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await hint(p, '.shift-cell[data-key]', 'セル を タップ');
      await wait(p, 800);
      await clickRing(p, '.shift-cell[data-key]');
      await wait(p, 1000);
      await caption(p, '5 ボタン ピッカー が 開く');
    }},
    // "9じ から 16じ の 朝番、15じ から 20じ の 夜番、9じ から 20じ の 通し番、休み、未定 の 5 つ。" (9s)
    { dur: 9.0, act: async (p) => {
      await clearCaption(p);
      await focusFlow(p, '#shiftPicker', '5 種類 の シフト', { holdMs: 6800, scale: 1.5 });
    }},
    // "選んで、下 の 「確定」 ボタン を 押す と 保存。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await pointAt(p, '#shiftPickerConfirm', '「確定」 で 保存', 3000);
    }},
    // "間違えたら、「取消」 で 元に 戻せます。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await pointAt(p, '#shiftPickerCancel', '「取消」 で 破棄', 2500);
      await p.evaluate(() => { const el = document.querySelector('#shiftPicker'); if (el) el.hidden = true; });
    }},
  ]},

  // ─────────────── 06 月シフト (39s) ───────────────
  { name: '06-month-shift', segments: [
    // "続いて、月 ビュー です。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'ops');
      await p.evaluate(() => document.querySelector('#shiftGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      await wait(p, 800);
      await showTitle(p, 'シフト 表<br>月 ビュー', 'CHAPTER 5');
    }},
    // "タブ で 「月」 を 選ぶと、1 ヶ 月 分 の カレンダー。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await removeTitle(p);
      await hint(p, '.shift-mode-btn[data-mode="month"]', '月 タブ');
      await wait(p, 700);
      await clickRing(p, '.shift-mode-btn[data-mode="month"]');
      await wait(p, 1200);
      await caption(p, '1 ヶ月 分 の カレンダー 全表示');
    }},
    // "各 日 に、出勤 する スタッフ の 色 チップ が 表示。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await clearCaption(p);
      const hasChip = await p.$('.mm-chip.shift-cell');
      if (hasChip) {
        await focusFlow(p, '.mm-chip.shift-cell', '色 チップ = 出勤 スタッフ', { holdMs: 2500, scale: 2.2 });
      } else {
        await wait(p, 5500);
      }
    }},
    // "「山 9-16」 とか、「田 15-20」 の ような 表示。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '例: <span style="background:#5A6B3F;color:#fff;padding:3px 8px;border-radius:2px;">山 9-16</span> <span style="background:#2A4A5E;color:#fff;padding:3px 8px;border-radius:2px;">田 15-20</span>');
    }},
    // "チップ を タップ すると、週 と 同じ 5 ボタン ピッカー が 開き、その 場 で 個別 編集。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await clearCaption(p);
      const hasChip = await p.$('.mm-chip.shift-cell');
      if (hasChip) {
        await clickRing(p, '.mm-chip.shift-cell');
        await wait(p, 1200);
        await focusFlow(p, '#shiftPicker', '週 と 同じ 5 ボタン', { holdMs: 2500, scale: 1.3 });
        await p.evaluate(() => { const el = document.querySelector('#shiftPicker'); if (el) el.hidden = true; });
      } else {
        await wait(p, 6500);
      }
    }},
    // "誰も シフト が 入って いない 日 に は、プラス マーク が 表示、全員 を 一括 編集。" (7s)
    { dur: 7.0, act: async (p) => {
      const hasAdd = await p.$('.mm-chip--add');
      if (hasAdd) {
        await focusFlow(p, '.mm-chip--add', '+ で 全員 一括', { holdMs: 3500, scale: 2.5 });
      } else {
        await wait(p, 7000);
      }
    }},
    // "予約 が 入って いる 日 に は、予約 件数 が バッジ で 表示。" (5.6s)
    { dur: 5.6, act: async (p) => {
      const hasResv = await p.$('.mm-cell__resv');
      if (hasResv) {
        await focusFlow(p, '.mm-cell__resv', '予約 件数 バッジ', { holdMs: 2200, scale: 2.5 });
      } else {
        await wait(p, 5600);
      }
      // 週に戻す
      await p.evaluate(() => document.querySelector('.shift-mode-btn[data-mode="week"]')?.click());
      await wait(p, 500);
    }},
  ]},

  // ─────────────── 07 スタッフ×月 (42s) ───────────────
  { name: '07-staff-editor', segments: [
    // "スタッフ 一人 分 の シフト を、まとめて 入力 したい 場合 は、" (5s)
    { dur: 5.0, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'ops');
      await wait(p, 300);
      await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await wait(p, 1000);
      await showTitle(p, 'スタッフ × 月<br>キーボード 入力', 'CHAPTER 6');
    }},
    // "スタッフ カード の 「シフト 入力」 ボタン。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '.staff-card__shift[data-sid="s1"]', '「シフト 入力」', { holdMs: 1500, scale: 1.5 });
    }},
    // "その 人 専用 の カレンダー が 開きます。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clickRing(p, '.staff-card__shift[data-sid="s1"]');
      await wait(p, 1500);
      await caption(p, 'その 人 専用 の カレンダー');
    }},
    // "使い方 は、2 通り あります。" (3s)
    { dur: 3.0, act: async (p) => {
      await caption(p, '入力 方法 は <strong style="color:#C1462C;">2 通り</strong>');
    }},
    // "1 つ 目 は、カレンダー の 日付 を 直接 タップ。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await caption(p, '<strong>① カレンダー 直接 タップ</strong>');
      await focusFlow(p, '#sseCal', '日付 を タップ', { holdMs: 1000, scale: 1.15 });
    }},
    // "2 つ 目 は、キーボード の 入力 欄 に、日付 を 打つ 方法。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '<strong>② キーボード 入力</strong>');
      await focusFlow(p, '#sseDateInput', 'ここ に 入力', { holdMs: 2000, scale: 1.4 });
    }},
    // "「7がつ 2か、5か、12か」 の ように 打って、" (5s)
    { dur: 5.0, act: async (p) => {
      await p.fill('#sseDateInput', '7/2 7/5 7/9 7/12').catch(() => {});
      await caption(p, '例: 7/2 7/5 7/9 7/12');
    }},
    // "エンター を 押す と、一気 に、複数 の 日 を 追加。" (5s)
    { dur: 5.0, act: async (p) => {
      await clickRing(p, '#sseAdd');
      await wait(p, 1500);
      await focusFlow(p, '#sseCal', '複数 日 が 一気 に 埋まる', { holdMs: 1200, scale: 1.15 });
    }},
    // "下 に、「N 日 変更 予定」 と 表示。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await pointAt(p, '#sseSummary', 'N 日 変更 予定', 2500);
    }},
    // "「保存 する」 を 押すと、まとめて 反映。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await pointAt(p, '#sseSave', '「保存 する」 で 一括 反映', 2500);
      await p.evaluate(() => { window.confirm = () => true; document.getElementById('sseCancel')?.click(); });
      await wait(p, 500);
      await p.evaluate(() => { const el = document.getElementById('opsModal'); if (el) el.hidden = true; });
    }},
  ]},

  // ─────────────── 08 LINE連携 (66s) ───────────────
  { name: '08-line-pairing', segments: [
    // "スタッフ を LINE と 連携 させる 方法。" (4s)
    { dur: 4.0, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'ops');
      await wait(p, 300);
      await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await wait(p, 800);
      await showTitle(p, 'スタッフ ↔ LINE<br>連携 方法', 'CHAPTER 7');
    }},
    // "これ を すると、スタッフ が、LINE で シフト の 確認、タスク の 完了 報告、" (6.5s)
    { dur: 6.5, act: async (p) => {
      await removeTitle(p);
      await caption(p, '連携 で できる こと (バイト 側 で):');
    }},
    // "明日 の 予定 の 通知、と いった こと が できる ように なります。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await caption(p, '① シフト 確認 &nbsp; ② タスク 完了 報告 &nbsp; ③ 前日 リマインド');
    }},
    // "まず、スタッフ カード の 「i」 マーク を タップ。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await clearCaption(p);
      await focusFlow(p, '.staff-card__info[data-sid="s1"]', '「i」 マーク', { holdMs: 1500, scale: 2.5 });
    }},
    // "情報 画面 が 開きます。" (3s)
    { dur: 3.0, act: async (p) => {
      await clickRing(p, '.staff-card__info[data-sid="s1"]');
      await wait(p, 1500);
      await caption(p, '情報 画面 が 開きます');
    }},
    // "下 の 方 に、「LINE 連携」 と いう 項目。" (4s)
    { dur: 4.0, act: async (p) => {
      await clearCaption(p);
      const hasArea = await p.$('#sfLineArea');
      if (hasArea) await pointAt(p, '#sfLineArea', '「LINE 連携」 項目', 3000);
      else await wait(p, 4000);
    }},
    // "「コード 発行」 を 押すと、" (3s)
    { dur: 3.0, act: async (p) => {
      const hasPair = await p.$('#sfPairBtn');
      if (hasPair) {
        await hint(p, '#sfPairBtn', '「コード 発行」');
        await clickRing(p, '#sfPairBtn');
        await wait(p, 1500);
      }
    }},
    // "6 桁 の 数字 が 表示。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await p.evaluate(() => {
        const area = document.getElementById('sfLineArea');
        if (area) area.innerHTML = `
          <div class="ar-help-fake-code" style="text-align:center;padding:22px;border:1px dashed #B8893B;border-radius:4px;background:#FBF8F2;">
            <div style="font-size:11px;letter-spacing:0.18em;color:#6B6356;text-transform:uppercase;">連携 コード (10 分 有効)</div>
            <div style="font-family:Inter,monospace;font-size:42px;font-weight:700;letter-spacing:0.16em;color:#0E0E0C;margin:12px 0;">483 291</div>
            <div style="font-size:12px;color:#6B6356;">山田 花 さん の LINE から<br>この 6 桁 を 送ってもらう</div>
          </div>`;
      });
      await wait(p, 800);
      await focusFlow(p, '.ar-help-fake-code', '6 桁 コード が 表示', { holdMs: 500, scale: 1.4 });
    }},
    // "この コード を、スタッフ 本人 に、口頭 で 伝えます。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '6 桁 を <strong>バイト 本人 に 口頭 で</strong> 伝える');
    }},
    // "バイト は、荒島 公式 LINE を 友達 追加 → 6 桁 の 数字 を LINE で 送信。" (7s)
    { dur: 7.0, act: async (p) => {
      await clearCaption(p);
      await p.evaluate(() => {
        document.getElementById('opsModal').hidden = true;
        const phone = document.createElement('div');
        phone.id = 'ar-help-phone';
        phone.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);width:340px;height:600px;background:#fff;border:8px solid #333;border-radius:36px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;display:flex;flex-direction:column;';
        phone.innerHTML = `
          <div style="background:#06C755;color:#fff;padding:14px 18px;font-weight:700;font-family:'Noto Sans JP',sans-serif;">
            荒島 ホステル 公式
          </div>
          <div id="ar-phone-body" style="padding:16px;flex:1;background:#F0F2F5;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;"></div>
        `;
        document.body.appendChild(phone);
      });
      await wait(p, 1200);
      await p.evaluate(() => {
        const body = document.getElementById('ar-phone-body');
        if (body) {
          const bubble = document.createElement('div');
          bubble.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:14px 18px;border-radius:16px 16px 4px 16px;max-width:70%;font-family:"Noto Sans JP",sans-serif;font-size:20px;font-weight:700;letter-spacing:0.1em;';
          bubble.textContent = '483291';
          body.appendChild(bubble);
        }
      });
      await caption(p, 'バイト が 6 桁 を LINE に 送信');
    }},
    // "これ だけ で、連携 完了。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await p.evaluate(() => {
        const body = document.getElementById('ar-phone-body');
        if (body) {
          const bubble = document.createElement('div');
          bubble.style = 'align-self:flex-start;background:#fff;color:#000;padding:12px 16px;border-radius:16px 16px 16px 4px;max-width:78%;font-family:"Noto Sans JP",sans-serif;font-size:13px;line-height:1.7;';
          bubble.innerHTML = '山田 花 さん、 荒島 ホテル の LINE 連携 が できました。';
          body.appendChild(bubble);
        }
      });
      await clearCaption(p);
      await caption(p, '✓ 連携 完了');
    }},
    // "連携 された カード に は、緑 の 「LINE」 バッジ。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '管理画面 の スタッフ カード に <span style="background:#06C755;color:#fff;padding:2px 8px;border-radius:2px;font-size:11px;font-weight:700;">LINE</span> バッジ');
    }},
    // "連携 後、「シフト」 と 送ると、今週 の シフト が 返る。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await clearCaption(p);
      await p.evaluate(() => {
        const body = document.getElementById('ar-phone-body');
        if (body) {
          body.innerHTML = '';
          const b1 = document.createElement('div');
          b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:60%;font-family:"Noto Sans JP",sans-serif;font-size:14px;';
          b1.textContent = 'シフト';
          body.appendChild(b1);
          const b2 = document.createElement('div');
          b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:78%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.9;';
          b2.innerHTML = '<b>THIS WEEK</b><br>7/2 (木) 9-16<br>7/5 (日) 9-16<br>7/9 (木) 9-16';
          body.appendChild(b2);
        }
      });
      await caption(p, 'コマンド 例 <span style="color:#B8893B;">①</span> シフト → 今週 の 予定');
    }},
    // "「明日 9じ から 16じ」 と 送ると、自分 で 登録 できる。" (5s)
    { dur: 5.0, act: async (p) => {
      await p.evaluate(() => {
        const body = document.getElementById('ar-phone-body');
        if (body) {
          body.innerHTML = '';
          const b1 = document.createElement('div');
          b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:70%;font-family:"Noto Sans JP",sans-serif;font-size:14px;';
          b1.textContent = '明日 9-16';
          body.appendChild(b1);
          const b2 = document.createElement('div');
          b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:80%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.7;';
          b2.innerHTML = '山田 花 さん、 明日 を 「9-16」 で 登録 しました。';
          body.appendChild(b2);
        }
      });
      await caption(p, 'コマンド 例 <span style="color:#B8893B;">②</span> 明日 9-16 → シフト 追加');
    }},
    // "「タスク」 と 送ると、今日 の 担当 タスク が 一覧。" (4.5s)
    { dur: 4.5, act: async (p) => {
      await p.evaluate(() => {
        const body = document.getElementById('ar-phone-body');
        if (body) {
          body.innerHTML = '';
          const b1 = document.createElement('div');
          b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:60%;font-family:"Noto Sans JP",sans-serif;font-size:14px;';
          b1.textContent = 'タスク';
          body.appendChild(b1);
          const b2 = document.createElement('div');
          b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:80%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.9;';
          b2.innerHTML = '<b>TODAY</b><br>1. 201 号 受付<br>2. 202 号 ベッド<br>3. 洗濯 タオル 12 枚';
          body.appendChild(b2);
        }
      });
      await caption(p, 'コマンド 例 <span style="color:#B8893B;">③</span> タスク → 今日 の 担当');
      await wait(p, 2000);
      await p.evaluate(() => document.getElementById('ar-help-phone')?.remove());
      await clearCaption(p);
    }},
  ]},

  // ─────────────── 09 一斉配信 (40s) ───────────────
  { name: '09-publish', segments: [
    // "1 ヶ 月 分 の シフト を、全員 に 一斉 配信。" (4s)
    { dur: 4.0, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await goTab(p, 'ops');
      await wait(p, 300);
      await p.evaluate(() => document.querySelector('#shiftGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      await wait(p, 800);
      await showTitle(p, '月次 シフト<br>一斉 配信', 'CHAPTER 8');
    }},
    // "上 の 「こんげつ ぶん 全員 に 配信」 ボタン を 押します。" (5.5s)
    { dur: 5.5, act: async (p) => {
      await removeTitle(p);
      await focusFlow(p, '#shiftPublish', '「今月分 全員 に 配信」', { holdMs: 1500, scale: 1.7 });
    }},
    // "モーダル が 開き、LINE 連携 済み の スタッフ が 一覧。" (6s)
    { dur: 6.0, act: async (p) => {
      await clickRing(p, '#shiftPublish');
      await wait(p, 1500);
      await focusFlow(p, '#publishList', '連携 済み スタッフ 一覧', { holdMs: 2500, scale: 1.25 });
    }},
    // "その 人 の、今月 の シフト 件数 も、一緒 に 表示。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '対象 選択 + 今月 の シフト 件数');
    }},
    // "「配信 する」 ボタン を 押します。" (3.5s)
    { dur: 3.5, act: async (p) => {
      await clearCaption(p);
      const hasBtn = await p.$('#pubSend');
      if (hasBtn) await pointAt(p, '#pubSend', '「配信 する」', 2500);
    }},
    // "各 スタッフ の LINE に、その 月 の シフト 一覧 + 「Google カレンダー に 追加」 ボタン が 届く。" (8.5s)
    { dur: 8.5, act: async (p) => {
      await p.evaluate(() => {
        document.getElementById('opsModal').hidden = true;
        const phone = document.createElement('div');
        phone.id = 'ar-help-flex';
        phone.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);width:340px;background:#fff;border:8px solid #333;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;';
        phone.innerHTML = `
          <div style="background:#0E0E0C;color:#F2EDE3;padding:16px 18px;">
            <div style="font-size:10px;color:#B8893B;letter-spacing:0.18em;font-weight:700;">SHIFT FIXED</div>
            <div style="font-size:20px;font-weight:700;margin-top:6px;font-family:'Noto Sans JP',sans-serif;">2026年 7月</div>
            <div style="font-size:11px;color:#B8893B;margin-top:4px;">山田 花 さん / 12 件 の シフト</div>
          </div>
          <div style="padding:14px 16px;font-family:'Noto Sans JP',sans-serif;font-size:12px;">
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;"><span style="color:#4A4238;">7/2 (木)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;"><span style="color:#4A4238;">7/5 (日)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;"><span style="color:#4A4238;">7/9 (木)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;"><span style="color:#4A4238;">7/12 (日)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
            <div style="text-align:center;color:#888;font-size:11px;padding:8px 0;">他 8 件</div>
          </div>
          <div style="padding:14px 16px 18px;background:#F0EBE0;">
            <div id="ar-flex-gbtn" style="background:#4285F4;color:#fff;text-align:center;padding:12px;border-radius:4px;font-weight:700;font-family:'Noto Sans JP',sans-serif;font-size:14px;">Google カレンダー に 追加</div>
          </div>`;
        document.body.appendChild(phone);
      });
      await wait(p, 1500);
      await pointAt(p, '#ar-help-flex', 'バイト の LINE に Flex メッセージ', 5000);
    }},
    // "この ボタン を 押すと、その 月 の 10 件、20 件 が、一気 に、Google カレンダー に 登録。" (7.5s)
    { dur: 7.5, act: async (p) => {
      await pointAt(p, '#ar-flex-gbtn', '1 タップ で 全 件 登録', 5500);
      await p.evaluate(() => document.getElementById('ar-help-flex')?.remove());
      await clearCaption(p);
    }},
  ]},

  // ─────────────── 10 自動通知 (68s) ───────────────
  { name: '10-auto-notify', segments: [
    // "最後 に、予約 が 入った とき の、自動 通知 の 仕組み。" (5s)
    { dur: 5.0, act: async (p) => {
      await clearCaption(p);
      await removeTitle(p);
      await showTitle(p, '予約 発生 時<br>自動 通知', 'CHAPTER 9');
    }},
    // "お客様 が LINE の リッチ メニュー から 予約 → その 瞬間 に、" (6s)
    { dur: 6.0, act: async (p) => {
      await removeTitle(p);
      await p.evaluate(() => {
        const box = document.createElement('div');
        box.id = 'ar-help-flow';
        box.style.cssText = 'position:fixed;top:6%;left:50%;transform:translateX(-50%);width:960px;background:#F2EDE3;border:2px solid #0E0E0C;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;padding:36px 40px;font-family:"Noto Sans JP",sans-serif;';
        box.innerHTML = `
          <div style="text-align:center;color:#B8893B;font-size:12px;letter-spacing:0.24em;font-weight:700;">AUTO NOTIFY FLOW</div>
          <div style="text-align:center;font-size:24px;font-weight:700;color:#0E0E0C;margin:10px 0 32px;">予約 が 入った 瞬間 の 自動 通知</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:16px;align-items:center;">
            <div id="ar-flow-1" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #C1462C;border-radius:6px;transition:transform .4s, box-shadow .3s;transform:scale(1.06);box-shadow:0 8px 24px rgba(193,70,44,.35);">
              <div style="font-size:36px;">👤</div>
              <div style="font-size:14px;font-weight:700;margin-top:8px;">お客様</div>
              <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">LINE リッチ<br>メニュー<br>から 予約</div>
            </div>
            <div id="ar-flow-arr1" style="font-size:32px;color:#C1462C;opacity:0.3;transition:opacity .4s;">→</div>
            <div id="ar-flow-2" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #2A4A5E;border-radius:6px;opacity:0.3;transition:opacity .4s, transform .3s;">
              <div style="font-size:36px;">☁️</div>
              <div style="font-size:14px;font-weight:700;margin-top:8px;">Cloud Function</div>
              <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">シフト表 から<br>担当 を<br>特定</div>
            </div>
            <div id="ar-flow-arr2" style="font-size:32px;color:#C1462C;opacity:0.3;transition:opacity .4s;">→</div>
            <div id="ar-flow-3" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #5A6B3F;border-radius:6px;opacity:0.3;transition:opacity .4s, transform .3s;">
              <div style="font-size:36px;">📱</div>
              <div style="font-size:14px;font-weight:700;margin-top:8px;">担当 バイト</div>
              <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">LINE に<br>Flex メッセージ</div>
            </div>
          </div>
          <div id="ar-flow-detail" style="margin-top:26px;padding:18px;background:#fff;border-left:4px solid #B8893B;font-size:14px;color:#0E0E0C;line-height:1.9;min-height:70px;">
            お客様 が LINE で 予約
          </div>
        `;
        document.body.appendChild(box);
      });
    }},
    // "サーバー の クラウドファンクション が 起動 → シフト表 を 確認。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await p.evaluate(() => {
        ['ar-flow-arr1', 'ar-flow-2'].forEach(id => { const el = document.getElementById(id); if (el) el.style.opacity = '1'; });
        const el2 = document.getElementById('ar-flow-2');
        if (el2) { el2.style.transform = 'scale(1.06)'; el2.style.boxShadow = '0 8px 24px rgba(42,74,94,.35)'; }
        const el1 = document.getElementById('ar-flow-1');
        if (el1) { el1.style.transform = 'scale(1)'; el1.style.boxShadow = ''; }
        const detail = document.getElementById('ar-flow-detail');
        if (detail) detail.innerHTML = 'サーバー の <strong>クラウド ファンクション</strong> が 起動 → シフト表 から 担当 を 特定';
      });
    }},
    // "特定 された スタッフ の LINE に、自動 で フレックス メッセージ が 届きます。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await p.evaluate(() => {
        ['ar-flow-arr2', 'ar-flow-3'].forEach(id => { const el = document.getElementById(id); if (el) el.style.opacity = '1'; });
        const el3 = document.getElementById('ar-flow-3');
        if (el3) { el3.style.transform = 'scale(1.06)'; el3.style.boxShadow = '0 8px 24px rgba(90,107,63,.35)'; }
        const el2 = document.getElementById('ar-flow-2');
        if (el2) { el2.style.transform = 'scale(1)'; el2.style.boxShadow = ''; }
        const detail = document.getElementById('ar-flow-detail');
        if (detail) detail.innerHTML = '担当 バイト の LINE に、 <strong>Flex メッセージ</strong> を 自動 送信';
      });
    }},
    // "お客様 の 名前、部屋 番号、IN と OUT の 日付、泊数、人数 が、まとめて 表示。" (7s)
    { dur: 7.0, act: async (p) => {
      await p.evaluate(() => {
        const detail = document.getElementById('ar-flow-detail');
        if (detail) detail.innerHTML = 'Flex 内容: <strong>お客様 名 / 部屋 番号 / IN・OUT 日付 / 泊数 / 人数</strong>';
      });
    }},
    // "受付 担当、ベッドメイキング 担当、と いう ラベル も 自動 で 付きます。" (6s)
    { dur: 6.0, act: async (p) => {
      await p.evaluate(() => {
        const detail = document.getElementById('ar-flow-detail');
        if (detail) detail.innerHTML = 'ラベル: <span style="background:#C1462C;color:#fff;padding:3px 10px;border-radius:2px;font-size:12px;">受付 担当</span> &nbsp; <span style="background:#5A6B3F;color:#fff;padding:3px 10px;border-radius:2px;font-size:12px;">ベッドメイキング 担当</span>';
      });
    }},
    // "さらに、前日 の 夜 8 時 には、明日 出勤 の スタッフ に、" (5.5s)
    { dur: 5.5, act: async (p) => {
      await p.evaluate(() => {
        document.getElementById('ar-help-flow')?.remove();
        const box = document.createElement('div');
        box.id = 'ar-help-reminder';
        box.style.cssText = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);width:860px;background:#F2EDE3;border:2px solid #0E0E0C;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;padding:32px;font-family:"Noto Sans JP",sans-serif;';
        box.innerHTML = `
          <div style="text-align:center;color:#B8893B;font-size:12px;letter-spacing:0.24em;font-weight:700;">PRE-DAY REMINDER</div>
          <div style="text-align:center;font-size:22px;font-weight:700;color:#0E0E0C;margin:10px 0 24px;">前日 20 時 に 自動 リマインド</div>
          <div style="display:flex;justify-content:center;gap:24px;align-items:center;">
            <div style="text-align:center;padding:18px 20px;background:#5A6B3F;color:#F2EDE3;border-radius:6px;min-width:200px;">
              <div style="font-size:10px;letter-spacing:0.18em;">TOMORROW</div>
              <div style="font-size:16px;font-weight:700;margin-top:6px;">山田 花 さん</div>
            </div>
            <div style="color:#C1462C;font-size:26px;">→</div>
            <div style="padding:18px 22px;background:#fff;border:2px solid #C1462C;border-radius:6px;font-size:14px;line-height:1.8;">
              <div style="font-weight:700;color:#0E0E0C;">明日 9-16 で 出勤 です</div>
              <div style="color:#6B6356;font-size:12px;margin-top:6px;">担当 タスク: 3 件</div>
            </div>
          </div>
        `;
        document.body.appendChild(box);
      });
    }},
    // "「明日 9じ から 16じ で 出勤 です。担当 タスク 3 件」 と いった、リマインダー が 届く。" (8s)
    { dur: 8.0, act: async (p) => {
      // すでに表示済み、ホールド
      await wait(p, 100);
    }},
    // "連絡 忘れ、出勤 忘れ が、完全 に なくなる。" (5s)
    { dur: 5.0, act: async (p) => {
      await caption(p, '<strong style="color:#C1462C;">連絡 忘れ・出勤 忘れ を 完全 に 防ぐ</strong>');
    }},
    // "全 スタッフ 一斉 か、担当者 だけ か を、チェック で 切替 できます。" (6.5s)
    { dur: 6.5, act: async (p) => {
      await caption(p, '通知 モード は 管理画面 の チェック で 切替 可能');
    }},
    // "これ が、荒島 うんえい かんり ツール の、ぜんたい像 です。" (5s)
    { dur: 5.0, act: async (p) => {
      await p.evaluate(() => document.getElementById('ar-help-reminder')?.remove());
      await clearCaption(p);
      await showTitle(p, '以上、 全体像 でした', 'END');
    }},
  ]},
];

// ─── main ───
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PE:', e.message.slice(0, 80)));

console.log('🔑 admin login...');
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
await p.waitForSelector('[data-tab="ops"]', { timeout: 15000 });
await p.waitForTimeout(2000);
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
