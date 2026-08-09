// タスクル 提案動画 録画スクリプト
// editorial slide のみ (admin UI なし、 全編 slide)
// sunchlorella-line-demo の SL primitives 継承
import pwPkg from '/Users/tsukasayoshida/.skeleton-pegat/node_modules/playwright/index.js';
const { chromium } = pwPkg;
import { mkdirSync, readdirSync, renameSync, statSync, existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';

const OUT_DIR = '/Users/tsukasayoshida/Desktop/skeleton-demos/tasukuru-pitch/videos';
mkdirSync(OUT_DIR, { recursive: true });

// TTS タイムポイント
const TP = JSON.parse(readFileSync('/Users/tsukasayoshida/Desktop/skeleton-demos/tasukuru-pitch/audio/timepoints.json', 'utf8'));

// 章ごとの 累積 秒オフセット を 計算
let cumulOffset = 0;
const CH_OFFSET = {};
for (const name of ['01-issue','02-crm','03-segment','04-broadcast','05-analytics','06-kpi','07-close']) {
  CH_OFFSET[name] = cumulOffset;
  cumulOffset += TP[name].duration;
}

// ============================================================
// デザイン トークン
// ============================================================
const C = {
  bg:      'oklch(0.985 0.005 130)',
  bg2:     'oklch(0.965 0.010 130)',
  ink:     'oklch(0.18 0.010 130)',
  ink2:    'oklch(0.35 0.015 130)',
  ink3:    'oklch(0.55 0.018 130)',
  line:    'oklch(0.86 0.012 130)',
  // タスクル カラー: 明るいターコイズグリーン 寄り (CRM/LINE テック)
  accent:  'oklch(0.38 0.120 195)',   // deep teal
  accentT: 'oklch(0.96 0.020 195)',   // teal tint
  accentInk: 'oklch(0.22 0.090 195)',
  alert:   'oklch(0.42 0.140 27)',    // terracotta 課題キーワード
  alertT:  'oklch(0.96 0.020 27)',
  fBody:   "'Noto Sans JP','Hiragino Sans','Yu Gothic',system-ui,sans-serif",
  fNum:    "'Inter Tight','Inter',system-ui,sans-serif",
};

// chrome: header identity bar
const chrome = (section, ordinal) => `
  <div style="display:flex;align-items:baseline;gap:20px;padding-bottom:22px;border-bottom:1px solid ${C.line};margin-bottom:0;">
    <div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.10em;text-transform:uppercase;">Tasukuru · タスクル</div>
    <div style="flex:1;"></div>
    ${section ? `<div style="font-family:${C.fBody};font-size:13px;font-weight:500;color:${C.ink2};letter-spacing:0.02em;">${section}</div>` : ''}
    ${ordinal ? `<div style="font-family:${C.fNum};font-size:12px;font-weight:500;color:${C.ink2};letter-spacing:0.12em;">${ordinal}</div>` : ''}
  </div>`;

// reveal helper HTML 生成
const rv = (n, html, extraStyle='') =>
  `<div data-reveal="${n}" style="${extraStyle}">${html}</div>`;

// ============================================================
// Playwright init
// ============================================================
async function wait(p, ms) { await p.waitForTimeout(ms); }

// 章 mark → 絶対時刻 (録画開始 t0 相対)
function markSec(chName, markName) {
  const off = CH_OFFSET[chName];
  const t   = TP[chName].marks[markName];
  return off + t;
}

class Sync {
  constructor() { this.t0 = null; }
  start() { this.t0 = Date.now(); }
  async waitForAbs(p, absSec, offsetMs = 0) {
    const target = absSec - offsetMs / 1000;
    const elapsed = (Date.now() - this.t0) / 1000;
    const remain = target - elapsed;
    if (remain > 0.02) await wait(p, remain * 1000);
  }
  async waitForMark(p, chName, markName, offsetMs = 0) {
    return this.waitForAbs(p, markSec(chName, markName), offsetMs);
  }
}

// ============================================================
// スライド HTML 定義
// ============================================================

// --- Ch01 slide A: カバー (課題 直入り)
function slideCoverIssue() {
  return `
    ${chrome('', '')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.20em;text-transform:uppercase;margin-bottom:32px;">Proposal 2026</div>
      <h1 style="margin:0;font-family:${C.fBody};font-size:76px;font-weight:900;color:${C.ink};letter-spacing:-0.045em;line-height:1.08;text-wrap:balance;">
        一人ひとりを、<br>覚えている。
      </h1>
      <div style="margin-top:36px;font-family:${C.fBody};font-size:20px;font-weight:500;color:${C.ink2};letter-spacing:0.01em;line-height:1.75;">
        ラインで つながっている でも 顧客を 覚えていない<br>
        そんな 経営者のための CRM ツール
      </div>
      <div style="margin-top:48px;display:inline-flex;align-items:center;gap:16px;">
        <div style="font-family:${C.fNum};font-size:34px;font-weight:400;color:${C.accent};letter-spacing:-0.03em;">tasukuru</div>
        <div style="width:1px;height:28px;background:${C.line};"></div>
        <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink3};letter-spacing:0.04em;">タスクル</div>
      </div>
    </div>`;
}

// --- Ch01 slide B: 課題 3つ アジェンダ
function slideIssueAgenda() {
  return `
    ${chrome('課題提示', '')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};margin-bottom:40px;letter-spacing:0.01em;">
        中小サービス事業者が 抱える 課題は、 大きく <strong style="color:${C.ink};">3つ</strong> あります。
      </div>
      <div style="display:flex;flex-direction:column;gap:28px;">
        ${rv(1, `
          <div style="display:flex;align-items:flex-start;gap:20px;">
            <div style="font-family:${C.fNum};font-size:14px;font-weight:500;color:${C.ink3};letter-spacing:0.08em;padding-top:4px;min-width:36px;">01</div>
            <div>
              <div style="font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.45;letter-spacing:-0.01em;">1つ目は、 顧客情報がラインの友だちリストにしか残らず、<br>誰が誰だか わからなくなること。</div>
            </div>
          </div>`, 'transform:translateY(6px);')}
        ${rv(2, `
          <div style="display:flex;align-items:flex-start;gap:20px;">
            <div style="font-family:${C.fNum};font-size:14px;font-weight:500;color:${C.ink3};letter-spacing:0.08em;padding-top:4px;min-width:36px;">02</div>
            <div>
              <div style="font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.45;letter-spacing:-0.01em;">2つ目は、 「このお客さんに連絡したい」 と思っても、<br>まとめて送ることしか できないこと。</div>
            </div>
          </div>`, 'transform:translateY(6px);')}
        ${rv(3, `
          <div style="display:flex;align-items:flex-start;gap:20px;">
            <div style="font-family:${C.fNum};font-size:14px;font-weight:500;color:${C.ink3};letter-spacing:0.08em;padding-top:4px;min-width:36px;">03</div>
            <div>
              <div style="font-family:${C.fBody};font-size:22px;font-weight:700;color:${C.ink};line-height:1.45;letter-spacing:-0.01em;">3つ目は、 配信したあとで 誰が開封したか、<br>売上につながったか、 何もわからないこと。</div>
            </div>
          </div>`, 'transform:translateY(6px);')}
      </div>
    </div>`;
}

// --- Ch02 slide A: CRM 転入
function slideCrmIntro() {
  return `
    ${chrome('顧客管理', '01 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:28px;">Customer Management</div>
      <h2 style="margin:0;font-family:${C.fBody};font-size:64px;font-weight:900;color:${C.ink};letter-spacing:-0.04em;line-height:1.10;text-wrap:balance;">
        ラインで友だち追加されたら<br>自動で顧客として登録
      </h2>
      <div style="margin-top:32px;font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};line-height:1.80;max-width:60ch;">
        友だち追加の瞬間から、タスクルの顧客一覧に<br>自動で加わります。名前・来店日・メモを1画面で。
      </div>
    </div>`;
}

// --- Ch02 slide B: CRM 詳細 (stats + example)
function slideCrmDetail() {
  return `
    ${chrome('顧客管理', '01 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:36px;gap:36px;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;">
        ${[
          ['新規顧客', '34', '今月'],
          ['リピーター', '128', '累計'],
          ['来店回数', '214', '今月'],
          ['平均来店間隔', '18', '日'],
        ].map(([label, num, unit]) => `
          <div style="background:${C.bg2};border-radius:12px;padding:24px 20px;display:flex;flex-direction:column;gap:8px;">
            <div style="font-family:${C.fBody};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.03em;">${label}</div>
            <div style="display:flex;align-items:baseline;gap:6px;">
              <div style="font-family:${C.fNum};font-size:48px;font-weight:400;color:${C.accent};letter-spacing:-0.04em;line-height:1;">${num}</div>
              <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink3};">${unit}</div>
            </div>
          </div>`).join('')}
      </div>
      ${rv(1, `
        <div style="background:${C.accentT};border-radius:12px;padding:28px 32px;display:flex;flex-direction:column;gap:10px;">
          <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.accentInk};letter-spacing:0.03em;">利用シーン</div>
          <div style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.65;letter-spacing:-0.01em;">
            「先月 来てくれた 田中さんは どんなメニューだったっけ?」<br>
            → 名前で検索するだけで、 過去の記録が全部 出てきます。
          </div>
        </div>`, 'transform:translateY(6px);')}
    </div>`;
}

