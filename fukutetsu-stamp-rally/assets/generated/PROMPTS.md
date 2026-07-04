# 福鉄 スタンプラリー · 画像生成 プロンプト集

**運用方法**:
1. 下記の各項目の英文プロンプト を そのまま 画像生成AI (Midjourney / DALL-E / Nano Banana / Stable Diffusion 等) に投げる
2. 生成した画像を **指定のファイル名** で **`fukutetsu-stamp-rally/assets/generated/`** フォルダに保存
3. Jobs にメンションすれば ファイル名 から どこに配置するか 自動判別 して 差し込み する

---

## 🎨 統一 デザインシステム (全画像 共通 · 必ず 各 prompt に 含める)

これは 全ての画像 の 冒頭 に くっつけて 使う共通 style ブロック:

```
STYLE: Hand-drawn illustrated Japanese travel poster art in the style of Naoshima ferry brochures and vintage Japan Rail publications. Consistent throughout the whole set.
LINE: Dark ink outlines (near-black, hex #1a1712), 1.5-2.5px equivalent, hand-drawn wobble not vector-perfect.
PALETTE (strict, no other colors):
  - Cream paper base #f5eddc (backgrounds always warm-cream, NEVER black or pure white)
  - Ink dark #1a1712 (outlines, primary text)
  - Warm red-orange accent #b8410f (single deliberate accent, sparingly)
  - Soft muted green #a8c090 (leaves, subtle nature)
  - Cherry blossom pink #e8a598 (sakura, sparingly)
  - Warm brown #c9b98f (wood, stone, kraft)
TEXTURE: Subtle paper grain overlay, slight ink-bleed on edges. No gradients. No drop shadows. No modern gloss.
COMPOSITION: Centered subject, generous surrounding white space, editorial breathing room.
FORBIDDEN: photorealism, gradients, drop shadows, emoji, generic vector line icons, corporate SaaS look, glowing effects, 3D render, cartoon anime style, black backgrounds, watermarks, text signature.
REFERENCE ANCHOR: Match the aesthetic of the app hero illustration (see photos/00_hero_illustration.jpeg — a warm hand-drawn scene of the Fukui Railway crossing a bridge with sakura, mountains and characters).
CULTURAL NOTE: This is Fukui prefecture, Japan (Echizen · Sabae · Fukui city area). Local landmarks: washi paper, chrysanthemums (Takefu), eyeglasses (Sabae), tsutsuji azaleas, red pandas (Sabae zoo), Fukui castle, Yokokan garden, Asuwa shrine, dinosaur monument at Fukui station, Tawaramachi shopping street.
FILE OUTPUT: Save as .webp (or .jpg/.png fallback) with the exact filename listed. No margins added (image goes edge to edge).
```

---

## 📁 ファイル命名規則

- 全 lowercase, hyphenated
- **接頭辞** で カテゴリ 分類 (Jobs は これで 配置場所 を 特定):
  - `crest-XX` → 章紋章 (3エリア)
  - `spot-seal-SP-XX` → 各スポットの 集印スタンプ (10地点)
  - `prize-XX` → 景品イラスト (3種)
  - `scene-XX` → 汎用シーン系 (scan-placeholder等)
  - `progress-XX` → PROGRESS カード 用
  - `stage-XX` → 章制覇 演出
- 拡張子: `.webp` 推奨 (`.jpg` `.png` も OK)
- 保存先: `fukutetsu-stamp-rally/assets/generated/`

---

# 一覧 (優先度順)

## 🅰 章紋章 (エリア バッジ) · 3点

現在 `assets/crest-1-echizen.svg` 等 で SVG 手描き。 差替希望 なら 生成。

### A-1. `crest-1-echizen.webp`

- **サイズ**: 512×512 (正方形, 円形 or 円内収まり)
- **配置**: ホーム画面 スポット一覧 の 「1 越前」 章ヘッダ左 (64px 表示)
- **既存 SVG**: `assets/crest-1-echizen.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A circular badge illustration representing the Echizen area (Fukui, Japan) for a stamp rally chapter marker. Compose these local elements together inside a single hand-drawn circular composition:
  - A sheet of Echizen washi paper (traditional handmade paper), folded slightly to show layers, with visible paper fiber texture
  - A single chrysanthemum flower (kiku) in red-orange, top-right corner
  - A branch of the paper mulberry plant (kozo, 楮) with 2-3 leaves, curving along the bottom
  - Subtle low mountains along the horizon behind
  - The Sundome (dome-shaped concert hall) small silhouette in the background

Circle border: dark ink outline (2px equivalent) with a second dashed inner ring.
NO text, NO kanji, NO seal. Just the scene inside the badge.
Background inside circle: cream paper.
```

