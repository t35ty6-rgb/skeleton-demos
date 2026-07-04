# 福鉄スタンプラリー · LIFF/Firebase セットアップ手順

契約後、実運用開始までの実装作業リスト。福鉄側とスケルトン側で作業分担。

---

## 全体所要時間

| 作業者 | 作業時間 |
|---|---|
| 福鉄さん (LINE設定) | 30分 |
| スケルトン (実装配線) | 半日 |
| 両者 (実機E2E検証) | 1時間 |

---

## 1. 福鉄さん側 · LINE Developers Console 設定

作業画面: https://developers.line.biz/console/

### 1-1. Provider (プロバイダ) 作成
1. 「新規プロバイダー作成」
2. プロバイダー名: `福井鉄道` (社名)

### 1-2. LINEログインチャネル 作成 (LIFF用)
1. Provider内で「新しいチャネルを作成」→ **LINEログイン** を選択
2. 設定:
   - チャネル名: `ふくてつ さんぽ帳`
   - チャネル説明: `福武線沿線スタンプラリー`
   - アプリタイプ: `Web app` にチェック
   - メールアドレス: 担当者メール
3. 作成後、「LIFF」タブへ

### 1-3. LIFF アプリ登録
1. LIFFタブで「追加」
2. 設定:
   - LIFF アプリ名: `ふくてつ さんぽ帳`
   - サイズ: **Full** (全画面推奨)
   - エンドポイント URL: `https://rally.fukutetsu.example.jp/` (実ドメイン、後述)
   - Scope: `profile` `openid` (最低限)
   - 「シェアターゲットピッカー」ON (SNS シェア機能で使用)
3. 作成後、**LIFF ID** をコピー (例: `2010266648-iX5kooZe`)
4. **→ スケルトンに LIFF ID を渡す**

### 1-4. Messaging APIチャネル 作成 (push配信用)
1. Provider内で「新しいチャネルを作成」→ **Messaging API** を選択
2. 設定:
   - チャネル名: `福鉄さんぽ 公式アカウント`
   - チャネル説明: 同上
   - 大業種/小業種: 交通
3. 作成後、「Messaging API」タブで:
   - **チャネルアクセストークン(長期)** を発行 → コピー
   - **チャネルシークレット** をコピー
   - Webhook URL は 後で スケルトンから設定
4. **→ スケルトンに 両方のトークンを渡す (Slack DM 等で)**

### 1-5. LINE公式アカウント 開設 (未開設の場合)
- https://www.linebiz.com/jp/entry/ から開設
- プラン: **スタンダードプラン (¥15,000/月、30,000通/月)** 推奨
- アカウント名: `福鉄さんぽ` (or 既存の公式アカウントに機能追加)

---

## 2. スケルトン側 · 実装配線

### 2-1. LIFF ID を app に セット
`index.html` 内の meta タグに LIFF ID を入れる:
```html
<meta name="fukutetsu-liff-id" content="2010266648-iX5kooZe">
```
これで LIFF SDK が自動で起動、LINE友だち → LIFFで名前+userId取得。

### 2-2. Firestore プロジェクト準備

**選択肢A**: Skeleton既存 project (`skeleton-skel-ec-2606`) に collection prefix で間借り (推奨、迅速)
```
fukutetsu/rallies/{rallyId}/participants/{userId}
fukutetsu/rallies/{rallyId}/stamps/{docId}
fukutetsu/segments/{segId}
```

**選択肢B**: 福鉄専用 Firebase プロジェクト新規作成 (福鉄名義、独立性◎)

### 2-3. Firestore Security Rules
```javascript
match /fukutetsu/rallies/{rallyId}/participants/{userId} {
  allow read: if request.auth.token.line_user_id == userId;
  allow write: if request.auth.token.line_user_id == userId;
}
match /fukutetsu/rallies/{rallyId}/stamps/{doc} {
  allow read: if request.auth != null;
  allow create: if request.auth.token.line_user_id == request.resource.data.userId
                && distanceOK(request.resource.data.coord, spotCoord);
}
```

### 2-4. Cloud Functions Deploy
`functions/index.js` に配置する関数:

