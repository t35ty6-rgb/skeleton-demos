/**
 * 宝喜園 CRM Webhook (Google Apps Script)
 * ============================================================
 * 予約フォーム (reserve.html) と 通販注文 (checkout.html) から
 * POST を受け取り、以下 3 シートに反映します:
 *   - 「顧客DB」  : email 主キーで upsert
 *   - 「予約履歴」: 予約 1件 = 1行
 *   - 「注文履歴」: 注文 1件 = 1行
 *
 * デプロイ手順:
 *  1. https://sheets.new  で 新規スプレッドシート 「宝喜園 CRM」 を作成
 *  2. 「拡張機能」 → 「Apps Script」 を開く
 *  3. Code.gs を全削除して このファイル全体を貼り付け、保存
 *  4. 「デプロイ」 → 「新しいデプロイ」 → 種類 = 「ウェブアプリ」
 *     - 実行するユーザー: 「自分」
 *     - アクセスできるユーザー: 「全員」
 *  5. 表示された Web App URL を コピーして、Jobs (私) に伝える
 *     → HTML の CRM_ENDPOINT に差し替えて deploy
 * ============================================================ */

const SHEET_CUSTOMERS = '顧客DB';
const SHEET_RESERVATIONS = '予約履歴';
const SHEET_ORDERS = '注文履歴';

const CUSTOMER_HEADERS = ['email', 'name', 'tel', '初回来店', '直近来店', '総購入額', '予約回数', '注文回数', '備考'];
const RESERVATION_HEADERS = ['日時', 'email', 'name', 'tel', '店', '用途', '希望日', '希望時間', '人数・数量', '備考'];
const ORDER_HEADERS = ['日時', '注文番号', 'email', 'name', 'tel', '合計金額', '支払方法', '配送先', '商品リスト', '熨斗', '備考'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type;

    if (type === 'reservation') {
      appendReservation(data);
      upsertCustomer(data);
    } else if (type === 'order') {
      appendOrder(data);
      upsertCustomer(data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unknown type' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Simple ping for health check
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: '宝喜園 CRM Webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f4a45f');
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendReservation(data) {
  const sh = getSheet_(SHEET_RESERVATIONS, RESERVATION_HEADERS);
  const now = new Date();
  sh.appendRow([
    now,
    data.email || '',
    data.name || '',
    data.tel || '',
    data.shop || '',
    data.occasion || '',
    data.date || '',
    data.time || '',
    data.quantity || '',
    data.note || ''
  ]);
}

function appendOrder(data) {
  const sh = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  const now = new Date();
  const itemsText = (data.items || []).map(it => `${it.name}×${it.qty}(¥${it.price*it.qty})`).join(' / ');
  const shipTo = [data.pref, data.city, data.addr].filter(Boolean).join(' ');
  const noshi = data.giftWrap ? `${data.giftType||''}/${data.giftName||''}` : '';
  sh.appendRow([
    now,
    data.orderNo || '',
    data.email || '',
    data.name || '',
    data.tel || '',
    data.total || 0,
    data.pay || '',
    shipTo,
    itemsText,
    noshi,
    data.note || ''
  ]);
}

function upsertCustomer(data) {
  const sh = getSheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  const email = String(data.email || '').trim().toLowerCase();
  if (!email) return;

  const lastRow = sh.getLastRow();
  const now = new Date();
  const type = data.type;
  const amount = type === 'order' ? Number(data.total || 0) : 0;

  if (lastRow < 2) {
    // first customer
    sh.appendRow([email, data.name||'', data.tel||'', now, now, amount, type === 'reservation' ? 1 : 0, type === 'order' ? 1 : 0, '']);
    return;
  }
  const emails = sh.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim().toLowerCase());
  const idx = emails.indexOf(email);
  if (idx === -1) {
    sh.appendRow([email, data.name||'', data.tel||'', now, now, amount, type === 'reservation' ? 1 : 0, type === 'order' ? 1 : 0, '']);
    return;
  }
  const row = idx + 2; // header offset
  // Update existing
  const range = sh.getRange(row, 1, 1, CUSTOMER_HEADERS.length);
  const current = range.getValues()[0];
  const name = current[1] || data.name || '';
  const tel = current[2] || data.tel || '';
  const firstVisit = current[3] || now;
  const totalSpent = Number(current[5] || 0) + amount;
  const reservations = Number(current[6] || 0) + (type === 'reservation' ? 1 : 0);
  const orders = Number(current[7] || 0) + (type === 'order' ? 1 : 0);
  range.setValues([[email, name, tel, firstVisit, now, totalSpent, reservations, orders, current[8] || '']]);
}