// --- Ch03 slide A: タグ転入
function slideSegmentIntro() {
  return `
    ${chrome('自動タグ・セグメント', '02 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:28px;">Auto Tag & Segment</div>
      <h2 style="margin:0;font-family:${C.fBody};font-size:64px;font-weight:900;color:${C.ink};letter-spacing:-0.04em;line-height:1.10;text-wrap:balance;">
        顧客を自動で<br>グループ分け
      </h2>
      <div style="margin-top:32px;font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};line-height:1.80;max-width:60ch;">
        お客さんの行動を見て、 タグを 自動でつけます。<br>
        タグの組み合わせで、 届けたい人だけに 絞り込めます。
      </div>
    </div>`;
}

// --- Ch03 slide B: タグ 3種 + セグメント デモ
function slideSegmentDetail() {
  return `
    ${chrome('自動タグ・セグメント', '02 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:32px;gap:28px;">
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${[
          ['3回以上来店', 'リピーター', 1],
          ['90日間来店なし', '休眠', 2],
          ['誕生月登録済み', '誕生月', 3],
        ].map(([cond, tag, n]) => rv(n, `
          <div style="display:flex;align-items:center;gap:16px;background:${C.bg2};border-radius:10px;padding:16px 24px;">
            <div style="font-family:${C.fBody};font-size:16px;font-weight:500;color:${C.ink2};min-width:200px;">${cond}</div>
            <div style="font-family:${C.fNum};font-size:12px;color:${C.ink3};">→ 自動タグ</div>
            <div style="font-family:${C.fBody};font-size:15px;font-weight:700;color:${C.accentInk};background:${C.accentT};padding:4px 14px;border-radius:20px;">${tag}</div>
          </div>`, 'transform:translateY(6px);')).join('')}
      </div>
      ${rv(4, `
        <div style="background:${C.accentT};border-radius:12px;padding:24px 32px;display:flex;align-items:center;gap:32px;">
          <div style="flex:1;">
            <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.accentInk};margin-bottom:8px;letter-spacing:0.02em;">セグメント絞り込み例</div>
            <div style="font-family:${C.fBody};font-size:19px;font-weight:700;color:${C.ink};line-height:1.55;">
              VIP かつ 30日以上来店なし
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-family:${C.fNum};font-size:72px;font-weight:400;color:${C.accent};letter-spacing:-0.05em;line-height:1;">7</div>
            <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink3};">名</div>
          </div>
        </div>`, 'transform:translateY(6px);')}
    </div>`;
}

