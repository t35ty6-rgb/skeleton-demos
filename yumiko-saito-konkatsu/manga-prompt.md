# 齋藤弓子 LP用 4コマ漫画 生成プロンプト集

LP のベネフィット訴求の流れに沿った **4コマ × 1ストーリー**。
画風は本人イラスト（水彩・優しいトーン・グリーン×温白×ターコイズ）に統一。

---

## 共通スタイル指示（全コマに付与）

```
Style: soft watercolor illustration in the style of Japanese essay manga,
gentle pastel palette of cream-white #F4ECD8, terracotta #B0392B, brass gold #C2A057,
warm greens, and turquoise accents. Light delicate brushstrokes with subtle paper texture.
Editorial tone, like a Japanese lifestyle magazine column. Calm, refined, dignified.
Avoid: harsh outlines, anime style, neon, photorealism, dark heavy shadows, comic-book halftones.
Aspect ratio: 1:1 square. Japanese cultural setting.

★ Speech bubble REQUIRED:
Include ONE hand-drawn watercolor speech bubble with the EXACT Japanese text
specified below. The text must be rendered clearly, legibly, and accurately as written.
Use a soft brush-style Japanese font (Mincho or handwriting style) inside the bubble.
The bubble itself is loose and organic, drawn with a thin warm-gray line, no harsh outlines.
Do not add any other text, signs, labels, or characters anywhere else in the image.
```

### 日本語テキスト生成のコツ（重要）

- **Nano Banana (Gemini 2.5 Flash Image)**: 日本語テキスト得意。プロンプトに `「セリフ全文」` を引用符でくくって明示
- **DALL-E 3**: 日本語崩れがち。短く（10-15文字以内）、漢字を減らしてひらがな多めで指示
- **Midjourney**: テキスト苦手。生成後 Photoshop / Canva で手書き吹き出しを上から追加するのが現実的
- **Imagen 3**: 日本語OK。プロンプト最後に "with the Japanese text: 「...」 inside the speech bubble" と明示

---

## キャラクター固定設定（毎コマ含める）

### 主役：齋藤先生（仲人 / 経営コンサルタント）
```
Character "Saito-sensei":
Japanese woman in her late 40s to early 50s,
soft curly chestnut-brown short hair (perm style),
warm gentle smile, slight pink blush on cheeks,
wearing a soft turquoise-mint blouse with subtle floral pattern and small pearl trim,
posture upright but warm, conveying experience and trustworthiness.
Watercolor style consistent with reference portrait.
```

### 相談相手：相談所オーナー（A: 運営中の方 想定）
```
Character "Agency Owner":
Japanese person in their 40s–50s, businesslike but tired expression at first,
plain white shirt or soft beige knitwear,
holding a notebook or tablet,
posture changes across panels: worried → curious → engaged → confident smile.
Watercolor style, consistent silhouette throughout the four panels.
```

---

## コマ1：PAIN（悩み）

★ 吹き出しのセリフ（必ず画像内に入れる）:
```
「会員はいるのに、成婚が出ない…」
```

```
A worried Japanese marriage agency owner sitting at a wooden desk in a
small private consulting office in Nagoya. Papers and a calendar scattered
on the desk, a laptop showing declining graphs of success rate.
A faint sigh visible in their expression. Through the window, evening light.
Mood: quiet anxiety, isolation of being a small business owner.

★ Include ONE hand-drawn watercolor speech bubble above the owner's head
with the EXACT Japanese text:「会員はいるのに、成婚が出ない…」
Use soft Mincho or handwritten brush style. The text must be accurate and legible.
No other text anywhere else in the image.

Style: soft watercolor, muted palette with grey-tinted cream background,
slight desaturation to convey heaviness. Composition: medium shot, desk in foreground.
Aspect: 1:1.
```

---

## コマ2：MEET（齋藤先生に出会う）

★ 吹き出しのセリフ（齋藤先生）:
```
「30年、現場で見てきました。お話、聞かせてください。」
```