- **`verifyStamp`** (HTTPS Callable) — 押印時に呼ばれ、GPS再判定 + hash-chain + Firestore書き込み
- **`onStampCreated`** (Firestore trigger) — 押印後にセグメント再計算・コンプリート判定・S4即時push
- **`scheduledSegmentPush`** (Cloud Scheduler daily 20:00 JST) — S1/S2/S3/S5 の 自動配信
- **`weatherTriggerPush`** (Cloud Scheduler weekly Fri 18:00) — 天気API連動 (継続Phase)
- **`monthlyReport`** (Cloud Scheduler monthly 1st 09:00) — 前月レポートPDF生成 + オーナーLINE push

### 2-5. Messaging API 連携
Cloud Functions 環境変数に:
```
LINE_CHANNEL_ACCESS_TOKEN=xxxxx (長期トークン)
LINE_CHANNEL_SECRET=xxxxx
```
push は 必ず `to: userId` 指定 (broadcast禁止、memory準拠)。

### 2-6. ドメイン設定 (推奨)
- 独自ドメイン: `rally.fukutetsu.example.jp` (福鉄側で用意) or
- Skeleton サブドメイン: `rally.skeleton-inc.jp/fukutetsu/`
- どちらもFirebase Hosting でカスタムドメイン設定
- LIFFエンドポイントURLに設定

### 2-7. QR現物の掲出設計
- `qr-print.html` で A4 印刷 → 現地掲出
- QR URL 形式: `https://rally.fukutetsu.example.jp/?spot=SP-XX`
  - Phase 2 で 時限トークン付き: `?spot=SP-XX&t=1234567&sig=abcde` (Cloud Functions で 30秒ごとに sig 更新、掲出はダイナミック QR ディスプレイ)
- 初回 PoC は 静的 QR で OK (掲出コスト重視)

---

## 3. 検証チェックリスト (契約後、両者立会い)

- [ ] LINE友だち追加 → 公式アカウントで挨拶メッセージ受信
- [ ] リッチメニューから LIFF 起動 → 名前+アイコン自動取得
- [ ] 現地スポットに 実 GPS で移動 → QR スキャン → 硬券押印 → LINE通知
- [ ] 3個押印 → S1セグメント自動push受信
- [ ] コンプリート → S4即時push + 硬券セット引換案内
- [ ] admin ダッシュボードで リアル数字 (今日◯人参加) 反映確認
- [ ] admin セグメント配信 → 対象ユーザーに実LINE push 到達
- [ ] 圏外から QR画像 スキャン → 押印されない + 監査ログ記録

---

## 4. リッチメニュー設計 (LINE公式アカウント側)

友だち追加時のリッチメニュー案:

```
┌──────────────┬──────────────┐
│  🎌         │  📖         │
│  さんぽ帳   │  スタンプ帳 │
│  を開く     │  を見る     │
├──────────────┼──────────────┤
│  🎁         │  ℹ️         │
│  景品交換   │  参加ガイド │
└──────────────┴──────────────┘
```

- 各ボタンから LIFF起動 (それぞれ違う tab 開始状態でリンク)
  - `/?tab=map` → スポットタブ
  - `/?tab=book` → 帳タブ
  - `/?tab=prize` → 景品タブ

---

## 5. コスト内訳 (通年運用)

| 項目 | 費用 | 支払先 |
|---|---|---|
| LINE公式スタンダード | ¥15,000/月 | LINE |
| Firebase (Firestore + Functions) | ¥0〜3,000/月 | Google (Blaze 従量) |
| スケルトン SaaS 費 | ¥10,000/月 | スケルトン |
| Cloud Scheduler | ¥0/月 | Google (無料枠) |
| 現地掲出印刷 (季節ラリー毎) | ¥30,000/回 × 4回 | 印刷会社 |
| 景品原資 | 実費 | 福鉄 |

年間: **約¥360,000 (システム) + 実費 (景品)**

---

## 6. リスクと対策

| リスク | 対策 |
|---|---|
| LIFF SDK バージョン変更で挙動変化 | 週次スケルトン監視・自動E2Eテスト |
| Messaging API push配信上限超過 | セグメント絞り込みで消費削減 · 上位プラン切替判断 |
| QR画像の SNS 流通 | GPS判定 + Phase2 で時限トークン化 |
| Firebase 課金想定超過 | Blaze プランの アラート設定 (¥3,000/月 で警告) |
| コンプ達成者への 硬券セット在庫切れ | 事前 発注数調整 · 予備景品用意 |