---

### A-2. `crest-2-sabae.webp`

- **サイズ**: 512×512 (正方形, 円形)
- **配置**: 章 「2 鯖江」 ヘッダ左
- **既存 SVG**: `assets/crest-2-sabae.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A circular badge illustration representing the Sabae area (Fukui, Japan). Compose:
  - Center: a pair of round-frame eyeglasses (Sabae is famous for eyewear manufacturing), drawn from front angle, cream lenses with subtle reflection lines
  - Around the glasses: 4-5 tsutsuji (azalea) flowers scattered, in soft cherry pink with red-orange centers, hand-drawn with visible petals
  - Bottom-right corner: a small red panda silhouette (Sabae zoo mascot), slightly reddish-orange, looking sideways, cute but not cartoonish
  - Ground indicator: subtle green grass line at the bottom
Circle border: dark ink outline with dashed inner ring.
NO text, NO kanji, NO seal, NO numbers.
Background inside circle: cream paper.
```

---

### A-3. `crest-3-fukui.webp`

- **サイズ**: 512×512 (正方形, 円形)
- **配置**: 章 「3 福井」 ヘッダ左
- **既存 SVG**: `assets/crest-3-fukui.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A circular badge illustration representing the Fukui city area (final chapter of the stamp rally). Compose:
  - Center: Fukui Castle keep (a 3-tier traditional Japanese castle tower with black tile roofs and cream white plaster walls, small windows visible), drawn in careful architectural detail
  - Base: stone castle wall (ishigaki) in warm brown, subtle stone joints
  - Roof crests: two golden orange shachihoko fish ornaments on top
  - Background: rolling low mountains in cream, subtle
  - Bottom-right corner: a small Fukui raptor dinosaur silhouette in reddish-orange (Fukui is famous for dinosaur fossils)
  - Foreground: a section of railway track (horizontal lines with ties) along the bottom
Circle border: dark ink outline with dashed inner ring.
NO text, NO kanji, NO seal.
Background inside circle: cream paper.
```

---

## 🅱 10 スポット 集印スタンプ (収集の 見応え)

**未実装**。 押印時 と 書き込みタブ (スタンプ帳) の 硬券カード に 使う 「個別の 印章」。 各スポット 固有意匠。

