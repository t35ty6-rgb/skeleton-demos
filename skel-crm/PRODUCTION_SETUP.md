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

Skel·CRM は Cloud Function `setAdminClaim` を持っており、 これを 呼ぶ には まず **自分 に super-admin custom claim** が 必要 (卵と鶏 問題)。 初回 のみ 下記 node script を 走らせて 自分 を super-admin に する。

**初回セットアップ (Cloud Shell で 1回だけ)**:

```bash
# Cloud Shell (Firebase console 右上 の terminal アイコン)
cd
cat > bootstrap-admin.js <<'EOF'
const admin = require('firebase-admin');
admin.initializeApp();
const [uid, tenantId] = process.argv.slice(2);
admin.auth().getUser(uid).then(u => {
  const existing = u.customClaims || {};
  const adminTenants = existing.adminTenants || {};
  adminTenants[tenantId] = 'admin';
  return admin.auth().setCustomUserClaims(uid, {
    ...existing,
    adminTenants,
    superAdmin: true,   // ← これで 以降 setAdminClaim を 呼べる
  });
}).then(() => {
  console.log('done. sign out & sign in で 反映されます');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
EOF
npm i firebase-admin
node bootstrap-admin.js <FIREBASE_UID> skeleton
```

`FIREBASE_UID` は Firebase console → Authentication → 該当 user 行 の 「UID」列 で 確認。

**2回目以降 (客の tenant を 増やす、 別 admin を 招く 等)**:

super-admin token を 持って login 済 の state で、 browser DevTools console で:

```js
const fn = firebase.functions('asia-northeast1').httpsCallable('setAdminClaim');
await fn({ uid: 'TARGET_UID', tenantId: 'client-abc', role: 'admin' });
// → {ok:true, uid, tenantId, role}
```

または gcloud CLI:

```bash
gcloud functions call setAdminClaim \
  --region=asia-northeast1 \
  --data '{"data":{"uid":"TARGET_UID","tenantId":"client-abc","role":"admin"}}'
```

権限 追加 の 実行 記録 は `tenants/{tenantId}/auditLog` に `ADMIN_CLAIM_SET` として 残る。

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
7. **Webhook URL を 設定** (Cloud Functions deploy 後):
   - URL: `https://asia-northeast1-<project-id>.cloudfunctions.net/lineWebhook?tenant=<tenantId>&channel=<channelId>`
     - 例 (単一 tenant): `https://asia-northeast1-skel-crm-prod.cloudfunctions.net/lineWebhook?tenant=skeleton`
     - 複数 tenant を 1 project で 相乗り する 場合 は `?tenant=` を 客ごと に 使い分ける
   - LINE Developers Console → Messaging API → Webhook URL に上記を貼付 → **Verify** button で 200 確認
   - **Use webhook** を ON に する
   - 挙動:
     - `follow` event → Firestore に customer doc 作成、 LINE displayName / picture を 取得、 `onFollow` trigger の autoTagRule を 発火
     - `unfollow` event → customer.status='unfollowed' に mark
     - `message` event → customer.lastActivityAt を 更新
     - `postback` event → postback.data (例: `campaign:cp123`) で campaignId autoTagRule を 発火

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

deploy 完了後、 **10 functions** が 生える:

**呼び出し系 (callable)**
- `sendLineBroadcast`   一括配信 (LINE multicast / broadcast)。 1日 3回 / 1分 3回 の rate limit
- `sendLineTest`        LINE bot/info で 接続テスト
- `createCheckoutSession` Stripe checkout session 発行
- `setAdminClaim`       admin 権限 付与 (super-admin のみ 呼べる)
- `deployRichMenu`      LINE リッチメニュー 画像 upload + 全ユーザー link

**HTTP endpoint**
- `stripeWebhook`       Stripe subscription event 受信 → tenants/{id}.plan mirror
- `lineWebhook`         LINE Messaging API webhook (follow / unfollow / message / postback)

**トリガー**
- `onCustomerCreate`    Firestore trigger: 新規客 追加 → welcome step 発火
- `processStepRunners`  scheduled every 5 min: step runner を 走査 → LINE push
- `dailyAggregator`     scheduled 03:00 JST: 前日 の 配信履歴 集計 → `analytics/{date}`

