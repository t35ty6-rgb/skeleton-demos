/**
 * 新規予約のオーナー通知 (Firestore onCreate trigger)
 *
 * reservations/{resNo} が作成された瞬間:
 *   - お客様に予約確定 Flex push (Bot)
 *   - オーナー LINE に新規予約 Flex push
 *   - guests コレクションを upsert (リピーター判定更新)
 */

const functions = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { Client } = require('@line/bot-sdk');
const confirmationFlex = require('../webhook/templates/confirmation');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function lineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}

exports.onReservationCreated = functions.onDocumentCreated({
  document: 'reservations/{resNo}',
  region: 'asia-northeast1',
}, async (event) => {
  const rec = { id: event.params.resNo, ...event.data.data() };
  const client = lineClient();

  // 建屋 + 客室マスタを取得
  let bldg = null, room = null;
  if (rec.buildingId) {
    const d = await db.collection('buildings').doc(rec.buildingId).get();
    if (d.exists) bldg = { id: d.id, ...d.data() };
  }
  if (rec.roomId) {
    const d = await db.collection('rooms').doc(rec.roomId).get();
    if (d.exists) room = { id: d.id, ...d.data() };
  }

  // 1. お客様に予約受付通知
  try {
    await client.pushMessage(rec.lineUserId, [
      { type: 'text', text: 'ご予約ありがとうございました。\n下記の内容で承りました。' },
      confirmationFlex(rec, bldg, room),
      { type: 'text', text: '担当者が空室を確認のうえ、24 時間以内に「確定」のご連絡をお送りいたします。' },
    ]);
  } catch (err) {
    console.error('customer push failed', err);
    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'error', source: 'trigger', event: 'customer_push_failed',
      payload: { error: err.message }, resNo: rec.resNo, lineUserId: rec.lineUserId,
    });
  }

  // 2. オーナーに新規予約通知
  const ownerSnap = await db.collection('ops_state').doc('owner').get();
  const ownerUserId = ownerSnap.exists ? ownerSnap.data().lineUserId : null;
  if (ownerUserId) {
    try {
      const ci = rec.checkin?.toDate?.();
      const dateStr = ci ? `${ci.getMonth() + 1}/${ci.getDate()} (${'日月火水木金土'[ci.getDay()]})` : '—';
      await client.pushMessage(ownerUserId, [
        { type: 'text', text: `[新規予約] ${rec.resNo}\n${rec.name} 様 / ${rec.tel}\n${bldg?.name || ''} ・ ${room?.no || ''}号\n${dateStr} から ${rec.nights}泊 / ${rec.guests}名\n合計 ¥${(rec.totalPrice || 0).toLocaleString()}\n備考: ${rec.note || 'なし'}` },
        { type: 'text', text: `管理画面で確定処理 → ${process.env.FIREBASE_HOSTING_URL || ''}/admin/` },
      ]);
    } catch (err) {
      console.error('owner push failed', err);
    }
  }

  // 3. guests upsert (リピーター判定)
  const guestRef = db.collection('guests').doc(rec.lineUserId);
  const gSnap = await guestRef.get();
  const prev = gSnap.exists ? gSnap.data() : {};
  await guestRef.set({
    realName: rec.name,
    tel: rec.tel,
    totalReservations: (prev.totalReservations || 0) + 1,
    totalNights: (prev.totalNights || 0) + rec.nights,
    lastResNo: rec.resNo,
    isRepeater: (prev.totalReservations || 0) >= 1,
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('ops_logs').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    level: 'info', source: 'trigger', event: 'reservation_created',
    payload: { resNo: rec.resNo, totalPrice: rec.totalPrice },
    resNo: rec.resNo, lineUserId: rec.lineUserId,
  });
});

/**
 * 予約状態変更時のお客様通知 (pending → confirmed / cancelled)
 */
exports.onReservationUpdated = functions.onDocumentUpdated({
  document: 'reservations/{resNo}',
  region: 'asia-northeast1',
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;

  const client = lineClient();
  const rec = { id: event.params.resNo, ...after };

  if (after.status === 'confirmed' && before.status === 'pending') {
    try {
      await client.pushMessage(rec.lineUserId, [
        { type: 'text', text: `${rec.name} 様\n\nご予約 ${rec.resNo} を確定いたしました。\n前日に道順、当日に鍵の場所をお送りします。お待ちしております。` },
      ]);
    } catch (err) { console.error(err); }
  } else if (after.status === 'cancelled') {
    try {
      await client.pushMessage(rec.lineUserId, [
        { type: 'text', text: `${rec.name} 様\n\nご予約 ${rec.resNo} をキャンセル扱いといたしました。\nまたのご利用をお待ちしております。` },
      ]);
    } catch (err) { console.error(err); }
  }

  await db.collection('ops_logs').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    level: 'info', source: 'trigger', event: 'reservation_status_changed',
    payload: { resNo: rec.resNo, from: before.status, to: after.status },
    resNo: rec.resNo, lineUserId: rec.lineUserId,
  });
});