```
The same agency owner now visiting Saito-sensei's office, sitting across
a small round wooden table. Saito-sensei (the curly-haired woman in turquoise
blouse from reference portrait) is leaning forward slightly, listening with a
warm gentle smile, holding a fountain pen above a leather notebook.
A vase of small white flowers on the table, a tea cup with steam rising.
Late afternoon golden light through translucent shoji-like screen.
Mood: relief, being heard, the start of dialogue.

★ Include ONE hand-drawn watercolor speech bubble near Saito-sensei
with the EXACT Japanese text:「30年、現場で見てきました。お話、聞かせてください。」
Use soft Mincho or handwritten brush style. The text must be accurate and legible.
No other text anywhere else in the image.

Style: soft watercolor, palette warming up — cream, soft brass-gold, hints of green from a
plant in the corner. Composition: side view, both characters at eye level.
Aspect: 1:1.
```

---

## コマ3：DIAGNOSIS（経営診断と3軸の見立て）

★ 吹き出しのセリフ（齋藤先生）:
```
「集客より、退会を止めるほうが効きますよ。」
```

```
Close-up overhead view of Saito-sensei's hands sketching on a notebook —
she draws three radiating lines from a center point, suggesting three
business axes for matchmaking quality, customer acquisition, retention.
Beside the notebook: a small porcelain seal with the kanji 仲人 in deep terracotta red,
a brass-toned pen, a leaf of green ivy on the edge of the desk.
The owner's hand visible at the edge, holding their own notebook, taking notes.
Mood: clarity emerging, insight being formed.

★ Include ONE hand-drawn watercolor speech bubble coming from off-frame
(suggesting Saito-sensei speaking) with the EXACT Japanese text:
「集客より、退会を止めるほうが効きますよ。」
Use soft Mincho or handwritten brush style. The text must be accurate and legible.
No other text on the notebook or anywhere else in the image — the notebook sketches
should be abstract lines and dots only, with no Japanese characters.

Style: soft watercolor, brass gold and deep terracotta accents become more prominent.
Paper grain texture visible. Composition: top-down close-up.
Aspect: 1:1.
```

---

## コマ4：BENEFIT（変化した後）

★ 吹き出しのセリフ（相談所オーナー）:
```
「3か月で、ここまで変わるとは…」
```

```
Three months later. The same agency owner now sitting confidently at their
own desk, smiling warmly, looking at a screen showing upward graphs and a
calendar marked with celebrations. On the desk: a bouquet of small soft pink
roses received from a recently married client, a thank-you letter, and a
leather notebook with handwritten plans. Morning light through the window,
plants visible on the windowsill.
Mood: confidence, renewed purpose, a small business owner who has found
their own rhythm again.

★ Include ONE hand-drawn watercolor speech bubble above the owner
with the EXACT Japanese text:「3か月で、ここまで変わるとは…」
Use soft Mincho or handwritten brush style. The text must be accurate and legible.
No other text anywhere else in the image — the graphs and calendar should
show shapes only, with no readable Japanese.

Style: soft watercolor, palette now full — cream, fresh greens, warm pinks,
brass gold highlights. Composition: medium shot, owner in foreground centered.
Aspect: 1:1.
```

---

## 使い方の手順

1. **Midjourney**: 各コマのプロンプトの末尾に `--ar 1:1 --style raw --v 6.1` を追加
2. **DALL-E 3 (ChatGPT/API)**: コマごとに「共通スタイル + キャラ設定 + コマプロンプト」を結合して投げる
3. **Stable Diffusion (SDXL/Flux)**: 共通スタイルを LoRA トリガー的に先頭に、ネガティブプロンプトに `realistic photo, harsh outlines, anime, neon, dark shadows` を入れる
4. **Nano Banana / Imagen 3**: 「画風参考」として本人イラスト添付しつつ、コマプロンプトを日本語に翻訳して投げてもOK

---

## LP 内での配置（実装案）

| 配置箇所 | 入れるコマ | 役割 |
|---|---|---|
| Chapter I (PAIN) 共感の前 | コマ1 | 「あなたの今」を絵で見せる |
| Chapter IV (HOW) STEP説明の冒頭 | コマ2 + コマ3 | 60分相談の風景を可視化 |
| Chapter II (BENEFIT) 末尾 | コマ4 | After の風景を絵で訴求 |

各コマは LP HTML 内に `<img>` で挿入。横スワイプカルーセル化も可能。