**監査 / 制御 挙動**
- 全 callable と webhook は `tenants/{tenantId}/auditLog/{logId}` に action log を 残す (admin のみ read、 client write 禁止)
- rate limit hit / LINE API error / Stripe error は auditLog + Cloud Logging に 出る
- Firestore rules で `auditLog` / `rateLimits` / `steps/{id}/runners` は client write を 全禁止 (Cloud Function 経由 のみ)

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

## Step 8.5: 動画ホスティング (会員動画) セットアップ (15 分)

Skel·CRM の 「動画ホスティング」 tab は Firebase Storage + LIFF viewer + Cloud Functions で 会員限定 の 動画配信 を 実装 する (UTAGE の 会員サイト 動画 相当)。

### 8.5-1. Firebase Storage を 有効化

1. Firebase console → **Storage** → 「始める」
2. 「本番モードで開始」 を 選択
3. リージョン: `asia-northeast1` (Firestore と 揃える)
4. rules を deploy:
```bash
firebase deploy --only storage
```
   `storage.rules` の 内容:
   - `videos/{tenantId}/{videoId}/*` は 公開 read (URL を 知る 人 のみ)、 admin write
   - それ以外 は default deny
   - 500MB 上限 + `video/*` or `image/*` content-type のみ

### 8.5-2. LIFF アプリ を 作成

LIFF (LINE Front-end Framework) 経由で 顧客 の LINE ID を 取得 → tag 判定 して 動画 表示 する 構成。

1. https://developers.line.biz/console/ → **既存 の Messaging API channel** を 開く (Step 5 で 作った channel)
2. 「LIFF」 タブ → 「追加」
3. 設定:
   - **LIFF app name**: `Skel·CRM Video Viewer`
   - **Size**: `Full` (画面全体、 mp4 再生 に 必要)
   - **Endpoint URL**: `https://<your-domain>/liff/video`
   - **Scope**: `profile` + `openid` (顧客 の userId を 取得 する ため)
   - **Bot link feature**: `On (Aggressive)` (未 友だち の 場合 自動 で 友だち 追加 促す)
4. 作成後、 「LIFF ID」 (`1234567890-abcXXXXX` 形式) を コピー

### 8.5-3. config.js に LIFF ID を 記入

```js
window.__CRM_CONFIG = {
  ...
  liffId: '1234567890-abcXXXXX',   // 8.5-2 で 発行 された LIFF ID
};
```

### 8.5-4. Cloud Functions を re-deploy

`getVideoForMember` / `recordVideoView` の 2 callable が Storage + LIFF 対応 で 追加 されている。 Step 6 の re-deploy で 反映:
```bash
firebase deploy --only functions
```

### 8.5-5. 動画 を 1 本 アップロード して 動作 確認

1. admin (自分) で login → 「動画ホスティング」 tab
2. 「+ 動画 を アップロード」 → mp4 (5分 以内 推奨) を drag & drop
3. タイトル + 説明 + 視聴 対象 タグ (例: `VIP`) を 入力 → 「アップロード」
4. Firebase Storage console で `videos/skeleton/{videoId}/...` に file が 上がって いる か 確認
5. カード の 「🔗 URL」 button で 視聴 URL を コピー → 別 browser で 開く
6. LINE login popup → 対象 tag 保有 者 なら 動画 再生、 未保有 なら gate 画面 表示

### 8.5-6. LINE 配信 から 動画 に 誘導

1. 「一括配信」 → 「+ 配信作成」
2. STEP 4 「動画 を 添付」 pulldown で 動画 を 選択
3. STEP 5 プレビュー に 動画 サムネ + タイトル の カード が 出る
4. 送信 → LINE 側 に text メッセージ + template message (動画 リンク) が 届く
5. 顧客 が タップ → LIFF viewer 起動 → tag 判定 → 視聴 開始
6. 15秒 ごと + 完走 で `viewLogs` に record → admin 側 の 分析 modal に 反映

### 8.5-7. 分析 の 見方

- **card 上 の 数字**: 累計 視聴 数 / 完走 率
- **カード クリック** or 「📊 分析」 button で 詳細 modal:
  - 累計 視聴 / ユニーク / 完走 数 / 平均 視聴率
  - 直近 40 件 の 視聴 ログ (誰 が / いつ / どれくらい 見た か)

### 動画 ホスティング の コスト 目安

