# サン・クロレラ 統合LINE OS テストスイート

## 内容

### 1. `linemulticast.test.mjs` — 単体テスト (Cloud Functions)

`functions/index.js` の `lineMulticast` を fetch mock で検証。

- 全成功 (200 OK 3チャンク)
- 429 リトライ → 3回目成功
- 5xx 3回全滅 → retry_exhausted
- 4xx 即失敗 (retry しない)
- 空リスト
- 部分失敗 (chunk 中の1つだけ 4xx)

**実行:**
```bash
node test/linemulticast.test.mjs
```

**現状: 6/6 PASS**

### 2. `e2e-flow.test.mjs` — E2E 実操作テスト (Playwright)

主要業務フロー を Chromium headless で 実際に触る。

- 訪問販売員 受注入力 (北野誠さん→田中幸子さま向け)
- 客の履歴に反映確認
- 本社ダッシュ KPI + 直近受注 反映確認
- キャンペーン新規作成 → 一覧反映
- チャネル詳細 5サブタブ切替
- セグメント配信 chip → 動的人数 → 送信 → 履歴反映
- 客: 定期便 skip 実行
- Escape でモーダル閉じる
- pageerror ゼロ

**実行:**
```bash
# サーバー起動
cd sunchlorella-line-demo && python3 -m http.server 8877 &
# テスト
node test/e2e-flow.test.mjs
```

**現状: 13/13 PASS**

### 3. 未実施: Firestore rules テスト

Firebase Emulator (Java Runtime 必須) が必要。 Sprint 4 で staging Firebase project 分離と 同時に環境構築 予定。

```bash
# 将来
brew install openjdk
firebase emulators:start --only firestore
node test/rules.test.mjs
```

## 検証状況 (2026-07-04 Sprint 1完了時点)

| 検証 | 手法 | 結果 |
|---|---|---|
| lineMulticast retry ロジック | fetch mock 単体テスト | 6/6 PASS ✓ |
| 3画面連動 (販売員→客→本社) | Playwright 実操作 | PASS ✓ |
| キャンペーン新規作成 | Playwright | PASS ✓ |
| チャネル詳細 5サブタブ | Playwright | PASS ✓ |
| セグメント配信 動的人数 | Playwright | PASS ✓ |
| 定期便 skip | Playwright | PASS ✓ |
| Escape ハンドラ (admin/rep) | Playwright | PASS ✓ |
| Firestore rules | Firebase Emulator | Sprint 4 予定 |
| Stripe 実接続 (二重カウント/metadata/idempotency) | Stripe Dashboard test mode | Sprint 4 予定 |
| LINE Messaging API 実接続 (webhook/multicast) | LINE 開発Channel | Sprint 4 予定 |
