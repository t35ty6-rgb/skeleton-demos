// 荒島 admin 使い方ガイド — 全10章 bulk録画 (1 context 連続 → ffmpegで時間分割)
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/arashima-admin-help/assets/videos';
mkdirSync(OUT_DIR, { recursive: true });

const SECRET = readFileSync('/Users/tsukasayoshida/.skeleton-arashima/.env', 'utf8').match(/ADMIN_SECRET=(\S+)/)[1];
const URL = `https://arashima-admin.web.app/?secret=${SECRET}`;

const HIGHLIGHT_CSS = `
body { transition: transform 0.55s cubic-bezier(.4,0,.2,1); }
html.ar-help-zooming, html.ar-help-zooming body { overflow: hidden !important; }
.ar-help-spot { position: absolute !important; border: 4px solid #C1462C !important; border-radius: 8px !important;
  box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5) !important;
  pointer-events: none !important; z-index: 99998 !important;
  animation: ar-help-pulse 1.1s ease-in-out infinite; }
.ar-help-arrow { position: absolute !important; pointer-events: none !important; z-index: 99999 !important;
  background: #0E0E0C; color: #F2EDE3; font-family: "Noto Sans JP", system-ui, sans-serif;
  font-weight: 700; font-size: 14px; padding: 8px 14px; border-radius: 3px;
  box-shadow: 0 6px 20px rgba(0,0,0,.35); white-space: nowrap;
  border-left: 3px solid #C1462C;
  animation: ar-help-fadein .25s ease; }
#ar-help-cursor { position: absolute; pointer-events: none; z-index: 99997;
  transition: left .45s cubic-bezier(.4,0,.2,1), top .45s cubic-bezier(.4,0,.2,1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.4)); }
.ar-help-ring { position: absolute; pointer-events: none; z-index: 100000;
  border: 4px solid #C1462C; border-radius: 50%;
  animation: ar-help-ring 0.65s cubic-bezier(.2,.8,.4,1) forwards; }
@keyframes ar-help-pulse {
  0%,100% { box-shadow: 0 0 0 8px rgba(193,70,44,0.28), 0 0 40px rgba(193,70,44,0.85), 0 0 90px rgba(193,70,44,0.5); }
  50%     { box-shadow: 0 0 0 14px rgba(193,70,44,0.14), 0 0 55px rgba(193,70,44,0.95), 0 0 120px rgba(193,70,44,0.4); }
}
@keyframes ar-help-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes ar-help-ring {
  from { transform: scale(0.25); opacity: 1; }
  to   { transform: scale(2.6);  opacity: 0; }
}
`;

async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.arHelp) return;
    window.arHelp = {};
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
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
      document.querySelectorAll('.ar-help-spot, .ar-help-arrow, .ar-help-ring').forEach(el => el.remove());
    };
  }, HIGHLIGHT_CSS);
}

async function focusClick(p, sel, label, opts) {
  opts = opts || {};
  const scale = opts.scale || 1.5;
  const holdMs = opts.hold || 1600;
  const afterMs = opts.after || 1400;
  const doClick = opts.click !== false;
  await p.evaluate(({ s, l, sc }) => window.arHelp.zoom(s, l, { scale: sc }), { s: sel, l: label || '', sc: scale });
  await p.waitForTimeout(holdMs);
  if (doClick) {
    await p.evaluate((s) => window.arHelp.clickRing(s), sel);
    await p.evaluate((s) => { const t = typeof s === 'string' ? document.querySelector(s) : s; if (t) t.click(); }, sel);
  }
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.arHelp.zoomOut(); window.arHelp.clear(); });
  await p.waitForTimeout(afterMs);
}
async function highlight(p, sel, label, holdMs = 3500) {
  await p.evaluate(({ s, l }) => window.arHelp.spot(s, l), { s: sel, l: label || '' });
  await p.waitForTimeout(holdMs);
  await p.evaluate(() => window.arHelp.clear());
}
async function goTab(p, tab) {
  await p.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), tab);
  await p.waitForTimeout(1200);
}
async function reset(p) {
  await p.evaluate(() => {
    document.querySelector('#opsModal') && (document.querySelector('#opsModal').hidden = true);
    document.querySelector('#shiftPicker') && (document.querySelector('#shiftPicker').hidden = true);
    window.arHelp && window.arHelp.clear();
    window.scrollTo(0, 0);
  });
  await goTab(p, 'today');
  await p.waitForTimeout(800);
}

