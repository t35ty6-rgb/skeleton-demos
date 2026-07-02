// 荒島 admin 使い方ガイド v2 — ナレーション segment 秒同期
// 各章のセリフを短い segment に分解、各 segment の時間内で画面操作/エフェクトを実行
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/arashima-admin-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const SECRET = readFileSync('/Users/tsukasayoshida/.skeleton-arashima/.env', 'utf8').match(/ADMIN_SECRET=(\S+)/)[1];
const URL = `https://arashima-admin.web.app/?secret=${SECRET}`;

// 各章の mp3 実測時間 (ffprobe 結果 + 0.4秒 バッファ)
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

// ========== helper (CSS) ==========
const HIGHLIGHT_CSS = `
body { transition: transform 0.55s cubic-bezier(.4,0,.2,1); }
html.ar-help-zooming, html.ar-help-zooming body { overflow: hidden !important; }
.ar-help-spot {
  position: absolute !important; border: 4px solid #C1462C !important; border-radius: 8px !important;
  box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: ar-help-pulse 1.1s ease-in-out infinite;
}
.ar-help-arrow {
  position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #0E0E0C; color: #F2EDE3; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 15px; padding: 9px 16px; border-radius: 3px;
  box-shadow: 0 6px 20px rgba(0,0,0,.35); white-space: nowrap;
  border-left: 3px solid #C1462C;
  animation: ar-help-fadein .3s ease;
}
#ar-help-cursor {
  position: absolute; pointer-events: none; z-index: 99997;
  transition: left .5s cubic-bezier(.4,0,.2,1), top .5s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4));
}
.ar-help-ring {
  position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #C1462C; border-radius: 50%;
  animation: ar-help-ring 0.6s cubic-bezier(.2,.8,.4,1) forwards;
}
@keyframes ar-help-pulse {
  0%,100% { box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5); }
  50%     { box-shadow: 0 0 0 14px rgba(193,70,44,0.14), 0 0 55px rgba(193,70,44,0.95), 0 0 120px rgba(193,70,44,0.4); }
}
@keyframes ar-help-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes ar-help-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.6);  opacity: 0; }
}
/* 大見出しオーバーレイ (章冒頭 or 概念説明) */
.ar-help-title {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 99995; padding: 32px 48px;
  background: rgba(14,14,12,0.92); color: #F2EDE3;
  border-left: 4px solid #C1462C;
  border-radius: 3px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 34px; letter-spacing: 0.02em;
  box-shadow: 0 30px 80px rgba(0,0,0,.5);
  animation: ar-help-fadein .35s ease;
  min-width: 400px; text-align: center; line-height: 1.5;
}
.ar-help-title small {
  display: block; font-size: 13px; color: #B8893B;
  letter-spacing: 0.24em; font-weight: 700;
  margin-bottom: 12px;
}
/* 説明ラベル (画面下部) */
.ar-help-caption {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 99993; padding: 12px 24px;
  background: rgba(14,14,12,0.90); color: #F2EDE3;
  border-left: 3px solid #B8893B;
  border-radius: 3px;
  font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 500; font-size: 15px; letter-spacing: 0.03em;
  box-shadow: 0 12px 32px rgba(0,0,0,.4);
  animation: ar-help-caption-in .3s ease;
  max-width: 900px; line-height: 1.7;
}
@keyframes ar-help-caption-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
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
    window.arHelp.spot = (sel, label) => {
      const t = window.arHelp.getTarget(sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = 'ar-help-spot';
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
        arr.style.left = (r.right + 20 + window.scrollX) + 'px';
        arr.style.top  = (r.top + r.height / 2 - 18 + window.scrollY) + 'px';
        // 右端超えなら 左に配置
        if (r.right + 250 > window.innerWidth) {
          arr.style.left = (r.left - 250 + window.scrollX) + 'px';
        }
        document.body.appendChild(arr);
      }
      window.arHelp.moveCursor(t);
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
      setTimeout(() => window.arHelp.spot(t, label), 500);
    };
    window.arHelp.zoomOut = () => {
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
      document.querySelectorAll('.ar-help-spot, .ar-help-arrow, .ar-help-ring, .ar-help-caption').forEach(el => el.remove());
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
async function goTab(p, tab) {
  await p.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), tab);
  await wait(p, 900);
}
async function reset(p) {
  await p.evaluate(() => {
    if (document.querySelector('#opsModal')) document.querySelector('#opsModal').hidden = true;
    if (document.querySelector('#shiftPicker')) document.querySelector('#shiftPicker').hidden = true;
    document.querySelectorAll('.ar-help-title, .ar-help-caption, .ar-help-spot, .ar-help-arrow, .ar-help-ring, #ar-help-urlbar, #ar-help-phone, #ar-help-flex, #ar-help-flow, #ar-help-reminder').forEach(el => el.remove());
    window.arHelp && window.arHelp.zoomOut && window.arHelp.zoomOut();
    window.arHelp && window.arHelp.clear && window.arHelp.clear();
    window.scrollTo(0, 0);
  });
  await goTab(p, 'today');
  await wait(p, 700);
}
async function caption(p, text) {
  await p.evaluate((t) => window.arHelp.caption(t), text);
}
async function clearCaption(p) {
  await p.evaluate(() => document.querySelectorAll('.ar-help-caption').forEach(el => el.remove()));
}
async function spot(p, sel, label) {
  await p.evaluate(({ s, l }) => { window.arHelp.clear(); window.arHelp.spot(s, l); }, { s: sel, l: label || '' });
}
async function zoomIn(p, sel, label, scale = 1.5) {
  await p.evaluate(({ s, l, sc }) => window.arHelp.zoom(s, l, { scale: sc }), { s: sel, l: label || '', sc: scale });
}
async function zoomOut(p) {
  await p.evaluate(() => { window.arHelp.zoomOut(); window.arHelp.clear(); });
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
async function removeTitle(p) {
  await p.evaluate(() => document.querySelectorAll('.ar-help-title').forEach(el => el.remove()));
}

// ========== 各章シナリオ (segment 単位で秒同期) ==========
// segment.dur: ナレーションのその文の秒 (合計が AUDIO_DUR に近づくよう配分)
// segment.action: その時間内に実行するアクション

const chapters = [
  // ─────────────────────────────────────
  { name: '01-overview', fn: async (p) => {
    // T: 37.5 s
    await goTab(p, 'today');
    await wait(p, 500);

    // seg1 (4s): "この どうが は、荒島 ホステル の うんえい かんり ツール、ぜんたい の つかいかた ガイド です。"
    await showTitle(p, '運営 管理 ツール<br>使い方 ガイド', 'ARASHIMA HOSTEL');
    await wait(p, 4000);
    await removeTitle(p);

    // seg2 (3.5s): "できる こと は、大きく 4 つ あります。"
    await caption(p, 'このツール で できる こと は、 4 つ');
    await wait(p, 3500);

    // seg3 (6s): "1つ目、お客様 が LINE から 予約 できる 仕組み。"
    await caption(p, '<span style="color:#B8893B;">1つ目</span> — お客様 が LINE で 予約');
    await wait(p, 6000);

    // seg4 (7s): "2つ目、予約 が はいる と、その日 に 出勤 する スタッフ の LINE に、自動 で 通知。"
    await caption(p, '<span style="color:#B8893B;">2つ目</span> — 予約 が 入る と、 該当日 出勤 スタッフ に 自動 通知');
    await wait(p, 7000);

    // seg5 (7s): "3つ目、シフト を、週 と 月 の 両方 で 一目 で 管理。"
    await caption(p, '<span style="color:#B8893B;">3つ目</span> — バイト の シフト を 週 と 月 で 一目 管理');
    await wait(p, 7000);

    // seg6 (7s): "4つ目、月次 シフト を 全員 の LINE に 一斉 配信 → Google カレンダー 一括 登録。"
    await caption(p, '<span style="color:#B8893B;">4つ目</span> — 月次 シフト を LINE で 一斉 配信 + Google カレンダー 一括 登録');
    await wait(p, 7000);

    // seg7 (3s): "順番 に ご案内 します。"
    await clearCaption(p);
    await wait(p, 3000);
  }},

  // ─────────────────────────────────────
  { name: '02-login', fn: async (p) => {
    // T: 37.1 s
    // seg1 (3s): "まず、うんえい かんり がめん を ひらきます。"
    await showTitle(p, 'ステップ 1<br>ログイン', 'STEP 1');
    await wait(p, 3000);
    await removeTitle(p);

    // seg2 (5s): "ブラウザ の アドレスバー に、arashima-admin.web.app と 入力 して、アクセス してください。"
    await p.evaluate(() => {
      const bar = document.createElement('div');
      bar.id = 'ar-help-urlbar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#0E0E0C;color:#F2EDE3;padding:16px 32px;font-family:"Noto Sans JP",monospace;font-size:18px;z-index:99996;display:flex;align-items:center;gap:16px;border-bottom:2px solid #C1462C;box-shadow:0 4px 16px rgba(0,0,0,.4);';
      bar.innerHTML = '<span style="color:#B8893B;font-weight:700;letter-spacing:0.14em;font-size:12px;">URL</span><span style="font-family:monospace;font-weight:600;">https://arashima-admin.web.app/</span>';
      document.body.appendChild(bar);
    });
    await caption(p, 'ブラウザ に URL を 入力');
    await wait(p, 5000);

    // seg3 (5s): "しょかい だけ、パスワード の 入力 が ひつよう です。"
    await caption(p, '初回 のみ パスワード 入力 が 必要');
    await wait(p, 5000);

    // seg4 (5s): "一度 入力 すれば、同じ ブラウザ では、次回 から 自動 ログイン。"
    await caption(p, '2回目 以降 は 自動 ログイン (パスワード 不要)');
    await wait(p, 5000);
    await p.evaluate(() => document.getElementById('ar-help-urlbar')?.remove());

    // seg5 (5s): "ログイン すると、画面 の 上 に、タブ が 7 つ 並んでいます。"
    await zoomIn(p, '.head__nav', '7 つ の タブ', 1.4);
    await wait(p, 5000);

    // seg6 (7s): "きょう、しゅうかん、こんご、ぜんよやく、こうてい、ゲスト、OTA、ログ の 7つ です。"
    await wait(p, 7000);
    await zoomOut(p);

    // seg7 (7s): "よく つかう の は、「きょう」 と 「こうてい」 の 2 つ です。"
    await caption(p, '一番 よく 使う: <strong style="color:#C1462C;">「今日」</strong> と <strong style="color:#C1462C;">「工程」</strong> の 2 タブ');
    await spot(p, '[data-tab="today"]', '「今日」');
    await wait(p, 3500);
    await spot(p, '[data-tab="ops"]', '「工程」');
    await wait(p, 3500);
    await clearCaption(p);
  }},

  // ─────────────────────────────────────
  { name: '03-today', fn: async (p) => {
    // T: 37.2 s
    await goTab(p, 'today');
    await wait(p, 800);

    // seg1 (3s): "ログイン すると、まず 「きょう」 タブ が 開きます。"
    await showTitle(p, '「今日」 タブ', 'CHAPTER 2');
    await wait(p, 3000);
    await removeTitle(p);

    // seg2 (5s): "3 つ の 情報 が まとめて 表示 されます。"
    await caption(p, '3 つ の 情報 が まとめて 表示');
    await wait(p, 5000);

    // seg3 (7s): "1つ目、きょう チェックイン、アウト、とまって いる お客様 が カード で 一覧。"
    await spot(p, 'section[data-pane="today"] .section-head', '① 予約カード 一覧');
    await wait(p, 7000);

    // seg4 (2s): "2つ目 は、"
    await wait(p, 2000);

    // seg5 (8s): "きゃくしつ マップ です。全 8 室 の 状態 が 色 で 一目 で わかります。"
    await p.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await wait(p, 800);
    await spot(p, '.roommap, main', '② 客室 マップ (8 室)');
    await wait(p, 7200);

    // seg6 (4s): "空 いて いる 部屋 は 白、予約 が 入って いる 部屋 は 色 が 変わる"
    await caption(p, '<span style="color:#F2EDE3;background:#0E0E0C;padding:2px 8px;">白</span> = 空室 / <span style="color:#F2EDE3;background:#C1462C;padding:2px 8px;">色付き</span> = 予約あり');
    await wait(p, 4000);
    await clearCaption(p);

    // seg7 (4s): "3つ目、チェックイン、アウト の 時間帯 も 表示。"
    await wait(p, 4000);

    // seg8 (4s): "朝 いちばん に 開くだけ で 動き が すべて 把握 できます。"
    await p.evaluate(() => window.scrollTo(0, 0));
    await removeTitle(p);
    await caption(p, '朝 一番 に 開くだけ で 今日 の 動き 把握');
    await wait(p, 4000);
    await clearCaption(p);
  }},

  // ─────────────────────────────────────
  { name: '04-tasks', fn: async (p) => {
    // T: 38.5 s
    await goTab(p, 'ops');
    await wait(p, 1000);

    // seg1 (3s): "「こうてい」 タブ を 開くと、"
    await showTitle(p, '本日 やること<br>(タスク 管理)', 'CHAPTER 3');
    await wait(p, 3000);
    await removeTitle(p);

    // seg2 (4s): "一番 上 に 「本日 やること」 が 表示 されます。"
    await spot(p, '#opsTasks', '本日 やること');
    await wait(p, 4000);

    // seg3 (6s): "予約 が 入る と、その日 に 必要 な タスク、たとえば 受付 や、ベッドメイキング が、自動 生成。"
    await caption(p, '予約 が 入る と、 受付 / ベッドメイキング が 自動 生成');
    await wait(p, 6000);

    // seg4 (5s): "手動 で 追加 したい 場合 は、上 の 入力 欄 に、"
    await zoomIn(p, '#opsQuickInput', 'ここ に 入力', 1.5);
    await wait(p, 3500);
    await zoomOut(p);
    await wait(p, 1500);

    // seg5 (5s): "「せんたく タオル 12 まい」 と 入力 して、"
    await p.fill('#opsQuickInput', '洗濯 タオル 12 枚').catch(() => {});
    await caption(p, '例) 洗濯 タオル 12 枚');
    await wait(p, 5000);

    // seg6 (4s): "エンター キー を 押すだけ で 追加 されます。"
    await clearCaption(p);
    await clickRing(p, '#opsQuickAdd');
    await wait(p, 1500);
    await caption(p, 'Enter で 即 追加 (モーダル 不要)');
    await wait(p, 2500);
    await clearCaption(p);

    // seg7 (4s): "追加 された タスク は、3 つ の 列 に 分かれて 表示。"
    await spot(p, '#opsTasks', '3 列 進捗 カンバン');
    await wait(p, 4000);

    // seg8 (3.5s): "まだ 誰も、担当 あり、終わり の 3 つ です。"
    await wait(p, 3500);

    // seg9 (3.5s): "タスク の カード を タップ すると、担当 を 選ぶ 画面 が 開きます。"
    await wait(p, 3500);
  }},

  // ─────────────────────────────────────
  { name: '05-week-shift', fn: async (p) => {
    // T: 35.8 s
    await goTab(p, 'ops');
    await wait(p, 800);
    await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await wait(p, 800);

    // seg1 (3s): "次 は、シフト 表 の 週 ビュー です。"
    await showTitle(p, 'シフト 表<br>週 ビュー', 'CHAPTER 4');
    await wait(p, 3000);
    await removeTitle(p);

    // seg2 (5s): "上 に、「週」 と 「月」 の タブ が あり、好きな 方 を 選べます。"
    await spot(p, '.shift-mode-tabs', '週 / 月 切替');
    await wait(p, 5000);

    // seg3 (5s): "縦 に スタッフ、横 に 一週間 の 曜日 が 並んでいます。"
    await spot(p, '#shiftGrid', 'スタッフ × 曜日');
    await wait(p, 5000);

    // seg4 (5s): "各 セル を タップ すると、5 つ の ボタン が 出てきます。"
    await p.evaluate(() => document.querySelector('.shift-cell[data-key]')?.click());
    await wait(p, 1500);
    await spot(p, '#shiftPicker', '5 ボタン ピッカー');
    await wait(p, 3500);

    // seg5 (10s): "9じ から 16じ の 朝番、15じ から 20じ の 夜番、9じ から 20じ の 通し番、休み、未定 の 5 つ。"
    await caption(p, '9-16 朝 / 15-20 夜 / 9-20 通し / 休 / 未定');
    await wait(p, 10000);

    // seg6 (5s): "選んで、下 の 「確定」 ボタン を 押す と 保存。"
    await spot(p, '#shiftPickerConfirm', '確定 で 保存');
    await wait(p, 5000);

    // seg7 (3s): "間違えたら、「取消」 で 元に 戻せます。"
    await spot(p, '#shiftPickerCancel', '取消 で 破棄');
    await wait(p, 3000);
    await p.evaluate(() => { const el = document.querySelector('#shiftPicker'); if (el) el.hidden = true; });
    await clearCaption(p);
  }},

  // ─────────────────────────────────────
  { name: '06-month-shift', fn: async (p) => {
    // T: 38.6 s
    await goTab(p, 'ops');
    await wait(p, 800);
    await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await wait(p, 800);

    // seg1 (3s): "続いて、月 ビュー です。"
    await showTitle(p, 'シフト 表<br>月 ビュー', 'CHAPTER 5');
    await wait(p, 3000);
    await removeTitle(p);

    // seg2 (5s): "タブ で 「月」 を 選ぶと、1 ヶ 月 分 の カレンダー。"
    await clickRing(p, '.shift-mode-btn[data-mode="month"]');
    await wait(p, 1200);
    await spot(p, '#shiftMonthGrid', '1 ヶ月 分 全表示');
    await wait(p, 4000);

    // seg3 (7s): "各 日 に、出勤 する スタッフ の 色 チップ が 表示。"
    await caption(p, '色 チップ = 出勤 スタッフ + シフト');
    await wait(p, 7000);
    await clearCaption(p);

    // seg4 (7s): "「山 9-16」 とか、「田 15-20」 の ような 表示 です。"
    const hasChip = await p.$('.mm-chip.shift-cell');
    if (hasChip) {
      await spot(p, '.mm-chip.shift-cell', '例) 山 9-16');
      await wait(p, 7000);
    } else {
      await wait(p, 7000);
    }

    // seg5 (6s): "チップ を タップ すると、週 と 同じ 5 ボタン ピッカー が 開き、個別 に 編集。"
    if (hasChip) {
      await clickRing(p, '.mm-chip.shift-cell');
      await wait(p, 1500);
      await spot(p, '#shiftPicker', '週 と 同じ 5 ボタン');
      await wait(p, 4500);
      await p.evaluate(() => { const el = document.querySelector('#shiftPicker'); if (el) el.hidden = true; });
    } else {
      await wait(p, 6000);
    }

    // seg6 (6s): "誰も シフト が 入って いない 日 に は、プラス マーク が 表示 され、全員 を 一括 編集。"
    const hasAdd = await p.$('.mm-chip--add');
    if (hasAdd) {
      await spot(p, '.mm-chip--add', '+ で 全員 一括');
      await wait(p, 6000);
    } else {
      await wait(p, 6000);
    }

    // seg7 (4s): "予約 が 入って いる 日 に は、予約 件数 が バッジ で 表示。"
    const hasResv = await p.$('.mm-cell__resv');
    if (hasResv) {
      await spot(p, '.mm-cell__resv', '予約 件数 バッジ');
      await wait(p, 4000);
    } else {
      await wait(p, 4000);
    }
    await p.evaluate(() => window.arHelp.clear());

    // 週に戻す (次章のため)
    await p.evaluate(() => document.querySelector('.shift-mode-btn[data-mode="week"]')?.click());
    await wait(p, 800);
  }},

  // ─────────────────────────────────────
  { name: '07-staff-editor', fn: async (p) => {
    // T: 41.5 s
    await goTab(p, 'ops');
    await wait(p, 800);
    await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await wait(p, 1200);

    // seg1 (4s): "スタッフ 一人 分 の シフト を、まとめて 入力 したい 場合 は、"
    await showTitle(p, 'スタッフ × 月<br>キーボード 入力', 'CHAPTER 6');
    await wait(p, 4000);
    await removeTitle(p);

    // seg2 (4s): "スタッフ カード の 「シフト 入力」 ボタン。"
    await spot(p, '.staff-card__shift[data-sid="s1"]', 'シフト 入力');
    await wait(p, 4000);

    // seg3 (3s): "その 人 専用 の カレンダー が 開きます。"
    await clickRing(p, '.staff-card__shift[data-sid="s1"]');
    await wait(p, 1500);
    await spot(p, '#sseCal', 'その 人 専用 の カレンダー');
    await wait(p, 1500);

    // seg4 (5s): "使い方 は、2 通り あります。"
    await caption(p, '入力 方法 は 2 通り');
    await wait(p, 5000);

    // seg5 (5s): "1 つ 目 は、カレンダー の 日付 を 直接 タップ。"
    await caption(p, '① カレンダー を 直接 タップ');
    await wait(p, 5000);

    // seg6 (5s): "2 つ 目 は、キーボード の 入力 欄 に、日付 を 打つ 方法。"
    await caption(p, '② キーボード 入力');
    await spot(p, '#sseDateInput', 'ここ に 入力');
    await wait(p, 5000);

    // seg7 (5s): "「7がつ 2か、5か、12か」 の ように 打って、"
    await p.fill('#sseDateInput', '7/2 7/5 7/9 7/12').catch(() => {});
    await wait(p, 5000);

    // seg8 (4s): "エンター を 押す と、一気 に、複数 の 日 を 追加。"
    await clickRing(p, '#sseAdd');
    await wait(p, 1500);
    await spot(p, '#sseCal', '複数日 が 一気 に 埋まる');
    await wait(p, 2500);

    // seg9 (3s): "下 に、「N 日 変更 予定」 と 表示。"
    await spot(p, '#sseSummary', 'N 日 変更 予定');
    await wait(p, 3000);

    // seg10 (3.5s): "「保存 する」 を 押すと、まとめて 反映。"
    await spot(p, '#sseSave', '保存 で 一括 反映');
    await wait(p, 3500);
    await clearCaption(p);

    // 一気に閉じる (Firestore汚染防止)
    await p.evaluate(() => { window.confirm = () => true; document.getElementById('sseCancel')?.click(); });
    await wait(p, 800);
    await p.evaluate(() => { const el = document.getElementById('opsModal'); if (el) el.hidden = true; });
  }},

  // ─────────────────────────────────────
  { name: '08-line-pairing', fn: async (p) => {
    // T: 66.2 s (長編)
    await goTab(p, 'ops');
    await wait(p, 800);
    await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await wait(p, 1200);

    // seg1 (5s): "スタッフ を LINE と 連携 させる 方法 を、ご 説明 します。"
    await showTitle(p, 'スタッフ ↔ LINE<br>連携 方法', 'CHAPTER 7');
    await wait(p, 5000);
    await removeTitle(p);

    // seg2 (7s): "スタッフ が、LINE で シフト の 確認、タスク の 完了 報告、明日 の 予定 の 通知 が できる。"
    await caption(p, '連携 で できる こと: シフト 確認 / タスク 完了 報告 / 前日 リマインド 受信');
    await wait(p, 7000);
    await clearCaption(p);

    // seg3 (5s): "まず、スタッフ カード の 「i」 マーク を タップ。"
    await spot(p, '.staff-card__info[data-sid="s1"]', 'i マーク で 情報');
    await wait(p, 5000);
    await clickRing(p, '.staff-card__info[data-sid="s1"]');
    await wait(p, 1500);

    // seg4 (4s): "情報 画面 が 開きます。"
    await wait(p, 4000);

    // seg5 (4s): "下 の 方 に、「LINE 連携」 と いう 項目。"
    const hasArea = await p.$('#sfLineArea');
    if (hasArea) {
      await spot(p, '#sfLineArea', 'LINE 連携 セクション');
      await wait(p, 4000);
    } else {
      await wait(p, 4000);
    }

    // seg6 (4s): "「コード 発行」 を 押すと、6 桁 の 数字 が 表示。"
    const hasPair = await p.$('#sfPairBtn');
    if (hasPair) {
      await clickRing(p, '#sfPairBtn');
      await wait(p, 2500);
    }
    // 疑似コード表示 (実 API を叩かない)
    await p.evaluate(() => {
      const area = document.getElementById('sfLineArea');
      if (area) {
        area.innerHTML = `
          <div class="ar-help-fake-code" style="text-align:center;padding:20px;border:1px dashed #B8893B;border-radius:4px;background:#FBF8F2;">
            <div style="font-size:11px;letter-spacing:0.18em;color:#6B6356;text-transform:uppercase;">連携 コード (10 分 有効)</div>
            <div style="font-family:Inter,monospace;font-size:38px;font-weight:700;letter-spacing:0.14em;color:#0E0E0C;margin:10px 0;">483 291</div>
            <div style="font-size:12px;color:#6B6356;">山田 花 さん の LINE から<br>この 6 桁 を 送ってもらう</div>
          </div>`;
      }
    });
    await wait(p, 1500);
    await spot(p, '.ar-help-fake-code', '6 桁 コード');
    await wait(p, 4000);

    // seg7 (5s): "この コード を、スタッフ 本人 に、口頭 で 伝えます。"
    await caption(p, '6 桁 を バイト に 口頭 で 伝える');
    await wait(p, 5000);

    // seg8 (7s): "バイト は、荒島 公式 LINE を 友達 追加 → 6 桁 の 数字 を LINE で 送信。"
    // LINE 疑似画面 表示
    await p.evaluate(() => {
      document.getElementById('opsModal').hidden = true;
      const phone = document.createElement('div');
      phone.id = 'ar-help-phone';
      phone.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);width:340px;height:600px;background:#fff;border:8px solid #333;border-radius:36px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;display:flex;flex-direction:column;';
      phone.innerHTML = `
        <div style="background:#06C755;color:#fff;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;font-family:'Noto Sans JP',sans-serif;">
          <span>荒島 ホステル 公式</span>
        </div>
        <div id="ar-phone-body" style="padding:16px;flex:1;background:#F0F2F5;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;"></div>
      `;
      document.body.appendChild(phone);
    });
    await wait(p, 1500);
    // バイトが 6桁送る 演出
    await p.evaluate(() => {
      const body = document.getElementById('ar-phone-body');
      if (body) {
        const bubble = document.createElement('div');
        bubble.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:12px 16px;border-radius:16px 16px 4px 16px;max-width:70%;font-family:"Noto Sans JP",sans-serif;font-size:18px;font-weight:700;letter-spacing:0.1em;';
        bubble.textContent = '483291';
        body.appendChild(bubble);
      }
    });
    await wait(p, 5500);

    // seg9 (4s): "これ だけ で、連携 完了。"
    await p.evaluate(() => {
      const body = document.getElementById('ar-phone-body');
      if (body) {
        const bubble = document.createElement('div');
        bubble.style = 'align-self:flex-start;background:#fff;color:#000;padding:12px 16px;border-radius:16px 16px 16px 4px;max-width:78%;font-family:"Noto Sans JP",sans-serif;font-size:13px;line-height:1.7;';
        bubble.innerHTML = '山田 花 さん、 荒島 ホテル の LINE 連携 が できました。';
        body.appendChild(bubble);
      }
    });
    await wait(p, 4000);

    // seg10 (5s): "連携 された カード に は、緑 の「LINE」 バッジ。"
    await caption(p, '緑 [LINE] バッジ = 連携済み スタッフ');
    await wait(p, 5000);
    await clearCaption(p);

    // seg11 (5s): "連携 後、「シフト」 と 送ると、今週 の 自分 の シフト が 返る。"
    await p.evaluate(() => {
      const body = document.getElementById('ar-phone-body');
      if (body) {
        body.innerHTML = '';
        const b1 = document.createElement('div');
        b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:60%;font-family:"Noto Sans JP",sans-serif;font-size:13px;';
        b1.textContent = 'シフト';
        body.appendChild(b1);
        const b2 = document.createElement('div');
        b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:75%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.9;';
        b2.innerHTML = '<b>THIS WEEK</b><br>7/2 (木) 9-16<br>7/5 (日) 9-16<br>7/9 (木) 9-16';
        body.appendChild(b2);
      }
    });
    await wait(p, 5000);

    // seg12 (6s): "「明日 9じ から 16じ」 と 送ると、自分 で 登録 できる。"
    await p.evaluate(() => {
      const body = document.getElementById('ar-phone-body');
      if (body) {
        body.innerHTML = '';
        const b1 = document.createElement('div');
        b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:70%;font-family:"Noto Sans JP",sans-serif;font-size:13px;';
        b1.textContent = '明日 9-16';
        body.appendChild(b1);
        const b2 = document.createElement('div');
        b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:78%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.7;';
        b2.innerHTML = '山田 花 さん、 7/3 (金) を 「9-16」 で 登録 しました。';
        body.appendChild(b2);
      }
    });
    await wait(p, 6000);

    // seg13 (5s): "「タスク」 と 送ると、今日 の 担当 タスク が 一覧。"
    await p.evaluate(() => {
      const body = document.getElementById('ar-phone-body');
      if (body) {
        body.innerHTML = '';
        const b1 = document.createElement('div');
        b1.style = 'align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:60%;font-family:"Noto Sans JP",sans-serif;font-size:13px;';
        b1.textContent = 'タスク';
        body.appendChild(b1);
        const b2 = document.createElement('div');
        b2.style = 'align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:80%;font-family:"Noto Sans JP",sans-serif;font-size:12px;line-height:1.9;';
        b2.innerHTML = '<b>TODAY</b><br>1. 201 号 受付<br>2. 202 号 ベッド<br>3. 洗濯 タオル 12 枚';
        body.appendChild(b2);
      }
    });
    await wait(p, 5200);

    await p.evaluate(() => document.getElementById('ar-help-phone')?.remove());
    await wait(p, 1500);
  }},

  // ─────────────────────────────────────
  { name: '09-publish', fn: async (p) => {
    // T: 40.2 s
    await goTab(p, 'ops');
    await wait(p, 800);
    await p.evaluate(() => document.querySelector('#shiftGrid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await wait(p, 1000);

    // seg1 (4s): "1 ヶ 月 分 の シフト を、全員 に 一斉 配信 する 機能。"
    await showTitle(p, '月次 シフト<br>一斉 配信', 'CHAPTER 8');
    await wait(p, 4000);
    await removeTitle(p);

    // seg2 (5s): "上 の、「こんげつ ぶん 全員 に 配信」 ボタン を 押します。"
    await spot(p, '#shiftPublish', '今月分 全員 に 配信');
    await wait(p, 5000);
    await clickRing(p, '#shiftPublish');
    await wait(p, 1500);

    // seg3 (6s): "モーダル が 開き、LINE 連携 済み の スタッフ が 一覧 で 表示。"
    await spot(p, '#publishList', '連携 済み スタッフ 一覧');
    await wait(p, 6000);

    // seg4 (5s): "その 人 の、今月 の シフト 件数 も、一緒 に 表示。"
    await wait(p, 5000);

    // seg5 (4s): "「配信 する」 ボタン を 押します。"
    await wait(p, 4000);

    // seg6 (8s): "各 スタッフ の LINE に、その 月 の シフト 一覧 + 「Google カレンダー に 追加」 ボタン が 届く。"
    await p.evaluate(() => {
      document.getElementById('opsModal').hidden = true;
      const phone = document.createElement('div');
      phone.id = 'ar-help-flex';
      phone.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);width:340px;background:#fff;border:8px solid #333;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;';
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
          <div style="background:#4285F4;color:#fff;text-align:center;padding:12px;border-radius:4px;font-weight:700;font-family:'Noto Sans JP',sans-serif;font-size:14px;">Google カレンダー に 追加</div>
        </div>`;
      document.body.appendChild(phone);
    });
    await wait(p, 8000);

    // seg7 (5s): "この ボタン を 押すと、その 月 の 10 件、20 件 の シフト が、"
    await spot(p, '#ar-help-flex div[style*="Google"]', '1 タップ で 全件 登録');
    await wait(p, 5000);

    // seg8 (3.2s): "一気 に、Google カレンダー に 登録。"
    await wait(p, 3200);
    await p.evaluate(() => document.getElementById('ar-help-flex')?.remove());
    await wait(p, 1000);
  }},

  // ─────────────────────────────────────
  { name: '10-auto-notify', fn: async (p) => {
    // T: 67.7 s (長編)
    // seg1 (4s): "最後 に、予約 が 入った とき の、自動 通知 の 仕組み。"
    await showTitle(p, '予約 発生 時<br>自動 通知', 'CHAPTER 9');
    await wait(p, 4000);
    await removeTitle(p);

    // seg2 (7s): "お客様 が LINE の リッチ メニュー から 予約 → その 瞬間 に、サーバー の クラウドファンクション が 起動。"
    // フロー図表示
    await p.evaluate(() => {
      const box = document.createElement('div');
      box.id = 'ar-help-flow';
      box.style.cssText = 'position:fixed;top:6%;left:50%;transform:translateX(-50%);width:960px;background:#F2EDE3;border:2px solid #0E0E0C;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;padding:36px 40px;font-family:"Noto Sans JP",sans-serif;';
      box.innerHTML = `
        <div style="text-align:center;color:#B8893B;font-size:12px;letter-spacing:0.24em;font-weight:700;">AUTO NOTIFY FLOW</div>
        <div style="text-align:center;font-size:24px;font-weight:700;color:#0E0E0C;margin:10px 0 32px;">予約 が 入った 瞬間 の 自動 通知</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:16px;align-items:center;">
          <div id="ar-flow-1" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #C1462C;border-radius:6px;transition:transform .3s, box-shadow .3s;">
            <div style="font-size:36px;">👤</div>
            <div style="font-size:14px;font-weight:700;margin-top:8px;">お客様</div>
            <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">LINE リッチ<br>メニュー<br>から 予約</div>
          </div>
          <div id="ar-flow-arr1" style="font-size:32px;color:#C1462C;opacity:0.3;">→</div>
          <div id="ar-flow-2" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #2A4A5E;border-radius:6px;opacity:0.3;transition:opacity .4s, transform .3s;">
            <div style="font-size:36px;">☁️</div>
            <div style="font-size:14px;font-weight:700;margin-top:8px;">Cloud Function</div>
            <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">シフト表 から<br>担当 を<br>特定</div>
          </div>
          <div id="ar-flow-arr2" style="font-size:32px;color:#C1462C;opacity:0.3;">→</div>
          <div id="ar-flow-3" style="text-align:center;padding:22px 14px;background:#fff;border:2px solid #5A6B3F;border-radius:6px;opacity:0.3;transition:opacity .4s, transform .3s;">
            <div style="font-size:36px;">📱</div>
            <div style="font-size:14px;font-weight:700;margin-top:8px;">担当 バイト</div>
            <div style="font-size:11px;color:#6B6356;margin-top:6px;line-height:1.7;">LINE に<br>Flex メッセージ</div>
          </div>
        </div>
        <div id="ar-flow-detail" style="margin-top:24px;padding:16px;background:#fff;border-left:4px solid #B8893B;font-size:13px;color:#0E0E0C;line-height:1.9;min-height:60px;">
          お客様 が LINE で 予約 →
        </div>
      `;
      document.body.appendChild(box);
    });
    await wait(p, 1000);
    // フロー1 (お客様) を活性化
    await p.evaluate(() => {
      const el = document.getElementById('ar-flow-1');
      if (el) el.style.transform = 'scale(1.06)';
    });
    await wait(p, 6000);

    // seg3 (6s): "クラウドファンクション が、その 日 に 出勤 する スタッフ を シフト表 から 特定。"
    await p.evaluate(() => {
      ['ar-flow-arr1', 'ar-flow-2'].forEach(id => { const el = document.getElementById(id); if (el) el.style.opacity = '1'; });
      const detail = document.getElementById('ar-flow-detail');
      if (detail) detail.innerHTML = 'サーバー の クラウドファンクション が、 シフト表 を 確認 →';
    });
    await wait(p, 6000);

    // seg4 (7s): "特定 された スタッフ の LINE に、自動 で フレックス メッセージ が とどく。"
    await p.evaluate(() => {
      ['ar-flow-arr2', 'ar-flow-3'].forEach(id => { const el = document.getElementById(id); if (el) el.style.opacity = '1'; });
      const el = document.getElementById('ar-flow-3');
      if (el) el.style.transform = 'scale(1.06)';
      const detail = document.getElementById('ar-flow-detail');
      if (detail) detail.innerHTML = '該当 バイト の LINE に、 Flex メッセージ を 自動 送信';
    });
    await wait(p, 7000);

    // seg5 (7s): "お客様 の 名前、部屋 番号、IN と OUT の 日付、泊数、人数 が まとめて。"
    await p.evaluate(() => {
      const detail = document.getElementById('ar-flow-detail');
      if (detail) detail.innerHTML = 'Flex 内容: <b>お客様 名 / 部屋 番号 / IN・OUT 日付 / 泊数 / 人数</b>';
    });
    await wait(p, 7000);

    // seg6 (6s): "受付 担当、ベッドメイキング 担当 の ラベル も 自動 で 付く。"
    await p.evaluate(() => {
      const detail = document.getElementById('ar-flow-detail');
      if (detail) detail.innerHTML = 'ラベル: <span style="background:#C1462C;color:#fff;padding:2px 8px;border-radius:2px;font-size:11px;">受付 担当</span> / <span style="background:#5A6B3F;color:#fff;padding:2px 8px;border-radius:2px;font-size:11px;">ベッドメイキング 担当</span>';
    });
    await wait(p, 6000);
    await p.evaluate(() => document.getElementById('ar-help-flow')?.remove());
    await wait(p, 500);

    // seg7 (5s): "さらに、前日 の 夜 8 時 には、明日 出勤 の スタッフ に。"
    await p.evaluate(() => {
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
    await wait(p, 5000);

    // seg8 (7s): "「明日 9じ から 16じ で 出勤 です。担当 タスク 3 件」 と いった リマインダー。"
    await wait(p, 7000);

    // seg9 (5s): "連絡 忘れ、出勤 忘れ が、完全 に なくなる。"
    await caption(p, '連絡 忘れ / 出勤 忘れ を 完全 に 防ぐ');
    await wait(p, 5000);
    await clearCaption(p);

    // seg10 (7s): "全 スタッフ 一斉 か、担当者 だけ か を、チェック で 切替 できます。"
    await caption(p, '通知 モード は 管理画面 の チェック で 切替 可能');
    await wait(p, 7000);
    await clearCaption(p);
    await p.evaluate(() => document.getElementById('ar-help-reminder')?.remove());
    await wait(p, 1500);
  }},
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
await p.waitForTimeout(2000);
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
  console.log(`🎬 [${start.toFixed(1)}s] ${f.name} (target ${target}s)`);
  try {
    await f.fn(p);
  } catch (e) {
    console.log(`  err: ${e.message.slice(0, 120)}`);
  }
  const end = (Date.now() - t0) / 1000;
  const actualDur = end - start;
  console.log(`  actual ${actualDur.toFixed(1)}s (diff ${(actualDur - target).toFixed(1)})`);
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
