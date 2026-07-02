#!/bin/zsh
# 新章 3本 (02-customer-liff, 03-booking-form, 04-booking-done) のみ生成
set -e
VOICE="ja-JP-Neural2-C"
RATE="1.15"
PROJECT="skeleton-pricer-130118"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$OUT_DIR"

declare -A NARR=(
  ["02-customer-liff"]="お客様 が 予約 する とき の 流れ を、 ご せつめい します。 お客様 は、 まず、 荒島 の 公式 LINE アカウント を、 友達 に 追加 します。 友達 追加 の あと、 LINE の トーク 画面 の した に、 リッチメニュー が 表示 されます。 リッチメニュー には、 予約、 客室 プラン、 アクセス、 料金、 空 室 確認、 の 5 つ の ボタン が あります。 予約 する とき は、 いちばん ひだり の 「予約」 を タップ します。 すると、 LINE の なか で、 予約 フォーム が 起動 します。 これ を、 リフ、 と 呼びます。 リフ は、 LINE の アプリ の なか だけ で 動く、 荒島 せんよう の 予約 画面 です。 アプリ を べつ に インストール したり、 ブラウザ を たちあげたり する 必要 が ありません。"

  ["03-booking-form"]="予約 フォーム は、 4 つ の ステップ です。 1 つ 目、 とまる たてもの を 選びます。 荒島 には、 旅舎 と、 學舎 の、 2 つ の たてもの が あります。 旅舎 は、 商店街 の ちゅうしん に ある、 メイン の やど です。 學舎 は、 商店街 の は ずれ に ある、 姉妹 かん です。 たてもの を 選ぶ と、 その たてもの の 客室 が、 いちらん で 表示 されます。 2 つ 目、 客室 を 選びます。 かく 客室 には、 ていいん、 料金、 写真、 が 表示 されます。 好きな 部屋 を タップ して、 選びます。 3 つ 目、 チェックイン の 日付 と、 とまりすう、 にんずう を、 入力 します。 日付 を 選ぶ と、 空 いて いる 客室 だけ が、 選べます。 4 つ 目、 お なまえ と、 電話 番号 を 入力 して、 「予約 を かくてい する」 を タップ。 これ で、 予約 完了 です。"

  ["04-booking-done"]="予約 が 完了 する と、 お客様 の LINE に、 じどう で 確認 メッセージ が とどきます。 メッセージ には、 予約 番号、 たてもの、 客室、 チェックイン と チェックアウト の 日付、 とまりすう、 にんずう、 そして 合計 きんがく が、 まとめて 表示 されます。 した に、 「Google カレンダー に とうろく」 の ボタン が あります。 このボタン を タップ する と、 予約 の にってい が、 じどう で、 Google カレンダー に とうろく されます。 さらに、 前日 の よる、 前日 リマインダー が、 チェックイン とうじつ の あさ、 案内 メッセージ が、 それぞれ じどう で とどきます。 バイト がわ の じどう 通知 だけ で なく、 お客様 がわ も、 完全 に じどう化 されて います。"
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

for n in $(echo "${(k)NARR[@]}" | tr ' ' '\n' | sort); do
  gen "$n" "${NARR[$n]}"
done

echo ""
for f in 02-customer-liff.mp3 03-booking-form.mp3 04-booking-done.mp3; do
  [ -f "$f" ] || continue
  dur=$(ffprobe -i "$f" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null)
  printf "  %s: %.1fs\n" "$f" "$dur"
done