// --- Ch04 slide A: 配信 転入
function slideBroadcastIntro() {
  return `
    ${chrome('一括配信', '03 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:28px;">Broadcast</div>
      <h2 style="margin:0;font-family:${C.fBody};font-size:64px;font-weight:900;color:${C.ink};letter-spacing:-0.04em;line-height:1.10;text-wrap:balance;">
        ライン と メールを<br>まとめて 送る
      </h2>
      <div style="margin-top:32px;font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};line-height:1.80;max-width:60ch;">
        絞り込んだ顧客だけに、 5ステップで 完結します。<br>
        ライン開封率は平均 <strong style="color:${C.ink};">65%</strong> を記録。
      </div>
    </div>`;
}

// --- Ch04 slide B: 5 STEP
function slideBroadcastSteps() {
  return `
    ${chrome('一括配信', '03 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:28px;gap:16px;">
      ${[
        ['01', '名前をつける', '配信キャンペーン名を入力'],
        ['02', '送る相手を選ぶ', 'セグメントから7名を選択'],
        ['03', 'メッセージを書く', 'ライン・メール同時作成可'],
        ['04', '配信日時を指定', '予約配信にも対応'],
        ['05', '確認して送信', 'これだけ'],
      ].map(([n, title, sub], i) => rv(i+1, `
        <div style="display:flex;align-items:center;gap:20px;background:${C.bg2};border-radius:10px;padding:16px 24px;">
          <div style="font-family:${C.fNum};font-size:24px;font-weight:400;color:${C.accent};letter-spacing:-0.02em;min-width:40px;">${n}</div>
          <div style="flex:1;">
            <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};letter-spacing:-0.01em;">${title}</div>
            <div style="font-family:${C.fBody};font-size:13px;font-weight:500;color:${C.ink3};margin-top:3px;">${sub}</div>
          </div>
        </div>`, 'transform:translateY(6px);')).join('')}
      ${rv(6, `
        <div style="background:${C.accentT};border-radius:10px;padding:14px 24px;font-family:${C.fBody};font-size:15px;font-weight:600;color:${C.accentInk};">
          ライン登録の顧客にはライン、それ以外にはメールが自動振り分けで届きます。
        </div>`, 'transform:translateY(6px);')}
    </div>`;
}