### 共通 プロンプト ブロック (全10種 に 使う):

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A single circular stamp mark ("集印" style, like a tourist rally seal) for a specific Fukui Railway sightseeing spot. Design specs:
  - Outer boundary: perfect circle, ink outline 2.5px, slightly wobbly hand-drawn feel
  - Inside: one iconic symbol representing the spot (see per-item detail below)
  - Style: like a rubber stamp impression on cream paper, slight ink smudge on one edge
  - Base color: warm red-orange ink (#b8410f) impression on cream paper background
  - Around the circle border, tiny mono-style text at top ("FUKUBU LINE") and bottom (spot code like "SP-01") — very small, fits inside 512x512
Single icon focus, no busy composition.
```

Per-spot 追記 プロンプト:

### B-1. `spot-seal-SP-01-echizen-washi.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-01 越前和紙の里 押印時 と スタンプ帳 カード
- **追記 プロンプト**: `The icon inside: a sheet of washi paper being pulled from a wooden mold with visible fibers, small hands holding the frame edges.`

### B-2. `spot-seal-SP-02-sundome.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-02 サンドーム福井
- **追記 プロンプト**: `The icon inside: a dome-shaped concert hall (like the Sundome Fukui) with an entrance and 3 small windows on the dome surface.`

### B-3. `spot-seal-SP-03-takefu-park.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-03 武生中央公園
- **追記 プロンプト**: `The icon inside: a chrysanthemum flower with 6-8 petals fully bloomed, alongside a small opened picture-book (representing the Takefu Chuo Park's chrysanthemum festival and Kako Satoshi ehon museum).`

### B-4. `spot-seal-SP-04-nishiyama.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-04 西山公園
- **追記 プロンプト**: `The icon inside: a full-body red panda sitting on a branch, front view, with clusters of tsutsuji azalea flowers (soft pink) around it.`

### B-5. `spot-seal-SP-05-megane-museum.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-05 めがねミュージアム
- **追記 プロンプト**: `The icon inside: a single pair of vintage round-frame eyeglasses displayed at 3/4 angle on a small pedestal, with a tiny craftsman's file tool crossed behind (representing Sabae's eyewear artisan tradition).`

### B-6. `spot-seal-SP-06-fukui-castle.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-06 福井城址
- **追記 プロンプト**: `The icon inside: an arched vermillion-painted bridge (Gorokabashi bridge) reflected in still water, with a stone castle wall in the background.`

### B-7. `spot-seal-SP-07-yokokan.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-07 養浩館庭園
- **追記 プロンプト**: `The icon inside: a traditional sukiya-style Japanese garden pavilion by a pond with a small stone lantern to the side, moss ground.`

### B-8. `spot-seal-SP-08-asuwa.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-08 足羽神社
- **追記 プロンプト**: `The icon inside: a traditional Shinto torii gate with a single cherry tree in bloom beside it, viewed slightly from below.`

### B-9. `spot-seal-SP-09-dinosaur.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-09 福井駅前 恐竜モニュメント
- **追記 プロンプト**: `The icon inside: a Fukui raptor dinosaur figure standing proudly, side view, with the Fukui station clock tower silhouetted small behind it.`

### B-10. `spot-seal-SP-10-tawaramachi.webp`
- **サイズ**: 512×512 (円形)
- **配置**: SP-10 田原町 商店街
- **追記 プロンプト**: `The icon inside: a shopping street scene with 3 traditional storefronts (a lantern-hanging shop, a wooden signboard shop, a shop with fabric noren curtain), a striped awning, "END OF LINE" implied.`

---

## 🅲 景品 イラスト · 3種

現在 SVG 手描き。 差替希望 なら 生成。

### C-1. `prize-1-coffee.webp`
- **サイズ**: 512×512
- **配置**: 景品タブ 「沿線カフェ ドリンク引換」 アイコン (62px 表示)、 景品モーダル hero (400px 表示)
- **既存 SVG**: `assets/prize-1-coffee.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: An illustrated coffee cup for a tourism drink coupon prize.
Compose:
  - Centered: a white ceramic coffee mug seen from 3/4 angle on a matching saucer
  - The mug has a Japanese kanji character (福 "fuku" meaning fortune) on the side in ink
  - Three curling steam trails rising from the mug (thin ink lines)
  - Latte art heart on the coffee surface (subtle)
  - Bottom right: a small red-orange rubber stamp mark reading "沿線 カフェ" (only if generation can handle it; else skip text)
  - No table, floating illustration on cream paper background
No shadows, no gradients.
```

---

### C-2. `prize-2-ticket.webp`
- **サイズ**: 512×384 (横長 · 4:3)
- **配置**: 景品タブ 「福鉄1日フリーきっぷ 半額」 アイコン (62px 表示)、モーダル hero (400px 表示)
- **既存 SVG**: `assets/prize-2-ticket.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: An illustrated vintage Japanese railway day-pass ticket, laid flat facing the viewer.
Compose:
  - Rectangular cream paper ticket with a dark ink header band across the top reading "福鉄1日フリーきっぷ" (attempt kanji, else "FUKUBU LINE 1-DAY PASS")
  - Left section: origin/destination "たけふ新 → 田原町" typed in mono-style font (attempt Japanese, else use readable romanization)
  - Right section: fare "¥1,000" struck through with red diagonal line, "¥500" shown below in bold ink
  - Dashed vertical perforation line dividing left/right
  - Small hole punch on left edge (empty circle)
  - Bottom corner: small red-orange stamp mark angled diagonally
  - Background: cream paper with subtle grain
Ticket is the sole subject, centered on cream background.
```

---

### C-3. `prize-3-kohken.webp`
- **サイズ**: 512×512
- **配置**: 景品タブ 「コンプリート限定 硬券セット」 アイコン (62px 表示)、モーダル hero (400px 表示)
- **既存 SVG**: `assets/prize-3-kohken.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A stack of 3 vintage-style Japanese hard-ticket rail passes ("硬券") arranged fan-style on a keepsake board, illustrated.
Compose:
  - 3 rectangular cream-colored hard tickets, slightly rotated (-12°, 0°, +12°) so they fan out
  - Each ticket has: a small red-orange side stripe, an ink black text area, a small red circular stamp mark (each with a different symbol: 1, 2, 3 or an appropriate icon)
  - Under them: a larger cream keepsake mounting board with dashed border frame
  - Bottom: a red-outlined caption box reading "10枚 全揃い · コンプリート" (attempt Japanese, else use "COMPLETE SET")
  - Background: cream paper
The stack of tickets is the hero of the composition.
```

---

## 🅳 シーン イラスト (Scan + Progress + Prize BG)

### D-1. `scene-scan-placeholder.webp`
- **サイズ**: 800×800 (正方形)
- **配置**: SCAN タブ カメラ未起動時 の 背景 (340px 表示、 スマホでは 縦横比 1:1 で 中央表示)
- **既存 SVG**: `assets/scan-placeholder.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: An illustrated scene showing a hand scanning a QR code on a "kohken" hard rail ticket, from an above/side perspective, inviting the user to start scanning.
Compose:
  - Center of image: a single hard-ticket ("kohken") laid flat with a QR code printed in the center of it. The ticket has a dark ink header band reading "福鉄 · 集印硬券" (attempt Japanese)
  - Bottom-left: a hand holding a smartphone, aimed toward the ticket, screen showing a preview of the ticket
  - Between the phone and the ticket: a dotted red-orange curved arrow indicating the scanning motion
  - Background context:
    - Top: soft distant mountains silhouette in cream
    - Left-top corner: a small sakura tree in bloom
    - Top-right: a cloud puff
    - Scattered around: 3-5 small sakura petals falling
  - No text overlays (just what's on the ticket illustration itself)
  - Background: cream paper with subtle grain
Bright warm inviting mood.
```

---

### D-2. `scene-train-running.webp`
- **サイズ**: 800×480 (横長 · 5:3)
- **配置**: ホーム画面 PROGRESS カード 上部 の 走る電車シーン (400px 幅 表示)
- **既存 SVG**: `assets/train-running.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: An illustrated scene of a Fukui Railway "Fukubu Line" tram crossing a bridge, in a warm inviting travel-poster style.
Compose:
  - Center: an orange Fukui Railway tram (2-car unit, streetcar style, with round headlights and a small "福鉄" plate on the front), moving left-to-right
  - Under the tram: a stone bridge with visible arch supports below
  - Below the bridge: a calm river
  - Left and right sides: two sakura trees in bloom framing the scene
  - Background: soft rolling mountains
  - Sky: pale cream/blue with 2 small cloud shapes
  - Small motion lines behind the tram indicating gentle forward motion
No text. No station names visible. Composition is 5:3 (wide) so it fits horizontally.
```

---

### D-3. `scene-prize-status-bg.webp`
- **サイズ**: 1600×800 (2:1 wide banner)
- **配置**: 景品タブ 集印カード の 背景 透かし (opacity 20-30% で 使用)
- **既存 SVG**: `assets/prize-status-bg.svg` を 差替
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A wide horizontal panoramic scene for a card background watermark.
Compose:
  - Two-layered distant mountain silhouettes across the width
  - A horizontal railway track across the bottom third
  - Center-right: a Fukubu Line tram running to the left, medium size
  - Left: a single sakura tree in bloom
  - Top-right: a cloud puff
  - Scattered above: 5-6 falling sakura petals
IMPORTANT: This will be used as a low-opacity watermark, so keep it as an OUTLINE-ONLY drawing (no fills), just ink lines on cream. Simple. Not busy.
Aspect 2:1 wide.
```

---

## 🅴 章制覇 演出 (Stage complete)

**未実装**。 一つの章 (エリア) を 全部 集印した瞬間 に モーダル で 出す 演出イラスト。 3種 (エリア 1/2/3 用)。

### E-1. `stage-1-echizen-complete.webp`
- **サイズ**: 512×512
- **配置**: エリア1 越前 制覇 モーダル (現在は `.chapter-cheer` 白箱で 出てるが、 これを イラスト化)
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A celebration illustration for completing the Echizen area (chapter 1) of a stamp rally.
Compose:
  - Center: a stack of 3 completed hard-tickets fanning out (representing the 3 spots collected)
  - Above them: a large red-orange "完成" (complete) circular stamp mark impressed
  - Around: chrysanthemum petals scattered, some sakura petals
  - Background: cream paper with a subtle celebratory sunburst pattern in very light lines (radiating from center)
No shadow. Just cream, ink, and the accent red.
```

### E-2. `stage-2-sabae-complete.webp`
- **サイズ**: 512×512
- **配置**: エリア2 鯖江 制覇 モーダル
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A celebration illustration for completing the Sabae area (chapter 2, 2 spots).
Compose:
  - Center: 2 completed hard-tickets crossed diagonally
  - A pair of eyeglasses resting on top (Sabae eyewear)
  - Tsutsuji azalea flowers scattered
  - Red-orange stamp mark "完成" or a red flower burst
  - A tiny red panda peeking from bottom corner
  - Background: cream with subtle sunburst
```

### E-3. `stage-3-fukui-complete.webp`
- **サイズ**: 512×512
- **配置**: エリア3 福井 制覇 モーダル (= コンプリート達成)
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A celebration illustration for completing the final Fukui area (chapter 3, 5 spots) — this is the GRAND FINAL. All 10 stamps collected.
Compose:
  - Center: Fukui Castle keep in full detail with 2 golden orange shachihoko fish on top
  - Foreground: 10 hard-tickets arranged in a fan spread across the bottom, some overlapping
  - A red-orange banner ribbon above reading "コンプリート" (attempt Japanese) or "COMPLETE"
  - Sakura petals falling
  - Small dinosaur silhouette at bottom corner
  - Sunburst rays in light cream
More celebratory than E-1 and E-2. This is the finale.
```

---

## 🅵 空状態 · サブシーン

### F-1. `scene-out-of-range.webp`
- **サイズ**: 512×384
- **配置**: 「圏内スポットなし」 状態 の 空カード (現在は テキストのみ)、 モーダル `oor-modal`
- **プロンプト**:

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: A gentle wayfinding illustration for a stamp-rally app's "out of range" state, encouraging the user to walk toward the nearest spot.
Compose:
  - Left third: a small character (nondescript traveler with a shoulder bag and a curious pose) walking to the right
  - Middle: a dotted footprint trail curving right, then upward
  - Right third: a distant spot marker (small circular hard-ticket floating with a red pin above it) as the destination
  - Background: soft cream with subtle path lines in ink
  - Small trees along the way
Not busy. Focus is on the direction of motion. Encouraging, warm.
```

---

### F-2. `scene-onboarding-welcome.webp` (optional)
- **サイズ**: 1600×900
- **配置**: オンボーディング 画面 hero (現在は `photos/00_hero_illustration.jpeg` 使用 · 差替えたい場合 に 生成)
- **既存**: `photos/00_hero_illustration.jpeg` (現行 · オーナー支給)
- **プロンプト** (差替希望 の場合 のみ):

```
[STYLE ブロック 上記 共通 STYLE を 貼付]

CONCEPT: An onboarding hero scene for the Fukui Railway stamp rally app — a wide inviting travel-poster illustration.
[Full scene similar to the existing hero: tram crossing bridge, sakura, characters walking, mountains, banner reading "FUKUI RAILWAY STAMP RALLY" and "福井鉄道スタンプラリー開催中"]

Only generate this if you want to replace the existing hero. Otherwise skip.
```

---

# 📋 Jobs 用 · 配置マッピング (Jobs が この行 を 読んで 自動配置)

各 生成ファイル → 差替え/追加 する 現行 asset のマッピング (Jobs 参照専用):

| 生成ファイル | 差替 or 新規追加 | 現行/配置先 | index.html 該当箇所 |
|---|---|---|---|
| `crest-1-echizen.webp` | 差替 | `assets/crest-1-echizen.svg` | CHAPTERS.I.crest |
| `crest-2-sabae.webp` | 差替 | `assets/crest-2-sabae.svg` | CHAPTERS.II.crest |
| `crest-3-fukui.webp` | 差替 | `assets/crest-3-fukui.svg` | CHAPTERS.III.crest |
| `spot-seal-SP-01-echizen-washi.webp` | 新規 | `assets/spot-seal-SP-01-echizen-washi.webp` | SPOTS[0].seal · 押印flash 硬券中央 · スタンプ帳 完了カード |
| `spot-seal-SP-02-sundome.webp` | 新規 | 同上 | SPOTS[1].seal |
| `spot-seal-SP-03-takefu-park.webp` | 新規 | 同上 | SPOTS[2].seal |
| `spot-seal-SP-04-nishiyama.webp` | 新規 | 同上 | SPOTS[3].seal |
| `spot-seal-SP-05-megane-museum.webp` | 新規 | 同上 | SPOTS[4].seal |
| `spot-seal-SP-06-fukui-castle.webp` | 新規 | 同上 | SPOTS[5].seal |
| `spot-seal-SP-07-yokokan.webp` | 新規 | 同上 | SPOTS[6].seal |
| `spot-seal-SP-08-asuwa.webp` | 新規 | 同上 | SPOTS[7].seal |
| `spot-seal-SP-09-dinosaur.webp` | 新規 | 同上 | SPOTS[8].seal |
| `spot-seal-SP-10-tawaramachi.webp` | 新規 | 同上 | SPOTS[9].seal |
| `prize-1-coffee.webp` | 差替 | `assets/prize-1-coffee.svg` | prize-item[data-prize=P1] .prize-icon src |
| `prize-2-ticket.webp` | 差替 | `assets/prize-2-ticket.svg` | prize-item[data-prize=P2] .prize-icon src |
| `prize-3-kohken.webp` | 差替 | `assets/prize-3-kohken.svg` | prize-item[data-prize=P3] .prize-icon src |
| `scene-scan-placeholder.webp` | 差替 | `assets/scan-placeholder.svg` | .cam-wrap .placeholder img src |
| `scene-train-running.webp` | 差替 | `assets/train-running.svg` | .prog-scene img src |
| `scene-prize-status-bg.webp` | 差替 | `assets/prize-status-bg.svg` | .ps-bg CSS background-image |
| `stage-1-echizen-complete.webp` | 新規 | `assets/stage-1-echizen-complete.webp` | showChapterCheer("I") 時 モーダル背景 |
| `stage-2-sabae-complete.webp` | 新規 | 同上 | showChapterCheer("II") |
| `stage-3-fukui-complete.webp` | 新規 | 同上 | showChapterCheer("III") |
| `scene-out-of-range.webp` | 新規 | `assets/scene-out-of-range.webp` | .hero-card.locked + oor-modal 背景 |
| `scene-onboarding-welcome.webp` | 差替 (任意) | `photos/00_hero_illustration.webp` | .ob-hero img · .hd-art img |

---

# 🧪 生成後 · オーナー フロー

1. 上記プロンプト を 画像生成AI (Midjourney / DALL-E / Nano Banana / Stable Diffusion 等) に投げて 画像を生成
2. 生成した webp / jpg / png を **上表の 「生成ファイル」 列 の 名前** で **`fukutetsu-stamp-rally/assets/generated/`** フォルダに保存 (このフォルダに置くだけ)
3. Jobs にメンション:
   - "assets/generated/ の 画像 全部 反映して"
   - Jobs は上の 「配置マッピング」 表 を 見て 該当箇所 に 差替 or 新規配線 · commit · push まで自動
4. 途中でやめる場合 (優先の3種 だけ 生成 等) も OK。 生成した分 だけ 差し込む。

---

# 🎯 優先度 (時間節約 の 参考)

**S ランク (先に生成 · 一番 見応え上がる):**
- 🅱 B-1 〜 B-10 スポット 集印スタンプ (10種) — これが 一番 感動ポイント
- 🅴 E-3 スタンプ帳コンプリート達成 (最後の演出)

**A ランク (映え る 場所):**
- 🅲 C-1 C-2 C-3 景品 3種 (景品タブ の 顔)
- 🅳 D-1 SCAN プレースホルダ (SCAN タブ の 顔)

**B ランク (SVG で 既に十分 なので 差替えは 任意):**
- 🅰 A-1 A-2 A-3 章紋章
- 🅳 D-2 走る電車 · D-3 集印カード 背景
- 🅴 E-1 E-2 途中 章制覇
- 🅵 F-1 圏内なし
- 🅵 F-2 オンボーディング (既存 hero で 十分)
