#!/bin/bash
# 齋藤弓子LP 漫画コマ Drive→assets 取込スクリプト
# 実行: bash fetch-manga.sh

set -e

DRIVE_PATH="skeleton:Skeleton 案件管理/2026/06_2026年6月/2026-06-03_齋藤弓子LP/漫画コマ/"
ASSETS_DIR="$(cd "$(dirname "$0")" && pwd)/assets"

echo "▸ Drive 漫画コマフォルダの中身:"
rclone lsf "$DRIVE_PATH" 2>&1

echo ""
echo "▸ assets/ にコピー中..."
rclone copy "$DRIVE_PATH" "$ASSETS_DIR/" --include "manga-*.png" --include "manga-*.jpg" --include "manga-*.jpeg" --include "manga-*.webp" --progress

echo ""
echo "▸ assets/ 内の manga ファイル:"
ls -lh "$ASSETS_DIR/manga-"* 2>/dev/null || echo "  (まだ無し)"

echo ""
echo "▸ 完了。git add → commit → push して LP 反映:"
echo "  cd $(dirname "$ASSETS_DIR")/.."
echo "  git add yumiko-saito-konkatsu/assets/manga-*"
echo "  git commit -m '齋藤弓子 LP: 漫画コマ画像追加'"
echo "  git push origin main"