Firebase Storage:
- 5GB まで 無料 (Blaze plan)、 以降 $0.026/GB/月
- 転送 は 1GB/日 無料、 以降 $0.12/GB
- **試算**: 動画 10本 × 100MB × 月間 500 視聴 = 保存 1GB + 転送 50GB → 月 約 ¥900

大量 配信 or 大容量 動画 で コスト が 気に なったら Cloudflare Stream ($5/月 + $1/1000分 配信) 等 に 差し替え 検討 (Phase 2)。

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

## 挙動 詳細 (追加リファレンス)

### Rate limit
- `sendLineBroadcast`: 1分 3回 / 1時間 10回 / **1日 3回** (客への spam 予防)
- `sendLineTest`: 1分 10回 / 1時間 100回
- `createCheckoutSession`: 1分 10回 / 1時間 100回
- `deployRichMenu`: 1分 3回 / 1時間 20回
- 超過 = HttpsError `resource-exhausted`、 `auditLog` に `RATE_LIMIT_HIT` として記録

### auditLog collection
- 経路: `tenants/{tenantId}/auditLog/{logId}`
- fields: `uid`, `tenantId`, `action`, `meta`, `createdAt`
- action 種類:
  - `LINE_BROADCAST_SENT` / `LINE_TEST_OK` / `LINE_TEST_FAILED`
  - `LINE_WEBHOOK_FOLLOW` / `LINE_WEBHOOK_UNFOLLOW`
  - `AUTOTAG_APPLIED`
  - `STEP_MESSAGE_SENT`
  - `STRIPE_CHECKOUT_CREATED`
  - `ADMIN_CLAIM_SET`
  - `RICHMENU_DEPLOYED`
  - `RATE_LIMIT_HIT`

### 動画ホスティング (Firebase Storage + LIFF)
- Storage path: `videos/{tenantId}/{videoId}/{fileName}` (公開 read、 admin write、 500MB 上限)
- Firestore: `tenants/{tenantId}/videos/{videoId}` に メタ (title, memberTagIds, analytics)
- 視聴ログ: `tenants/{tenantId}/videos/{videoId}/viewLogs/{logId}` (Cloud Function `recordVideoView` のみ write)
- LIFF endpoint: `/liff/video?tenant=xxx&videoId=xxx`
- CF callable:
  - `getVideoForMember`: LINE access token 検証 → customer tag 判定 → video URL 返却
  - `recordVideoView`: 15秒 ごと + 完走 で 視聴ログ 追記 + analytics 更新
- 監査 は `firebase functions:log` と 併用、 週次で 異常 API 呼び出し 有無 確認

### step runner (`processStepRunners`)
- 5分間隔 で `tenants/*/steps/*/runners/*` を 走査
- `status==='pending' && nextRunAt<=now` の runner を LINE push
- step 定義 に `messages: [{delayMinutes, text}, ...]` が 必要 (現状 UI では 空 で作成、 後日 UI 拡張)
- 送信失敗 3回 で `status='failed'` に mark、 `lastError` 記録
- 1 スケジュール実行 で 50 通/step まで (安全弁)

### richmenu deploy (`deployRichMenu`)
- Firestore `tenants/{tenantId}/richmenus/{richMenuId}` に `{name, imageDataUrl or imageUrl, areas, size, chatBarText}` を 事前 保存
- Cloud Function が LINE `POST /v2/bot/richmenu` → 画像 upload → 全ユーザー link を 一気に 実行
- 成功時 は `deployed:true, lineRichMenuId` を doc に 書き戻し

---

## 次 の 拡張 候補 (Phase 2 · UTAGE parity)

- 決済 連動 (Stripe 既存 配線 → 動画 単品 販売 / 会員 プラン に 連動)
- LP builder (drag-drop エディタ)
- ステップ配信 の 動画 添付 UI (現状 は 一括配信 のみ 対応)
- 動画 視聴 セグメント 化 (「動画 A を 80% 以上 視聴 した 人」 で 追加 配信)
- Cloudflare Stream 移行 option (大容量 / 大量 配信 時 の コスト 最適化)
- アフィリエイト 管理 (顧客 → 顧客 の 紹介 リンク 発行)
- 分析 dashboard 強化 (Analytics BigQuery export)
- SSO (Google Workspace SAML) 対応
- audit log 検索 UI (admin panel)