// --- Ch05 slide A: 効果測定 転入
function slideAnalyticsIntro() {
  return `
    ${chrome('効果測定', '04 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:28px;">Analytics</div>
      <h2 style="margin:0;font-family:${C.fBody};font-size:64px;font-weight:900;color:${C.ink};letter-spacing:-0.04em;line-height:1.10;text-wrap:balance;">
        送ったあとの結果が<br>リアルタイムで見える
      </h2>
      <div style="margin-top:32px;font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};line-height:1.80;max-width:60ch;">
        何人に届いて、何人が開封して、何人がタップしたか。<br>
        翌朝には数字が出ています。
      </div>
    </div>`;
}

// --- Ch05 slide B: 数字 詳細
function slideAnalyticsDetail() {
  return `
    ${chrome('効果測定', '04 / 04')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:36px;gap:36px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        ${rv(1, `
          <div style="background:${C.accentT};border-radius:12px;padding:28px 32px;">
            <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.accentInk};margin-bottom:12px;">ライン配信 開封率</div>
            <div style="display:flex;align-items:baseline;gap:8px;">
              <div style="font-family:${C.fNum};font-size:80px;font-weight:400;color:${C.accent};letter-spacing:-0.05em;line-height:1;">89</div>
              <div style="font-family:${C.fNum};font-size:28px;font-weight:400;color:${C.accent};letter-spacing:-0.02em;">%</div>
            </div>
          </div>`, 'transform:translateY(6px);')}
        ${rv(2, `
          <div style="background:${C.bg2};border-radius:12px;padding:28px 32px;">
            <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink3};margin-bottom:12px;">メール配信 開封率</div>
            <div style="display:flex;align-items:baseline;gap:8px;">
              <div style="font-family:${C.fNum};font-size:80px;font-weight:400;color:${C.ink};letter-spacing:-0.05em;line-height:1;">71</div>
              <div style="font-family:${C.fNum};font-size:28px;font-weight:400;color:${C.ink2};letter-spacing:-0.02em;">%</div>
            </div>
          </div>`, 'transform:translateY(6px);')}
      </div>
      ${rv(3, `
        <div style="background:${C.bg2};border-radius:12px;padding:24px 32px;">
          <div style="font-family:${C.fBody};font-size:16px;font-weight:700;color:${C.ink};margin-bottom:8px;">「送りっぱなしで何もわからない」 から脱出</div>
          <div style="font-family:${C.fBody};font-size:15px;font-weight:500;color:${C.ink2};line-height:1.75;">
            数字を見て次回の文面を改善する PDCAサイクルが、 タスクルで自然に回ります。
          </div>
        </div>`, 'transform:translateY(6px);')}
    </div>`;
}