const features = [
  // ─────────────────────────────────────
  { name: '01-overview', dur: 34, fn: async (p) => {
    // 全体像: 各タブを 順に軽く zoom で 紹介
    await goTab(p, 'today');
    await p.waitForTimeout(1500);
    await highlight(p, '.head', 'このツール で できる こと', 3500);
    await focusClick(p, '[data-tab="today"]', '今日 の 予約 状況', { scale: 1.4, hold: 2000, after: 400, click: false });
    await focusClick(p, '[data-tab="ops"]', '工程 (シフト + タスク)', { scale: 1.4, hold: 2500, after: 400 });
    await p.waitForTimeout(2000);
    await highlight(p, 'section[data-pane="ops"]', 'この 中 に 全機能', 4000);
    await p.waitForTimeout(4000);
    await goTab(p, 'today');
    await p.waitForTimeout(2000);
    await highlight(p, '.head__nav', '7 つ の タブ', 4000);
    await p.waitForTimeout(3000);
  }},

  // ─────────────────────────────────────
  { name: '02-login', dur: 30, fn: async (p) => {
    // ログイン画面 の 説明 (もう ログイン済み なので、 URL バー を 疑似表示)
    await p.evaluate(() => {
      const bar = document.createElement('div');
      bar.id = 'ar-help-urlbar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#0E0E0C;color:#F2EDE3;padding:14px 32px;font-family:"Noto Sans JP",monospace;font-size:16px;z-index:99996;display:flex;align-items:center;gap:14px;border-bottom:2px solid #C1462C;';
      bar.innerHTML = '<span style="color:#B8893B;font-weight:700;letter-spacing:0.14em;font-size:12px;">URL</span><span style="font-family:monospace;">https://arashima-admin.web.app/</span>';
      document.body.appendChild(bar);
    });
    await p.waitForTimeout(3500);
    await highlight(p, '#ar-help-urlbar', 'ブラウザ に URL を 入力', 4500);
    await p.waitForTimeout(3500);
    // ヘッダ を 見せる
    await highlight(p, '.head', 'ログイン 後 の 画面', 4000);
    await p.waitForTimeout(3500);
    await focusClick(p, '.head__nav', 'この 7 つ の タブ', { scale: 1.3, hold: 3500, after: 400, click: false });
    await p.waitForTimeout(3000);
    await p.evaluate(() => document.getElementById('ar-help-urlbar')?.remove());
    await p.waitForTimeout(2000);
  }},

  // ─────────────────────────────────────
  { name: '03-today', dur: 30, fn: async (p) => {
    await goTab(p, 'today');
    await p.waitForTimeout(2000);
    await highlight(p, 'section[data-pane="today"]', '今日 の 全体', 4000);
    await p.waitForTimeout(2500);
    // 予約カード群
    await focusClick(p, 'section[data-pane="today"] .section-head', '今日 チェックイン / アウト', { scale: 1.3, hold: 3000, after: 400, click: false });
    // 客室マップ
    await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await p.waitForTimeout(1500);
    await highlight(p, '.roommap, [class*="room"], main', '客室 マップ (全 8 室)', 5000);
    await p.waitForTimeout(4000);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2000);
  }},

  // ─────────────────────────────────────
  { name: '04-tasks', dur: 36, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1500);
    await highlight(p, '#opsTasks', '本日 やること', 3500);
    await p.waitForTimeout(2500);
    // クイック追加
    await focusClick(p, '#opsQuickInput', 'ここ に 入力', { scale: 1.6, hold: 2000, after: 400, click: false });
    await p.fill('#opsQuickInput', '洗濯 タオル 12 枚').catch(() => {});
    await p.waitForTimeout(1500);
    await focusClick(p, '#opsQuickAdd', 'エンター で 追加', { scale: 1.7, hold: 2000, after: 800 });
    await p.waitForTimeout(1500);
    // 追加された カードにspot
    await highlight(p, '#opsListPending .task-card, #opsListPending', '3 列 で 進捗 管理', 5000);
    await p.waitForTimeout(4500);
    // クリーンアップ: 追加した タスク を消す (Firestore backend 呼び出しは async なので DOM 直接いじりだと戻る、時間内スキップ)
    await p.waitForTimeout(2500);
  }},

  // ─────────────────────────────────────
  { name: '05-week-shift', dur: 32, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1000);
    await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await p.waitForTimeout(1200);
    await highlight(p, '#shiftGrid', '週 ビュー', 3500);
    await p.waitForTimeout(2500);
    // セル tap → ピッカー
    await focusClick(p, '.shift-cell[data-key]', 'セル を タップ', { scale: 1.5, hold: 2500, after: 400 });
    await p.waitForTimeout(1500);
    await highlight(p, '#shiftPicker', '5 つ の ボタン', 4500);
    await p.waitForTimeout(3500);
    await focusClick(p, '.shift-opt[data-shift="9-16"]', '9 - 16 朝', { scale: 1.5, hold: 2000, after: 400 });
    await focusClick(p, '#shiftPickerConfirm', '確定 で 保存', { scale: 1.7, hold: 2500, after: 1200, click: false });
    // ピッカー閉じる
    await p.evaluate(() => { const p = document.querySelector('#shiftPicker'); if (p) p.hidden = true; });
    await p.waitForTimeout(2000);
  }},

  // ─────────────────────────────────────
  { name: '06-month-shift', dur: 34, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1000);
    await p.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await p.waitForTimeout(1000);
    // 月ボタン
    await focusClick(p, '.shift-mode-btn[data-mode="month"]', '月 タブ で 切替', { scale: 1.7, hold: 2000, after: 1500 });
    await highlight(p, '#shiftMonthGrid', '一 ヶ 月 分 全 表示', 4000);
    await p.waitForTimeout(3000);
    // チップ を tap
    const hasChip = await p.$('.mm-chip.shift-cell');
    if (hasChip) {
      await focusClick(p, '.mm-chip.shift-cell', 'チップ tap で 編集', { scale: 1.8, hold: 2500, after: 400 });
      await p.waitForTimeout(1200);
      await highlight(p, '#shiftPicker', '週 と 同じ 5 ボタン', 3500);
      await p.waitForTimeout(2500);
      await p.evaluate(() => { const p = document.querySelector('#shiftPicker'); if (p) p.hidden = true; });
    }
    // + 追加 chip
    const hasAdd = await p.$('.mm-chip--add');
    if (hasAdd) {
      await focusClick(p, '.mm-chip--add', 'プラス で 全 員 編集', { scale: 1.8, hold: 2500, after: 400, click: false });
    }
    await p.waitForTimeout(3000);
    // 週 に戻す
    await p.evaluate(() => document.querySelector('.shift-mode-btn[data-mode="week"]')?.click());
    await p.waitForTimeout(1500);
  }},

  // ─────────────────────────────────────
  { name: '07-staff-editor', dur: 39, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1000);
    await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await p.waitForTimeout(1500);
    await highlight(p, '#staffList', 'スタッフ 一覧', 3500);
    await p.waitForTimeout(2500);
    // 山田花 の シフト入力ボタン
    await focusClick(p, '.staff-card__shift[data-sid="s1"]', 'シフト 入力 を 押す', { scale: 1.7, hold: 2500, after: 1500 });
    await p.waitForTimeout(1500);
    await highlight(p, '#sseCal', 'その 人 の 月 カレンダー', 3500);
    await p.waitForTimeout(2500);
    // キーボード入力 highlight
    await focusClick(p, '#sseDateInput', 'キーボード で 日付', { scale: 1.5, hold: 1500, after: 400, click: false });
    await p.fill('#sseDateInput', '7/2 7/5 7/9 7/12').catch(() => {});
    await p.waitForTimeout(1500);
    await focusClick(p, '#sseAdd', 'エンター で 一気 に 追加', { scale: 1.7, hold: 2500, after: 800 });
    await p.waitForTimeout(1500);
    await highlight(p, '#sseSummary', 'N 日 変更 予定', 4000);
    await p.waitForTimeout(3500);
    // キャンセルで閉じる (Firestore 汚染防止)
    await p.evaluate(() => document.getElementById('sseCancel')?.click());
    await p.waitForTimeout(1000);
    // confirm dialog
    await p.evaluate(() => { const c = window.confirm; window.confirm = () => true; setTimeout(() => window.confirm = c, 1000); });
    await p.evaluate(() => document.getElementById('opsModal').hidden = true);
    await p.waitForTimeout(1500);
  }},

  // ─────────────────────────────────────
  { name: '08-line-pairing', dur: 63, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1000);
    await p.evaluate(() => document.querySelector('#staffList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await p.waitForTimeout(1500);
    // 「i」ボタンで情報モーダル
    await focusClick(p, '.staff-card__info[data-sid="s1"]', 'i マーク で 情報', { scale: 1.7, hold: 2200, after: 1200 });
    await p.waitForTimeout(1500);
    await highlight(p, '#sfLineArea, .ops-edit', 'LINE 連携 セクション', 3500);
    await p.waitForTimeout(2500);
    // コード発行ボタン
    const hasPairBtn = await p.$('#sfPairBtn');
    if (hasPairBtn) {
      await focusClick(p, '#sfPairBtn', 'コード 発行', { scale: 1.7, hold: 2500, after: 2500 });
    }
    // 6桁コード 疑似表示
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      const area = document.getElementById('sfLineArea');
      if (area && !area.querySelector('.ar-help-fake-code')) {
        area.innerHTML = `
          <div class="ar-help-fake-code" style="text-align:center;padding:14px;border:1px dashed #B8893B;border-radius:4px;background:#FBF8F2;">
            <div style="font-size:11px;letter-spacing:0.18em;color:#6B6356;text-transform:uppercase;">連携コード (10分有効)</div>
            <div style="font-family:Inter,monospace;font-size:32px;font-weight:700;letter-spacing:0.14em;color:#0E0E0C;margin:8px 0;">483 291</div>
            <div style="font-size:12px;color:#6B6356;">山田 花 さんの LINE から<br>この 6桁 を送ってもらう</div>
          </div>`;
      }
    });
    await p.waitForTimeout(3000);
    await highlight(p, '.ar-help-fake-code', 'この 6 桁 を バイト に', 5000);
    await p.waitForTimeout(4000);

    // LINE 画面 疑似 overlay
    await p.evaluate(() => {
      document.getElementById('opsModal').hidden = true;
      const phone = document.createElement('div');
      phone.id = 'ar-help-phone';
      phone.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);width:340px;height:600px;background:#fff;border:8px solid #333;border-radius:36px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;display:flex;flex-direction:column;';
      phone.innerHTML = `
        <div style="background:#06C755;color:#fff;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;font-family:'Noto Sans JP',sans-serif;">
          <span>荒島ホステル 公式</span>
        </div>
        <div style="padding:16px;flex:1;background:#F0F2F5;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;">
          <div style="align-self:flex-end;background:#8CE562;color:#000;padding:10px 14px;border-radius:16px 16px 4px 16px;max-width:70%;font-family:'Noto Sans JP',sans-serif;font-size:14px;font-weight:600;">
            483291
          </div>
          <div style="align-self:flex-start;background:#fff;color:#000;padding:10px 14px;border-radius:16px 16px 16px 4px;max-width:75%;font-family:'Noto Sans JP',sans-serif;font-size:13px;">
            山田 花 さん、 荒島ホテル の LINE 連携ができました。<br><br>・「シフト」→ 今週の予定<br>・「明日 9-16」→ シフト追加<br>・「タスク」→ 今日のやること
          </div>
        </div>`;
      document.body.appendChild(phone);
    });
    await p.waitForTimeout(4500);
    await highlight(p, '#ar-help-phone', 'バイト から 送信 → 連携 完了', 6000);
    await p.waitForTimeout(5500);
    // 送れる コマンド 例
    await highlight(p, '#ar-help-phone', 'シフト / 明日 / タスク コマンド', 6500);
    await p.waitForTimeout(6000);
    await p.evaluate(() => document.getElementById('ar-help-phone')?.remove());
    await p.waitForTimeout(2000);
  }},

  // ─────────────────────────────────────
  { name: '09-publish', dur: 39, fn: async (p) => {
    await goTab(p, 'ops');
    await p.waitForTimeout(1000);
    await p.evaluate(() => document.querySelector('#shiftGrid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await p.waitForTimeout(1500);
    await focusClick(p, '#shiftPublish', '今月分 全員 に 配信', { scale: 1.7, hold: 2500, after: 1800 });
    await p.waitForTimeout(1500);
    await highlight(p, '#publishList', '対象 スタッフ', 4500);
    await p.waitForTimeout(3500);
    // LINE Flex 疑似表示
    await p.evaluate(() => {
      document.getElementById('opsModal').hidden = true;
      const phone = document.createElement('div');
      phone.id = 'ar-help-flex';
      phone.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);width:340px;background:#fff;border:8px solid #333;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;overflow:hidden;';
      phone.innerHTML = `
        <div style="background:#0E0E0C;color:#F2EDE3;padding:16px 18px;">
          <div style="font-size:10px;color:#B8893B;letter-spacing:0.18em;font-weight:700;">SHIFT FIXED</div>
          <div style="font-size:18px;font-weight:700;margin-top:6px;font-family:'Noto Sans JP',sans-serif;">2026年 7月</div>
          <div style="font-size:11px;color:#B8893B;margin-top:4px;">山田 花 さん / 12 件 のシフト</div>
        </div>
        <div style="padding:14px 16px;font-family:'Noto Sans JP',sans-serif;font-size:12px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#4A4238;">7/2 (木)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#4A4238;">7/5 (日)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#4A4238;">7/9 (木)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="color:#4A4238;">7/12 (日)</span><span style="font-weight:700;color:#2A4A5E;">9-16</span></div>
          <div style="text-align:center;color:#888;font-size:10px;padding:6px 0;">... 他 8 件</div>
        </div>
        <div style="padding:14px 16px 18px;background:#F0EBE0;">
          <div style="background:#4285F4;color:#fff;text-align:center;padding:12px;border-radius:4px;font-weight:700;font-family:'Noto Sans JP',sans-serif;font-size:14px;">Google カレンダー に 追加</div>
        </div>`;
      document.body.appendChild(phone);
    });
    await p.waitForTimeout(4500);
    await highlight(p, '#ar-help-flex', '各 バイト の LINE に Flex', 6000);
    await p.waitForTimeout(5500);
    await highlight(p, '#ar-help-flex', 'ボタン 1 つ で 12 件 一括 登録', 6500);
    await p.waitForTimeout(6000);
    await p.evaluate(() => document.getElementById('ar-help-flex')?.remove());
    await p.waitForTimeout(1500);
  }},

  // ─────────────────────────────────────
  { name: '10-auto-notify', dur: 60, fn: async (p) => {
    // フロー図: 予約 → Cloud Function → Flex to duty staff
    await p.evaluate(() => {
      const box = document.createElement('div');
      box.id = 'ar-help-flow';
      box.style.cssText = 'position:fixed;top:8%;left:50%;transform:translateX(-50%);width:900px;background:#F2EDE3;border:2px solid #0E0E0C;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;padding:32px;font-family:"Noto Sans JP",sans-serif;';
      box.innerHTML = `
        <div style="text-align:center;color:#B8893B;font-size:11px;letter-spacing:0.24em;font-weight:700;">AUTO NOTIFY FLOW</div>
        <div style="text-align:center;font-size:22px;font-weight:700;color:#0E0E0C;margin:8px 0 28px;">予約 が 入った 瞬間 に 自動 通知</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:14px;align-items:center;">
          <div style="text-align:center;padding:18px 12px;background:#fff;border:2px solid #C1462C;border-radius:4px;">
            <div style="font-size:32px;">👤</div>
            <div style="font-size:13px;font-weight:700;margin-top:6px;">お客様</div>
            <div style="font-size:11px;color:#6B6356;margin-top:4px;">LINE で 予約</div>
          </div>
          <div style="font-size:26px;color:#C1462C;">→</div>
          <div style="text-align:center;padding:18px 12px;background:#fff;border:2px solid #2A4A5E;border-radius:4px;">
            <div style="font-size:32px;">☁️</div>
            <div style="font-size:13px;font-weight:700;margin-top:6px;">Cloud Function</div>
            <div style="font-size:11px;color:#6B6356;margin-top:4px;">シフト から <br>担当 を 判定</div>
          </div>
          <div style="font-size:26px;color:#C1462C;">→</div>
          <div style="text-align:center;padding:18px 12px;background:#fff;border:2px solid #5A6B3F;border-radius:4px;">
            <div style="font-size:32px;">📱</div>
            <div style="font-size:13px;font-weight:700;margin-top:6px;">担当 バイト</div>
            <div style="font-size:11px;color:#6B6356;margin-top:4px;">LINE に Flex</div>
          </div>
        </div>
        <div style="margin-top:22px;padding:14px;background:#fff;border-left:4px solid #B8893B;font-size:13px;color:#0E0E0C;line-height:1.7;">
          Flex の 内容: お客様名 / 部屋番号 / IN・OUT 日付 / 泊数 / 担当ラベル (受付 or ベッドメイキング)
        </div>
      `;
      document.body.appendChild(box);
    });
    await p.waitForTimeout(4500);
    await highlight(p, '#ar-help-flow', '予約 が 入った 瞬間', 6500);
    await p.waitForTimeout(6000);
    await highlight(p, '#ar-help-flow', 'Cloud Function が シフト を 見て 判定', 7000);
    await p.waitForTimeout(6500);
    await highlight(p, '#ar-help-flow', '担当 だけ に 自動 送信', 7000);
    await p.waitForTimeout(6500);

    await p.evaluate(() => {
      document.getElementById('ar-help-flow')?.remove();
      const box = document.createElement('div');
      box.id = 'ar-help-reminder';
      box.style.cssText = 'position:fixed;top:8%;left:50%;transform:translateX(-50%);width:820px;background:#F2EDE3;border:2px solid #0E0E0C;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:99990;padding:32px;font-family:"Noto Sans JP",sans-serif;';
      box.innerHTML = `
        <div style="text-align:center;color:#B8893B;font-size:11px;letter-spacing:0.24em;font-weight:700;">PRE-DAY REMINDER</div>
        <div style="text-align:center;font-size:22px;font-weight:700;color:#0E0E0C;margin:8px 0 20px;">前日 20:00 に 自動 リマインド</div>
        <div style="display:flex;justify-content:center;gap:20px;align-items:center;">
          <div style="text-align:center;padding:16px 14px;background:#5A6B3F;color:#F2EDE3;border-radius:4px;min-width:200px;">
            <div style="font-size:10px;letter-spacing:0.18em;color:#F2EDE3;">TOMORROW</div>
            <div style="font-size:15px;font-weight:700;margin-top:4px;">山田 花 さん</div>
          </div>
          <div style="color:#C1462C;font-size:22px;">→</div>
          <div style="padding:14px 20px;background:#fff;border:2px solid #C1462C;border-radius:4px;font-size:13px;line-height:1.7;">
            <div style="font-weight:700;color:#0E0E0C;">明日 9-16 で 出勤 です</div>
            <div style="color:#6B6356;font-size:12px;margin-top:4px;">担当 タスク: 3 件</div>
          </div>
        </div>
        <div style="margin-top:22px;padding:14px;background:#fff;border-left:4px solid #B8893B;font-size:13px;color:#0E0E0C;line-height:1.7;">
          連絡 忘れ・出勤 忘れ を 完全 に 防ぐ、 24 時間 自動 稼働 の 仕組み
        </div>
      `;
      document.body.appendChild(box);
    });
    await p.waitForTimeout(3500);
    await highlight(p, '#ar-help-reminder', '前日 20 時 に 自動 送信', 7500);
    await p.waitForTimeout(7000);
    await p.evaluate(() => document.getElementById('ar-help-reminder')?.remove());
    await p.waitForTimeout(2000);
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
for (const f of features) {
  if (ONLY_ARG && !f.name.includes(ONLY_ARG)) continue;
  await reset(p);
  await injectHelper(p);
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
