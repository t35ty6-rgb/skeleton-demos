// SSML mark + timepoints で ナレーション生成 (v2: 詳細版)
// mark 名を record-video.mjs の reveal タイミングに使用
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const OUT = '/Users/tsukasayoshida/Desktop/skeleton-demos/sunchlorella-line-demo/audio';
const VOICE = 'ja-JP-Neural2-C';
const RATE = 1.10;
const PROJECT = 'skeleton-skel-ec-2606';

const CHAPTERS = [
  { name: '01-issue', phrases: [
    { text: 'サン・クロレラジャパン 様。 本日は、 統合LINE OS のご提案に お時間を いただき、 ありがとう ございます。' },
    { mark: 'thanks_end' },
    { text: 'まず、 いま、 御社の 現場で 起きている、 3つの 具体的な 課題を、 場面と 数字で ご説明します。' },
    { mark: 'intro_end' },

    // 課題①
    { text: '課題 1つ目。 訪問販売員 の 実績が、 EC化 に よって 消えていく。' },
    { mark: 'issue1_title' },
    { text: 'たとえば、 販売員 北野さんが、 3ヶ月 通って 信頼関係を 築いた 田中さま。' },
    { mark: 'issue1_scene_visit' },
    { text: '週末の 夜、 スマホ で 定期便に お申し込みに なった 瞬間、' },
    { mark: 'issue1_scene_ec' },
    { text: 'その 売上は、 EC部門の 実績として 記録されます。' },
    { mark: 'issue1_result' },
    { text: '北野さんの 3ヶ月の 努力は、 どこにも 残らない。' },
    { mark: 'issue1_end' },

    // 課題②
    { text: '課題 2つ目。 4つの 公式LINE アカウントが、 部署ごと 別々の ツールで 運用されて いる ため、' },
    { mark: 'issue2_intro' },
    { text: '本社として、 各アカウントで、 どれだけの 数字が 動いて いるのか、 横断的に 把握できない。' },
    { mark: 'issue2_hq' },
    { text: '経営会議 で、 「LINE経由 の 総売上、 総友達数、 平均開封率」、 これらを 見たくても、 4部署から 数字を 集めて 手作業で 合算する 必要が あります。' },
    { mark: 'issue2_end' },

    // 課題③
    { text: '課題 3つ目。 御社の 中心顧客層 で ある 中高齢 の お客様は、 ECサイト で メールアドレス 入力を 求められた 瞬間、 半数が 購入を あきらめて しまう。' },
    { mark: 'issue3_scene' },
    { text: '結果、 販売員が いくら 「ECサイト、 ぜひ ご利用ください」 と ご案内しても、 定期便の 追加購入 に つながらない。' },
    { mark: 'issue3_end' },

    { text: 'これらの 3つの 課題 を、 1つの 運用OS に まとめた のが、 統合LINE OS で ございます。' },
    { mark: 'solution_end' },
  ]},

  { name: '02-solution-1-rep', phrases: [
    { text: '1つ目。 訪問販売員の 実績を、 永続的に 守る 仕組みです。' },
    { mark: 'title_end' },
    { text: '玄関先で、 販売員 が、 タブレット もしくは 名刺 に 印刷 された、 販売員 個別の QRコード を お客様に お見せします。' },
    { mark: 'step_show_qr' },
    { text: 'お客様は、 LINE アプリで その QRコード を スキャン。' },
    { mark: 'step_scan' },
    { text: '3秒で、 御社の 公式LINE アカウントの 友達追加 と、 担当販売員 の ID 刻印 が、 同時に 完了 します。' },
    { mark: 'step_engrave' },

    { text: '以降、 その お客様の 全ての 購入、' },
    { mark: 'ltv_intro' },
    { text: '玄関先 訪問での 対面注文、 ECサイト での 定期購入、 LINE からの 追加購入、 電話 での 注文、' },
    { mark: 'ltv_channels' },
    { text: 'これら 全て の 売上 が、 担当販売員 の 実績 と して、 本社ダッシュボード に 集計されて いきます。' },
    { mark: 'ltv_end' },

    { text: '訪問販売員 62名 それぞれの、 月次売上、 定期便継続率、 全国 ランキング、 前月比、 前年比、 目標達成率、' },
    { mark: 'app_metrics' },
    { text: 'これらの 数字が、 本人 の スマホ アプリで、 リアルタイムに 確認できる。' },
    { mark: 'app_realtime' },
    { text: '「自分の 努力が 見えない」、 「頑張っても 反映されない」、 という 販売員 の モヤモヤ を 完全に 解消します。' },
    { mark: 'end' },
  ]},

  { name: '03-solution-2-account', phrases: [
    { text: '2つ目。 4つの 公式LINE アカウントを、 1画面で 束ねます。' },
    { mark: 'title_end' },
    { text: '営業部、' },
    { mark: 'acc_sales' },
    { text: 'お客様サポート、' },
    { mark: 'acc_support' },
    { text: '定期便お知らせ、' },
    { mark: 'acc_sub' },
    { text: 'イベント・キャンペーン、' },
    { mark: 'acc_camp' },
    { text: 'それぞれの アカウントの、 友達数の 推移、 月次 売上、 配信メッセージ の 開封率、 獲得した お客様の 詳細 一覧 が、 本社の 1画面で 見渡せます。' },
    { mark: 'unified' },

    { text: '各アカウント を クリック すると、 そのアカウント 単独の 詳細ダッシュボード に 遷移。' },
    { mark: 'detail_intro' },
    { text: '誰が いつ、 どんな 配信を 送り、 何名の 顧客が 反応し、 いくらの 売上に つながったか、 個別に 分析 できる 仕組みです。' },
    { mark: 'detail_end' },

    { text: '「4つを 完全に 統合して 1本の アカウント に する」 か、 「このまま 4本 で 運用する」 か、 の 判断も、 数字を 見てから、 経営会議 で ご判断 いただけます。' },
    { mark: 'decision' },
    { text: '統合による、 既存 友達の 喪失リスク を、 ゼロに 保った まま、 経営判断の 材料 を、 3ヶ月で 揃えます。' },
    { mark: 'end' },
  ]},

  { name: '04-solution-3-liff', phrases: [
    { text: '3つ目。 お客様の LINEアプリの 中だけで、 商品閲覧から、 お支払い まで、 完結する 仕組みです。' },
    { mark: 'title_end' },
    { text: 'メールアドレス の 入力は、 一切、 求めません。' },
    { mark: 'no_email' },
    { text: 'LINE で 友達追加した お客様が、 リッチメニュー の 「商品を 見る」 を タップ すると、 LINE アプリの 中で、 御社の 商品一覧が 表示されます。' },
    { mark: 'rich_menu' },
    { text: '気に なる 商品を タップ、 数量を 選び、 カートに 追加、 決済 は Stripe 経由で、 クレジットカード もしくは 銀行振込。' },
    { mark: 'checkout' },

    { text: '初回のみ、 お名前、 ご住所、 電話番号、 の 3項目を ご入力いただき、 次回以降は、 自動で 引き継がれます。' },
    { mark: 'first_only' },
    { text: 'パスワード の 記憶 も、 会員登録 の 手続き も、 一切 ありません。' },
    { mark: 'no_pass' },

    { text: '定期便の スキップ、 数量変更、 停止、 再開、 これら 全て、 LINE アプリの 中で、 1タップ です。' },
    { mark: 'sub_ops' },
    { text: '中高齢の お客様に とって、 最大の 購入ハードル で あった、 メール登録の 壁 を、 完全に 取り除きます。' },
    { mark: 'end' },
  ]},

  { name: '05-solution-4-attr', phrases: [
    { text: '4つ目。 キャンペーンごとに、 獲得した お客様の 生涯購入額を、 別々に 計測 します。' },
    { mark: 'title_end' },
    { text: '例えば、 滋賀レイクス様 と の 協賛試合 で 会場配布 した QRコード、' },
    { mark: 'ch_lakes' },
    { text: '大阪関西万博 の 出展 ブースで 配布した QRコード、' },
    { mark: 'ch_expo' },
    { text: '新聞広告 に 掲載 した QRコード、' },
    { mark: 'ch_paper' },
    { text: 'それぞれ 別の QRコード を、 管理画面 で ワンクリック で 発行 します。' },
    { mark: 'qr_issue' },

    { text: '試合日 の 会場QR から 友達追加 した 500名 の 平均LTV は 1万8千400円、 半年 継続率は 52パーセント。' },
    { mark: 'data_lakes' },
    { text: '万博会場QR から の 200名 は、 平均LTV 9千200円、 継続率 28パーセント。' },
    { mark: 'data_expo' },
    { text: '新聞広告 の 80名 は、 平均LTV 6千700円、 継続率 19パーセント。' },
    { mark: 'data_paper' },

    { text: '「滋賀レイクス 様は 2倍のLTV を 生み出して いる、 継続を 判断」、 「万博は 顧客獲得コスト の 割に LTV 低い、 再考」、 「新聞広告 は 見直し」 と いった、 スポンサー投資 の 費用対効果 が、 数字で 判定 できるように なります。' },
    { mark: 'end' },
  ]},

  { name: '06-solution-5-scenario', phrases: [
    { text: '5つ目。 ステップ配信 シナリオ ビルダー を、 標準 装備 して おります。' },
    { mark: 'title_end' },
    { text: 'これは、 月30万円 から 50万円 かかる、 LSTEP と 呼ばれる ツール の 中核機能を、 御社 の 統合LINE OS の 中に 直接、 内蔵する もの です。' },
    { mark: 'lstep_intro' },

    { text: '友だち追加 された 直後 から 3日間 で 商品理解 を 深めていく プログラム。' },
    { mark: 'sc_a' },
    { text: '初回購入 直後 から の 継続育成 シナリオ。' },
    { mark: 'sc_b' },
    { text: '60日 購入が ない お客様 への 復帰オファー。' },
    { mark: 'sc_c' },
    { text: 'このような、 複雑な 自動配信 シナリオを、 マウス操作 だけで 組み上げる ことが できます。' },
    { mark: 'sc_intro_end' },

    { text: '待機、 送信、 タグ付与、 分岐、 購入判定、 終了、 の 6種類 の ステップ を、 縦に 並べて いく だけの 直感的な 操作。' },
    { mark: 'steps_list' },
    { text: 'マーケティング 担当者 の 方は、 エクセル は 使える けど、 プログラミング は でき ない、 と いう 前提 で 設計 されて います。 追加費用 は、 かかり ません。' },
    { mark: 'end' },
  ]},

  { name: '07-impact', phrases: [
    { text: '同規模 の 健康食品 ブランド 事例では、 統合LINE OS 導入 から 6ヶ月後、 3つの 主要 数字 に、 明確な 変化が 出て います。' },
    { mark: 'title_end' },

    { text: '1つ目、 訪問販売員 1人 あたり の 月次売上 が、 平均で、 18パーセント増。' },
    { mark: 'kpi1' },
    { text: 'これは、 販売員 の 担当顧客が、 EC や LINE で 追加購入 した 分も、 販売員 実績 に 帰属する ように なった ため。' },
    { mark: 'kpi1_reason' },
    { text: '「自分の 顧客が、 見えない ところで も 買って くれて いる」、 この 実感 が、 販売員 の モチベーション を 押し上げた 結果です。' },
    { mark: 'kpi1_end' },

    { text: '2つ目、 定期便 の 半年 継続率 が、 12ポイント 上昇。' },
    { mark: 'kpi2' },
    { text: 'これは、 「解約」 タップ 前 の 引き止め シナリオ と、 定期便スキップ の 1タップ操作 に よって、 「面倒だから やめる」 の 手前 で、 継続に 戻せた ため です。' },
    { mark: 'kpi2_reason' },

    { text: '3つ目、 LINE 経由 の 購入 CVR が、 2倍から 3倍。 メール登録 が 不要 に なり、 中高齢層 の 離脱が 撤廃 された 結果です。' },
    { mark: 'kpi3' },

    { text: '御社の 場合、 訪問販売員 62名 × 平均月商 500万円 の 15パーセント 増分 で、' },
    { mark: 'calc_setup' },
    { text: '月商 プラス 4.7億円、' },
    { mark: 'monthly' },
    { text: '年間で 約 56億円 の 売上インパクト が、 想定 されます。' },
    { mark: 'end' },
  ]},

  { name: '08-close', phrases: [
    { text: 'まずは、 京都本社 の 1営業所 で、 3ヶ月 の 試験運用 を、 ご提案 いたします。' },
    { mark: 'title_end' },
    { text: '費用は、 800万円。' },
    { mark: 'cost' },
    { text: '販売員 5名、 既存の 定期便顧客 500名 規模での、 実効果 検証で ございます。' },
    { mark: 'scale_end' },

    { text: '3ヶ月 で 見て いただく 数字は、 4つ。' },
    { mark: 'metrics_intro' },
    { text: '販売員 1人 あたり 月次売上 の +18パーセント 到達。' },
    { mark: 'm1' },
    { text: 'LINE 経由 定期便 加入率。' },
    { mark: 'm2' },
    { text: '解約 阻止率。' },
    { mark: 'm3' },
    { text: '販売員 満足度 スコア。' },
    { mark: 'm4' },

    { text: 'その後の、 全社 62名 への 展開、 4アカウント の 統合 判断、 保守契約、 これらの 判断は、 3ヶ月 の 数字 を 見て いただいた 上で、 御判断 ください。' },
    { mark: 'phase_after' },

    { text: 'スケジュール の 打ち合わせ から、 ぜひ、 お聞かせ ください。' },
    { mark: 'schedule' },
    { text: 'サン・クロレラジャパン 様 の、 100年先 の 事業 を、 一緒に、 デザイン させて いただければ、 幸いです。' },
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
  console.log(`✓ ${dur.toFixed(1)}s (${nMarks} marks)`);
}

writeFileSync(`${OUT}/timepoints.json`, JSON.stringify(timepoints, null, 2));
console.log('\n📝 timepoints.json saved');

console.log('\n=== merging ===');
const listPath = '/tmp/concat.txt';
const files = CHAPTERS.map(c => `file '${OUT}/${c.name}.mp3'`).join('\n');
writeFileSync(listPath, files);
execSync(`ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${OUT}/sales-narration-full.mp3 > /dev/null 2>&1`);
const totalDur = parseFloat(execSync(`ffprobe -i "${OUT}/sales-narration-full.mp3" -show_entries format=duration -v quiet -of csv="p=0"`, { encoding: 'utf8' }).trim());
console.log(`  sales-narration-full.mp3: ${totalDur.toFixed(1)}s (${(totalDur/60).toFixed(1)} min)`);
