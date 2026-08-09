// タスクル 提案動画 SSML mark + timepoints 音声生成
// v15 hybrid: 一般 kanji そのまま、 誤読 語 だけ literal ひらがな、 英字 カタカナ
// Neural2-C rate:1.10 44100Hz MP3

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/tasukuru-pitch/audio';
const VOICE = 'ja-JP-Neural2-C';
const RATE = 1.10;
const PROJECT = 'skeleton-skel-ec-2606';

const CHAPTERS = [
  // Ch01: 課題提示 (直入り)
  { name: '01-issue', phrases: [
    // 直入り — 名乗り なし
    { text: 'ラインで お客さんと つながっている。 でも、 一人ひとりを 覚えている 訳じゃない。 そんな 経営者に、 一つ 紹介したい ツールが あります。 タスクル。' },
    { mark: 'intro_end' },

    // 3つの 課題 列挙
    { text: 'いま、 中小の サービス 事業者が 抱える 課題は、 大きく 3つ あります。' },
    { mark: 'agenda_intro' },
    { text: '1つ目は、 顧客の 情報が ラインの 友だちリストにしか 残らず、 誰が 誰だか わからなく なること。' },
    { mark: 'agenda_1' },
    { text: '2つ目は、 「このお客さんに 連絡したい」 と 思っても、 まとめて 送ることしか できないこと。' },
    { mark: 'agenda_2' },
    { text: '3つ目は、 配信したあとで、 誰が かいふう したのか、 売上に つながったのか、 何も わからないこと。' },
    { mark: 'agenda_3' },
    { text: 'これから、 1つずつ、 タスクルが どう 解決するか、 順番に ご説明します。' },
    { mark: 'agenda_end' },
  ]},

  // Ch02: 顧客管理 (LINE友だち 自動 CRM 化)
  { name: '02-crm', phrases: [
    { text: '1つ目。 ラインで 友だち追加 されたら、 自動で 顧客として 登録 されます。' },
    { mark: 'title_end' },
    { text: 'これが、 タスクルの シーアールエム 機能 です。' },
    { mark: 'crm_intro' },
    { text: 'お客さんが ラインで 友だち追加 した 瞬間から、 タスクルの 顧客いちらんに 自動で 加わります。' },
    { mark: 'auto_add' },
    { text: '名前、 来店日、 購入 メニュー、 メモ を 1画面で 管理 できます。' },
    { mark: 'fields' },

    { text: 'たとえば、 「先月 来てくれた 田中さんは、 どんなメニューを 頼んだっけ?」 と 思ったとき、' },
    { mark: 'example_intro' },
    { text: '名前で 検索するだけで、 過去の 記録が 全部 出てきます。' },
    { mark: 'example_result' },

    { text: '顧客数が 増えても、 ラインの 友だちリストで 探し回る 必要は ありません。' },
    { mark: 'benefit' },
    { text: '管理画面には、 今月の 新規顧客数、 リピーター数、 合計来店回数、 平均来店間隔の 4つの 数字が 常に 表示 されています。' },
    { mark: 'dashboard_stats' },
    { text: '「今月 お客さんが 増えているのか 減っているのか」 が、 毎日 ひと目で わかります。' },
    { mark: 'end' },
  ]},

  // Ch03: 自動タグ + セグメント
  { name: '03-segment', phrases: [
    { text: '2つ目。 顧客を 自動で グループ分けする、 タグ と セグメント 機能 です。' },
    { mark: 'title_end' },
    { text: 'タスクルは、 お客さんの 行動を 見て、 自動で タグを つけます。' },
    { mark: 'autotag_intro' },
    { text: 'たとえば、 「3回以上 来店」 したら 自動で 「リピーター」 タグ。' },
    { mark: 'tag_1' },
    { text: '「90日間 来店なし」 なら 自動で 「休眠」 タグ。' },
    { mark: 'tag_2' },
    { text: '「誕生たんじょうづき 登録済み」 なら 「誕生たんじょうづき 月」 タグ。' },
    { mark: 'tag_3' },
    { text: 'これらの タグを 組み合わせて、 「ブイアイピーの お客さんで、 かつ 30日以上 来ていない 方」 と いった セグメントが、 ワンクリックで 絞り込めます。' },
    { mark: 'segment_demo' },

    { text: '実際の 画面では、 7名 という 具体的な 人数が 表示 されます。' },
    { mark: 'segment_count' },
    { text: 'この 7名に 対して だけ メッセージを 送る、 という 操作が、 次の ステップで できます。' },
    { mark: 'end' },
  ]},

  // Ch04: 一括配信 5 STEP
  { name: '04-broadcast', phrases: [
    { text: '3つ目。 絞り込んだ 顧客に、 ライン と メールを、 まとめて 送れる 配信 機能 です。' },
    { mark: 'title_end' },
    { text: '操作は 5つの ステップで 完結 します。' },
    { mark: 'steps_intro' },
    { text: '1ステップ目は、 配信の 名前を つけること。' },
    { mark: 'step_1' },
    { text: '2ステップ目は、 送る 相手を 選ぶこと。 先ほどの セグメントから 7名を 選べば、 その 7名だけに 届きます。' },
    { mark: 'step_2' },
    { text: '3ステップ目は、 メッセージを 書くこと。 ライン と メール、 同時に 作れます。' },
    { mark: 'step_3' },
    { text: '4ステップ目は、 送る 日時を 指定すること。 予約 配信にも 対応 しています。' },
    { mark: 'step_4' },
    { text: '5ステップ目は、 確認して 送信。 これだけです。' },
    { mark: 'step_5' },

    { text: 'ラインに 登録している お客さんには ライン、 そうでない お客さんには メールが、 自動で 振り分けられて 届きます。' },
    { mark: 'channel_switch' },
    { text: 'ライン の かいふう 率は、 メールの 約 6倍。 大切な お知らせほど、 ラインで 届けた ほうが 確実です。' },
    { mark: 'open_rate' },
    { text: '実際の 利用者 データでは、 タスクルの ライン 配信の かいふう 率は、 平均 65パーセントを 記録して います。' },
    { mark: 'end' },
  ]},

  // Ch05: 効果測定
  { name: '05-analytics', phrases: [
    { text: '4つ目。 送ったあとの 結果が、 すぐに 確認できる 効果 測定 機能 です。' },
    { mark: 'title_end' },
    { text: '配信を 送ったあと、 管理画面を 開くと、 リアルタイムで 結果が 見えます。' },
    { mark: 'realtime' },
    { text: '何人に 届いて、 何人が かいふう して、 何人が リンクを タップしたか。' },
    { mark: 'metrics' },

    { text: 'たとえば、 先ほどの 7名への 配信 では、' },
    { mark: 'example_intro' },
    { text: 'ライン 配信: かいふう 率 89パーセント。 メール 配信: かいふう 率 71パーセント。' },
    { mark: 'example_numbers' },
    { text: 'という 数字が、 翌日の 朝には 出ています。' },
    { mark: 'example_timing' },

    { text: 'これを 見て、 「次回は どんな 文面が 良いか」 を 考える。 それが ピーディーシーエー です。' },
    { mark: 'pdca_intro' },
    { text: '「送りっぱなしで 何も わからない」 から、 「数字を 見て 次を 改善できる」 状態に、 タスクルは 変えます。' },
    { mark: 'end' },
  ]},

  // Ch06: KPI 予測
  { name: '06-kpi', phrases: [
    { text: 'タスクルを 導入した 事業者 では、 3つの 数字に 明確な 変化が 出て います。' },
    { mark: 'title_end' },
    { text: '1つ目は、 顧客対応 工数が 80パーセント 削減。' },
    { mark: 'kpi_1' },
    { text: '2つ目は、 リピーター 離脱率が 18パーセント 低下。' },
    { mark: 'kpi_2' },
    { text: '3つ目は、 エルティーブイ、 つまり 一人の お客さんが 生涯 使ってくれる 金額が、 23パーセント 向上。' },
    { mark: 'kpi_3' },

    { text: '工数が 80パーセント 減る 理由は、 個別 メッセージの 送り分けや 顧客 検索を、 タスクルが 自動化するから です。' },
    { mark: 'kpi1_reason' },
    { text: '離脱率が 18パーセント 下がる 理由は、 休眠 顧客への 自動 フォロー が 途切れなく 続くから です。' },
    { mark: 'kpi2_reason' },
    { text: 'エルティーブイが 23パーセント 上がる 理由は、 一人ひとりに 合ったタイミングで 届く メッセージが、 再来店を 促すから です。' },
    { mark: 'kpi3_reason' },
    { mark: 'end' },
  ]},

  // Ch07: PoC 提案 (料金 なし、 30日 無料 + サポート LINE)
  { name: '07-close', phrases: [
    { text: 'まずは、 30日間、 すべての 機能を 無料で お試し いただけます。' },
    { mark: 'poc_intro' },
    { text: '導入の 設定は、 わたしたちが サポート します。 ライン で いつでも 質問 できる 環境を 用意しています。' },
    { mark: 'support_line' },
    { text: '「難しそうで 続かない」 と いうことが ないよう、 設定から 最初の 配信まで、 一緒に 進める 体制を 整えて います。' },
    { mark: 'support_detail' },

    { text: '30日 使って みて、 「これは 合わない」 と 思えば、 そこで 止めて いただいて 構いません。' },
    { mark: 'no_lock' },
    { text: 'まず 一度、 あなたの 事業の 顧客データを タスクルに 入れて、 動いているところを 見て ください。' },
    { mark: 'cta' },
    { text: 'タスクル。 一人ひとりを、 覚えている ツール。' },
    { mark: 'end' },
  ]},
];

function buildSsml(phrases) {
  const body = phrases.map(p => {
    if (p.mark) return `<mark name="${p.mark}"/>`;
    return p.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    throw new Error(`TTS failed for ${ch.name}: ${JSON.stringify(json).slice(0, 400)}`);
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

// 全章 concat
console.log('\n=== merging ===');
const listPath = '/tmp/tasukuru-concat.txt';
const files = CHAPTERS.map(c => `file '${OUT}/${c.name}.mp3'`).join('\n');
writeFileSync(listPath, files);
execSync(`ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${OUT}/narration-full.mp3 > /dev/null 2>&1`);
const totalDur = parseFloat(execSync(`ffprobe -i "${OUT}/narration-full.mp3" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
console.log(`  narration-full.mp3: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)} min)`);
