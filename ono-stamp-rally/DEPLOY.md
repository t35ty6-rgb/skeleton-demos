# デプロイ手順

このディレクトリを **本番稼働** させるまでの操作。 スケルトン側 (Jobs) が実行する。

## 前提

- Firebase CLI インストール済み (`npm i -g firebase-tools`)
- `gcloud auth login` 済み or `firebase login` 済み
- Skeleton 既存 project `skeleton-skel-ec-2606` のオーナー権限あり (memory: MEI と同 project)
- LINE Developers Console で LIFF ID + Messaging API チャネル発行済 ([SETUP.md](./SETUP.md) 参照)

---

## 1. secrets 設定

```bash
firebase functions:secrets:set FUKUTETSU_LINE_ACCESS_TOKEN
# → プロンプトで 長期チャネルアクセストークン (LINE Developers Console) を貼り付け

firebase functions:secrets:set FUKUTETSU_LINE_CHANNEL_SECRET
# → プロンプトで チャネルシークレット を貼り付け
```

## 2. Firestore rules + indexes deploy

```bash
cd fukutetsu-stamp-rally/
firebase deploy --only firestore:rules,firestore:indexes --project skeleton-skel-ec-2606
```

**⚠️ 注意**: 現在 `firestore.rules` は fukutetsu 用 rules 単独。 Skel·EC / MEI の rules と統合する必要がある。 デプロイ前に既存 rules と マージ してから 単一 rules ファイルで deploy。

## 3. Functions deploy

```bash
cd functions/
npm install
cd ..
firebase deploy --only "functions:fukutetsu*" --project skeleton-skel-ec-2606
```

deploy 対象:
- `fukutetsuVerifyStamp` — 押印検証 (HTTPS Callable)
- `fukutetsuOnStampWrite` — 押印後トリガー (Firestore trigger)
- `fukutetsuPushSegment` — セグメント配信 (HTTPS Callable)
- `fukutetsuSchedulePush` — 定時配信 (Cloud Scheduler)
- `fukutetsuGetStats` — 集計 (HTTPS Callable)
- `fukutetsuLineWebhook` — LINE webhook (HTTPS)

## 4. Seed 実行

```bash
cd functions/
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
node seed.js
```

`fukutetsu_spots/{SP-01..SP-10}` + `fukutetsu_rallies/FT-2026-Summer` が投入される。

## 5. LINE webhook URL 設定

Cloud Functions deploy 後、 fukutetsuLineWebhook の URL をコピー:
```
https://asia-northeast1-skeleton-skel-ec-2606.cloudfunctions.net/fukutetsuLineWebhook
```

LINE Developers Console → Messaging API チャネル → Webhook URL に上記を貼り付け → 「Webhookの利用」ON。

## 6. Hosting deploy (Firebase Hosting で配信する場合)

現状は GitHub Pages で配信。Firebase Hosting に切替える場合:

```bash
firebase hosting:sites:create fukutetsu-rally --project skeleton-skel-ec-2606
firebase deploy --only "hosting:fukutetsu-rally" --project skeleton-skel-ec-2606
```

deploy先:
- `https://fukutetsu-rally.web.app/`
- `https://fukutetsu-rally.firebaseapp.com/`

カスタムドメイン (例 `rally.fukutetsu.example.jp`) は Hosting 設定 → カスタムドメイン から追加。

## 7. index.html の config 切替

Hosting deploy 後、`index.html` の meta を本番設定に:

```html
<meta name="fukutetsu-liff-id" content="2010266648-XXXXXXXX">
<meta name="fukutetsu-backend" content="firestore">
```

これで LIFF 認証 + Firestore 保存が有効化。 push commit → Hosting 再deploy。

## 8. LIFF エンドポイントURL 設定

LINE Developers Console → LIFF アプリ → エンドポイントURL:
```
https://fukutetsu-rally.web.app/
```
または カスタムドメイン。

## 9. E2E 動作確認 (実LINE で)

- [ ] LINE公式アカウント 友だち追加 → 挨拶メッセージ受信 (webhook 動作)
- [ ] リッチメニュー → LIFF起動 → 名前+アイコン自動取得
- [ ] 対象スポット圏内で QR スキャン → 硬券押印 → LINE通知
- [ ] 4個押印 → 「4個到達」 通知受信 (onStampWrite → threshold push)
- [ ] admin セグメント配信 → 対象ユーザーに実LINE push 到達
- [ ] 圏外から QR画像 → 「圏外です」 + fukutetsu_rallies/{}/fraud に記録

---

## ロールバック手順

```bash
# Functions
firebase functions:delete "fukutetsuVerifyStamp,fukutetsuOnStampWrite,fukutetsuPushSegment,fukutetsuSchedulePush,fukutetsuGetStats,fukutetsuLineWebhook" --region asia-northeast1

# Hosting
firebase hosting:disable --site fukutetsu-rally
```

Firestore データは保持されるので、 後日再開可能。

---

## モニタリング

- Cloud Logging: `https://console.cloud.google.com/logs/query?project=skeleton-skel-ec-2606`
- Cloud Functions Metrics: `https://console.cloud.google.com/functions/list?project=skeleton-skel-ec-2606`
- Firestore Usage: `https://console.cloud.google.com/firestore/data?project=skeleton-skel-ec-2606`

## 週次確認

- Functions 呼び出し数 (`fukutetsuVerifyStamp`)
- push 送信数 と 失敗率
- Firestore reads/writes (無料枠内かチェック)
- LINE公式アカウント push 消費 (プラン上限 30,000/月)
