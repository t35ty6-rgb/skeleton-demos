#!/bin/zsh
# Femoon LIFF guide screenshot annotation v2 — coords measured from 1440-px images
set -e
cd "$(dirname "$0")"

FONT='/System/Library/Fonts/Supplemental/Arial Bold.ttf'

badge() {
  # $1 cx, $2 cy, $3 label
  echo " -fill '#DC2626' -stroke white -strokewidth 3 -draw \"circle $1,$2 $1,$(($2 + 24))\""
}

# saas-01-login 1440x900 — login tab/email/pw/button highlight
magick saas-01-login.png \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 530,340 740,395 12,12" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 510,365 510,393" \
  -fill white -font "$FONT" -pointsize 22 -annotate +500+375 "1" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 530,455 920,500 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 510,478 510,506" \
  -fill white -pointsize 22 -annotate +500+488 "2" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 530,540 920,585 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 510,562 510,590" \
  -fill white -pointsize 22 -annotate +500+572 "3" \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 530,600 920,650 12,12" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 510,625 510,653" \
  -fill white -pointsize 22 -annotate +500+635 "4" \
  saas-01-login.annot.png
echo "✓ saas-01"

# saas-02-admin-top 1425x999 — header tab "設定" at right; nav order: 予約/顧客/メッセージ/売上/設定
# from tiny view: 設定 around x=560 in 1440 coords ⇒ x=555..585 y=15..45
magick saas-02-admin-top.png \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 540,5 600,55 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 515,30 515,58" \
  -fill white -font "$FONT" -pointsize 22 -annotate +505+40 "1" \
  saas-02-admin-top.annot.png
echo "✓ saas-02"

# saas-03 = settings page full (1425x1991). Basic info section y=130..580
magick saas-03-settings-top.png \
  -crop 1425x650+0+90 +repage \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,110 1390,150 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,130 215,158" \
  -fill white -font "$FONT" -pointsize 22 -annotate +205+140 "1" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,162 1390,202 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,182 215,210" \
  -fill white -pointsize 22 -annotate +205+192 "2" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,214 1390,255 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,235 215,263" \
  -fill white -pointsize 22 -annotate +205+245 "3" \
  saas-03-settings-top.annot.png
echo "✓ saas-03"

# saas-04 = same source. 営業時間+定休日+臨時休業 y=265..560
magick saas-03-settings-top.png \
  -crop 1425x350+0+260 +repage \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,90 380,135 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,112 215,140" \
  -fill white -font "$FONT" -pointsize 22 -annotate +205+122 "1" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,143 380,185 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,164 215,192" \
  -fill white -pointsize 22 -annotate +205+174 "2" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 240,195 620,235 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 215,215 215,243" \
  -fill white -pointsize 22 -annotate +205+225 "3" \
  saas-04-hours.annot.png
echo "✓ saas-04"

# saas-05 = コース・料金 list. crop full-src y=1440..1850 (height 410)
magick saas-03-settings-top.png \
  -crop 1425x410+0+1440 +repage \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 30,50 220,100 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 10,72 10,100" \
  -fill white -font "$FONT" -pointsize 22 -annotate +0+82 "1" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 50,180 1395,300 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 25,210 25,238" \
  -fill white -pointsize 22 -annotate +15+220 "2" \
  saas-05-menu-list.annot.png
echo "✓ saas-05"

# saas-06 = "+ コース追加" button — full source y≈1830, button at right edge
magick saas-03-settings-top.png \
  -crop 1425x260+0+1750 +repage \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 1235,60 1395,105 12,12" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 1208,80 1208,108" \
  -fill white -font "$FONT" -pointsize 22 -annotate +1198+90 "1" \
  saas-06-menu-new.annot.png
echo "✓ saas-06"

# saas-07 = 予約フォームURL row — full source y≈900..960; crop y=860..1060
magick saas-03-settings-top.png \
  -crop 1425x200+0+860 +repage \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 250,70 1245,110 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 220,90 220,118" \
  -fill white -font "$FONT" -pointsize 22 -annotate +210+100 "1" \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 1252,72 1310,115 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 1240,90 1240,118" \
  -fill white -pointsize 22 -annotate +1230+100 "2" \
  saas-07-bookurl.annot.png
echo "✓ saas-07"

# liff-01-providers 1425x1022 — provider list row (any), e.g. claude company at y≈430
magick liff-01-providers.png \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 280,420 1370,460 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 248,440 248,468" \
  -fill white -font "$FONT" -pointsize 22 -annotate +238+450 "1" \
  liff-01-providers.annot.png
echo "✓ liff-01"

# liff-02 = チャネル種別 (1440x1366). LINEログイン icon at left col around (520, 620)
# Add a big red circle around LINEログイン icon (highlight the choice)
magick liff-02-channels.png \
  -fill none -stroke '#DC2626' -strokewidth 9 \
    -draw "ellipse 520,625 130,130 0,360" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 380,485 380,513" \
  -fill white -font "$FONT" -pointsize 22 -annotate +370+495 "1" \
  liff-02-channels.annot.png
echo "✓ liff-02"

# liff-03 same source: highlight 4 channel types overall
magick liff-02-channels.png \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "ellipse 519,625 130,130 0,360" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "ellipse 839,625 130,130 0,360" \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "ellipse 1160,625 130,130 0,360" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 519,485 519,513" \
  -fill white -font "$FONT" -pointsize 22 -annotate +508+495 "1" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 839,485 839,513" \
  -fill white -pointsize 22 -annotate +828+495 "2" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 1160,485 1160,513" \
  -fill white -pointsize 22 -annotate +1149+495 "3" \
  liff-03-channel-type.annot.png
echo "✓ liff-03"

# liff-04 (=B-03-provider-page 1440x1022) — new provider modal: name input + create button
magick liff-04-create-form.png \
  -fill none -stroke '#DC2626' -strokewidth 7 \
    -draw "roundrectangle 593,378 1010,415 8,8" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 568,392 568,420" \
  -fill white -font "$FONT" -pointsize 22 -annotate +558+402 "1" \
  -fill none -stroke '#DC2626' -strokewidth 8 \
    -draw "roundrectangle 720,575 1035,620 10,10" \
  -fill '#DC2626' -stroke white -strokewidth 3 \
    -draw "circle 696,590 696,618" \
  -fill white -pointsize 22 -annotate +686+600 "2" \
  liff-04-create-form.annot.png
echo "✓ liff-04"

echo ""
ls -la *.annot.png
