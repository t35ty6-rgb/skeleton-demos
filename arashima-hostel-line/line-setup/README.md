# 荒島ホテル LINE 予約システム — セットアップパッケージ

このディレクトリは、荒島ホテルの LINE 公式アカウント (@arashima-hotel) を「予約から滞在まで完結する窓口」にするための一式です。

## オーナーがやること (5分)

公式 LINE アカウントを作成し、3つの値を Jobs に渡すだけです。

```
1. https://www.lycbiz.com/jp/signup でアカウント作成
   ↓ 名前: 荒島ホテル / 業種: 宿泊 / 国: 日本
2. Official Account Manager → 設定 → Messaging API → 「利用する」
   ↓ Provider を新規作成 or 既存選択
3. 発行された 3つの値を Jobs に共有:
   ↓ Channel ID
   ↓ Channel secret
   ↓ Channel access token (long-lived)
```

## Jobs がやること (残り全部)

Channel 情報を受け取ったら、以下を順次自動で構築します。

| 区分 | 内容 | ファイル |
|------|------|---------|
| 1 | Firebase プロジェクト作成 + Firestore 有効化 | (CLI) |
| 2 | Channel 情報を env に投入 | `webhook/.env` |
| 3 | Firestore セキュリティルール + index デプロイ | `firestore/` |
| 4 | Webhook サーバー (Cloud Functions) デプロイ | `webhook/` |
| 5 | LINE Developers Console で webhook URL 登録 | (CLI) |
| 6 | LIFF アプリ作成 + LIFF ID 取得 | (CLI) |
| 7 | リッチメニュー画像作成 + upload + デフォルト設定 | `rich-menu/` |
| 8 | 自動応答 + 友だち追加メッセージ設定 | `webhook/handlers/` |
| 9 | 当日朝・前日夜のリマインダー cron 仕込み | `functions/reminderCron.js` |
| 10 | オーナー用管理画面 (Firebase Hosting) デプロイ | `admin/` |

## ディレクトリ構成

```
line-setup/
├── README.md                    ← この文書
├── env.example                  ← 環境変数テンプレ
├── rich-menu/
│   ├── rich-menu.svg            ← 2500x1686 デザインソース
│   ├── rich-menu.json           ← LINE API リッチメニュー定義
│   └── upload.mjs               ← 画像 + JSON を upload するスクリプト
├── webhook/
│   ├── package.json
│   ├── index.js                 ← Express + LINE SDK + Firestore
│   ├── handlers/
│   │   ├── follow.js            ← 友だち追加時の挨拶
│   │   ├── postback.js          ← リッチメニュー postback 処理
│   │   └── message.js           ← フリーメッセージ応答
│   └── templates/               ← Flex Message テンプレ
│       ├── confirmation.js
│       ├── reminder.js
│       └── arrival.js
├── liff/                        ← LIFF mini-app 予約フォーム
│   ├── index.html
│   ├── style.css
│   └── app.js
├── admin/                       ← オーナー向け予約一覧画面
│   ├── index.html
│   ├── style.css
│   └── app.js
├── functions/                   ← Cloud Functions
│   ├── reminderCron.js          ← 前日18時 / 当日朝7時の push
│   └── ownerNotify.js           ← 新規予約のオーナー LINE 通知
└── firestore/
    ├── schema.md                ← コレクション設計
    ├── rules.txt                ← セキュリティルール
    └── indexes.json             ← 複合インデックス
```

## データの持ち方

```
reservations/{resNo}
  - lineUserId: string
  - buildingId: 'ryosha' | 'gakusha'
  - roomId: string
  - checkin: timestamp
  - nights: number
  - guests: number
  - name: string
  - tel: string
  - note: string
  - status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  - createdAt: timestamp
  - updatedAt: timestamp

guests/{lineUserId}
  - displayName: string
  - tel: string
  - lastResNo: string
  - repeatCount: number
  - firstSeenAt: timestamp
  - lastSeenAt: timestamp

ops_logs/{autoId}    ← 障害・通知の運用ログ
ops_state/owner      ← オーナー側 LINE userId (リッチメニュー通知の宛先)
```

## 運用フロー (お客様体験)

```
1. お客様が QR / ID で @arashima-hotel を友だち追加
   ↓ follow webhook → 挨拶メッセージ + リッチメニュー表示
2. リッチメニューから「予約する」をタップ
   ↓ LIFF mini-app 起動
3. 建屋 → 客室 → 日付 → 連絡先 → 確定
   ↓ Firestore に書込 + LINE userId 紐付け
4. 即座に予約確定 Flex Message を push
   ↓ 同時にオーナー LINE にも新規予約通知
5. 前日 18:00 に道順リマインダー push (Cron)
6. 当日 07:00 に鍵案内 push (Cron)
7. 出発後の翌日に サンキューレター push (Cron)
8. 再訪時、リッチメニュー「予約する」 → LIFF に履歴ベース ワンタップ再予約 UI 表示
```

## 環境変数

`webhook/.env` に以下を設定:

```
LINE_CHANNEL_ID=2000xxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxx...
LIFF_ID=2000xxxxxx-xxxxxxxx
FIREBASE_PROJECT_ID=arashima-hotel
OWNER_LINE_USER_ID=Uxxxxxxxxx... (オーナーが友だち追加した時に発行される)
```

## デプロイコマンド (Jobs が叩く)

```bash
cd line-setup

# Firestore ルール + index
firebase deploy --only firestore

# Webhook (Cloud Functions)
firebase deploy --only functions

# LIFF + 管理画面 (Firebase Hosting)
firebase deploy --only hosting

# リッチメニュー登録
node rich-menu/upload.mjs
```

## 既知のハマりどころ

- LINE Channel access token は long-lived 版を使う (短命版はサーバ用途 NG)
- LIFF Endpoint URL は Firebase Hosting の https URL を登録
- リッチメニュー画像は **2500x1686 px の PNG** 厳守 (それ以外サイズ拒否)
- 友だち追加直後の挨拶は LINE Official Account Manager の方ではなく webhook で出すこと (重複防止)
- `experimentalAutoDetectLongPolling: true` は LIFF 側 Firestore Web SDK で必須 (memory: WebChannel block 対策)
