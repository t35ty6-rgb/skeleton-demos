#!/bin/zsh
# サン・クロレラジャパン 統合LINE OS 営業ナレーション TTS
# Neural2-C 1.10x (中高齢経営層向け、 荒島より少しゆっくり)
set -e
VOICE="ja-JP-Neural2-C"
RATE="1.10"
PROJECT="skeleton-skel-ec-2606"  # Blaze 有効 project (billing OK)
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$OUT_DIR"

# 誤読対策:
#  「訪問」→ ひらがな (問=もん誤読リスクなし、 訪=ぼう も OK)
#  「販売」→ そのまま
#  「LTV」→ 「エルティーヴィ」明示
#  「CVR」→ 「シーヴイアール」明示
#  「LSTEP」→ 「エルステップ」
#  「LIFF」→ 「リフ」
#  「Stripe」→ 「ストライプ」
#  「Firebase」→ 「ファイアベース」
#  「QR」→ 「キューアール」
#  数字は 漢数字にせず 半角のまま (Neural2 は自然読み)

declare -A NARR=(
  ["01-issue"]="サン・クロレラジャパン 様。 いま、 御社の 現場で 起きて いる こと を、 わたくしどもは、 このように 見て おります。 訪問販売員が 玄関先で 積み上げた 信頼が、 後日、 お客様が オンラインで お買い物を された その 瞬間に、 EC部門の 売上として 記録されて しまう。 4つの 公式LINE アカウントが、 部署ごとに 別々に 作られ、 運用されている ため、 本社として、 どの アカウントで、 どれだけの 数字が 動いて いるのか、 横断的に、 把握できない 状態に なって いる。 そして、 メール アドレスの 入力を 求めた 瞬間に、 中高齢の お客様の 半数が、 購入を あきらめて しまう。 これらの 課題を、 1つの 運用 OS に まとめた のが、 統合 LINE OS、 で ございます。"

  ["02-solution-1-rep"]="1つ目。 訪問販売員の 実績を、 永続的に 守ります。 玄関先で 販売員が 提示した キューアール コードを、 お客様が 読み取る その 瞬間に、 担当販売員の ID が、 お客様の LINE 情報に、 永久に 刻印されます。 以降、 その お客様が いつ、 どこで、 何を お買い上げに なっても、 担当販売員の 実績として、 本社ダッシュボードに 集計されます。 訪問販売員 62 名 それぞれの 月次 売上、 継続率、 社内 ランキング が、 本人 の スマホ アプリで、 リアルタイムに 確認 できます。"

  ["03-solution-2-account"]="2つ目。 4つの LINE 公式 アカウント を、 1画面で 束ねます。 営業部、 お客様サポート、 定期便お知らせ、 イベント・キャンペーン、 それぞれの アカウントの 友だち数、 売上、 配信の 開封率、 獲得した お客様の 一覧が、 本社の 1画面で 見渡せます。 4つを 完全に 統合するか、 このまま 分けて 運用するかは、 数字を 見てから 判断できます。 統合による、 友だち 喪失リスクを、 ゼロに 保った まま、 経営判断の 材料を 得ることが 可能に なります。"

  ["04-solution-3-liff"]="3つ目。 お客様の LINE アプリ の 中だけで、 商品閲覧から お会計まで 完結します。 メール アドレスの 入力は、 一切、 求めません。 お名前、 ご住所は、 初回のみ ご入力 いただき、 次回以降は 自動で 引き継がれます。 定期便の スキップ、 数量変更、 停止、 再開も、 すべて 1タップです。 中高齢の お客様に とって、 最大の 購入ハードルで あった、 メール登録の 壁を、 完全に 取り除きます。"

  ["05-solution-4-attr"]="4つ目。 滋賀レイクス 様との 協賛試合、 大阪関西万博の 出展、 新聞広告、 それぞれの 現場で 配布した キューアール コード ごとに、 獲得した お客様の、 生涯 購入額を、 別々に 計測します。 試合日の 会場QR から 来た 500名の エルティーヴィ、 万博 会場QR から 来た 200名の 継続率、 という 数字が、 リアルタイムで 経営会議の 資料に なります。 スポンサー投資の 費用対効果が、 数字で 判定できるように なります。"

  ["06-solution-5-scenario"]="5つ目。 ステップ配信シナリオ ビルダーを、 標準 装備 しております。 友だち追加から 3日プログラム、 初回購入後の 継続育成、 休眠60日 復帰オファー、 このような 自動配信 シナリオを、 マウス操作で 組み上げることが できます。 待機、 送信、 タグ付与、 分岐、 の 6種類の ステップを、 縦に 並べて いく だけの 直感的な 操作です。 エルステップ 代替の 中核 機能を、 追加費用なしで、 ご提供 いたします。"

  ["07-impact"]="同規模の 健康食品 ブランド 事例では、 導入から 6ヶ月後、 訪問販売員 1人 あたりの 月次売上が、 平均で、 18パーセント増。 定期便の 半年 継続率が、 12ポイント 上昇。 LINE 経由の 購入 シーヴイアール が、 2倍から 3倍。 このような 数字を 実現されて おります。 御社の 場合、 訪問販売員 62名 × 平均月商 500万円 の 15パーセント 増分で、 月商 プラス 4.7億円、 年間で 約 56億円 の 売上インパクトが、 想定されます。"

  ["08-close"]="まずは、 京都本社の 1営業所で、 3ヶ月の 試験運用を、 ご提案 いたします。 費用は、 800万円。 販売員 5名、 顧客 500名 規模での、 実効果 検証で ございます。 その後の、 全社展開、 保守 契約 は、 数字を 見て いただいた 上で、 ご判断 ください。 スケジュールの 打ち合わせから、 ぜひ、 お聞かせ ください。 サン・クロレラジャパン 様の 100年 先の 事業を、 一緒に、 デザイン させて いただければ、 幸いです。"
)

