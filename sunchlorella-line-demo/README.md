# サン・クロレラ 統合LINE OS

訪問販売員 / お客さま(LINE) / 本社の3つの現場を一つの運用OSにまとめる、健康食品ブランド向け SaaS 一式。

- **フロント** — Firebase Hosting (静的ホスト)
  - `/`         入口 (3 role picker)
  - `/rep/`     訪問販売員 スマホSPA
  - `/customer/` 公式LINE内 LIFF ミニアプリ
  - `/admin/`   本社 統合コンソール
- **サーバー** — Cloud Functions (Node.js 20, asia-northeast1)
- **データ**   — Firestore (multi-tenant, prefix `sunchlorella_tenants/{tenantId}/…`)
- **決済**     — Stripe Checkout (payment / subscription)
- **メッセージ** — LINE Messaging API (webhook + push + multicast)

デモは `localStorage` バックエンドでフルに触れる状態 (下記 `backend` 参照)。 本番接続時は 同じ UI がそのまま Firestore / Cloud Functions を叩く設計。

---

## 1. 前提

- Node.js 20+
- `firebase-tools` v13.x
- Firebase project 権限 (Blaze プラン推奨。 dailyRoutine を使わない場合は Spark でも動くが LINE Webhook などの外向き API 呼び出しに Blaze が必要)
- LINE Developers アカウント (Messaging API チャネル + LIFF アプリ)
- Stripe アカウント (Publishable / Secret / Webhook Signing Secret)

---

## 2. Firebase project セットアップ (初回のみ)

1. Firebase Console で project 作成
   - Blaze プランに昇格
   - Firestore を「本番モード」で有効化 (region: `asia-northeast1`)
   - Authentication を有効化 (Email/Password provider ON)
   - Hosting を有効化
2. Web app を追加してconfig を取得
3. リポジトリで `.firebaserc` を更新

```json
{
  "projects": { "default": "YOUR_PROJECT_ID" }
}
```

4. `firebase login` → `firebase use --add`

---

## 3. secrets 設定

```bash
# Stripe
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# setupTenant 用の共通シークレット (Skeleton 保守者のみ知る値)
firebase functions:secrets:set SUPER_SECRET

# LIFF アプリの Login Channel ID (ID Token 検証に使用)
firebase functions:secrets:set LIFF_CHANNEL_ID
```

補足: `LIFF_CHANNEL_ID` は LIFF アプリではなく、LIFF が紐づく **LINE Login Channel** の Channel ID を指定 (10 桁の数値)。LIFF ID (例: `1234567890-abcdefg`) ではないので注意。

---

## 4. デプロイ

```bash
# 依存インストール
cd functions && npm install && cd ..

# Firestore rules + indexes
firebase deploy --only firestore

# Functions
firebase deploy --only functions

# Hosting
firebase deploy --only hosting
```

デプロイ完了で以下のURLが動く (プロジェクトIDが `example` の場合):

```
https://example.web.app/           入口
https://example.web.app/rep/       訪問販売員
https://example.web.app/customer/  お客さま
https://example.web.app/admin/     本社
https://example.web.app/api/health 疎通確認
```

---

## 5. テナント作成

初回のみ:

```bash
curl -X POST https://example.web.app/api/setupTenant \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": "sunchlorella-live",
    "tenantName": "サン・クロレラジャパン",
    "adminEmail": "admin@sunchlorella.example",
    "adminPassword": "強固なパスワード",
    "superSecret": "上で設定した SUPER_SECRET"
  }'
```

レスポンスに `adminUid` が返る。 以降 `/admin/` から email/password でサインイン可能。

---

## 6. LINE Messaging API 設定

1. LINE Developers Console でチャネル (Messaging API) 作成
2. Channel Secret / Channel Access Token を取得
3. Webhook URL を設定

```
https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/lineWebhook?tenant=sunchlorella-live
または (Hosting rewrite 経由)
https://example.web.app/api/lineWebhook?tenant=sunchlorella-live
```

4. `/admin/` にログイン → 設定ページ → LINE設定に Secret / Token を貼り付け保存
   - もしくは Cloud Functions を叩く:

```bash
curl -X POST https://example.web.app/api/setTenantConfig \
  -H "Authorization: Bearer <管理者IDトークン>" \
  -H 'Content-Type: application/json' \
  -d '{"line":{"channelSecret":"xxx","channelAccessToken":"yyy"}}'
```

5. LIFF アプリを作成し LIFF ID を取得 → `/customer/` の起動URLに設定
6. Endpoint URL は `https://example.web.app/customer/` を指定
7. Rich Menu を設定 (`商品を見る` → LIFF URL 等)

---

## 7. Stripe 設定

1. Stripe Dashboard で API keys を発行
2. 上記の secret を Firebase Functions secrets に登録
3. Webhook endpoint を追加:

```
https://example.web.app/api/stripeWebhook
```

- 監視イベント: `checkout.session.completed`
- Signing secret を `STRIPE_WEBHOOK_SECRET` に登録

4. `setTenantConfig` で テナント側にも保存:

