#!/usr/bin/env node
/**
 * リッチメニュー登録スクリプト
 *
 * 前提:
 *   - rich-menu.svg を rich-menu.png (2500x1686) に変換済みであること
 *   - LIFF_ID が rich-menu.json の REPLACE_WITH_LIFF_ID と置換済みであること
 *   - .env が設定済みであること
 *
 * 手順:
 *   1. リッチメニュー作成 (JSON POST)
 *   2. 画像 upload (POST /content)
 *   3. デフォルトメニューに設定
 *   4. 旧リッチメニュー (あれば) を全削除
 *
 * 実行:
 *   node upload.mjs
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.LIFF_ID;
const PNG_PATH = path.join(__dirname, 'rich-menu.png');
const JSON_PATH = path.join(__dirname, 'rich-menu.json');

if (!TOKEN) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN is missing in .env');
  process.exit(1);
}
if (!LIFF_ID) {
  console.error('LIFF_ID is missing in .env');
  process.exit(1);
}
if (!fs.existsSync(PNG_PATH)) {
  console.error(`PNG not found: ${PNG_PATH}`);
  console.error('rich-menu.svg を 2500x1686 PNG に変換してください (rsvg-convert or Figma)');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

async function main() {
  // 1. 旧リッチメニュー削除 (重複防止)
  console.log('既存のリッチメニュー一覧を取得...');
  const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers });
  const list = await listRes.json();
  for (const rm of list.richmenus || []) {
    console.log(`  - 削除: ${rm.richMenuId} (${rm.name})`);
    await fetch(`https://api.line.me/v2/bot/richmenu/${rm.richMenuId}`, {
      method: 'DELETE',
      headers,
    });
  }

  // 2. JSON 読み込み + LIFF ID 差し込み
  const def = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  delete def._comment;
  def.areas.forEach((a) => {
    delete a._comment;
    if (a.action.uri) {
      a.action.uri = a.action.uri.replace('REPLACE_WITH_LIFF_ID', LIFF_ID);
    }
  });

  // 3. リッチメニュー作成
  console.log('リッチメニュー作成...');
  const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(def),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    console.error('作成失敗:', created);
    process.exit(1);
  }
  const richMenuId = created.richMenuId;
  console.log(`  ✓ ${richMenuId}`);

  // 4. 画像 upload
  console.log('画像 upload...');
  const png = fs.readFileSync(PNG_PATH);
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png' },
    body: png,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('upload 失敗:', err);
    process.exit(1);
  }
  console.log('  ✓ uploaded');

  // 5. デフォルトメニューに設定
  console.log('デフォルトメニューに設定...');
  const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers,
  });
  if (!defaultRes.ok) {
    console.error('デフォルト設定失敗:', await defaultRes.text());
    process.exit(1);
  }
  console.log('  ✓ デフォルト化完了');

  console.log('\n完了。LINE 公式アカウントを友だち追加して確認してください。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
