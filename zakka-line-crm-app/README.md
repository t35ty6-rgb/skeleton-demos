# 雑貨LINEツール (zakka-line-crm)

雑貨店向け「公式LINE連動 顧客カルテ + ポイントカード + ミニ在庫 + 売上ダッシュボード」一体型SaaS。

## 構成

```
zakka-line-crm/
├── admin/index.html          スタッフ画面 SPA (ダッシュボード/顧客/カルテ/在庫/商品/配信/設定)
├── customer/index.html       お客側 LIFF (ポイント/履歴/クーポン/お店)
├── shared/
│   ├── schema.js             Firestore スキーマ + 集計ロジック SSOT
│   └── data.js               データ抽象化レイヤー (localStorage / Firestore 切替可)
├── seed/demo-data.js         デモテナント "zakka-demo" 初期データ
├── functions/index.js        Cloud Functions 雛形 (LINE webhook / 自動配信)
├── firestore.rules           マルチテナント security rules
├── firestore.indexes.json
└── firebase.json
```

## 動かす

### Phase 0 (デモ / 商談前): ブラウザだけで完結

データは localStorage に保存。Firebase 不要。

```bash
cd skeleton-tools/zakka-line-crm
python3 -c "import http.server, socketserver; \
  socketserver.TCPServer(('127.0.0.1', 8910), http.server.SimpleHTTPRequestHandler).serve_forever()" &

open http://127.0.0.1:8910/admin/index.html
open http://127.0.0.1:8910/customer/index.html
```

初回起動でデモデータ (5顧客 / 8商品 / 8購入記録) が自動投入される。

### Phase 1 (本番): Firebase 接続

1. **客先と一緒に** LINE Developer Console で Messaging API チャネル + LIFF アプリ作成
2. Firebase project 作成 (例: `zakka-{客先}-prod`)
3. `firebase deploy --only firestore:rules,firestore:indexes,functions`
4. `admin/`, `customer/` を Firebase Hosting に deploy
5. 設定画面で Channel ID / Secret / Access Token / LIFF ID を入力
6. `shared/data.js` の `createRepo()` を `LocalAdapter` から `FirestoreAdapter` に切替

## 機能 (Phase 1 完成済)

### スタッフ画面 (admin/)
- 今日の店ダッシュボード (KPI / 14日売上グラフ / お声がけ候補 / 最近購入)
- お客さま一覧 (検索 / VIP・常連・新規・休眠・誕生月フィルタ)
- カルテ (タグ / 累計 / 来店回数 / ポイント / 店長メモ / 購入記録フォーム / 履歴 / LINEやりとり)
- 在庫管理 (絵文字付き / 残量バー / 増減ボタン / 残少フィルタ)
- 商品マスタ (作家・カテゴリ・価格・原価・在庫・基準在庫)
- 配信・施策 (自動配信3種 / 手動セグメント6種 配信数リアルタイム集計)
- 設定 (店名 / LINE連携 / ポイントルール)

### お客側 LIFF (customer/)
- ホーム (ポイント残高 / 次の特典までのプログレス / 累計と来店回数)
- メニュー4タブ (購入履歴 / クーポン / お気に入り / 取り置き)
- お知らせ (誕生月クーポン / 入荷情報 / 自動配信履歴)
- 購入履歴 (商品リスト / 包装あり等のメモ / 合計)
- クーポン (使用済/未使用 / レジ提示用)
- お店へ

### Cloud Functions (functions/)
- `lineWebhook` — LINE Messaging API webhook (友だち追加でカルテ自動発行 / メッセージ受信)
- `recordPurchase` — 購入記録 (在庫減算 / ポイント加算 / 自動メッセージ送信)
- `dailyBirthCoupon` — 毎朝9時 誕生月クーポン自動配信
- `weeklyRevival` — 毎週月曜 休眠掘り起こしメッセージ

## ポイント計算 ロジック (SSOT)

`shared/schema.js` 参照。

- ¥100 = 1P (デフォルト、テナント設定で変更可)
- 誕生月は 2倍ボーナス
- 1P = ¥1 値引きに利用可
- 100P から利用開始
- 365日間 利用なしで失効

## 顧客タグ 自動付与

`shared/schema.js#classifyCustomer()` でランタイム算出:

- `vip`    — 累計 ¥50,000以上
- `regul`  — 来店5回以上
- `new`    — 来店1回以下 かつ 登録30日以内
- `sleep`  — 最終来店 90日以上前
- `birth`  — 誕生月

スタッフが手動で追加するタグ (`oribe_fan`, `gift_user` 等) は別管理で上書きしない。

## 商談で確認したいこと

1. 客先 屋号 / 取扱商品 / 既存POS有無
2. ドメイン (例: `nouto.app` / `{客先}.skeleton-inc.jp`)
3. LINE 公式アカウントの保有状況 (有料プラン推奨: 1,000通/月 〜)
4. ポイントルール (デフォルト ¥100=1P で問題ないか)
5. スタッフ4名のメールアドレス (Firebase Auth 招待用)

## 料金 (デフォルト提案)

| 項目 | 金額 |
|---|---|
| 初期構築 (4週間) | ¥248,000 |
| 月額 (サーバー・LINE配信・保守込) | ¥9,800 |
| Phase 2 在庫機能 | +¥98,000 |
| Phase 3 マーケ機能 | +¥128,000 |
