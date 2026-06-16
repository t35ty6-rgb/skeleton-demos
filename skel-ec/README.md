# Skeleton LINE EC — たたき台 (v0.1)

LINE公式アカウント上で動く EC プラットフォーム。
月額固定の外部SaaSに依存せず、Skeleton自社で持つ自社プロダクト化を目指す。

## ディレクトリ

```
skeleton-line-ec/
├── index.html        ← ランディング (admin/shop 入口)
├── admin/index.html  ← 店舗オーナー管理画面 SPA
├── shop/index.html   ← LIFF お客様購入画面 SPA
├── demo-data/        ← デモデータ (Lune 4品 + 注文 + 顧客)
│   ├── products.json
│   ├── orders.json
│   ├── customers.json
│   ├── categories.json
│   ├── coupons.json
│   └── messages.json
└── README.md
```

## 起動 (ローカル)

```sh
cd skeleton-line-ec
python3 -m http.server 8765
# http://localhost:8765/  ← ランディング
# http://localhost:8765/admin/  ← 管理画面
# http://localhost:8765/shop/   ← LIFF 購入画面
```

## v0.1 で組み込み済

### 管理画面 (admin)
- ダッシュボード (KPI / 売上チャート / タスク / 最近の注文)
- 注文管理 (一覧 / フィルタ / 詳細モーダル)
- 顧客 (友だち) 管理 (一覧 / タグ / LTV / 詳細モーダル)
- メッセージ配信 (一斉 / ステップ / セグメント実績)
- 商品マスタ (CRUD / バリエーション / CSV+ZIP一括登録)
- カテゴリ / クーポン
- リッチメニュー (4種レイアウト + セル設定)
- 店舗情報 / 配送 / 決済 / 特商法 / LIFF設定

### LIFF (shop)
- 商品一覧 (カテゴリ絞り込み)
- 商品詳細 (バリエーション選択 / カート追加)
- カート (数量変更 / クーポン適用 / 送料無料ライン)
- レジ (お届け先 / 支払方法 / 確認)
- 注文履歴 / マイページ / 検索

### デザイン
- 和の業務SaaS美学: 墨×珊瑚 (#15151a × #c8412e)、Shippori Mincho B1 (見出し) + BIZ UDPGothic (本文) + JetBrains Mono (数値)
- 情報密度高、razor-thin rules、no fluff shadows
- モバイル: サイドナビ → ハンバーガー drawer、テーブル → 横スクロール
- LIFF: max-width 520px の中央寄せ縦長レイアウト、bottom tabbar

## Phase 2 (本番化)

- バックエンド: Firestore (FP Compass と同方式)
- LINE Bot Webhook: 友だち追加・受信メッセージ処理
- Stripe live 連携 (FP Compass の仕組み流用)
- LIFF 実 LINEログイン連携
- 配信 API 実装 (Messaging API push / multicast / narrowcast)
- リッチメニュー API 連携 (画像アップ + LINE OA 反映)
- 商品画像実アップロード (R2 / Cloudflare Images)

## 想定販路

1. **自社運用** — Mio EC / IDEAL SKIN サロン EC / Lune 自社EC など
2. **受託展開** — 既存サロン・物販事業者の LINE EC 構築代行
3. **SaaS化** — 月額¥3,300前後の自社プロダクトとして他社提供 (Lea / L-Message 等代替)

## 関連事業

- `事業/Lune-LINE-EC-構築/` — 既存の Lea 案件 (Lune 商品マスタ流用元)
- `事業/Mio-EC/` — 越前大野商工会議所の Mio EC (Shopify検討中、こちらに統合候補)
- FP Compass (Firestore + Stripe live) — 技術基盤として転用可能

## 設計判断メモ

- **Lea構造の踏襲**: ナビ・ページ構成・項目名は Lea ユーザーがそのまま乗り換えられるよう整合
- **デザイン独自**: 業務SaaS美学 (和編集デザイン)。Lea ピクセル写しはしない (商標・差別化)
- **localStorage カート**: たたき台は static で完結。本番化で Firestore に置換
- **Lune を初期デモ商材に**: 既存 `事業/Lune-LINE-EC-構築/` の素材を流用 → サロン提案で実物見せやすい