```json
{
  "stripe": {
    "enabled": true,
    "publishableKey": "pk_live_...",
    "successUrl": "https://example.web.app/customer/#history",
    "cancelUrl":  "https://example.web.app/customer/#cart"
  }
}
```

---

## 8. 販売員アカウント発行

Admin 画面から「販売員を追加」→ email/password 登録すると `role=rep, tenantId=xxx, repId=yyy` の Custom Claims が付与される。 `/rep/` から本人が サインインできるようになる。

CLI で発行するなら:

```bash
firebase auth:import users.csv  # または firebase-admin SDK 経由
# 続けて claim 付与
```

---

## 9. デモモード (Firebase なしで見せる)

`localStorage` バックエンドで完全にオフライン動作する。 商談前の見せかた:

- ブラウザで `index.html` を開くだけ (`backend=local` default)
- URL に `?backend=firebase` を付ければ 本番接続に切替
- `/admin/` の「設定 → シード再適用」でデータリセット

---

## 10. 開発

```bash
# ローカル HTTP
npx http-server . -p 8080

# Firebase Emulators (Firestore + Functions + Auth)
firebase emulators:start
```

Emulator に接続する時は URL param `?backend=firebase&tenant=demo` を付けて `/admin/` を開く。

---

## 11. データモデル (SSOT)

```
sunchlorella_tenants/{tenantId}
  ├─ tenantName, branding.*, line.*, stripe.*, autoBroadcast.*
  ├─ reps/{repId}         name, office, officeId, status, joinedAt, tenure
  ├─ customers/{custId}   name, lineUserId, repId, age, birthMonth, phone,
  │                       address, lastVisitAt, orderCount, ltv, tags[], note
  ├─ products/{prodId}    name, category, price, subPrice, stock, tag, desc, img
  ├─ orders/{orderId}     customerId, repId?, channel, items[], total,
  │                       paymentMethod, status, stripeSessionId?,
  │                       stripePaymentIntent?, paidAt?, createdAt
  ├─ subscriptions/{sid}  customerId, productId, qty, cycleDays,
  │                       nextDeliveryAt, status, stripeSubscriptionId?
  ├─ visits/{vid}         customerId, repId, kind, note, createdAt
  ├─ messages/{mid}       customerId, direction, repId?, body|kind, createdAt
  ├─ broadcasts/{bid}     kind, title, segment[], targetCount, openRate,
  │                       clickRate, sentAt, status, sentBy
  └─ users/{uid}          email, role, createdAt (Auth の補助メタ)
```

`shared/schema.js` が全定数を保持する SSOT。 UI・Cloud Functions ともに同じ enum を使う。

---

## 12. セキュリティ (要点)

- Firestore rules で multi-tenant を強制 (`request.auth.token.tenantId` と path を照合)
- Cloud Functions の書込 API は Bearer IDToken 必須 + `role` 判定
- LINE Webhook は署名検証 (`x-line-signature` HMAC-SHA256)
- Stripe Webhook は署名検証 (`stripe-signature`)
- 顧客の LINE UserID は Firestore 内でのみ扱う (フロントに露出しない)
- `setupTenant` は SUPER_SECRET 必須 (乗っ取り防止)

---

## 13. 運用チェックリスト (納品後 1週間)

- [ ] `/api/health` GET → `{ok:true}` を確認
- [ ] Admin ログイン → 顧客一覧が表示される
- [ ] LINE 友達追加テスト → customers に自動投入 & 初回 push 到達
- [ ] 販売員が受注 → 顧客に LINE 決済リンク到達
- [ ] Stripe テストカード決済 → order.status が paid に遷移 & 顧客に完了通知
- [ ] 定期便を作成 → 翌々日に「3日前リマインド」が到達 (cron 動作)
- [ ] セグメント配信 → 該当LINE友達に multicast 到達
- [ ] Firestore rules テスト (未認証で読めない) — Firebase Emulator で確認

---

## 14. ファイル構成

```
sunchlorella-line-demo/
├─ index.html                  入口
├─ rep/index.html              訪問販売員 SPA
├─ customer/index.html         客LIFF SPA
├─ admin/index.html            本社 SPA
├─ shared/
│   ├─ config.js               動的設定 (backend / firebase / liff / stripe)
│   ├─ data.js                 Local/Firestore アダプタ facade
│   ├─ firebase-adapter.js     Firestore + Auth ラッパー (v10 SDK)
│   ├─ auth.js                 認証共通
│   ├─ auth-gate.js            ログインオーバーレイ (admin/rep)
│   ├─ api.js                  writeOrder / sendDirect / sendBroadcast / createCheckout
│   ├─ schema.js               SSOT 定数
│   ├─ seed.js                 デモ用シード (販売員5/顧客20/商品8/受注55/…)
│   └─ ui.css / icons.js       共通デザイントークン + SVG
├─ functions/
│   ├─ index.js                Cloud Functions 12本
│   └─ package.json
├─ firebase.json               Hosting + Functions + Firestore
├─ firestore.rules             multi-tenant セキュリティ
├─ firestore.indexes.json      複合インデックス
├─ .firebaserc                 project alias
└─ README.md                   このファイル
```