// --- Ch06 slide: KPI 3つ
function slideKpi() {
  return `
    ${chrome('導入効果', '')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <div style="font-family:${C.fBody};font-size:17px;font-weight:500;color:${C.ink2};margin-bottom:44px;letter-spacing:0.01em;">
        導入事業者で確認された 3つの 変化
      </div>
      <div style="display:flex;flex-direction:column;gap:24px;">
        ${[
          ['工数', '-80%', '顧客対応の手作業が8割消える', '個別送り分け・顧客検索の自動化'],
          ['離脱率', '-18%', 'リピーター離脱が18%低下', '休眠顧客への自動フォローが途切れない'],
          ['LTV', '+23%', '顧客生涯購入額が23%向上', '一人ひとりのタイミングで届くメッセージが再来店を促す'],
        ].map(([label, num, title, reason], i) => rv(i+1, `
          <div style="display:flex;align-items:center;gap:28px;background:${C.bg2};border-radius:12px;padding:20px 28px;">
            <div style="min-width:72px;text-align:center;">
              <div style="font-family:${C.fNum};font-size:36px;font-weight:400;color:${i===0?C.accent:(i===1?C.alert:C.accent)};letter-spacing:-0.03em;line-height:1;">${num}</div>
              <div style="font-family:${C.fBody};font-size:12px;font-weight:500;color:${C.ink3};margin-top:4px;">${label}</div>
            </div>
            <div style="width:1px;height:44px;background:${C.line};"></div>
            <div style="flex:1;">
              <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};letter-spacing:-0.01em;margin-bottom:5px;">${title}</div>
              <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink3};line-height:1.65;">${reason}</div>
            </div>
          </div>`, 'transform:translateY(6px);')).join('')}
      </div>
    </div>`;
}

// --- Ch07 slide: PoC 提案
function slidePoc() {
  return `
    ${chrome('30日 無料トライアル', '')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:0;">
      <h2 style="margin:0 0 40px;font-family:${C.fBody};font-size:60px;font-weight:900;color:${C.ink};letter-spacing:-0.04em;line-height:1.10;text-wrap:balance;">
        まず 30日間、<br>すべての機能を 無料で。
      </h2>
      <div style="display:flex;flex-direction:column;gap:20px;">
        ${rv(1, `
          <div style="display:flex;align-items:flex-start;gap:16px;background:${C.accentT};border-radius:12px;padding:22px 28px;">
            <div style="font-family:${C.fNum};font-size:20px;font-weight:400;color:${C.accent};min-width:28px;line-height:1.3;">1</div>
            <div>
              <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};margin-bottom:6px;">設定から最初の配信まで、一緒に進めます</div>
              <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink2};line-height:1.65;">
                導入設定はわたしたちがサポート。<br>「難しそうで続かない」がないよう、初回配信まで完走できる体制を用意しています。
              </div>
            </div>
          </div>`, 'transform:translateY(6px);')}
        ${rv(2, `
          <div style="display:flex;align-items:flex-start;gap:16px;background:${C.bg2};border-radius:12px;padding:22px 28px;">
            <div style="font-family:${C.fNum};font-size:20px;font-weight:400;color:${C.ink3};min-width:28px;line-height:1.3;">2</div>
            <div>
              <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};margin-bottom:6px;">ラインでいつでも質問できます</div>
              <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink2};line-height:1.65;">
                サポート専用のラインを用意しています。設定の疑問から使い方まで、何でも聞いてください。
              </div>
            </div>
          </div>`, 'transform:translateY(6px);')}
        ${rv(3, `
          <div style="display:flex;align-items:flex-start;gap:16px;background:${C.bg2};border-radius:12px;padding:22px 28px;">
            <div style="font-family:${C.fNum};font-size:20px;font-weight:400;color:${C.ink3};min-width:28px;line-height:1.3;">3</div>
            <div>
              <div style="font-family:${C.fBody};font-size:17px;font-weight:700;color:${C.ink};margin-bottom:6px;">合わなければ、そこで止めて構いません</div>
              <div style="font-family:${C.fBody};font-size:14px;font-weight:500;color:${C.ink2};line-height:1.65;">
                30日使ってみて「合わない」と思えば縛りなし。まず一度、動いているところを見てください。
              </div>
            </div>
          </div>`, 'transform:translateY(6px);')}
      </div>
    </div>`;
}

// --- Ch07 slide fin: クロージング キャッチ
function slideClose() {
  return `
    ${chrome('', '')}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:0;">
      <div style="font-family:${C.fNum};font-size:13px;font-weight:500;color:${C.ink3};letter-spacing:0.20em;text-transform:uppercase;margin-bottom:32px;">tasukuru</div>
      <h1 style="margin:0;font-family:${C.fBody};font-size:72px;font-weight:900;color:${C.ink};letter-spacing:-0.045em;line-height:1.08;text-wrap:balance;">
        一人ひとりを、<br>覚えている ツール。
      </h1>
      <div style="margin-top:44px;font-family:${C.fBody};font-size:18px;font-weight:500;color:${C.ink2};line-height:1.80;">
        あなたの事業の顧客データを タスクルに入れて、<br>
        動いているところを 一度 見てください。
      </div>
    </div>`;
}

