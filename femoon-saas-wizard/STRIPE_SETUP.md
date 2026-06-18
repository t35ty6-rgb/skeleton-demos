# FEMOON SaaS · Stripe 決済 セットアップ (オーナー作業)

ウィザード末尾の `_payment` slide で実際の決済を有効化するための1回限り設定。

## 現状
- `index.html` の `STRIPE_PAYMENT_LINK` 定数が placeholder
- placeholder のまま「¥9,800 を 支払う」 を 押すと「営業側で 準備中」 アラート → done画面 へ
- 申込データ自体は Stripe前 に Firestore送信済 (Skeleton側で受信可能)

## 設定手順 (10分)

### 1. Stripe Dashboard で月額プラン作成
1. https://dashboard.stripe.com/ にログイン (live mode)
2. **商品 → 商品を追加** → 名前「FEMOON SaaS / 月額」
3. **価格** → ¥9,800 / 月 (subscription, JPY)
4. **保存**

### 2. Payment Link 発行
1. **支払い → 支払いリンク** → 「新規」
2. 上の商品/価格を選択
3. オプション:
   - **顧客のメールアドレスを自動入力**: ON (wizardから `prefilled_email=` で渡す)
   - **クライアント参照ID**: ON (wizardから `client_reference_id=` で 申込番号を渡す)
   - **決済成功後のリダイレクト**: `https://t35ty6-rgb.github.io/skeleton-demos/femoon-saas-wizard/?paid=1` (オプション)
4. 発行されたURL (例: `https://buy.stripe.com/abc123XYZ`) をコピー

### 3. wizard に URL を貼る
```js
// femoon-saas-wizard/index.html L184付近
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/abc123XYZ';  // ← 貼替
```

### 4. commit & deploy
```bash
cd ~/Desktop/skeleton-demos
git add femoon-saas-wizard/index.html
git commit -m "wizard: Stripe Payment Link 本番URL 設定"
git push
```

## 動作確認
- ウィザード末尾まで進む → 「お支払い」 slide → 「¥9,800 を 支払う」 → Stripe Checkout 画面
- メアド と 申込番号 が プリフィル されている
- テスト決済: VISAテストカード `4242 4242 4242 4242` / 任意有効期限 / 任意CVC

## 解約フロー
- Stripe Customer Portal を有効化 (Dashboard → 設定 → 顧客ポータル)
- サロン admin に「解約」 ボタン埋込 → Customer Portal リンク へ

## Webhook (将来)
- 決済成功 → `tenants/{id}.subscriptionStatus = 'active'` 反映
- 失敗 → サロン admin で 警告表示
- 現状は Firestore `onboarding_requests` の `payment_status` を 手動で更新
