#!/usr/bin/env bash
# 雑貨LINEツール - Firebase Hosting 用 deploy ビルド
# admin/ と customer/ を 自己完結する _dist/ にコピーして import 相対パス化
set -euo pipefail
cd "$(dirname "$0")"

for site in admin customer; do
  out="_dist/$site"
  rm -rf "$out"
  mkdir -p "$out/shared" "$out/seed"
  cp "$site/index.html" "$out/index.html"
  cp shared/*.js "$out/shared/"
  cp seed/*.js   "$out/seed/"
  # import パス書換: '../shared/...' → './shared/...'
  /usr/bin/sed -i.bak \
    -e "s|'\\.\\./shared/|'./shared/|g" \
    -e "s|\"\\.\\./shared/|\"./shared/|g" \
    -e "s|'\\.\\./seed/|'./seed/|g" \
    -e "s|\"\\.\\./seed/|\"./seed/|g" \
    "$out/index.html"
  rm -f "$out/index.html.bak"
  echo "✔ $out built ($(wc -l < $out/index.html) lines)"
done
echo "done — deploy with: firebase deploy --only hosting"
