// 三崎屋電工AI デモ動画 ナレーション生成 (SSML mark + timepoints)
// 8章構成: イントロ / 課題 / ツール全体像 / 手順書閲覧 / 動画→手順自動生成 / 教材モード / 導入イメージ / CTA
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/misakiya-denko-ai-demo/audio';
const VOICE = 'ja-JP-Neural2-C';
const RATE = 1.08;
const PROJECT = 'skeleton-skel-ec-2606';

const CHAPTERS = [
  // ─────────────────────────────────────────────
  //  Ch01 · イントロ (30秒)
  // ─────────────────────────────────────────────
  { name: '01-intro', phrases: [
    { text: '三崎屋電工 の 三崎 社長、 本日は お時間を いただき、 ありがとう ございます。' },
    { mark: 'greeting_end' },
    { text: 'これから ご覧 いただく のは、 三崎屋電工AI ── 現場の 技術を、 次の 世代へ 伝える ための ツール です。' },
    { mark: 'intro_tool' },
    { text: '社員の 皆さんが 現場で 積み上げて きた 作業ノウハウを、 動画と 手順書 という 形で 残し、 いつでも、 誰でも、 スマホから 参照できる 仕組みを、 ご提案 します。' },
    { mark: 'intro_value' },
    { text: '全体で 約6分、 実際に 画面を 動かしながら ご説明 します。' },
    { mark: 'intro_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch02 · こんな課題ありませんか (45秒)
  // ─────────────────────────────────────────────
  { name: '02-issue', phrases: [
    { text: 'まず、 現場の 課題から 確認 させてください。 地方の 電気工事会社が 抱える 課題は、 大きく 3つ あります。' },
    { mark: 'issue_intro' },
    { text: '1つ目は、 ベテランの 技術を 若手に 伝えたい、 という こと。' },
    { mark: 'issue_1' },
    { text: '2つ目は、 作業手順書が 紙や PDFで 管理 されていて、 現場で 探せない こと。' },
    { mark: 'issue_2' },
    { text: '3つ目は、 ベテランが 引退したら、 誰が 若手に 教えるのか、 という 後継ぎの 問題 です。' },
    { mark: 'issue_3' },
    { text: 'この 3つを まとめて 解決する のが、 三崎屋電工AI です。' },
    { mark: 'issue_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch03 · ツール全体像 (60秒)
  // ─────────────────────────────────────────────
  { name: '03-overview', phrases: [
    { text: '画面を ご覧ください。 左側に ナビゲーション、 右側に コンテンツ が表示 される、 シンプルな 構成です。' },
    { mark: 'overview_layout' },
    { text: 'サイドバーには 8つの 機能が 並んでいます。' },
    { mark: 'overview_nav' },
    { text: 'ホーム、 作業を探す、 お気に入り、 最近の閲覧、 マイページ、 データベース、 教材モード、 そして 管理メニュー です。' },
    { mark: 'overview_navlist' },
    { text: '上部の 青い ボタン は、 「動画から作る」 CTA ボタンです。 ここが このツールの 核心機能 へのエントリー になります。' },
    { mark: 'overview_cta' },
    { text: 'ホーム画面を 見てみましょう。 おすすめの 作業手順書が 4件、 最近の閲覧履歴、 そして お知らせが 並んでいます。' },
    { mark: 'overview_home' },
    { text: '右側には データ統計 4つの KPI と、 詳細ペイン が 表示されます。 全体の 作業件数、 カテゴリ数、 教材コース数、 登録ユーザー数です。' },
    { mark: 'overview_kpi' },
    { text: '直感的に 操作できる レイアウト で、 現場 のスタッフが すぐに 使いこなせます。' },
    { mark: 'overview_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch04 · 作業手順書を見る (60秒)
  // ─────────────────────────────────────────────
  { name: '04-view-manual', phrases: [
    { text: 'では、 実際の 作業手順書を 開いてみます。 左メニューの 「作業を探す」 から、 「分電盤の交換」 を 選択します。' },
    { mark: 'view_open' },
    { text: '画面の 上部には 動画プレーヤー が 表示されます。 実際の 作業映像を、 いつでも 確認できます。' },
    { mark: 'view_player' },
    { text: 'その 下に 手順一覧 が 並んでいます。 今回は 8手順 で 構成されています。' },
    { mark: 'view_steps' },
    { text: '停電確認、 検電、 養生、 既設取外し、 新設取付、 配線復旧、 絶縁抵抗測定、 通電確認 の 順番です。' },
    { mark: 'view_steplist' },
    { text: '各手順 をクリックすると、 その手順 の 詳細と 注意点 が 展開します。 現場で 確認しながら 作業できます。' },
    { mark: 'view_step_detail' },
    { text: '右側の 関連データ には、 単線結線図 のPDF、 施工図、 現場写真が 紐づいています。 紙の 引き出しを 探す 手間が、 ゼロになります。' },
    { mark: 'view_related' },
    { text: 'これまで ベテランの 頭の中に あった 情報が、 ここに 集約されます。' },
    { mark: 'view_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch05 · メインの売り: 動画から手順を自動生成 (120秒)
  // ─────────────────────────────────────────────
  { name: '05-ai-generate', phrases: [
    { text: 'このツールの 核心機能を ご紹介 します。 動画を アップロードすると、 AIが 自動で 作業手順書 を 生成する 機能です。' },
    { mark: 'ai_intro' },
    { text: '左メニュー上部の、 「動画から作る」 ボタンを クリックします。' },
    { mark: 'ai_click_btn' },
    { text: '資料タブが 開きます。 3つの カードが 並んでいます。 添付資料、 動画をアップロード、 そして 動画から手順を自動生成 です。' },
    { mark: 'ai_tabs' },
    { text: 'ここで、 「AIで疑似生成」 ボタンを 押します。 実際には、 現場で 撮った 動画ファイルを ここに ドロップするだけです。' },
    { mark: 'ai_generate_btn' },
    { text: 'AIが 動画の 映像を 解析して、 作業の シーンを 自動で 区切り、 キャプション を 認識します。' },
    { mark: 'ai_analyzing' },
    { text: '数秒で、 8つの 手順が 自動的に 生成されました。 各手順に 動画の 開始時刻と 終了時刻 が 自動で 付与されています。' },
    { mark: 'ai_generated' },
    { text: 'タイトルを 入力して、 たとえば 「分電盤の交換」 と 入力して、 保存します。' },
    { mark: 'ai_save' },
    { text: '生成された 手順書を 開いてみましょう。 各手順の 下に、 時刻と 再生ボタンが 付いています。' },
    { mark: 'ai_open_result' },
    { text: 'この 再生ボタンを クリックすると、 動画の 該当 場面に 自動で 移動します。 「2番目の 手順の 映像を 見たい」 という 時に、 頭から 全部 見る 必要が ありません。' },
    { mark: 'ai_seek' },
    { text: '10分の 作業動画から、 手順書が 30秒で 作れる。 これが このツールの 最大の 価値です。' },
    { mark: 'ai_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch06 · 教材モードで若手育成 (45秒)
  // ─────────────────────────────────────────────
  { name: '06-course', phrases: [
    { text: '次は、 若手育成 のための 教材モードを ご覧ください。' },
    { mark: 'course_intro' },
    { text: '左メニュー の 「教材モード」 を クリックします。 コースが 3種類 用意されています。' },
    { mark: 'course_list' },
    { text: '電気工事基礎 12章、 高圧設備保守 8章、 受変電設備施工 10章。 それぞれ 体系的に 学べる カリキュラムです。' },
    { mark: 'course_courses' },
    { text: 'コース内には 理解度テストも 内蔵されています。 若手スタッフが どこまで 学んだか、 管理者が 確認できます。' },
    { mark: 'course_quiz' },
    { text: 'OJT の 補助 として、 また 資格取得の 予習 として 活用できます。' },
    { mark: 'course_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch07 · 導入イメージ (45秒)
  // ─────────────────────────────────────────────
  { name: '07-deployment', phrases: [
    { text: '実際の 使い方の イメージを ご説明します。' },
    { mark: 'deploy_intro' },
    { text: 'スマホからも 見られます。 現場で スマホを 取り出して、 手順を 確認しながら 作業できます。' },
    { mark: 'deploy_mobile' },
    { text: 'PDFで 印刷して、 現場に 持参することも できます。 電波が 届かない 場所でも 安心です。' },
    { mark: 'deploy_pdf' },
    { text: 'ベテランが 一度 動画を 撮って アップロードすれば、 その 技術は 会社の 資産に なります。 ベテランが 引退した 後も、 映像は 残ります。' },
    { mark: 'deploy_asset' },
    { text: '管理メニューでは、 スタッフ 4名を 登録して、 閲覧権限を 管理できます。 全社の 作業実績と KPIも 一覧で 確認できます。' },
    { mark: 'deploy_admin' },
    { text: 'データの エクスポートと インポート 機能も 備えています。 バックアップも 簡単 です。' },
    { mark: 'deploy_end' },
  ]},

  // ─────────────────────────────────────────────
  //  Ch08 · まとめ + CTA (30秒)
  // ─────────────────────────────────────────────
  { name: '08-close', phrases: [
    { text: 'まとめます。 三崎屋電工AI は、 現場の 作業手順を 動画と テキストで 残し、 若手が いつでも スマホで 参照できる ツールです。' },
    { mark: 'close_summary' },
    { text: 'ベテランの 技術が 会社の 資産に なります。 手順書の 作成が、 動画から 30秒で できます。 若手育成の コストが、 大幅に 下がります。' },
    { mark: 'close_value' },
    { text: 'まずは、 三崎屋電工AI を 実際に 触ってみてください。 ご質問は、 スケルトン株式会社まで お気軽に ご連絡ください。' },
    { mark: 'close_end' },
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

console.log('\n=== merging ===');
const listPath = '/tmp/misakiya-concat.txt';
const files = CHAPTERS.map(c => `file '${OUT}/${c.name}.mp3'`).join('\n');
writeFileSync(listPath, files);
execSync(`ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${OUT}/narration-full.mp3 2>/dev/null`);
const totalDur = parseFloat(execSync(`ffprobe -i "${OUT}/narration-full.mp3" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
console.log(`  narration-full.mp3: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)} min)`);
