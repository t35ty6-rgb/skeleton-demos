# Skel·CRM 本番セットアップ 手順書

このドキュメント は、 GitHub Pages で 動く demo mode の Skel·CRM を **本番環境 (Firebase + LINE Messaging API + Stripe)** に 差し替える 手順。

**所要時間**: 初回 90-120 分 (Firebase / LINE / Stripe の アカウント作成 込み)

---

## 前提

- macOS or Linux
- Node.js 20 以上 (`node --version` で確認)
- Firebase CLI (`npm i -g firebase-tools`)
- gcloud CLI (Cloud Functions 用、 https://cloud.google.com/sdk/docs/install)
- Google account (Firebase / GCP 用)
- Stripe account (https://dashboard.stripe.com/register)
- LINE developer account (https://developers.line.biz/)

---

## Step 1: Firebase project 新設 (10 分)

1. https://console.firebase.google.com/ を 開く
2. 「プロジェクトを追加」 → 名前 は任意 (例: `skel-crm-prod`)
3. Google Analytics は お好み で ON/OFF
4. 作成 完了後、 project settings (⚙️) を 開く
5. 「マイアプリ」 → `</>` (Web) を 選択 → nickname を 「Skel·CRM Web」等 で 登録
6. 「Firebase SDK snippet」 → 「Config」 の JSON 相当 部分 を コピー
7. `config.example.js` を `config.js` に コピー して、 `firebase: { ... }` に 貼付

```bash
cd ~/Desktop/クロード/事業/顧客配信ツール
cp config.example.js config.js
```

`config.js`:
```js
window.__CRM_CONFIG = {
  demo: false,  // ← false にする
  firebase: {
    apiKey: 'AIzaSy...',
    authDomain: 'skel-crm-prod.firebaseapp.com',
    projectId: 'skel-crm-prod',
    ...
  },
  ...
};
```

8. `.firebaserc` の `YOUR_FIREBASE_PROJECT_ID` を 実 project ID に 差し替え:
```json
{ "projects": { "default": "skel-crm-prod" } }
```

---

## Step 2: Firebase Auth 有効化 (5 分)

1. Firebase console → Authentication → 「始める」
2. 「Sign-in method」 タブ:
   - **Email/Password** を 有効化
   - **Google** を 有効化 (承認済み domain に 本番 domain を 追加、 例: `app.skel-crm.jp`)
3. まず 自分 (owner) の アカウント を 「Users」 タブ から 手動 作成 (email + password)、 または Google login で 一度 login すれば OK

---

## Step 3: Firestore 有効化 + rules deploy (5 分)

1. Firebase console → Firestore Database → 「データベースを作成」
2. **本番モード で 開始** (rules は 後で 上書き)
3. リージョン: `asia-northeast1` (東京) 推奨
4. rules を deploy:

```bash
firebase login          # 初回のみ
firebase use skel-crm-prod
firebase deploy --only firestore:rules
```

---

## Step 4: tenant を 手動作成 + admin claim 付与 (10 分)

Skel·CRM は multi-tenant SaaS 構造。 顧客 (別会社) に 提供する場合 は 1 tenant = 1 顧客 で 分ける。 自社利用 なら tenant 1 個 で OK。

### 4-1. tenant doc を Firestore に 作る
Firebase console → Firestore → 「コレクションを開始」:
- Collection ID: `tenants`
- Document ID: 任意 (例: `skeleton`、 これが `tenantId`)
- fields:
  - `name`: "Skeleton 株式会社" (string)
  - `plan`: "trial" (string)
  - `createdAt`: 現在時刻 (timestamp)

### 4-2. admin claim を owner に 付与
Cloud Functions が deploy 済 なら (Step 6 後)、 Cloud Shell で:

```bash
gcloud functions call setAdminClaim --data '{"uid":"YOUR_FIREBASE_UID","tenantId":"skeleton","role":"admin"}'
```

または、 Cloud Shell で node script を 実行:

```bash
# Cloud Shell (console 右上 の アイコン)
cd
cat > setclaim.js <<'EOF'
const admin = require('firebase-admin');
admin.initializeApp();
const [uid, tenantId, role] = process.argv.slice(2);
admin.auth().getUser(uid).then(u => {
  const existing = u.customClaims || {};
  const adminTenants = existing.adminTenants || {};
  adminTenants[tenantId] = role || 'admin';
  return admin.auth().setCustomUserClaims(uid, { ...existing, adminTenants });
}).then(() => {
  console.log('done. sign out & sign in で反映されます');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
EOF
npm i firebase-admin
node setclaim.js <FIREBASE_UID> skeleton admin
```

`FIREBASE_UID` は Firebase console → Authentication → 該当 user 行 の 「UID」列 で 確認。

### 4-3. login 後 一度 sign out / sign in で claim が token に 焼き込まれる

---

## Step 5: LINE Messaging API channel 作成 (15 分)

1. https://developers.line.biz/console/ に アクセス
2. 「Create a new provider」 (初回のみ) → provider 名 は 任意
3. provider を 開いて 「Create a new channel」 → **Messaging API** を 選択
4. channel 情報 入力 (channel name / channel description / category / subcategory / email)
5. 作成後、 channel を 開いて:
   - **Basic settings** タブ: `Channel secret` を メモ
   - **Messaging API** タブ:
     - `Channel access token (long-lived)` を 発行 → メモ (これが Skel·CRM で使う LINE token)
     - `Bot ID` メモ
6. 「Auto-reply messages」 「Greeting messages」 を OFF (Skel·CRM が 制御 するため)
7. Webhook URL を 設定 (Cloud Functions deploy 後、 `https://asia-northeast1-<project-id>.cloudfunctions.net/lineWebhook` 相当。 現状 webhook 未実装 なので 後日 追加)

### 5-1. LINE token を Firestore に 保存

Firebase console → Firestore → `tenants/skeleton` doc を 開いて field 追加:
- `line` (map):
  - `accessToken`: "上で発行した long-lived token"
  - `channelSecret`: "channel secret"
  - `botId`: "@xxxxxx"

**注意**: LINE access token は 秘密情報。 Firestore rules で client から は read 不可 に (現行 rules で admin のみ read 可)。 client UI (channels view) では masked 表示。

---

## Step 6: Cloud Functions deploy (10 分)

```bash
cd ~/Desktop/クロード/事業/顧客配信ツール/functions
npm install
cd ..
firebase deploy --only functions
```

初回 deploy 時、 GCP APIs (Cloud Build / Artifact Registry / etc) の 有効化 promptあり → Y。

deploy 完了後、 5 functions が 生える:
- `sendLineBroadcast`  (callable)
- `sendLineTest`       (callable)
- `createCheckoutSession` (callable)
- `stripeWebhook`      (HTTP endpoint、 Stripe に登録する)
- `onCustomerCreate`   (Firestore trigger)
- `dailyAggregator`    (schedule: 03:00 JST)

---

## Step 7: Stripe アカウント + product / price 作成 (15 分)

1. https://dashboard.stripe.com/register で 登録 → 本人確認完了させる
2. `Developers` → `API keys`:
   - `Publishable key` (pk_live_ or pk_test_) を メモ → `config.js` の `stripe.publishableKey` に 貼付
   - `Secret key` (sk_live_ or sk_test_) を メモ → 下記で Secret Manager に 登録
3. `Products` → `Add product`:
   - 商品名: 「Skel·CRM スタンダード」 等
   - Pricing: recurring 月次 (例: ¥9,800/月)
   - 作成後、 price ID (`price_...`) を メモ → `config.js` の `stripe.priceIds.standard` に 貼付
4. secret key を Firebase Secret Manager に:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# → sk_test_XXX (or sk_live_XXX) を 貼付
```

5. webhook 登録:
   - Stripe dashboard → `Developers` → `Webhooks` → `Add endpoint`
   - endpoint URL: `https://asia-northeast1-<project-id>.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - 作成後、 `Signing secret` (whsec_...) を メモ:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# → whsec_XXX を 貼付
```

6. functions を 再deploy (secret 変更後 は 必須):
```bash
firebase deploy --only functions
```

---

## Step 8: Hosting deploy (5 分)

```bash
cd ~/Desktop/クロード/事業/顧客配信ツール
firebase deploy --only hosting
```

deploy 完了後 の URL (例: `https://skel-crm-prod.web.app`) で 本番 UI が 開く。

### 8-1. カスタムドメイン (任意)
- Firebase console → Hosting → 「カスタムドメインを追加」
- DNS TXT + A record を 設定 (指示通り)
- 数分~ 数時間 で 反映、 SSL 自動

---

## Step 9: 動作確認 (10 分)

### 9-1. Login
1. `https://<your-domain>/?tenant=skeleton` を 開く
2. login 画面 が 出る → Step 2 で作った email/pw or Google login
3. Step 4-2 の adminTenants claim が 効いてれば dashboard に 遷移

### 9-2. LINE 接続テスト
1. サイドバー 「LINE アカウント」 → 「接続テスト」 button
2. 実 LINE bot/info API が 200 で 返れば 接続 OK

### 9-3. 一括配信
1. サイドバー 「一括配信」 → 「+ 配信作成」
2. 対象 セグメント + message 入力 → 送信
3. LINE 側 で 実 配信 が 走る (test 用 に 自分 だけ が member の tag / segment で 試す推奨)
4. 「配信履歴」 に record が 積まれる

### 9-4. Stripe 課金
1. header 右 「プラン アップグレード」 button (plan=trial 時 に 表示)
2. Stripe Checkout page に redirect → test card 4242 4242 4242 4242 で 決済
3. webhook 経由 で `tenants/skeleton.plan` が `active` に mirror → UI badge 更新

---

## Step 10: 客 tenant 追加 (提供開始時)

新規 顧客 に SaaS を 提供する 場合:

1. Firestore → `tenants` collection に 新 doc 追加 (Document ID = 顧客 tenantId、 例: `client-abc`)
2. 顧客 owner の Firebase Auth user 作成 (email 招待 or self signup)
3. Step 4-2 の script で `setclaim.js <UID> client-abc admin` 実行
4. 顧客 側 の LINE channel token を 取得 → `tenants/client-abc.line.accessToken` に 保存
5. 顧客 に URL 案内: `https://<your-domain>/?tenant=client-abc`

---

## トラブルシューティング

### ログインできない (Firebase auth/invalid-credential)
- Step 2 で email/password 認証 が 有効 か
- Step 2 で 該当 user が 作成 済 か
- password が UTF-8 で 正しく 入力 されて いる か

### 「tenant への 権限が ありません」 表示
- Step 4-2 の setCustomUserClaims が 走ってる か (`admin.auth().getUser(uid).customClaims` で 確認)
- 一度 sign out → sign in で token を refresh

### LINE 送信 で 「LINE API error 401」
- `tenants/{tenantId}.line.accessToken` の 値 が 正しい か (long-lived token か、 期限切れ で ないか)
- LINE console で token 再発行 → Firestore 更新

### Stripe checkout 「invalid API key」
- `firebase functions:secrets:access STRIPE_SECRET_KEY` で 値 確認
- `sk_test_` と `sk_live_` を 環境 で 揃える (test key で live product は 買えない)

### GitHub Pages demo mode に 戻したい
- `config.js` を 削除 or リネーム → demo mode 起動

---

## セキュリティ 注意

- **`config.js` を git に commit しない** (`.gitignore` に 追記推奨)
- LINE access token / Stripe secret key は Secret Manager / Firestore の admin only field で 管理、 client bundle に 埋め込ま ない
- Firestore rules は 定期的 に `firebase deploy --only firestore:rules` で 最新化
- Cloud Functions log は `firebase functions:log` で 監査、 異常 な API 呼出 が ないか 週次確認

---

## 次 の 拡張 候補 (Phase 2)

- LINE webhook (`lineWebhook` HTTP function) 実装 → 友だち追加 event で 自動 顧客登録
- Storage 統合 → 画像 message 配信
- LIFF 連携 → 顧客 side の form / ミニアプリ
- 分析 dashboard 強化 (Analytics BigQuery export)
- SSO (Google Workspace SAML) 対応
