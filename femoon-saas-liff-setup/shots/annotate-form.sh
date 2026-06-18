#!/bin/zsh
# Femoon onboarding form — annotation script (v3 LIFF guide)
set -e
cd "$(dirname "$0")"
FONT='/System/Library/Fonts/Supplemental/Arial Bold.ttf'

# ----- form-02-basic.annot.png (740x605) — 店名/電話/住所
# 店名 input:   x≈30..705,  y≈140..188
# 電話 input:   x≈30..360,  y≈320..365
# 住所 input:   x≈30..705,  y≈410..453
magick form-02-basic.png \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 28,138 708,192 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,165 14,193" \
  -fill white -font "$FONT" -pointsize 20 -annotate +5+174 "1" \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 28,318 365,367 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,343 14,371" \
  -fill white -pointsize 20 -annotate +5+352 "2" \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 28,408 708,456 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,432 14,460" \
  -fill white -pointsize 20 -annotate +5+441 "3" \
  form-02-basic.annot.png
echo "✓ form-02-basic"

# ----- form-03-hours.annot.png (740x470) — 開店/閉店/定休日
# 開店 select:  x≈30..360,  y≈140..188
# 閉店 select:  x≈380..710, y≈140..188
# 定休日 btns:  x≈40..390,  y≈230..272
magick form-03-hours.png \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 28,138 365,192 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,165 14,193" \
  -fill white -font "$FONT" -pointsize 20 -annotate +5+174 "1" \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 376,138 714,192 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 720,165 720,193" \
  -fill white -pointsize 20 -annotate +711+174 "2" \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 28,228 408,275 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,252 14,280" \
  -fill white -pointsize 20 -annotate +5+261 "3" \
  form-03-hours.annot.png
echo "✓ form-03-hours"

# ----- form-04-courses.annot.png (740x373) — + コース 追加 ボタン
# 「+ コース を 追加」 btn: x≈30..710, y≈305..343
magick form-04-courses.png \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 28,303 712,347 12,12" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 14,325 14,353" \
  -fill white -font "$FONT" -pointsize 22 -annotate +5+335 "1" \
  form-04-courses.annot.png
echo "✓ form-04-courses"

# ----- form-06-submit.annot.png (1440x417) — 送信する ボタン
# 送信ボタン: 中央 x≈640..800, y≈239..301
magick form-06-submit.png \
  -fill none -stroke '#DC2626' -strokewidth 9 \
    -draw "ellipse 720,270 130,80 0,360" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 855,272 855,302" \
  -fill white -font "$FONT" -pointsize 24 -annotate +843+282 "1" \
  form-06-submit.annot.png
echo "✓ form-06-submit"

# ----- form-07-done.annot.png (1440x900)
# 申込番号 box:        x≈630..810, y≈330..372
# email + 30分以内 文言: x≈400..1040, y≈232..312
magick form-07-done.png \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 396,230 1040,316 12,12" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 380,250 380,278" \
  -fill white -font "$FONT" -pointsize 22 -annotate +371+260 "1" \
  -fill none -stroke '#DC2626' -strokewidth 6 \
    -draw "roundrectangle 626,328 814,374 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 612,349 612,377" \
  -fill white -pointsize 22 -annotate +603+359 "2" \
  form-07-done.annot.png
echo "✓ form-07-done"

echo ""
ls -la form-*.annot.png
