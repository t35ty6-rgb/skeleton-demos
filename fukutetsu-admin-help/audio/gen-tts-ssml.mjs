// 福鉄 さんぽ帳 richmenu admin 使い方動画 — 音声生成
// Neural2-C (女性) / SSML mark / 44100Hz MP3
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/fukutetsu-admin-help/audio';
const VOICE = 'ja-JP-Neural2-C';
const RATE = 1.05;
const PROJECT = 'skeleton-skel-ec-2606';

const CHAPTERS = [
  // ──────────────────────────────────────────────────────────────
  // Ch01: オープニング (10-15s)
  // ──────────────────────────────────────────────────────────────
  { name: '01-opening', phrases: [
    { text: 'こんにちは。 福鉄 さんぽ帳 の 管理画面、 リッチメニュー admin パネル の 使い方を ご説明します。' },
    { mark: 'intro_end' },
    { text: 'この ツールを 使うと、 LINE アプリ の 底面 に 表示される リッチメニュー を、 パソコンから 自由に 設定、 切り替えることが できます。' },
    { mark: 'purpose_end' },
    { text: '説明する 機能は、 大きく 3つ あります。' },
    { mark: 'agenda_intro' },
    { text: '1つ目は、 画面の 全体構成 の ご説明。' },
    { mark: 'agenda_1' },
    { text: '2つ目は、 タブ切替式 リッチメニュー の 設定方法。' },
    { mark: 'agenda_2' },
    { text: '3つ目は、 LINE に 反映 する 手順 と、 その他の セクション の 確認。' },
    { mark: 'agenda_3' },
    { text: 'それでは、 1つずつ ご案内 します。' },
    { mark: 'agenda_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch02: 画面全体の構成 (30s)
  // ──────────────────────────────────────────────────────────────
  { name: '02-layout', phrases: [
    { text: 'まず、 1つ目。 画面の 全体構成 について です。' },
    { mark: 'title_end' },
    { text: 'この 管理画面は、 大きく 3つの エリアに 分かれています。' },
    { mark: 'layout_intro' },
    { text: '左側の サイドバー は、 リッチメニュー、 景品、 ルーレット、 スポット、 一般設定 と いった セクションを 切り替える ナビゲーション です。' },
    { mark: 'sidebar_end' },
    { text: '中央の エリアは、 現在 選択中の セクションの 設定フォーム です。 タイトル、 テンプレート、 背景画像、 アクション など を ここで 入力 します。' },
    { mark: 'center_end' },
    { text: '右側の エリアは、 スマートフォン の 画面 を イメージ した プレビュー です。 設定を 変更すると、 ここに 即 座に 反映されます。' },
    { mark: 'preview_end' },
    { text: '画面上部 には、 「プレビュー確認」 と 「LINE に 反映」 の 2つの ボタンが 常に 表示 されています。 設定が 終わったら、 右上の 「LINE に 反映」 を 押します。' },
    { mark: 'topbar_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch03: メインタブ機能 (60s)
  // ──────────────────────────────────────────────────────────────
  { name: '03-tabs', phrases: [
    { text: '次に、 2つ目。 タブ切替式 リッチメニュー の 設定方法 です。' },
    { mark: 'title_end' },
    { text: 'まず、 タブ切替とは 何か を ご説明 します。' },
    { mark: 'concept_intro' },
    { text: 'LINE アプリの 通常の リッチメニューは、 1種類 の メニュー しか 表示 できません。' },
    { mark: 'single_end' },
    { text: 'しかし この ツールを 使うと、 1つの リッチメニューの 底面に タブバー を 追加し、 タップするだけで 複数の メニューを 切り替える ことが できます。' },
    { mark: 'multi_end' },
    { text: 'たとえば、 「スタンプラリー」 タブ、 「景品交換」 タブ、 「ルーレット」 タブ の 3種類を 底面に 並べ、 タップで 即 切替 できる イメージ です。' },
    { mark: 'example_end' },
    { text: 'では、 実際の 設定方法を 見ていきましょう。' },
    { mark: 'howto_intro' },
    { text: '中央の フォームに 「タブ機能」 という カードが あります。 ここで、 タブの 数を 1個 から 4個 まで 選択 できます。' },
    { mark: 'seg_end' },
    { text: '3個 を 選ぶと、 タブ 1、 タブ 2、 タブ 3 の 見出しが 現れ、 それぞれを クリック して 個別に 設定できる ようになります。' },
    { mark: 'tabs_appear' },
    { text: '各タブは、 完全に 独立した リッチメニュー として 機能します。 テンプレート、 背景画像、 アクション、 それぞれ 別々に 設定できます。' },
    { mark: 'tabs_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch04: タブごとの設定 (90s)
  // ──────────────────────────────────────────────────────────────
  { name: '04-tab-settings', phrases: [
    { text: '続いて、 各タブの 詳細な 設定方法 です。' },
    { mark: 'title_end' },
    { text: 'タブを 選択すると、 基本情報の 設定エリアが 表示されます。 設定項目は 4つ あります。' },
    { mark: 'fields_intro' },
    { text: 'まず 「タイトル」。 これは 管理画面の 中でのみ 使う 識別名 です。 例えば 「スポット一覧」 など、 自分が 分かりやすい 名前を 付けてください。 LINE アプリには 表示されません。' },
    { mark: 'title_field_end' },
    { text: '次に 「メニューバーのテキスト」。 これは LINE アプリの 下部タブに 表示される 文字です。 最大 14文字 まで 入力できます。' },
    { mark: 'menubar_end' },
    { text: '「表示期間」 は、 期間限定で 表示したい 場合に 開始日と 終了日を 設定します。 通常は 「無期限」 にチェックを 入れてください。' },
    { mark: 'period_end' },
    { text: '「デフォルト表示」 を 「表示する」 にすると、 お客様が トークルームを 開いた 瞬間に リッチメニューが 自動で 展開されます。' },
    { mark: 'default_end' },
    { text: '次は テンプレート の 選択です。' },
    { mark: 'template_intro' },
    { text: 'テンプレートは 合計 15種類 あります。 大きいサイズが 12種、 小さいサイズが 3種です。' },
    { mark: 'template_count' },
    { text: '特殊な 配置として、 上3エリア と 下4エリア の 非対称 テンプレートや、 上4エリアと 下3エリアの 逆パターンも 使えます。' },
    { mark: 'template_asymm' },
    { text: 'テンプレートを 選ぶと、 右側の プレビューが 即座に 更新されます。' },
    { mark: 'template_end' },
    { text: '続いて 背景画像の 設定 です。 2つの モードが あります。' },
    { mark: 'bg_intro' },
    { text: '「エリアごとに 配置」 モードでは、 テンプレートの 各エリアに 個別の 画像を アップロード できます。 エリアをクリックするか、 ドラッグ &amp; ドロップで 画像を 設定します。' },
    { mark: 'bg_area_end' },
    { text: '「全体に 1枚」 モードでは、 1枚の 大きな 画像を リッチメニュー全体に 表示します。 アップロード後、 ズームスライダー や ドラッグで 表示位置を 細かく 調整できます。' },
    { mark: 'bg_full_end' },
    { text: '最後に アクション の 設定です。 各エリアを タップした 時に 何が 起きるかを 設定します。 LIFF の URLや 外部サイトの URLを 入力するか、 LINE内で テキストを 自動送信する 設定も できます。' },
    { mark: 'action_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch05: LINE への反映 (30s)
  // ──────────────────────────────────────────────────────────────
  { name: '05-apply', phrases: [
    { text: 'では、 設定が 終わったら 「LINE に 反映」 の 手順 です。' },
    { mark: 'title_end' },
    { text: '右上の 「LINE に 反映」 ボタンを クリックします。 未設定の タブが ある 場合は 確認の ダイアログが 出ますが、 そのまま 続行 して 問題ありません。' },
    { mark: 'click_end' },
    { text: 'クリックすると、 設定ファイル が 自動的に ダウンロードフォルダ に 保存されます。' },
    { mark: 'download_end' },
    { text: '30秒以内 に、 裏で 動いている 監視プログラムが ファイルを 検知し、 LINE の API に 自動で アップロード します。 完了すると、 LINE から 通知が 届きます。' },
    { mark: 'auto_end' },
    { text: '反映を 確認するには、 スマートフォンで LINE アプリを 完全終了 してから 再起動 してください。 アプリ スイッチャーで 上に スワイプして 終了 します。' },
    { mark: 'restart_end' },
    { text: '再起動後、 福鉄 さんぽ帳 の トーク を 開き、 「メニュー」 を タップすると、 底面に タブバー が 表示され、 タップで 切り替えが できます。' },
    { mark: 'confirm_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch06: 他のセクション (30s)
  // ──────────────────────────────────────────────────────────────
  { name: '06-other-sections', phrases: [
    { text: '最後に、 リッチメニュー 以外の セクション を 簡単に ご紹介 します。' },
    { mark: 'title_end' },
    { text: '「景品」 セクションでは、 スタンプ 4個、 7個、 10個 達成時の 景品情報 を 設定 できます。 景品名、 説明、 引換場所 などを 入力します。' },
    { mark: 'prize_end' },
    { text: '「ルーレット」 セクションでは、 6つの 枠の 内容、 色、 確率を 設定します。 確率の 合計が 100パーセントに なるよう、 自動調整 ボタンも 用意しています。' },
    { mark: 'roulette_end' },
    { text: '「スポット」 セクションでは、 10か所の 観光スポット の 写真、 名称、 説明を 管理 できます。 写真は ドラッグ &amp; ドロップで 一括 アップロード でき、 ファイル名の 番号で 自動的に スポットに 割り当てられます。' },
    { mark: 'spot_end' },
    { text: '「一般設定」 では、 キャンペーン名 や チャンネルアクセストークン など の 基本情報を 設定 します。' },
    { mark: 'general_end' },
  ]},

  // ──────────────────────────────────────────────────────────────
  // Ch07: エンディング (15s)
  // ──────────────────────────────────────────────────────────────
  { name: '07-ending', phrases: [
    { text: '以上が、 福鉄 さんぽ帳 admin パネル の 使い方です。' },
    { mark: 'title_end' },
    { text: 'admin パネルの URL は、 動画の 概要欄 に 記載 しています。 このURLから いつでも 設定を 変更 できます。' },
    { mark: 'url_end' },
    { text: '反映後、 LINE が 変わっていない 場合は、 まず LINE アプリを 完全終了 してから 再起動 してください。 それでも 変わらない 場合は、 担当者 に お問い合わせ ください。' },
    { mark: 'trouble_end' },
    { text: 'ご確認 ありがとう ございました。' },
    { mark: 'end' },
  ]},
];

function buildSsml(phrases) {
  const body = phrases.map(p => {
    if (p.mark) return `<mark name="${p.mark}"/>`;
    return p.text.replace(/&(?!amp;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }).join('');
  return `<speak><prosody rate="${RATE}">${body}</prosody></speak>`;
}

async function synthesizeChapter(ch) {
  const ssml = buildSsml(ch.phrases);
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const body = JSON.stringify({
    input: { ssml },
    voice: { languageCode: 'ja-JP', name: VOICE },
    audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 44100 },
    enableTimePointing: ['SSML_MARK'],
  });
  const resp = await fetch('https://texttospeech.googleapis.com/v1beta1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'x-goog-user-project': PROJECT,
    },
    body,
  });
  const json = await resp.json();
  if (!json.audioContent) {
    throw new Error(`TTS failed for ${ch.name}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const mp3Path = `${OUT}/${ch.name}.mp3`;
  writeFileSync(mp3Path, Buffer.from(json.audioContent, 'base64'));
  const marks = {};
  for (const tp of (json.timepoints || [])) marks[tp.markName] = tp.timeSeconds;
  return { mp3Path, marks };
}

const ONLY = process.argv[2] || '';
const timepoints = {};
for (const ch of CHAPTERS) {
  if (ONLY && !ch.name.includes(ONLY)) continue;
  process.stdout.write(`  ${ch.name}... `);
  const r = await synthesizeChapter(ch);
  const dur = parseFloat(execSync(`ffprobe -i "${r.mp3Path}" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
  timepoints[ch.name] = { duration: dur, marks: r.marks };
  const nMarks = Object.keys(r.marks).length;
  console.log(`done ${dur.toFixed(1)}s (${nMarks} marks)`);
}

writeFileSync(`${OUT}/timepoints.json`, JSON.stringify(timepoints, null, 2));
console.log('\ntimepoints.json saved');

// merge all chapters to full mp3
console.log('\n=== merging ===');
const { existsSync } = await import('node:fs');
const listPath = '/tmp/fk-concat.txt';
const CHAPTERS_MERGED = ONLY ? CHAPTERS.filter(c => c.name.includes(ONLY)) : CHAPTERS;
const files = CHAPTERS_MERGED.map(c => `file '${OUT}/${c.name}.mp3'`).join('\n');
writeFileSync(listPath, files);
execSync(`ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${OUT}/narration-full.mp3 2>/dev/null`);
const totalDur = parseFloat(execSync(`ffprobe -i "${OUT}/narration-full.mp3" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
console.log(`  narration-full.mp3: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)} min)`);
