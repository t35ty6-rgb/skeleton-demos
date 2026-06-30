#!/bin/zsh
# FP Compass ヘルプ ナレーション TTS (Google Cloud Neural2-D 男性 落ち着いた声)
set -e
VOICE="ja-JP-Neural2-C"
RATE="1.20"   # オーナーfb: 1.20 で OK (1.05 はまだ遅い)
PROJECT="skeleton-pricer-130118"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$OUT_DIR"

# セクション1: ログイン (約30秒)
TEXT_01="朝、 FP コンパス を 開きます。 ブラウザ で、 アプリ の URL に アクセス してください。 続いて、 ご登録 の メールアドレス と パスワード を 入力 します。 最後 に、 ログイン ボタン を 押すと、 あなた専用 の ダッシュボード が 開きます。"

gen() {
  local n="$1" text="$2"
  printf "  [%s] %s文字 → " "$n" "${#text}"
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

gen "01-login" "$TEXT_01"

# duration
for f in *.mp3; do
  dur=$(ffprobe -i "$f" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null)
  printf "  %s: %.1fs\n" "$f" "$dur"
done
