# 五十嵐 サイト 素材 差替 ガイド

**このファイル 1つ を 見れば、 五十嵐 の 実 データ が 揃った 時 に どこ を どう 差替 すれば いい か 分かる 構造 に なっています。**

差替 は 全部 3ヶ所 に 集約 されています:

1. **`i18n.js`** — 文字 データ (電話 · 住所 · 屋号 · メール · 着物名 · 説明文 · 営業時間 等)
2. **`assets/kimono/k01.webp` 〜 `k08.webp`** — 着物 サムネイル 画像 8枚
3. **`assets/hero.webp`** — トップ ヒーロー 画像 1枚

---

## 1. 文字データ の 差替 (`i18n.js`)

`i18n.js` を エディタ で 開いて、 `ja: { ... }` の 中 の 該当 キー を 書き換え、 その 下 の `en: { ... }` も 同じ キー を 書き換える (バイリンガル維持)。

### 店舗 基本情報 (brand-bar + utility-bar に 表示)

| キー | 現状 (JP) | 五十嵐 実データ を ここ に |
|---|---|---|
| `brand_name` | きもの 五十嵐 | 実 屋号 (例: きもの 五十嵐、 Kimono Igarashi) |
| `brand_est` | 金沢 · 創業 | 例: 金沢 · 創業 2020 |
| `brand_tel` | 076-000-0000 | 実 電話番号 |
| `brand_tel_display` | ☎ 076-000-0000 | 表示用 (☎ 込み) |
| `brand_address` | 金沢市 東山 X-X-X | 実 住所 |
| `brand_open_short` | Tue – Sun 9:00–18:00 | 実 営業時間 (短縮版) |
| `utility_hours` | 火〜日 09:00〜18:00 / 月曜定休 | 上部 バー 用 (定休日込み) |
| `utility_area` | 金沢 · 出張対応 | 例: 金沢 · 出張 対応 · 加賀温泉郷 |

### 連絡先

| キー | 現状 | 五十嵐 実データ |
|---|---|---|
| `contact_email` | info@kimono-igarashi.jp | 実 メール |
| `ig_handle` | kimono_igarashi | 実 Instagram アカウント (@ なし) |

### プラン 名 · 価格

| キー | 現状 | 五十嵐 実データ |
|---|---|---|
| `plan1_name` | エコノミー | 変更不要 |
| `plan1_price` | ¥7,800 | 実 価格 |
| `plan2_name` | カナザワ | 変更不要 (or お好み) |
| `plan2_price` | ¥14,800 | 実 価格 |
| `plan3_name` | カガ | 変更不要 (or お好み) |
| `plan3_price` | ¥29,800 | 実 価格 |
| `plan1_cost` | 原価内訳: 着付け ¥3,500 + 着物 ¥3,000 + 諸経費 ¥1,300 (粗利率 42%) | 実 内訳 |
| `plan2_cost` / `plan3_cost` | 同上 | 同上 |

### 着物 8枚 の 名前 と 説明

| キー | 現状 | 五十嵐 実 着物 名 と 説明 |
|---|---|---|
| `kimono_01_name` | No. 01 · 桃桜文 | 実 着物 1 名前 |
| `kimono_01_desc` | 京友禅 · 桜地紋 | 実 着物 1 説明 |
| `kimono_02_name` 〜 `kimono_08_name` | 同上 pattern | 実 名前 |
| `kimono_02_desc` 〜 `kimono_08_desc` | 同上 pattern | 実 説明 |

---

## 2. 着物 画像 8枚 の 差替 (`assets/kimono/`)

現状: alice-mieux から 借用 の 仮 画像 8枚 (webp 形式、 各 30-90KB)。

**差替 手順**:
1. 五十嵐 の 着物 写真 8枚 を 用意 (縦長 3:4 or 4:5 推奨、 モデル 着用 or 平置き)
2. webp 形式 に 変換 (推奨: 幅 800-1200px、 品質 80-85%)
3. `assets/kimono/k01.webp` から `k08.webp` に **同名 上書き**
4. コミット + push で 公開

Gallery 8枚 + IG mock 1枚 (k04.webp を 流用) + hero.webp = 合計 9枚 の 画像 が サイト で 使われます。

**webp 変換 コマンド (Mac、 ImageMagick or cwebp)**:
```bash
cwebp -q 82 input.jpg -o k01.webp
```

---

## 3. Hero 画像 の 差替 (`assets/hero.webp`)

現状: alice-mieux 借用 (89KB)。

**差替 手順**:
- 縦長 4:5 推奨 (トップページ 大画像 用)
- モデル 着用 が 望ましい (顔出しOK or 後ろ姿 or 横顔)
- `assets/hero.webp` に 同名 上書き

---

## 4. 差替 後 の deploy

```bash
cd ~/Desktop/skeleton-demos
git add igarashi-kimono/
git commit -m "igarashi 五十嵐 実データ 差替"
git push origin main
```

Push 後 1-5 分 で https://t35ty6-rgb.github.io/skeleton-demos/igarashi-kimono/v2/ に 反映。

---

## 5. Optional (深い 差替 が 必要 な 場合)

- **ドメイン**: 現状 GitHub Pages サブパス。 五十嵐 の 独自 ドメイン (例: kimono-igarashi.jp) に 移す 場合 は Cloudflare/DNS 設定 + `CNAME` file 追加
- **Stripe 決済**: 現状 デモ (submit で alert)、 本番 決済 に する なら Stripe アカウント + webhook 実装 (別 依頼)
- **予約 admin panel**: 現状 なし、 五十嵐 側 の 予約管理 が Airtable / Google Sheets / Firestore の どれ か 決めて から 実装
- **Instagram DM 自動返信**: Meta ビジネス API 連携 (別 開発)

---

## 6. 変更 が 難しい (触ら ない ほう が いい) 箇所

- `v2/index.html` の HTML 構造 · CSS · JS
- 5 バリエ picker (v1-v5) の 他 4 案
- `i18n.js` の `applyLang` / `initLang` 関数
- section 順序 (hero → plans → gallery → booking → cancel → referral → ig → inquiry → partner → footer)

これら を 触る 場合 は Jobs に 相談 して ください。

---

**Last updated**: 2026-08-17 · commit `a381fecf` 時点