// ============================================================
// メイン 録画
// ============================================================
async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  // blank HTML ページを HTTP サーバー なしで 直接 表示
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });

  const p = await context.newPage();

  // 最小限の blank ページ (about:blank だと slide inject が動く)
  await p.goto('about:blank');
  await p.setContent(`<!doctype html><html><head>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter+Tight:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      html,body{width:1280px;height:720px;background:oklch(0.985 0.005 130);overflow:hidden;
      -webkit-font-smoothing:antialiased;font-feature-settings:'palt' 1;}
    </style>
  </head><body></body></html>`);

  // fonts preload
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => {
    try {
      await Promise.all([
        document.fonts.load('900 88px "Noto Sans JP"'),
        document.fonts.load('700 24px "Noto Sans JP"'),
        document.fonts.load('500 16px "Noto Sans JP"'),
        document.fonts.load('400 88px "Inter Tight"'),
      ]);
    } catch(_) {}
  });

  // SL primitives inject
  await injectHelper(p);

  const sync = new Sync();

  // preload 計測
  const recordStart = Date.now();

  // 最初のスライドを事前に出しておく (preload 間 に 表示)
  await p.evaluate(async (html) => {
    await window.scHelp.slide(html);
  }, slideCoverIssue());

  sync.start();
  const t0 = Date.now();
  const preloadSec = (t0 - recordStart) / 1000;
  console.log(`preload: ${preloadSec.toFixed(2)}s`);

  // ============================================================
  // Ch01: 課題 提示
  // ============================================================
  // カバー スライド は 既に 表示中、 intro_end まで 待機
  await sync.waitForMark(p, '01-issue', 'intro_end', 200);

  // 課題 アジェンダ スライドへ
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideIssueAgenda());

  await sync.waitForMark(p, '01-issue', 'agenda_1', 150);
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '01-issue', 'agenda_2', 150);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '01-issue', 'agenda_3', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '01-issue', 'agenda_end');

  // ============================================================
  // Ch02: CRM
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideCrmIntro());

  await sync.waitForMark(p, '02-crm', 'auto_add', 200);
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideCrmDetail());

  await sync.waitForMark(p, '02-crm', 'example_intro', 150);
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '02-crm', 'end');

  // ============================================================
  // Ch03: セグメント
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideSegmentIntro());

  await sync.waitForMark(p, '03-segment', 'tag_1', 200);
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideSegmentDetail());
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '03-segment', 'tag_2', 150);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '03-segment', 'tag_3', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '03-segment', 'segment_demo', 150);
  await p.evaluate(() => window.scHelp.reveal(4));

  await sync.waitForMark(p, '03-segment', 'end');

  // ============================================================
  // Ch04: 配信
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideBroadcastIntro());

  await sync.waitForMark(p, '04-broadcast', 'step_1', 200);
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideBroadcastSteps());
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '04-broadcast', 'step_2', 150);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '04-broadcast', 'step_3', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '04-broadcast', 'step_4', 150);
  await p.evaluate(() => window.scHelp.reveal(4));

  await sync.waitForMark(p, '04-broadcast', 'step_5', 150);
  await p.evaluate(() => window.scHelp.reveal(5));

  await sync.waitForMark(p, '04-broadcast', 'channel_switch', 150);
  await p.evaluate(() => window.scHelp.reveal(6));

  await sync.waitForMark(p, '04-broadcast', 'end');

  // ============================================================
  // Ch05: 効果測定
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideAnalyticsIntro());

  await sync.waitForMark(p, '05-analytics', 'example_intro', 200);
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideAnalyticsDetail());

  await sync.waitForMark(p, '05-analytics', 'example_numbers', 150);
  await p.evaluate(() => window.scHelp.reveal(1));
  await wait(p, 400);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '05-analytics', 'pdca_intro', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '05-analytics', 'end');

  // ============================================================
  // Ch06: KPI
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideKpi());

  await sync.waitForMark(p, '06-kpi', 'kpi_1', 150);
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '06-kpi', 'kpi_2', 150);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '06-kpi', 'kpi_3', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '06-kpi', 'end');

  // ============================================================
  // Ch07: PoC + Close
  // ============================================================
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slidePoc());

  await sync.waitForMark(p, '07-close', 'poc_intro', 150);
  await p.evaluate(() => window.scHelp.reveal(1));

  await sync.waitForMark(p, '07-close', 'support_detail', 150);
  await p.evaluate(() => window.scHelp.reveal(2));

  await sync.waitForMark(p, '07-close', 'no_lock', 150);
  await p.evaluate(() => window.scHelp.reveal(3));

  await sync.waitForMark(p, '07-close', 'cta', 200);
  await p.evaluate(async (html) => { await window.scHelp.slide(html); }, slideClose());

  await sync.waitForMark(p, '07-close', 'end');

  // 末尾 余白
  await wait(p, 1200);

  // ============================================================
  // 後始末
  // ============================================================
  const totalMs = Date.now() - t0;
  console.log(`total recorded: ${(totalMs/1000).toFixed(1)}s`);

  await context.close();
  await browser.close();

  // webm を _all.webm に rename
  const files = readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const newest = files
      .map(f => ({ f, mtime: statSync(`${OUT_DIR}/${f}`).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime)[0].f;
    const dest = `${OUT_DIR}/_all.webm`;
    if (existsSync(dest)) unlinkSync(dest);
    renameSync(`${OUT_DIR}/${newest}`, dest);
    console.log(`webm: ${newest} -> _all.webm`);
  }

  writeFileSync(`${OUT_DIR}/_timeline.json`, JSON.stringify({ preloadSec: preloadSec.toFixed(3) }, null, 2));
  console.log('done');
}