gen() {
  local n="$1" text="$2"
  printf "  [%s] %4d文字 → " "$n" "${#text}"
  python3 -c "
import json
print(json.dumps({
    'input': {'text': '''$text'''},
    'voice': {'languageCode': 'ja-JP', 'name': '$VOICE'},
    'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': $RATE, 'sampleRateHertz': 44100}
}, ensure_ascii=False))" > /tmp/p.json
  TOKEN=$(gcloud auth print-access-token)
  resp=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "x-goog-user-project: $PROJECT" \
    -d @/tmp/p.json \
    "https://texttospeech.googleapis.com/v1/text:synthesize")
  echo "$resp" | python3 -c "
import json, sys, base64
d = json.load(sys.stdin)
if 'audioContent' in d:
    open('$n.mp3','wb').write(base64.b64decode(d['audioContent']))
    print('✓')
else:
    print('✗ ' + str(d.get('error',{}).get('message','?'))[:120])
    sys.exit(1)"
}

ONLY="${1:-}"
for n in $(echo "${(k)NARR[@]}" | tr ' ' '\n' | sort); do
  if [ -n "$ONLY" ] && [[ "$n" != *"$ONLY"* ]]; then continue; fi
  gen "$n" "${NARR[$n]}"
done

echo ""
echo "=== chapters ==="
for f in *.mp3; do
  dur=$(ffprobe -i "$f" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null)
  printf "  %s: %.1fs\n" "$f" "$dur"
done

# 全編結合 (concat 用リスト)
echo ""
echo "=== merged ==="
ls *.mp3 | sort | grep -v full | awk -v d="$PWD" '{print "file \x27" d "/" $0 "\x27"}' > /tmp/concat.txt
ffmpeg -y -f concat -safe 0 -i /tmp/concat.txt -c copy sales-narration-full.mp3 > /dev/null 2>&1
totalDur=$(ffprobe -i sales-narration-full.mp3 -show_entries format=duration -v quiet -of csv="p=0")
printf "  sales-narration-full.mp3: %.1fs\n" "$totalDur"