// ============================================================
// injectHelper (sunchlorella パターン から コピー)
// ============================================================
const HIGHLIGHT_CSS = `
body { transition: transform 0.7s cubic-bezier(.4,0,.2,1); }
.sc-slide {
  position: fixed !important; inset: 0 !important; z-index: 2147483647 !important;
  background: oklch(0.985 0.005 130) !important;
  display: flex !important; flex-direction: column !important;
  padding: 48px 72px 44px !important; overflow: hidden !important;
  font-feature-settings: 'palt' 1 !important;
}
`;

async function injectHelper(p) {
  await p.evaluate((css) => {
    if (window.scHelp) return;
    window.scHelp = {};
    let style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    window.scHelp.slide = async (html) => {
      if (!document.getElementById('sc-fonts')) {
        const l = document.createElement('link');
        l.id = 'sc-fonts'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Inter+Tight:wght@300;400;500;700&display=swap';
        document.head.appendChild(l);
      }
      try {
        await document.fonts.load('900 64px "Noto Sans JP"');
        await document.fonts.load('400 80px "Inter Tight"');
        await document.fonts.ready;
      } catch(_) {}

      const existing = Array.from(document.querySelectorAll('.sc-slide'));
      const el = document.createElement('div');
      el.className = 'sc-slide';
      el.style.cssText = [
        'position:fixed','inset:0','z-index:2147483647',
        'background:oklch(0.985 0.005 130)',
        "font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',system-ui,sans-serif",
        'color:oklch(0.18 0.010 130)',
        'display:flex','flex-direction:column',
        'padding:48px 72px 44px','overflow:hidden',
        'opacity:0','transition:opacity .35s ease-out',
        "font-feature-settings:'palt' 1",
      ].join(';');
      el.innerHTML = html;
      el.querySelectorAll('[data-reveal]').forEach(x => {
        x.style.opacity = '0';
        x.style.transform = 'translateY(6px)';
        x.style.transition = 'opacity .15s ease-out, transform .18s cubic-bezier(.2,.8,.4,1)';
      });
      document.body.appendChild(el);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.style.opacity = '1';
      existing.forEach(old => {
        old.style.transition = 'opacity .30s ease-out';
        old.style.opacity = '0';
        setTimeout(() => { try { old.remove(); } catch(_) {} }, 320);
      });
      await new Promise(r => setTimeout(r, 360));
      return el;
    };

    window.scHelp.reveal = (n) => {
      document.querySelectorAll(`.sc-slide [data-reveal="${n}"]`).forEach(x => {
        x.style.opacity = '1';
        x.style.transform = 'translateY(0)';
      });
    };

    window.scHelp.revealAll = () => {
      document.querySelectorAll('.sc-slide [data-reveal]').forEach(x => {
        x.style.opacity = '1'; x.style.transform = 'translateY(0)';
      });
    };
  }, HIGHLIGHT_CSS);
}

main().catch(e => { console.error(e); process.exit(1); });
